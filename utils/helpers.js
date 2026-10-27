import mongoose from 'mongoose';

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// "Priya Sharma" -> "P***a" : bidders are anonymised in public auction data
export const maskName = (name = 'Anonymous') => {
  const clean = String(name).trim() || 'Anonymous';
  return clean.length <= 2 ? `${clean[0]}***` : `${clean[0]}***${clean.slice(-1)}`;
};

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Accepts an array or a comma / newline separated string and returns clean unique strings
export const toList = (value) => {
  const arr = Array.isArray(value) ? value : String(value || '').split(/[\n,]+/);
  return [...new Set(arr.map((v) => String(v).trim()).filter(Boolean))];
};
