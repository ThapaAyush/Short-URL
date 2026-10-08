const mongoose = require("mongoose");

let connectionPromise;

async function connectToMongoDB(url) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(url, {
      serverSelectionTimeoutMS: 5000,
    }).then(
      (connection) => {
        connectionPromise = undefined;
        return connection;
      },
      (err) => {
        connectionPromise = undefined;
        console.error("MongoDB connection failed:", err.message);
        throw err;
      }
    );
  }

  return connectionPromise;
}

module.exports = {
  connectToMongoDB,
};