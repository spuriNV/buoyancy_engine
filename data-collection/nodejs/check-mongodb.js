const { MongoClient } = require('mongodb');

async function checkMongoDB() {
    console.log('🔍 Checking MongoDB Connection and Data...\n');
    
    try {
        // Connect to MongoDB
        const client = await MongoClient.connect('mongodb://localhost:27017');
        console.log('✅ Connected to MongoDB');
        
        // List all databases
        const adminDb = client.db('admin');
        const databases = await adminDb.admin().listDatabases();
        console.log('\n📁 Available Databases:');
        databases.databases.forEach(db => {
            console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
        });
        
        // Check specific databases
        const databasesToCheck = ['mission_data', 'crm_api', 'missionDB'];
        
        for (const dbName of databasesToCheck) {
            try {
                const db = client.db(dbName);
                const collections = await db.listCollections().toArray();
                
                if (collections.length > 0) {
                    console.log(`\n📊 Database: ${dbName}`);
                    console.log('Collections:');
                    collections.forEach(col => {
                        console.log(`  - ${col.name}`);
                    });
                    
                    // Check if mission_data collection exists
                    const missionDataCollection = collections.find(c => c.name === 'mission_data');
                    if (missionDataCollection) {
                        console.log(`  ✅ mission_data collection found in ${dbName}`);
                        
                        // Count documents
                        const count = await db.collection('mission_data').countDocuments();
                        console.log(`  📄 Document count: ${count}`);
                        
                        if (count > 0) {
                            // Show sample document
                            const sample = await db.collection('mission_data').findOne();
                            console.log(`  📋 Sample document:`, JSON.stringify(sample, null, 2));
                        }
                    }
                }
            } catch (error) {
                console.log(`❌ Could not access database: ${dbName}`);
            }
        }
        
        await client.close();
        console.log('\n✅ MongoDB check complete');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
    }
}

checkMongoDB().catch(console.error); 