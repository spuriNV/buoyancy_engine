#  Buoyancy Engine Control System

A complete system with real-time data collection, transmission, and visualization for the buoyancy engine for the MATE ROV competition for SFU Subvision. 

##  System Architecture

```
┌─────────────────┐    WiFi    ┌─────────────────┐    HTTP    ┌─────────────────┐
│   Arduino       │ ──────────▶ │  Data Logger    │ ──────────▶ │   MongoDB       │
│  (Underwater)   │             │   (Port 3000)   │             │   Database      │
└─────────────────┘             └─────────────────┘             └─────────────────┘
                                        │                                │
                                        ▼                                │
                               ┌─────────────────┐                        │
                               │   Dashboard     │ ◀──────────────────────┘
                               │  (Port 3001)    │
                               └─────────────────┘
```

##  Tech Stack

### **Hardware Layer**
- **Arduino Board**: Controls buoyancy mechanism and sensors
- **Pressure Sensor**: Measures water depth
- **Stepper Motor**: Controls syringe for buoyancy adjustment
- **WiFi Module**: Transmits data when at surface

### **Software Layer**
- **Arduino C++**: Embedded control logic
- **Node.js**: Data logger server
- **Express.js**: REST API endpoints
- **MongoDB**: NoSQL database for data storage
- **TypeScript**: Dashboard server
- **ts-node**: TypeScript execution runtime
- **Chart.js**: Real-time data visualization
- **HTML/CSS/JavaScript**: Dashboard frontend
- **ArduinoJson**: JSON parsing for Arduino
- **HTTPClient**: HTTP requests from Arduino
- **WiFiNINA**: WiFi connectivity for Arduino
- **TMC2209**: Stepper motor driver library

### **Infrastructure**
- **HTTP REST API**: Data transmission protocol
- **JSON**: Data format for all communications
- **CORS**: Cross-origin resource sharing
- **body-parser**: Request body parsing middleware
- **WebSocket**: Real-time dashboard updates (future enhancement)

##  Project Structure

```
buoyancy_materov/
├── sem/
│   ├── ardui_code/
│   │   └── ardui_code.ino          # Arduino control code
│   └── nodejs/
│       ├── server.js               # Data logger server
│       ├── package.json
│       └── node_modules/
├── crm-api/
│   ├── src/
│   │   └── index.ts               # Dashboard server
│   ├── routes/
│   │   └── data.ts                # API routes
│   ├── controllers/
│   │   └── getData.ts             # Data retrieval logic
│   ├── public/
│   │   └── index.html             # Dashboard frontend
│   └── package.json
├── run-buoyancy-system.sh         # Complete system startup script
├── stop-buoyancy-system.sh        # System shutdown script
├── test-arduino-data.js           # Test data simulation
└── README.md
```

##  Data Flow

### **1. Underwater Operation**
```
Arduino → Collect Data → Store Locally → No WiFi
```

- Arduino reads pressure sensor every 5 seconds
- Data stored in local arrays during underwater mission
- WiFi disabled to save power and avoid interference

### **2. Surface Transmission**
```
Arduino → Connect WiFi → HTTP POST → Server → MongoDB
```

- Arduino surfaces and connects to WiFi
- Sends all stored data via HTTP POST requests
- Server receives data and stores in MongoDB
- Competition format: `"PN0 1:51:40 FLOAT 9.8 kpa 1.00 meters"`

### **3. Dashboard Visualization**
```
MongoDB → Dashboard API → Chart.js → Real-time Graphs
```

- Dashboard reads data from MongoDB
- Displays real-time depth vs time graphs
- Shows pressure vs time visualization
- Supports profile filtering and data export

##  Mission Phases

### **First Vertical Profile**
1. **WAITING**: System ready, waiting for start signal
2. **FIRST_DESCENDING**: Descend to 4m target depth
3. **FIRST_AT_DEPTH**: Collect data at target depth
4. **FIRST_ASCENDING**: Ascend to surface
5. **FIRST_AT_SURFACE**: Transmit first profile data

### **Second Vertical Profile**
6. **SECOND_DESCENDING**: Descend to 4m target depth
7. **SECOND_AT_DEPTH**: Collect data at target depth
8. **SECOND_ASCENDING**: Ascend to surface
9. **SECOND_AT_SURFACE**: Transmit second profile data
10. **COMPLETE**: Mission finished

##  Installation & Setup

### **Prerequisites**

#### **1. Install Node.js**
```bash
# Download from https://nodejs.org/
# Or use Homebrew (macOS):
brew install node

# Verify installation:
node --version  # Should be v18+
npm --version
```

#### **2. Install MongoDB**
```bash
# macOS with Homebrew:
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB:
brew services start mongodb/brew/mongodb-community

# Or start manually:
mongod --dbpath /Users/sakethpoori/data/db
```

#### **3. Install Arduino IDE**
- Download from: https://www.arduino.cc/en/software
- Install required libraries:
  - **TMC2209**: Stepper motor driver
  - **ArduinoJson**: JSON parsing
  - **WiFiNINA**: WiFi connectivity (built-in for Arduino Nano 33 IoT)

#### **4. Install Project Dependencies**
```bash
# Navigate to project directory
cd buoyancy_materov

# Install data logger dependencies
cd sem/nodejs
npm install

# Install dashboard dependencies
cd ../../crm-api
npm install

# Return to project root
cd ..
```

### **Configuration**

#### **1. Arduino Configuration**
Edit `sem/ardui_code/ardui_code.ino`:
```cpp
// Update WiFi settings
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// Update server IP address
const char* serverName = "http://YOUR_COMPUTER_IP:3000/api/data";
```

#### **2. Find Your Computer's IP Address**
```bash
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig | findstr IPv4
```

#### **3. Upload Arduino Code**
1. Open `sem/ardui_code/ardui_code.ino` in Arduino IDE
2. Select your board (Arduino Nano 33 IoT)
3. Select the correct port
4. Click "Upload"

##  Quick Start

### **1. Start the Complete System**
```bash
# Make scripts executable (first time only)
chmod +x run-buoyancy-system.sh stop-buoyancy-system.sh

# Start the entire system
./run-buoyancy-system.sh
```

**What this does:**
- Kills any existing processes
- Starts MongoDB (if not running)
- Starts data logger server (port 3000)
- Starts dashboard server (port 3001)
- Sends test data (if enabled)

### **2. Access Dashboard**
Open your web browser and go to:
```
http://localhost:3001
```

You should see the buoyancy control dashboard with:
- Real-time data display
- Depth vs Time graph
- Pressure vs Time graph
- Data table and export options

### **3. Test the System**
```bash
# Send test data manually
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "company_number": "PN0",
    "timestamp": "0:00:05",
    "pressure_kpa": 10.2,
    "depth_m": 1.48,
    "data_packet": "PN0 0:00:05 FLOAT 10.2 kpa 1.48 meters",
    "profile_number": 1
  }'

# Run automated test
node test-arduino-data.js
```

### **4. Stop All Servers**
```bash
./stop-buoyancy-system.sh
```


##  Dashboard Features

### **Real-time Monitoring**
- Current depth and pressure readings
- Data point count and profile information
- Connection status indicators

### **Data Visualization**
- **Depth vs Time Graph**: Competition requirement graph
- **Pressure vs Time Graph**: Pressure sensor readings
- **Profile Filtering**: View all data, Profile 1, or Profile 2

### **Data Management**
- **Export Functionality**: Download data as CSV
- **Real-time Updates**: Auto-refresh every 5 seconds
- **Historical Data**: View all mission data

##  Configuration

### **Arduino Settings**
```cpp
// Update these in ardui_code.ino
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";
const String company_number = "PN0"; // Your assigned number
```

### **Server Configuration**
```javascript
// Data Logger (sem/nodejs/server.js)
const port = 3000;
const mongoUrl = 'mongodb://localhost:27017';

// Dashboard (crm-api/src/index.ts)
const port = 3001;
```

### **Depth Conversion Factors**
```cpp
// Update for your float design
const float PRESSURE_SENSOR_OFFSET_CM = 20.0;
const float FLOAT_BOTTOM_OFFSET_CM = 10.0;
const float DEPTH_CONVERSION_FACTOR = 1.0;
```

##  Testing

### **Simulate Arduino Data**
```bash
node test-arduino-data.js
```

### **Manual Test Data**
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "company_number": "PN0",
    "timestamp": "0:00:05",
    "pressure_kpa": 10.2,
    "depth_m": 1.48,
    "data_packet": "PN0 0:00:05 FLOAT 10.2 kpa 1.48 meters",
    "profile_number": 1
  }'
```


---
