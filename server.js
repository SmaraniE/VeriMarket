import 'dotenv/config';
import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import Product from './models/Product.js';
import { userFromToken } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { BidError, broadcastBid, buildAuctionState, finalizeEndedAuctions, placeProxyBid } from './utils/auctionEngine.js';
import { isValidId } from './utils/helpers.js';
import User from './models/User.js';
import { seedDatabase } from './utils/seedData.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

// ---------------------------------------------------------------- HTTP API
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Static serving for user uploads and mock seed assets
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', message: 'VeriMarket API is running', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------- Socket.io
const io = new Server(server, { cors: { origin: origins, credentials: true } });
app.set('io', io); // lets REST controllers broadcast too

// Identify the user from the handshake token. Anonymous sockets may watch auctions but not bid.
io.use(async (socket, next) => {
  const user = await userFromToken(socket.handshake.auth?.token);
  if (user) socket.user = user;
  next();
});

io.on('connection', (socket) => {
  if (socket.user) socket.join(`user:${socket.user._id}`); // private channel for outbid / won alerts
  let lastBidAt = 0;

  // Client -> server: start receiving live updates; ack returns the current state for instant sync
  socket.on('join_auction', async (productId, ack) => {
    try {
      if (!isValidId(productId)) throw new BidError('Auction not found', 404);
      const product = await Product.findById(productId);
      if (!product || product.listingType !== 'auction') throw new BidError('Auction not found', 404);

      socket.join(`auction:${productId}`);
      const leader = product.highestBidder ? await User.findById(product.highestBidder).select('name') : null;
      ack?.({ ok: true, state: buildAuctionState(product, leader?.name) });
    } catch (err) {
      ack?.({ ok: false, message: err.status ? err.message : 'Could not join auction' });
    }
  });

  socket.on('leave_auction', (productId) => {
    socket.leave(`auction:${productId}`);
  });

  // Client -> server: { productId, maxAmount }. Proxy-bids and broadcasts `bid_update` to the room.
  socket.on('place_bid', async (payload = {}, ack) => {
    try {
      if (!socket.user) throw new BidError('Log in to place a bid', 401);
      if (Date.now() - lastBidAt < 500) throw new BidError('Slow down - one bid at a time', 429);
      lastBidAt = Date.now();

      const result = await placeProxyBid({
        productId: payload.productId,
        bidderId: socket.user._id,
        maxAmount: Number(payload.maxAmount),
      });
      broadcastBid(io, result);

      ack?.({
        ok: true,
        isLeading: result.leaderId === String(socket.user._id),
        currentBid: result.state.currentBid,
        yourMax: result.yourMax,
        extended: result.state.extended,
      });
    } catch (err) {
      if (!(err instanceof BidError)) console.error('place_bid failed:', err);
      ack?.({ ok: false, message: err instanceof BidError ? err.message : 'Could not place your bid. Please try again.' });
    }
  });
});

// ---------------------------------------------------------------- Boot
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  // Automatic data seeding to ensure rich realistic listings on launch
  await seedDatabase();
  // Close finished auctions every 5 seconds (also catches anything that ended while the server was down)
  setInterval(() => finalizeEndedAuctions(io).catch((e) => console.error('Auction sweep failed:', e)), 5000);
  server.listen(PORT, () => console.log(`VeriMarket API + sockets listening on :${PORT}`));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
