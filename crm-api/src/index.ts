// retrieving main components that we need
import { MongoClient } from 'mongodb';
const express = require('express');
const body = require('body-parser');
const path = require('path');



async function start() {
  try {

    const app = express(); // app is what im gonna use to configure with web server

    const mongo = new MongoClient('mongodb://localhost:27017/'); // connects to missionDB on local mongodb database
    await mongo.connect();

    app.db = mongo.db('missionDB'); // Use the same database as SEM server

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
      console.log('Server is running on port 3001');
      console.log('Dashboard available at: http://localhost:3001');
    });

  }
  catch(error) {
    console.log(error);
  }
}

start();