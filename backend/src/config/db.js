const mongoose = require('mongoose');

let retryCount = 0;

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MongoDB Error: MONGO_URI is missing in .env file.');
      console.log('Backend can still start, but features requiring the database will fail.');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    retryCount = 0;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    retryCount += 1;
    console.error(`MongoDB Error (attempt ${retryCount}): ${error.message}`);
    if (retryCount >= 5) {
      console.error('MongoDB connection failed after 5 attempts. Exiting process.');
      process.exit(1);
    }
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;