import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch {
  // ignore dns overrides if unsupported
}
import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verimarket';
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('\n========================================');
    console.error('❌ MONGODB CONNECTION FAILED:');
    console.error(err.message);
    console.error('----------------------------------------');
    console.error('👉 If using MongoDB Atlas, verify:');
    console.error('1. Atlas Network Access IP Whitelist allows your IP (or 0.0.0.0/0 for anywhere).');
    console.error('2. Database user credentials and privileges are correct.');
    console.error('========================================\n');
    throw err;
  }
};

export default connectDB;
