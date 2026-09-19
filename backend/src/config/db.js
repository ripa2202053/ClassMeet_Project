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
    console.log('Ensure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add 0.0.0.0/0).');
    console.log('Retrying MongoDB connection in 10 seconds...');
    setTimeout(connectDB, 10000);
  }
};

module.exports = connectDB;