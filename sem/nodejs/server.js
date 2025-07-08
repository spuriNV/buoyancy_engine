const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

app.use(express.json());

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'missionDB';
let db;

// Only start the server after MongoDB is connected
MongoClient.connect(mongoUrl)
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');

    // Test endpoint
    app.get('/test', (req, res) => {
      res.status(200).send('Server is working!');
    });

// Define the API endpoint
app.post('/api/data', (req, res) => {
      console.log('POST /api/data received');
      const data = req.body;
      console.log('Request body:', data);
      
      if (!db) {
        console.log('Database not connected, but logging data');
        return res.status(503).send('Database not connected');
      }
      
  db.collection('mission_data').insertOne(data, (err, result) => {
    if (err) {
          console.error('MongoDB insert error:', err);
      res.status(500).send('Error inserting data');
    } else {
          console.log('Data inserted successfully:', data);
      res.status(200).send('Data inserted successfully');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
});