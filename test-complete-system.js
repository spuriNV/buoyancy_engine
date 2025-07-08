const axios = require('axios');

// Configuration
const DATA_LOGGER_URL = 'http://localhost:3000/api/data';
const DASHBOARD_URL = 'http://localhost:3001/data';
const TEST_INTERVAL = 3000; // 3 seconds for faster testing
const TEST_DURATION = 30000; // 30 seconds

// Test data generator
function generateTestData() {
    const basePressure = 101325;
    const pressureVariation = Math.random() * 15000;
    const pressure = basePressure + pressureVariation;
    const depth = (pressure - 101325) / (1025 * 9.81);
    
    return {
        company_number: "PN0",
        timestamp: new Date().toISOString(),
        pressure_pa: Math.round(pressure),
        depth_m: Math.round(depth * 100) / 100
    };
}

// Test 1: Check if servers are running
async function checkServers() {
    console.log('🔍 Checking if servers are running...');
    
    // Check data logger
    try {
        await axios.get('http://localhost:3000');
        console.log('✅ Data logger server (port 3000) is running');
    } catch (error) {
        console.log('❌ Data logger server (port 3000) is not running');
        return false;
    }
    
    // Check dashboard
    try {
        await axios.get('http://localhost:3001');
        console.log('✅ Dashboard server (port 3001) is running');
    } catch (error) {
        console.log('❌ Dashboard server (port 3001) is not running');
        return false;
    }
    
    return true;
}

// Test 2: Send test data
async function sendTestData() {
    console.log('\n📡 Sending test data...');
    
    const testData = generateTestData();
    try {
        const response = await axios.post(DATA_LOGGER_URL, testData);
        console.log('✅ Test data sent successfully');
        console.log(`   Pressure: ${testData.pressure_pa} Pa`);
        console.log(`   Depth: ${testData.depth_m} m`);
        console.log(`   Timestamp: ${testData.timestamp}`);
        return testData;
    } catch (error) {
        console.log('❌ Failed to send test data:', error.message);
        return null;
    }
}

// Test 3: Check if data appears in dashboard
async function checkDashboardData() {
    console.log('\n📊 Checking dashboard data...');
    
    try {
        const response = await axios.get(DASHBOARD_URL);
        const data = response.data;
        
        if (data.customers && data.customers.length > 0) {
            console.log(`✅ Dashboard has ${data.customers.length} data points`);
            const latest = data.customers[data.customers.length - 1];
            console.log(`   Latest: ${latest.pressure_pa} Pa, ${latest.depth_m} m`);
            return true;
        } else {
            console.log('⚠️  Dashboard has no data yet');
            return false;
        }
    } catch (error) {
        console.log('❌ Failed to get dashboard data:', error.message);
        return false;
    }
}

// Test 4: Continuous data flow test
async function continuousDataTest() {
    console.log('\n🔄 Starting continuous data flow test...');
    console.log(`⏱️  Sending data every ${TEST_INTERVAL}ms for ${TEST_DURATION}ms`);
    
    let dataCount = 0;
    let successCount = 0;
    
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            dataCount++;
            const testData = generateTestData();
            
            try {
                await axios.post(DATA_LOGGER_URL, testData);
                successCount++;
                console.log(`📊 Data point #${dataCount} sent successfully`);
            } catch (error) {
                console.log(`❌ Failed to send data point #${dataCount}`);
            }
            
            if (dataCount * TEST_INTERVAL >= TEST_DURATION) {
                clearInterval(interval);
                console.log(`\n🏁 Continuous test completed:`);
                console.log(`   Total sent: ${dataCount}`);
                console.log(`   Successful: ${successCount}`);
                console.log(`   Success rate: ${((successCount / dataCount) * 100).toFixed(1)}%`);
                resolve(successCount);
            }
        }, TEST_INTERVAL);
    });
}

// Test 5: Verify data persistence
async function verifyDataPersistence() {
    console.log('\n💾 Verifying data persistence...');
    
    try {
        const response = await axios.get(DASHBOARD_URL);
        const data = response.data;
        
        if (data.customers && data.customers.length > 0) {
            console.log(`✅ Data persisted in database: ${data.customers.length} records`);
            
            // Show sample data
            const sample = data.customers.slice(-3);
            console.log('📋 Sample data:');
            sample.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.timestamp} - ${item.pressure_pa} Pa, ${item.depth_m} m`);
            });
            return true;
        } else {
            console.log('❌ No data found in database');
            return false;
        }
    } catch (error) {
        console.log('❌ Failed to verify data persistence:', error.message);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Complete System Test');
    console.log('================================');
    
    // Test 1: Check servers
    const serversRunning = await checkServers();
    if (!serversRunning) {
        console.log('\n❌ Please start both servers before running tests');
        console.log('   Data logger: cd sem/nodejs && node server.js');
        console.log('   Dashboard: cd crm-api && npm start');
        return;
    }
    
    // Test 2: Send single test data
    const testData = await sendTestData();
    if (!testData) {
        console.log('\n❌ Cannot proceed without successful data transmission');
        return;
    }
    
    // Wait a moment for data to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Check dashboard
    const dashboardWorking = await checkDashboardData();
    
    // Test 4: Continuous data flow
    const continuousSuccess = await continuousDataTest();
    
    // Wait for final data processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 5: Verify persistence
    const persistenceVerified = await verifyDataPersistence();
    
    // Final summary
    console.log('\n📋 Test Summary');
    console.log('===============');
    console.log(`✅ Servers Running: ${serversRunning ? 'Yes' : 'No'}`);
    console.log(`✅ Data Transmission: ${testData ? 'Yes' : 'No'}`);
    console.log(`✅ Dashboard Working: ${dashboardWorking ? 'Yes' : 'No'}`);
    console.log(`✅ Continuous Flow: ${continuousSuccess > 0 ? 'Yes' : 'No'}`);
    console.log(`✅ Data Persistence: ${persistenceVerified ? 'Yes' : 'No'}`);
    
    console.log('\n🌐 Dashboard URL: http://localhost:3001');
    console.log('📊 API Endpoint: http://localhost:3001/data');
    
    if (serversRunning && testData && dashboardWorking && continuousSuccess > 0 && persistenceVerified) {
        console.log('\n🎉 All tests passed! Your system is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }
}

// Run the tests
runAllTests().catch(console.error); 