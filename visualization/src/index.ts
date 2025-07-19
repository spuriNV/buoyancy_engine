// retrieving main components that we need
import { MongoClient } from 'mongodb';
const express = require('express');
const body = require('body-parser');
const path = require('path');
require('dotenv').config();

// Better error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

async function start() {
  try {
    console.log('🚀 Starting Dashboard Server...');

    const app = express(); // app is what im gonna use to configure with web server

    const mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/', {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongo.connect();
    console.log('✅ Connected to MongoDB Atlas successfully');

    app.db = mongo.db(process.env.DB_NAME || 'mission_data'); // Use the same database as data logger server
    console.log('📊 Using database: mission_data');

    // body parser
    app.use(body.json({
      limit: '500kb'
    }));

    // Serve static files (dashboard)
    app.use(express.static(path.join(__dirname, '../public')));

    // Routes
    app.use('/data', require('../routes/data.ts')); // Fixed path and added .ts extension

    // Serve dashboard at root
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Start server
    app.listen(3001, () => { // Changed port to avoid conflict
      console.log('🚀 Dashboard Server running on port 3001');
      console.log('🌐 Dashboard available at: http://localhost:3001');
    });

  }
  catch(error) {
    console.error('❌ Failed to start Dashboard Server:', error);
    console.log('💡 Check your connection string and network connection');
    process.exit(1);
  }
}

start();