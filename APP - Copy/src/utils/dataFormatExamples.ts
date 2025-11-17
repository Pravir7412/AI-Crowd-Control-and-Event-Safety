// Examples of messy data formats that the enhanced converter can handle

export const messyDataExamples = {
  // Example 1: Jumbled CSV with inconsistent headers
  jumbledCSV: `"Person ID","Time Stamp","Gate/Zone","Scenario","Transport","Weather","Capacity","Arrivals"
1,"2025-10-10 19:30","Gate A","Entry","Car","Clear",2000,150
2,"2025-10-10 19:35","Gate B","Entry","Train","Clear",2500,200
3,"2025-10-10 19:40","Gate C","MidEvent","Bus","Rain",1800,120`,

  // Example 2: Mixed date formats
  mixedDateFormats: `Person_ID,Time,Scenario_Type,Gate_Zone_ID
1,10/10/2025 19:30,Entry,Gate A
2,2025-10-10T19:35:00,MidEvent,Gate B
3,10-10-2025 19:40,Exit,Gate C`,

  // Example 3: Inconsistent column names
  inconsistentHeaders: `ID,Timestamp,Zone,Type,Mode,Weather_Status,Cap,Actual_Count
1,2025-10-10 19:30,Gate A,Entry,Car,Clear,2000,150
2,2025-10-10 19:35,Gate B,MidEvent,Train,Rain,2500,200`,

  // Example 4: Mixed data types in same column
  mixedDataTypes: `Person_ID,Time,Scenario_Type,Gate_Zone_ID,Capacity,Arrivals
1,"2025-10-10 19:30",Entry,"Gate A","2,000",150
2,"2025-10-10 19:35",MidEvent,"Gate B",2500,"200"
3,"2025-10-10 19:40",Exit,"Gate C",1.8e3,120`,

  // Example 5: Text file with inconsistent formatting
  messyTextFile: `Event Name: Amazon Hackathon Concert
Location: Bukit Jalil Stadium  
Attendance: 75,000
Start Datetime: 2025-12-10T19:00:00
End Datetime: 2025-12-10T23:00:00

Gate ID: A, Name: Main Entrance A, Capacity: 8,000, GPS: 3.0560, 101.6997
Gate ID: B, Name: North Gate B, Capacity: 6,000, GPS: 3.0550, 101.6990
Gate ID: C, Name: South Gate C, Capacity: 6,000, GPS: 3.0545, 101.7005`,

  // Example 6: JSON with inconsistent field names
  inconsistentJSON: {
    "event_name": "Concert Event",
    "venue": "Bukit Jalil Stadium",
    "expected_attendance": 50000,
    "start_time": "2025-10-10T19:30:00",
    "end_time": "2025-10-10T23:30:00",
    "gates": [
      {
        "id": "A",
        "name": "Gate A",
        "capacity": 2000,
        "coordinates": "3.0485, 101.6795"
      }
    ],
    "transportation": [
      {
        "type": "LRT",
        "station": "Bukit Jalil Station",
        "arrival": "2025-10-10T19:10:00",
        "capacity": 1500
      }
    ]
  }
};

// Test cases for the enhanced converter
export const testCases = {
  // Test case 1: Handles jumbled columns
  testJumbledColumns: () => {
    const csvData = `"ID","Time","Gate","Type","Mode","Weather"
1,"2025-10-10 19:30","Gate A","Entry","Car","Clear"
2,"2025-10-10 19:35","Gate B","MidEvent","Train","Rain"`;
    
    // Should work even though columns are in different order
    return DataFormatConverter.convertCSVData(csvData);
  },

  // Test case 2: Handles mixed date formats
  testMixedDateFormats: () => {
    const csvData = `Person_ID,Time,Scenario_Type
1,10/10/2025 19:30,Entry
2,2025-10-10T19:35:00,MidEvent
3,10-10-2025 19:40,Exit`;
    
    // Should normalize all date formats
    return DataFormatConverter.convertCSVData(csvData);
  },

  // Test case 3: Handles inconsistent field names
  testInconsistentFieldNames: () => {
    const jsonData = {
      "event_name": "Test Event",
      "venue": "Test Stadium",
      "expected_attendance": 10000,
      "start_time": "2025-10-10T19:30:00", // Note: start_time instead of event_start_datetime
      "end_time": "2025-10-10T23:30:00",   // Note: end_time instead of event_end_datetime
      "gates": [
        {
          "id": "A",
          "name": "Gate A",
          "capacity": 1000
        }
      ]
    };
    
    // Should map inconsistent field names to standard format
    return DataFormatConverter.convertJSONData(jsonData);
  }
};

// Utility function to demonstrate robust parsing
export const demonstrateRobustParsing = () => {
  console.log("=== Enhanced Data Format Converter Demo ===");
  
  // Test 1: Jumbled CSV
  console.log("\n1. Testing jumbled CSV columns:");
  try {
    const result1 = DataFormatConverter.convertCSVData(messyDataExamples.jumbledCSV);
    console.log("✅ Successfully parsed jumbled CSV");
    console.log("Event:", result1.event_name);
    console.log("Gates:", result1.gates.length);
  } catch (error) {
    console.log("❌ Failed to parse jumbled CSV:", error);
  }

  // Test 2: Mixed date formats
  console.log("\n2. Testing mixed date formats:");
  try {
    const result2 = DataFormatConverter.convertCSVData(messyDataExamples.mixedDateFormats);
    console.log("✅ Successfully parsed mixed date formats");
    console.log("Start time:", result2.event_start_datetime);
    console.log("End time:", result2.event_end_datetime);
  } catch (error) {
    console.log("❌ Failed to parse mixed date formats:", error);
  }

  // Test 3: Inconsistent JSON
  console.log("\n3. Testing inconsistent JSON:");
  try {
    const result3 = DataFormatConverter.convertJSONData(messyDataExamples.inconsistentJSON);
    console.log("✅ Successfully parsed inconsistent JSON");
    console.log("Event:", result3.event_name);
    console.log("Location:", result3.location_name);
  } catch (error) {
    console.log("❌ Failed to parse inconsistent JSON:", error);
  }

  // Test 4: Messy text file
  console.log("\n4. Testing messy text file:");
  try {
    const result4 = DataFormatConverter.convertTextData(messyDataExamples.messyTextFile);
    console.log("✅ Successfully parsed messy text file");
    console.log("Event:", result4.event_name);
    console.log("Attendance:", result4.expected_attendance);
    console.log("Gates:", result4.gates.length);
  } catch (error) {
    console.log("❌ Failed to parse messy text file:", error);
  }
};
