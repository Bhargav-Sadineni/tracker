const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  try {
    if (uri && !uri.includes('127.0.0.1') && !uri.includes('localhost')) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to configured MongoDB');
    } else {
      try {
        await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/activity-tracker', { serverSelectionTimeoutMS: 2000 });
        console.log('Connected to local MongoDB');
      } catch (localErr) {
        console.log('Local MongoDB not running. Starting in-memory MongoDB...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        await mongoose.connect(memUri);
        console.log('Connected to in-memory MongoDB');
      }
    }
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
