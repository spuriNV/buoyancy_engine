const { MongoClient } = require('mongodb');

async function checkMongoDBAtlas() {
    console.log('🔍 CHECKING MONGODB ATLAS DATABASE');
    console.log('=====================================\n');
    
    const mongoUrl = 'mongodb+srv://root:root@cluster0.elyzzqa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    try {
        console.log('📡 Connecting to MongoDB Atlas...');
        const client = new MongoClient(mongoUrl);
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas successfully!\n');
        
        // List all databases
        console.log('📊 DATABASES IN YOUR CLUSTER:');
        const adminDb = client.db('admin');
        const databases = await adminDb.admin().listDatabases();
        
        databases.databases.forEach(db => {
            console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
        });
        
        // Check if mission_data database exists
        const missionDataDb = client.db('mission_data');
        const collections = await missionDataDb.listCollections().toArray();
        
        console.log('\n📁 COLLECTIONS IN mission_data DATABASE:');
        if (collections.length === 0) {
            console.log('  ❌ No collections found (database might not exist yet)');
        } else {
            collections.forEach(collection => {
                console.log(`  - ${collection.name}`);
            });
            
            // Count documents in mission_data collection
            const missionDataCollection = missionDataDb.collection('mission_data');
            const count = await missionDataCollection.countDocuments();
            console.log(`\n📈 DOCUMENTS IN mission_data COLLECTION: ${count}`);
            
            if (count > 0) {
                console.log('\n📋 SAMPLE DOCUMENT:');
                const sample = await missionDataCollection.findOne();
                console.log(JSON.stringify(sample, null, 2));
            }
        }
        
        await client.close();
        console.log('\n✅ Database check complete!');
        
    } catch (error) {
        console.error('❌ Error connecting to MongoDB Atlas:', error.message);
    }
}

checkMongoDBAtlas(); 