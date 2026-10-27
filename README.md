# VeriMarket

A MERN marketplace for verified new and second-hand goods, featuring fixed-price checkout, live proxy-bid auctions, native multi-photo uploads, and secure Razorpay payments.

---

## 🚀 Live Demo & Video Walkthrough

- **Live Deployed Application:** [https://veri-market.vercel.app](https://veri-market.vercel.app)
- **Backend API (Render):** [https://verimarket-f2jz.onrender.com](https://verimarket-f2jz.onrender.com)
- **Feature Walkthrough Video (Google Drive):** [Watch Video Explanation & Demo](https://drive.google.com/file/d/1ZAo8v3yOR5OTqsGc7DlRlVWnZjEywEyc/view?usp=drive_link)

---

## Key Features

- **Trust & Verification System:** Listings are reviewed for authenticity with verifiable serial numbers and receipts, displaying an active "Verified Authentic" green badge.
- **Dual Selling Formats:** Supports instant "Buy It Now" fixed-price purchasing and live real-time auctions.
- **Real-Time Live Bidding Engine:** Built on WebSockets (Socket.IO) with proxy bidding, anti-sniping dynamic time extensions, and instant outbid notifications.
- **Native Multi-Picture Uploading:** Direct multipart image uploads via Multer to server storage (no manual URL inputs needed).
- **Secure Razorpay Integration:** End-to-end checkout with server order generation and SHA-256 HMAC cryptographic signature verification.
- **Zero-Result Smart Fallback:** Automatically presents trending and popular auction recommendations if no search items match.

---

## Run it locally

Requires Node 18+ and a MongoDB instance (local or Atlas).

```bash
# 1. API + sockets  (http://localhost:5000)
cd backend
cp .env.example .env        # set JWT_SECRET, MONGO_URI, ADMIN_EMAIL
npm install
npm run dev

# 2. Web app  (http://localhost:5173)
cd ../frontend
cp .env.example .env        # optional in development
npm install
npm run dev
```

Register with the email you put in `ADMIN_EMAIL` to get an admin account. Admins see a
"Verification queue" tab in the dashboard and can mark listings Verified or Rejected.

To watch an auction close, create one with the "6 minutes (demo)" duration, bid from two browsers
(use a private window for the second account), and watch the clock and prices sync.

## How the pieces fit

| Feature | Where |
| --- | --- |
| Buy It Now + cart + checkout | `productController`, `orderController.checkout`, `pages/Cart.jsx` |
| Live auctions | `server.js` (Socket.io), `utils/auctionEngine.js`, `pages/ProductDetails.jsx`, `components/AuctionTimer.jsx` |
| Proxy bidding | `utils/auctionEngine.js` -> `placeProxyBid` |
| Verification (Pending / Verified / Rejected) | `models/Product.js`, `productController.setVerification`, dashboard admin tab |
| Buyer + seller dashboard | `pages/Dashboard.jsx`, `store/dashboardSlice.js` |
| Reviews | `models/Review.js`, `orderController.createReview`, `getSellerReviews` |

## Socket events

| Event | Direction | Payload |
| --- | --- | --- |
| `join_auction` | client -> server | `productId`, ack `{ ok, state }` |
| `leave_auction` | client -> server | `productId` |
| `place_bid` | client -> server | `{ productId, maxAmount }`, ack `{ ok, isLeading, currentBid, yourMax, extended }` |
| `bid_update` | server -> room | `{ productId, currentBid, bidCount, highestBidder, highestBidderName, reserveMet, minNextBid, increment, endListingTime, newBids[], serverTime }` |
| `auction_ended` | server -> room | `{ productId, status, finalPrice, winnerName }` |
| `outbid`, `auction_won` | server -> one user | personal alerts, delivered on any page |

## Proxy bidding rules

* A bidder enters the most they will pay. The public price only rises as far as needed.
* A higher maximum takes the lead at (previous maximum + one step), capped at the new maximum.
* A lower maximum leaves the leader in front at (new maximum + one step), capped at the leader's maximum.
* Equal maximums: the earlier bidder keeps the lead.
* Step sizes scale with price (see `bidIncrement`).
* Bids in the last 2 minutes extend the auction by 2 minutes.
* The reserve price and every proxy maximum stay server-side; they are never sent to other users.
* Concurrent bids are serialised with a compare-and-swap on `bidCount`, so no replica set is needed.

## Production notes

* Payments are **simulated** (`simulatePayment` in `orderController.js`). Integrate Stripe, Razorpay or similar before taking real money.
* Images and proof documents are URLs. Add an upload service (S3, Cloudinary) for real use.
* Auctions are closed by a 5 second sweep inside the API process. If you run several API instances, move the sweep to one worker and add the Socket.io Redis adapter so bids broadcast across instances.
* Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CLIENT_URL` to your deployed web origin.
