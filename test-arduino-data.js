const axios = require('axios');

// Test data simulating Arduino transmission
const testData = [
    {
        company_number: "PN0",
        timestamp: "0:00:05",
        pressure_kpa: 10.2,
        depth_m: 1.48,
        data_packet: "PN0 0:00:05 FLOAT 10.2 kpa 1.48 meters",
        transmission_type: "first_profile_bulk",
        profile_number: 1
    },
    {
        company_number: "PN0",
        timestamp: "0:00:10",
        pressure_kpa: 15.8,
        depth_m: 2.29,
        data_packet: "PN0 0:00:10 FLOAT 15.8 kpa 2.29 meters",
        transmission_type: "first_profile_bulk",
        profile_number: 1
    },
    {
        company_number: "PN0",
        timestamp: "0:00:15",
        pressure_kpa: 27.6,
        depth_m: 4.00,
        data_packet: "PN0 0:00:15 FLOAT 27.6 kpa 4.00 meters",
        transmission_type: "first_profile_bulk",
        profile_number: 1
    },
    {
        company_number: "PN0",
        timestamp: "0:00:20",
        pressure_kpa: 15.8,
        depth_m: 2.29,
        data_packet: "PN0 0:00:20 FLOAT 15.8 kpa 2.29 meters",
        transmission_type: "first_profile_bulk",
        profile_number: 1
    },
    {
        company_number: "PN0",
        timestamp: "0:00:25",
        pressure_kpa: 10.2,
        depth_m: 1.48,
        data_packet: "PN0 0:00:25 FLOAT 10.2 kpa 1.48 meters",
        transmission_type: "first_profile_bulk",
        profile_number: 1
    },
    {
        company_number: "PN0",
        timestamp: "0:01:05",
        pressure_kpa: 10.2,
        depth_m: 1.48,
        data_packet: "PN0 0:01:05 FLOAT 10.2 kpa 1.48 meters",
        transmission_type: "second_profile_bulk",
        profile_number: 2
    },
    {
        company_number: "PN0",
        timestamp: "0:01:10",
        pressure_kpa: 15.8,
        depth_m: 2.29,
        data_packet: "PN0 0:01:10 FLOAT 15.8 kpa 2.29 meters",
        transmission_type: "second_profile_bulk",
        profile_number: 2
    },
    {
        company_number: "PN0",
        timestamp: "0:01:15",
        pressure_kpa: 27.6,
        depth_m: 4.00,
        data_packet: "PN0 0:01:15 FLOAT 27.6 kpa 4.00 meters",
        transmission_type: "second_profile_bulk",
        profile_number: 2
    },
    {
        company_number: "PN0",
        timestamp: "0:01:20",
        pressure_kpa: 15.8,
        depth_m: 2.29,
        data_packet: "PN0 0:01:20 FLOAT 15.8 kpa 2.29 meters",
        transmission_type: "second_profile_bulk",
        profile_number: 2
    },
    {
        company_number: "PN0",
        timestamp: "0:01:25",
        pressure_kpa: 10.2,
        depth_m: 1.48,
        data_packet: "PN0 0:01:25 FLOAT 10.2 kpa 1.48 meters",
        transmission_type: "second_profile_bulk",
        profile_number: 2
    }
];

async function sendTestData() {
    console.log('🚀 Starting Arduino Data Flow Test...');
    console.log('📡 Sending test data to data logger server (port 3000)...');
    
    const dataLoggerUrl = 'http://localhost:3000/api/data';
    
    for (let i = 0; i < testData.length; i++) {
        const data = testData[i];
        try {
            console.log(`📊 Sending data point ${i + 1}/${testData.length}: ${data.data_packet}`);
            
            const response = await axios.post(dataLoggerUrl, data);
            
            if (response.status === 200) {
                console.log(`✅ Data point ${i + 1} sent successfully`);
            } else {
                console.log(`❌ Failed to send data point ${i + 1}: ${response.status}`);
            }
            
            // Small delay between transmissions to simulate real Arduino behavior
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error(`❌ Error sending data point ${i + 1}:`, error.message);
        }
    }
    
    console.log('\n🎯 Test data transmission complete!');
    console.log('📊 Check the dashboard at: http://localhost:3001');
    console.log('🔍 You should see:');
    console.log('   - 10 data points in the table');
    console.log('   - Depth vs Time graph showing two profiles');
    console.log('   - Pressure vs Time graph');
    console.log('   - Profile filtering working (All/Profile 1/Profile 2)');
}

// Check if servers are running before sending data
async function checkServers() {
    console.log('🔍 Checking if servers are running...');
    
    try {
        // Check data logger server
        const dataLoggerResponse = await axios.get('http://localhost:3000/api/data');
        console.log('✅ Data logger server (port 3000) is running');
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Data logger server (port 3000) is not running');
            console.log('   Start it with: cd sem/nodejs && node server.js');
            return false;
        }
    }
    
    try {
        // Check dashboard server
        const dashboardResponse = await axios.get('http://localhost:3001');
        console.log('✅ Dashboard server (port 3001) is running');
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Dashboard server (port 3001) is not running');
            console.log('   Start it with: cd crm-api && npm start');
            return false;
        }
    }
    
    return true;
}

async function main() {
    const serversRunning = await checkServers();
    
    if (serversRunning) {
        console.log('\n🚀 All servers are running! Starting data flow test...\n');
        await sendTestData();
    } else {
        console.log('\n❌ Please start the required servers before running this test.');
        process.exit(1);
    }
}

main().catch(console.error); 