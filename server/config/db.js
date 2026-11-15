const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'paperless';

  if (!uri) {
    console.warn('[Database Warning] MONGODB_URI is not set in environment variables. Database operations will wait for connection.');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });
    isConnected = !!conn.connections[0].readyState;
    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host} | DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Do not crash the entire process so server can stay responsive or retry
    return null;
  }
};

const getDBStatus = () => ({
  connected: mongoose.connection.readyState === 1,
  state: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
});

module.exports = connectDB;
module.exports.getDBStatus = getDBStatus;
