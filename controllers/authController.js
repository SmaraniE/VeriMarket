import User from '../models/User.js';
import Product from '../models/Product.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { isValidId } from '../utils/helpers.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new HttpError('Name, email and password are required');

  const normalised = String(email).toLowerCase().trim();
  if (await User.findOne({ email: normalised })) throw new HttpError('An account with this email already exists', 409);

  const isAdmin = process.env.ADMIN_EMAIL && normalised === process.env.ADMIN_EMAIL.toLowerCase();
  const user = await User.create({ name, email: normalised, password, role: isAdmin ? 'admin' : 'user' });
  res.status(201).json({ user, token: signToken(user._id) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError('Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new HttpError('Incorrect email or password', 401);

  res.json({ user, token: signToken(user._id) });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const items = await Product.find({ _id: { $in: req.user.watchlist }, verificationStatus: { $ne: 'Rejected' } })
    .populate('seller', 'name rating');
  res.json(items);
});

export const toggleWatchlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!isValidId(productId) || !(await Product.exists({ _id: productId }))) throw new HttpError('Product not found', 404);

  const watching = req.user.watchlist.some((id) => String(id) === productId);
  req.user.watchlist = watching
    ? req.user.watchlist.filter((id) => String(id) !== productId)
    : [...req.user.watchlist, productId];
  await req.user.save();
  res.json({ watchlist: req.user.watchlist, watching: !watching });
});

// PUT /api/auth/profile  { name, email, avatar, bio, phone, location }
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, avatar, bio, phone, location } = req.body;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed || trimmed.length > 60) throw new HttpError('Name must be between 1 and 60 characters');
    req.user.name = trimmed;
  }

  if (email !== undefined) {
    const normalised = String(email).toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalised)) throw new HttpError('Enter a valid email address');
    const conflict = await User.findOne({ email: normalised, _id: { $ne: req.user._id } });
    if (conflict) throw new HttpError('That email address is already in use', 409);
    req.user.email = normalised;
  }

  if (avatar !== undefined) req.user.avatar = String(avatar).trim().slice(0, 500);
  if (bio !== undefined) req.user.bio = String(bio).trim().slice(0, 500);
  if (phone !== undefined) req.user.phone = String(phone).trim().slice(0, 30);
  if (location !== undefined) req.user.location = String(location).trim().slice(0, 100);

  await req.user.save();
  res.json({ user: req.user });
});

// PUT /api/auth/password  { currentPassword, newPassword }
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new HttpError('Both current and new passwords are required');
  if (newPassword.length < 6) throw new HttpError('New password must be at least 6 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw new HttpError('Current password is incorrect', 401);

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});
