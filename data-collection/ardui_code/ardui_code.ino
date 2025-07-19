#include <TMC2209.h> // Include library for TMC2209 stepper driver
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiNINA.h>

// WiFi Configuration - Update these with your network details
char ssid[] = "YOUR_WIFI_SSID"; // Replace with your WiFi name
char pass[] = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password
int status = WL_IDLE_STATUS; // Wi-Fi status

const char* serverName = "http://192.168.1.100:3000/api/data"; // Update with your computer's IP address

// Company and mission configuration
const String company_number = "PN0"; // Company identifier - UPDATE THIS WITH YOUR ASSIGNED NUMBER

// Pin assignments
const uint8_t sensorPin = A0; // Analog pin for pressure sensor

// Motor control constants
const int32_t RUN_VELOCITY = 20000; // Velocity for the motor
const int32_t STOP_VELOCITY = 0; // Stopping velocity
const uint8_t RUN_CURRENT_PERCENT = 70; // Motor current percentage

// Pressure and depth variables
float pressureValue = 0; // Current pressure value from sensor
float currentDepth = 0.0; // Current depth in meters (calculated from pressure)
float pressureError = 0.25; // Allowed error for target pressure
const float TARGET_PRESSURE = 5.6742; // Fixed target pressure in PSI (≈4 meters)
const float SURFACE_PRESSURE = 0.5; // Surface pressure threshold in PSI

// Depth conversion factors (IMPORTANT: Update these for your float design)
const float PRESSURE_SENSOR_OFFSET_CM = 20.0; // Distance from waterline to pressure sensor (cm)
const float FLOAT_BOTTOM_OFFSET_CM = 10.0; // Distance from pressure sensor to float bottom (cm)
const float DEPTH_CONVERSION_FACTOR = 1.0; // Additional conversion factor if needed

// Mission control variables
enum MissionPhase {
  WAITING,           // Waiting for start signal
  FIRST_DESCENDING,  // First descent to target depth
  FIRST_AT_DEPTH,    // At target depth during first profile
  FIRST_ASCENDING,   // First ascent to surface
  FIRST_AT_SURFACE,  // At surface after first profile - TRANSMIT FIRST PROFILE DATA
  SECOND_DESCENDING, // Second descent to target depth
  SECOND_AT_DEPTH,   // At target depth during second profile
  SECOND_ASCENDING,  // Second ascent to surface
  SECOND_AT_SURFACE, // At surface after second profile - TRANSMIT SECOND PROFILE DATA
  COMPLETE           // Mission complete
};

MissionPhase currentPhase = WAITING;
bool firstProfileComplete = false;
bool secondProfileComplete = false;
bool firstDataTransmitted = false;
bool secondDataTransmitted = false;
bool wifiConnected = false; // Track WiFi connection status

// Timing for syringe operations
unsigned long syringe_time = 5000; // Time required for the motor to push/pull the syringe (5 seconds)
unsigned long previousTimeSyringe = 0; // Track when syringe operation started
bool syringeActive = false; // Whether syringe is currently moving

// Instantiate TMC2209 driver
TMC2209 stepper_driver;

// Data storage for pressure readings (competition requirement: every 5 seconds)
const int MAX_DATA_POINTS = 200; // Increased for longer missions
float firstProfileData[MAX_DATA_POINTS]; // Array to store first profile pressure data
float firstProfileDepths[MAX_DATA_POINTS]; // Array to store first profile depth data
String firstProfileTimes[MAX_DATA_POINTS]; // Array to store first profile time stamps
int firstProfileIndex = 0; // Index for first profile data

float secondProfileData[MAX_DATA_POINTS]; // Array to store second profile pressure data
float secondProfileDepths[MAX_DATA_POINTS]; // Array to store second profile depth data
String secondProfileTimes[MAX_DATA_POINTS]; // Array to store second profile time stamps
int secondProfileIndex = 0; // Index for second profile data

// Timing variables for data collection
unsigned long previousTimeData = millis(); // Last data collection time
const long timeIntervalData = 5000; // Time interval for data collection (5 seconds) - COMPETITION REQUIREMENT
unsigned long missionStartTime = 0; // Mission start time for float time calculation

// Control signals for operation
char startSignal = '0'; // Signal for initialization/start

void setup() {
    // Initialize serial communication
    Serial.begin(9600);
    
    // Set up stepper driver
    stepper_driver.setRunCurrent(RUN_CURRENT_PERCENT);
    stepper_driver.enableCoolStep();
    stepper_driver.enable();
  
    // Set LED pin as output
    pinMode(LED_BUILTIN, OUTPUT);
  
    // Connect to Wi-Fi initially
    connectToWiFi();
    
    Serial.println("---------------------------------------");
    Serial.println("Buoyancy Control System Ready");
    Serial.println("Send '1' to start mission");
    Serial.println("=== DEPTH CONVERSION INFO ===");
    Serial.print("Pressure sensor offset: ");
    Serial.print(PRESSURE_SENSOR_OFFSET_CM);
    Serial.println(" cm from waterline");
    Serial.print("Float bottom offset: ");
    Serial.print(FLOAT_BOTTOM_OFFSET_CM);
    Serial.println(" cm from pressure sensor");
    Serial.print("Surface depth reading: ");
    Serial.print(PRESSURE_SENSOR_OFFSET_CM + FLOAT_BOTTOM_OFFSET_CM);
    Serial.println(" cm");
    Serial.println("================================");
}

void loop() {
    // Check for incoming control signals
    if (Serial.available() > 0) {
        startSignal = Serial.read(); // Read control signal
        if (startSignal == '1' && currentPhase == WAITING) {
            startMission();
        }
    }
    
    // Main mission control loop
    if (currentPhase != WAITING && currentPhase != COMPLETE) {
        handlePressureReading(); // Read pressure and calculate depth
        controlBuoyancy(); // Control buoyancy based on current phase
        printMissionStatus(); // Print current status
    }
}

void connectToWiFi() {
    Serial.print("Attempting to connect to network: ");
    Serial.println(ssid);
    
    while (status != WL_CONNECTED) {
        status = WiFi.begin(ssid, pass); // Connect to Wi-Fi
        delay(10000); // Wait for connection
    }
    
    wifiConnected = true;
    Serial.println("You're connected to the network");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

void disconnectWiFi() {
    if (wifiConnected) {
        WiFi.disconnect();
        wifiConnected = false;
        Serial.println("WiFi disconnected for underwater operation");
        }
    }

void startMission() {
    currentPhase = FIRST_DESCENDING;
    firstProfileComplete = false;
    secondProfileComplete = false;
    firstDataTransmitted = false;
    secondDataTransmitted = false;
    firstProfileIndex = 0; // Reset first profile data collection
    secondProfileIndex = 0; // Reset second profile data collection
    missionStartTime = millis(); // Record mission start time
    
    Serial.println("=== MISSION STARTED ===");
    Serial.println("Phase: FIRST_DESCENDING to 4m depth");
    Serial.println("Data collection: Every 5 seconds (stored locally)");
    Serial.println("WiFi will be disabled during underwater operation");
    
    // Disconnect WiFi before going underwater
    disconnectWiFi();
}

void handlePressureReading() {
    unsigned long currentTime = millis();
    pressureValue = (float)analogRead(sensorPin); // Read pressure from sensor and cast to float
    
    // Convert analog reading to voltage and then to pressure
    float voltage = pressureValue * (5.0 / 1023.0); // Scale analog value to voltage
    float baseVoltage = 0; // Adjust base voltage if necessary
    float pressurePSI = (voltage - baseVoltage) * (10.0 / (4.5 - baseVoltage)); // Convert to PSI
    
    // Calculate depth from pressure (keeping the conversion)
    float rawDepth = pressurePSI * 0.7049; // Convert PSI to meters
    
    // Apply depth conversion factors for competition accuracy
    // Add offsets to get actual depth from float bottom
    currentDepth = rawDepth + (PRESSURE_SENSOR_OFFSET_CM + FLOAT_BOTTOM_OFFSET_CM) / 100.0; // Convert cm to meters
    currentDepth *= DEPTH_CONVERSION_FACTOR; // Apply any additional conversion factor
    
    // Collect pressure data every 5 seconds (COMPETITION REQUIREMENT)
    if (currentTime - previousTimeData > timeIntervalData) {
        previousTimeData = currentTime;
        
        // Store data based on current profile (NO WiFi transmission underwater)
        String timeString = formatFloatTime(currentTime - missionStartTime);
        
        if (currentPhase >= FIRST_DESCENDING && currentPhase <= FIRST_AT_SURFACE) {
            // First profile data collection (stored locally)
            if (firstProfileIndex < MAX_DATA_POINTS) {
                firstProfileData[firstProfileIndex] = pressurePSI;
                firstProfileDepths[firstProfileIndex] = currentDepth;
                firstProfileTimes[firstProfileIndex] = timeString;
                firstProfileIndex++;
                
                // Print data packet for monitoring (not transmitted)
                String dataPacket = createDataPacket(pressurePSI * 6.89476, currentDepth, timeString);
                Serial.println("Data Stored (Profile 1): " + dataPacket);
            }
        } else if (currentPhase >= SECOND_DESCENDING && currentPhase <= SECOND_AT_SURFACE) {
            // Second profile data collection (stored locally)
            if (secondProfileIndex < MAX_DATA_POINTS) {
                secondProfileData[secondProfileIndex] = pressurePSI;
                secondProfileDepths[secondProfileIndex] = currentDepth;
                secondProfileTimes[secondProfileIndex] = timeString;
                secondProfileIndex++;

                // Print data packet for monitoring (not transmitted)
                String dataPacket = createDataPacket(pressurePSI * 6.89476, currentDepth, timeString);
                Serial.println("Data Stored (Profile 2): " + dataPacket);
            }
        }
    }
}

String formatFloatTime(unsigned long milliseconds) {
    unsigned long seconds = milliseconds / 1000;
    unsigned long hours = seconds / 3600;
    unsigned long minutes = (seconds % 3600) / 60;
    seconds = seconds % 60;
    
    char timeStr[20];
    sprintf(timeStr, "%lu:%02lu:%02lu", hours, minutes, seconds);
    return String(timeStr);
}

String createDataPacket(float pressureKPa, float depthM, String timeStr) {
    // Format: "PN0 1:51:40 FLOAT 9.8 kpa 1.00 meters"
    char packet[100];
    sprintf(packet, "%s %s FLOAT %.1f kpa %.2f meters", 
            company_number.c_str(), 
            timeStr.c_str(), 
            pressureKPa, 
            depthM);
    return String(packet);
}

void controlBuoyancy() {
    unsigned long currentTime = millis();
    
    switch (currentPhase) {
        case FIRST_DESCENDING:
            // Move down to target depth during first profile
            if (pressureValue < TARGET_PRESSURE - pressureError) {
                // Need to go deeper - activate syringe to increase buoyancy
                if (!syringeActive) {
                    stepper_driver.disableInverseMotorDirection();
                    stepper_driver.moveAtVelocity(RUN_VELOCITY);
                    syringeActive = true;
                    previousTimeSyringe = currentTime;
                }
            } else {
                // Reached target depth
                stepper_driver.moveAtVelocity(STOP_VELOCITY);
                syringeActive = false;
                currentPhase = FIRST_AT_DEPTH;
                Serial.println("=== REACHED TARGET DEPTH (4m) - FIRST PROFILE ===");
                Serial.println("Phase: FIRST_AT_DEPTH - preparing to ascend");
            }
            break;
            
        case FIRST_AT_DEPTH:
            // Wait at depth, then start ascending
            delay(2000); // Wait 2 seconds at depth
            currentPhase = FIRST_ASCENDING;
            Serial.println("Phase: FIRST_ASCENDING to surface");
            break;
            
        case FIRST_ASCENDING:
            // Move up to surface after first profile
            if (pressureValue > SURFACE_PRESSURE + pressureError) {
                // Need to go higher - activate syringe in reverse to decrease buoyancy
                if (!syringeActive) {
                    stepper_driver.enableInverseMotorDirection();
                    stepper_driver.moveAtVelocity(RUN_VELOCITY);
                    syringeActive = true;
                    previousTimeSyringe = currentTime;
                }
            } else {
                // Reached surface after first profile
                stepper_driver.moveAtVelocity(STOP_VELOCITY);
                syringeActive = false;
                currentPhase = FIRST_AT_SURFACE;
                firstProfileComplete = true;
                Serial.println("=== REACHED SURFACE - FIRST PROFILE COMPLETE ===");
                Serial.println("Phase: FIRST_AT_SURFACE - RECONNECTING WiFi AND TRANSMITTING DATA");
                
                // Reconnect WiFi and transmit data
                connectToWiFi();
                transmitFirstProfileData();
            }
            break;
            
        case FIRST_AT_SURFACE:
            // At surface after first profile - transmit first profile data
            if (!firstDataTransmitted) {
                delay(3000); // Wait 3 seconds at surface
                firstDataTransmitted = true;
                Serial.println("=== FIRST PROFILE DATA TRANSMISSION COMPLETE ===");
                Serial.println("Starting second vertical profile...");
                
                // Disconnect WiFi before second dive
                disconnectWiFi();
                currentPhase = SECOND_DESCENDING;
                Serial.println("Phase: SECOND_DESCENDING to 4m depth");
            }
            break;
            
        case SECOND_DESCENDING:
            // Move down to target depth during second profile
            if (pressureValue < TARGET_PRESSURE - pressureError) {
                // Need to go deeper - activate syringe to increase buoyancy
                if (!syringeActive) {
        stepper_driver.disableInverseMotorDirection();
                    stepper_driver.moveAtVelocity(RUN_VELOCITY);
                    syringeActive = true;
                    previousTimeSyringe = currentTime;
                }
            } else {
                // Reached target depth
                stepper_driver.moveAtVelocity(STOP_VELOCITY);
                syringeActive = false;
                currentPhase = SECOND_AT_DEPTH;
                Serial.println("=== REACHED TARGET DEPTH (4m) - SECOND PROFILE ===");
                Serial.println("Phase: SECOND_AT_DEPTH - preparing to ascend");
            }
            break;
            
        case SECOND_AT_DEPTH:
            // Wait at depth, then start ascending
            delay(2000); // Wait 2 seconds at depth
            currentPhase = SECOND_ASCENDING;
            Serial.println("Phase: SECOND_ASCENDING to surface");
            break;
            
        case SECOND_ASCENDING:
            // Move up to surface after second profile
            if (pressureValue > SURFACE_PRESSURE + pressureError) {
                // Need to go higher - activate syringe in reverse to decrease buoyancy
                if (!syringeActive) {
                    stepper_driver.enableInverseMotorDirection();
                    stepper_driver.moveAtVelocity(RUN_VELOCITY);
                    syringeActive = true;
                    previousTimeSyringe = currentTime;
                }
    } else {
                // Reached surface after second profile
                stepper_driver.moveAtVelocity(STOP_VELOCITY);
                syringeActive = false;
                currentPhase = SECOND_AT_SURFACE;
                secondProfileComplete = true;
                Serial.println("=== REACHED SURFACE - SECOND PROFILE COMPLETE ===");
                Serial.println("Phase: SECOND_AT_SURFACE - RECONNECTING WiFi AND TRANSMITTING DATA");
                
                // Reconnect WiFi and transmit data
                connectToWiFi();
                transmitSecondProfileData();
            }
            break;
            
        case SECOND_AT_SURFACE:
            // At surface after second profile - transmit second profile data
            if (!secondDataTransmitted) {
                delay(3000); // Wait 3 seconds at surface
                secondDataTransmitted = true;
                Serial.println("=== SECOND PROFILE DATA TRANSMISSION COMPLETE ===");
                Serial.println("Both vertical profiles completed successfully!");
                currentPhase = COMPLETE;
            }
            break;
            
        default:
            break;
    }
    
    // Stop syringe if it's been running too long
    if (syringeActive && (currentTime - previousTimeSyringe > syringe_time)) {
        stepper_driver.moveAtVelocity(STOP_VELOCITY);
        syringeActive = false;
    }
}

void transmitFirstProfileData() {
    if (!wifiConnected) {
        Serial.println("ERROR: WiFi not connected. Cannot transmit first profile data.");
        return;
    }
    
    Serial.println("=== TRANSMITTING FIRST PROFILE DATA PACKETS ===");
    Serial.println("Data collected every 5 seconds during first vertical profile:");
    Serial.println("Format: Company Time FLOAT Pressure Depth");
    Serial.println("----------------------------------------");
    
    for (int j = 0; j < firstProfileIndex; j++) {
        float pressureKPa = firstProfileData[j] * 6.89476; // Convert PSI to kPa
        float depthM = firstProfileDepths[j]; // Use stored depth with conversion factors
        
        String dataPacket = createDataPacket(pressureKPa, depthM, firstProfileTimes[j]);
        Serial.println("Transmitting: " + dataPacket);
        
        // Send each data packet to server
        StaticJsonDocument<300> jsonDoc;
        jsonDoc["company_number"] = company_number;
        jsonDoc["timestamp"] = firstProfileTimes[j];
        jsonDoc["pressure_kpa"] = pressureKPa;
        jsonDoc["depth_m"] = depthM;
        jsonDoc["data_packet"] = dataPacket;
        jsonDoc["transmission_type"] = "first_profile_bulk";
        jsonDoc["profile_number"] = 1;

        String jsonString;
        serializeJson(jsonDoc, jsonString);
        sendToMongoDB(jsonString);
        
        delay(100); // Small delay between transmissions
    }
    
    Serial.println("----------------------------------------");
    Serial.print("First profile data packets transmitted: ");
    Serial.println(firstProfileIndex);
    Serial.println("=== FIRST PROFILE TRANSMISSION COMPLETE ===");
}

void transmitSecondProfileData() {
    if (!wifiConnected) {
        Serial.println("ERROR: WiFi not connected. Cannot transmit second profile data.");
        return;
    }
    
    Serial.println("=== TRANSMITTING SECOND PROFILE DATA PACKETS ===");
    Serial.println("Data collected every 5 seconds during second vertical profile:");
    Serial.println("Format: Company Time FLOAT Pressure Depth");
    Serial.println("----------------------------------------");
    
    for (int j = 0; j < secondProfileIndex; j++) {
        float pressureKPa = secondProfileData[j] * 6.89476; // Convert PSI to kPa
        float depthM = secondProfileDepths[j]; // Use stored depth with conversion factors
        
        String dataPacket = createDataPacket(pressureKPa, depthM, secondProfileTimes[j]);
        Serial.println("Transmitting: " + dataPacket);
        
        // Send each data packet to server
        StaticJsonDocument<300> jsonDoc;
        jsonDoc["company_number"] = company_number;
        jsonDoc["timestamp"] = secondProfileTimes[j];
        jsonDoc["pressure_kpa"] = pressureKPa;
        jsonDoc["depth_m"] = depthM;
        jsonDoc["data_packet"] = dataPacket;
        jsonDoc["transmission_type"] = "second_profile_bulk";
        jsonDoc["profile_number"] = 2;

        String jsonString;
        serializeJson(jsonDoc, jsonString);
        sendToMongoDB(jsonString);
        
        delay(100); // Small delay between transmissions
    }
    
    Serial.println("----------------------------------------");
    Serial.print("Second profile data packets transmitted: ");
    Serial.println(secondProfileIndex);
    Serial.println("=== SECOND PROFILE TRANSMISSION COMPLETE ===");
}

String getPhaseString(MissionPhase phase) {
    switch (phase) {
        case WAITING: return "WAITING";
        case FIRST_DESCENDING: return "FIRST_DESCENDING";
        case FIRST_AT_DEPTH: return "FIRST_AT_DEPTH";
        case FIRST_ASCENDING: return "FIRST_ASCENDING";
        case FIRST_AT_SURFACE: return "FIRST_AT_SURFACE";
        case SECOND_DESCENDING: return "SECOND_DESCENDING";
        case SECOND_AT_DEPTH: return "SECOND_AT_DEPTH";
        case SECOND_ASCENDING: return "SECOND_ASCENDING";
        case SECOND_AT_SURFACE: return "SECOND_AT_SURFACE";
        case COMPLETE: return "COMPLETE";
        default: return "UNKNOWN";
    }
}

void printMissionStatus() {
    Serial.print("Depth: ");
    Serial.print(currentDepth, 2);
    Serial.print("m | Pressure: ");
    Serial.print(pressureValue, 2);
    Serial.print(" PSI | Phase: ");
    Serial.print(getPhaseString(currentPhase));
    Serial.print(" | Profile: ");
    Serial.print((currentPhase <= FIRST_AT_SURFACE) ? "1" : "2");
    Serial.print(" | Data Points: ");
    Serial.print((currentPhase <= FIRST_AT_SURFACE) ? firstProfileIndex : secondProfileIndex);
    Serial.print(" | WiFi: ");
    Serial.println(wifiConnected ? "ON" : "OFF");
}

void sendToMongoDB(String data) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);  // Specify the server endpoint
    http.addHeader("Content-Type", "application/json"); 
    
    // Send the POST request with the data payload
    int httpResponseCode = http.POST(data);
    
    if (httpResponseCode > 0) {
      Serial.print("Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end(); // Free resources
  } else {
    Serial.println("WiFi Disconnected - Cannot send data");
  }
}