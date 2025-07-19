const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/mission_data';
const dbName = process.env.DB_NAME || 'mission_data';
let db;

// Better error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Only start the server after MongoDB is connected
MongoClient.connect(mongoUrl, { 
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000
})
  .then(client => {
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB Atlas successfully');

    // Test endpoint
    app.get('/test', (req, res) => {
      res.status(200).send('Server is working!');
    });

    // Define the API endpoint with better error handling
    app.post('/api/data', async (req, res) => {
      console.log('📥 POST /api/data received');
      const data = req.body;
      console.log('📊 Request body:', data);
      
      if (!db) {
        console.log('❌ Database not connected');
        return res.status(503).send('Database not connected');
      }
      
      try {
        const result = await db.collection('mission_data').insertOne(data);
        console.log('✅ Data inserted successfully:', data);
        res.status(200).send('Data inserted successfully');
      } catch (err) {
        console.error('❌ MongoDB insert error:', err);
        res.status(500).send('Error inserting data');
      }
    });

    app.listen(port, () => {
      console.log(`🚀 Data Logger Server running at http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error('❌ Failed to connect to MongoDB Atlas:', error);
    console.log('💡 Check your connection string and network connection');
    process.exit(1);
});