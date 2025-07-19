const chai = require('chai');
const chaiHttp = require('chai-http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const expect = chai.expect;
const path = require('path');
const supertest = require('supertest');
const child_process = require('child_process');

chai.use(chaiHttp);

describe('Data Logger Server Integration', function() {
  let mongod, uri, client, db, serverProcess, request;

  before(async function() {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('buoyancy');

    // Start the server as a child process with test DB URI
    serverProcess = child_process.fork(
      path.join(__dirname, '../server.js'),
      [],
      {
        env: { ...process.env, MONGO_URI: uri, PORT: 4000 },
        stdio: 'ignore',
      }
    );
    // Wait for server to start
    await new Promise(res => setTimeout(res, 1500));
    request = supertest('http://localhost:4000');
  });

  after(async function() {
    if (serverProcess) serverProcess.kill();
    if (client) await client.close();
    if (mongod) await mongod.stop();
  });

  it('should accept valid POST /api/data and store in DB', async function() {
    const testData = {
      company: 'PN0',
      timestamp: '1:51:40',
      type: 'FLOAT',
      pressure: 9.8,
      unit: 'kpa',
      depth: 1.0,
      depth_unit: 'meters'
    };
    const res = await request.post('/api/data').send(testData);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('message');
    // Check DB
    const found = await db.collection('data').findOne({ company: 'PN0' });
    expect(found).to.include({ company: 'PN0', type: 'FLOAT' });
  });

  it('should reject invalid POST /api/data', async function() {
    const badData = { foo: 'bar' };
    const res = await request.post('/api/data').send(badData);
    expect(res.status).to.not.equal(200);
  });
}); 