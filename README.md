**Note: The dashboard was added after the competition, and the Arduino code was further refined post-competition as well.**

# Buoyancy Engine Control System

A complete underwater buoyancy control system with real-time data collection, transmission, and visualization for the MATE ROV competition. Features embedded Arduino sensors, dual-server architecture, cloud MongoDB integration, and real-time dashboard visualization.

## System Architecture

```
┌─────────────────┐    WiFi    ┌─────────────────┐    HTTP    ┌─────────────────┐
│   Arduino       │ ──────────▶ │  Data Logger    │ ──────────▶ │  MongoDB Atlas  │
│  (Underwater)   │             │   (Port 3000)   │             │   (Cloud DB)    │
└─────────────────┘             └─────────────────┘             └─────────────────┘
                                        │                                │
                                        ▼                                │
                               ┌─────────────────┐                        │
                               │   Dashboard     │ ◀──────────────────────┘
                               │  (Port 3001)    │
                               └─────────────────┘
```

## Tech Stack

### **Hardware Layer**
- **Arduino Nano 33 IoT**: Controls buoyancy mechanism and sensors
- **Pressure Sensor**: Measures water depth with ±0.25 PSI precision
- **Stepper Motor**: Controls syringe for automated buoyancy adjustment
- **WiFi Module**: Transmits data when at surface

### **Software Layer**
- **Arduino C++**: Embedded control logic with 10-phase mission automation
- **Node.js**: Data logger server with real-time processing
- **Express.js**: REST API endpoints for data transmission
- **MongoDB Atlas**: Cloud NoSQL database for mission data persistence
- **TypeScript**: Dashboard server with type safety
- **Chart.js**: Real-time data visualization
- **HTML/CSS/JavaScript**: Modern dashboard frontend

### **Infrastructure**
- **HTTP REST API**: Data transmission protocol
- **JSON**: Data format for all communications
- **Environment Variables**: Secure credential management
- **CORS**: Cross-origin resource sharing
- **Dual-Server Architecture**: High-reliability design

## Project Structure

```
buoyancy_materov/
├── data-collection/
│   ├── ardui_code/
│   │   └── ardui_code.ino          # Arduino control code
│   └── nodejs/
│       ├── server.js               # Data logger server
│       ├── .env                    # Environment variables (secure)
│       ├── package.json
│       └── node_modules/
├── visualization/
│   ├── src/
│   │   └── index.ts               # Dashboard server
│   ├── routes/
│   │   └── data.ts                # API routes
│   ├── controllers/
│   │   └── getData.ts             # Data retrieval logic
│   ├── public/
│   │   └── index.html             # Dashboard frontend
│   ├── .env                       # Environment variables (secure)
│   └── package.json
├── .env.example                   # Environment template
├── .gitignore                     # Protects sensitive files
├── run-buoyancy-system.sh         # Complete system startup script
├── stop-buoyancy-system.sh        # System shutdown script
└── README.md
```

## Data Flow

### **1. Underwater Operation**
```
Arduino → Collect Data → Store Locally → No WiFi
```

- Arduino reads pressure sensor every 5 seconds
- Data stored in local arrays during underwater mission
- WiFi disabled to save power and avoid interference

### **2. Surface Transmission**
```
Arduino → Connect WiFi → HTTP POST → Server → MongoDB Atlas
```

- Arduino surfaces and connects to WiFi
- Sends all stored data via HTTP POST requests
- Server receives data and stores in cloud MongoDB
- Competition format: `"PN0 1:51:40 FLOAT 9.8 kpa 1.00 meters"`

### **3. Dashboard Visualization**
```
MongoDB Atlas → Dashboard API → Chart.js → Real-time Graphs
```

- Dashboard reads data from cloud MongoDB
- Displays real-time depth vs time graphs
- Shows pressure vs time visualization
- Supports profile filtering and data export

## Mission Phases

### **10-Phase Automated Mission:**
1. **WAITING**: System ready, waiting for start signal
2. **FIRST_DESCENDING**: Descend to 4m target depth
3. **FIRST_AT_DEPTH**: Collect data at target depth
4. **FIRST_ASCENDING**: Ascend to surface
5. **FIRST_AT_SURFACE**: Transmit first profile data
6. **SECOND_DESCENDING**: Descend to 4m target depth
7. **SECOND_AT_DEPTH**: Collect data at target depth
8. **SECOND_ASCENDING**: Ascend to surface
9. **SECOND_AT_SURFACE**: Transmit second profile data
10. **COMPLETE**: Mission finished



## Installation & Setup

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

#### **2. Install Arduino IDE**
- Download from: https://www.arduino.cc/en/software
- Install required libraries:
  - **TMC2209**: Stepper motor driver
  - **ArduinoJson**: JSON parsing
  - **WiFiNINA**: WiFi connectivity (built-in for Arduino Nano 33 IoT)

#### **3. Install Project Dependencies**
```bash
# Navigate to project directory
cd buoyancy_materov

# Install data logger dependencies
cd data-collection/nodejs
npm install

# Install dashboard dependencies
cd ../../visualization
npm install

# Return to project root
cd ..
```

### **Configuration**

#### **1. Set Up Environment Variables**
```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your MongoDB Atlas credentials
# data-collection/nodejs/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=mission_data

# visualization/.env (same credentials)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=mission_data
```

#### **2. Arduino Configuration**
Edit `data-collection/ardui_code/ardui_code.ino`:
```cpp
// Update WiFi settings
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// Update server IP address
const char* serverName = "http://YOUR_COMPUTER_IP:3000/api/data";
```

#### **3. Find Your Computer's IP Address**
```bash
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig | findstr IPv4
```

#### **4. Upload Arduino Code**
1. Open `data-collection/ardui_code/ardui_code.ino` in Arduino IDE
2. Select your board (Arduino Nano 33 IoT)
3. Select the correct port
4. Click "Upload"

## Quick Start

### **1. Start the Complete System**
```bash
# Make scripts executable (first time only)
chmod +x run-buoyancy-system.sh stop-buoyancy-system.sh

# Start the entire system
./run-buoyancy-system.sh
```

**What this does:**
- Starts data logger server (port 3000)
- Starts dashboard server (port 3001)
- Connects to MongoDB Atlas
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
    "pressure": 2.5,
    "depth": 4.0,
    "timestamp": "2025-07-19T01:12:22.212Z",
    "phase": "DEPTH_CONTROL"
  }'
```

### **4. Stop All Servers**
```bash
./stop-buoyancy-system.sh
```

## Dashboard Features

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


