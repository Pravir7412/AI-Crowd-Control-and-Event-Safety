// Data Format Converter for Real-time Simulation
// Handles conversion between different data formats to the standard EventData format

export interface CrowdSimulationData {
  Person_ID: number;
  Time: string;
  Scenario_Type: string;
  Gate_Zone_ID: string;
  Seat_Zone: string;
  Transport_Mode: string;
  Transport_Arrival: string;
  Weather: string;
  Gate_Capacity: number;
  Expected_Arrivals: number;
  Actual_Arrivals: number;
  Queue_Length: number;
  Density: number;
  Hotspot_Label: string;
  Evacuation_Time: number;
  Recommended_Action: string;
  Venue: string;
}

export interface ConvertedEventData {
  event_name: string;
  location_name: string;
  expected_attendance: number;
  event_start_datetime: string;
  event_end_datetime: string;
  gates: Array<{
    gate_id: string;
    gate_name: string;
    capacity_per_hour: number;
    gps?: string;
  }>;
  transport_schedule: Array<{
    transport_type: string;
    stop_name: string;
    arrival_datetime: string;
    est_capacity?: number;
  }>;
  parking_capacity?: number;
  weather_forecast?: string;
  crowd_simulation_data?: CrowdSimulationData[];
}

export class DataFormatConverter {
  /**
   * Convert crowd simulation dataset to event data format
   */
  static convertCrowdSimulationData(data: CrowdSimulationData[]): ConvertedEventData {
    if (!data || data.length === 0) {
      throw new Error('No crowd simulation data provided');
    }

    // Clean and normalize data first
    const cleanedData = this.cleanAndNormalizeData(data);

    // Extract unique values and calculate statistics
    const uniqueVenues = [...new Set(cleanedData.map(d => d.Venue))];
    const uniqueGates = [...new Set(cleanedData.map(d => d.Gate_Zone_ID))];
    const uniqueScenarios = [...new Set(cleanedData.map(d => d.Scenario_Type))];
    const uniqueTransportModes = [...new Set(cleanedData.map(d => d.Transport_Mode))];
    
    // Calculate attendance based on actual arrivals
    const totalAttendance = cleanedData.reduce((sum, d) => sum + (d.Actual_Arrivals || 0), 0);
    const maxAttendance = Math.max(...cleanedData.map(d => d.Actual_Arrivals || 0));
    
    // Extract and normalize time range
    const times = this.extractAndNormalizeTimes(cleanedData);
    const startTime = times[0];
    const endTime = times[times.length - 1];
    
    // Create gates from unique gate/zone IDs
    const gates = uniqueGates.map((gateId, index) => {
      const gateData = data.find(d => d.Gate_Zone_ID === gateId);
      const capacity = gateData?.Gate_Capacity || 1000;
      
      return {
        gate_id: gateId,
        gate_name: `Gate ${gateId}`,
        capacity_per_hour: capacity,
        gps: this.generateGPSForGate(gateId, index)
      };
    });

    // Create transport schedule from transport data
    const transportSchedule = this.createTransportSchedule(data, uniqueTransportModes);

    // Determine weather forecast from weather data
    const weatherForecast = this.determineWeatherForecast(data);

    return {
      event_name: `Crowd Simulation Event - ${uniqueVenues[0]}`,
      location_name: uniqueVenues[0] || 'Unknown Venue',
      expected_attendance: Math.max(totalAttendance, maxAttendance),
      event_start_datetime: startTime.toISOString(),
      event_end_datetime: endTime.toISOString(),
      gates,
      transport_schedule: transportSchedule,
      parking_capacity: Math.floor(totalAttendance * 0.3), // 30% parking assumption
      weather_forecast,
      crowd_simulation_data: data
    };
  }

  /**
   * Convert Excel format to event data
   */
  static convertExcelData(data: any): ConvertedEventData {
    // Handle different Excel sheet structures
    if (data.sheets && data.sheets.Crowd_Simulation) {
      // Crowd simulation format
      return this.convertCrowdSimulationData(data.sheets.Crowd_Simulation);
    } else if (data.event_name) {
      // Direct event data format
      return this.ensureRequiredFields(data);
    } else {
      throw new Error('Unrecognized Excel format');
    }
  }

  /**
   * Convert CSV data to event format
   */
  static convertCSVData(csvText: string): ConvertedEventData {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse CSV with proper handling of quoted values and commas
    const parsedLines = this.parseCSVLines(lines);
    const headers = parsedLines[0];
    
    // Check if it's crowd simulation format (flexible header matching)
    const hasPersonId = headers.some(h => this.normalizeFieldName(h).includes('person'));
    const hasScenario = headers.some(h => this.normalizeFieldName(h).includes('scenario'));
    const hasGate = headers.some(h => this.normalizeFieldName(h).includes('gate'));
    
    if (hasPersonId && hasScenario && hasGate) {
      // Crowd simulation format
      const crowdData: CrowdSimulationData[] = parsedLines.slice(1).map(line => {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = line[index]?.trim() || '';
        });
        return row as CrowdSimulationData;
      });
      return this.convertCrowdSimulationData(crowdData);
    } else {
      // Simple CSV format - try to extract event data
      const data: any = {};
      parsedLines.slice(1).forEach(line => {
        if (line.length >= 2) {
          const key = line[0]?.trim();
          const value = line[1]?.trim();
          if (key && value) {
            data[this.normalizeFieldName(key)] = value;
          }
        }
      });
      return this.ensureRequiredFields(data);
    }
  }

  /**
   * Parse CSV lines handling quoted values and commas
   */
  private static parseCSVLines(lines: string[]): string[][] {
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    });
  }

  /**
   * Convert JSON data to event format
   */
  static convertJSONData(jsonData: any): ConvertedEventData {
    if (Array.isArray(jsonData)) {
      // Check if it's crowd simulation data
      if (jsonData.length > 0 && jsonData[0].Person_ID) {
        return this.convertCrowdSimulationData(jsonData as CrowdSimulationData[]);
      } else {
        throw new Error('Unrecognized JSON array format');
      }
    } else if (jsonData.event_name) {
      return this.ensureRequiredFields(jsonData);
    } else {
      throw new Error('Unrecognized JSON format');
    }
  }

  /**
   * Convert text format to event format
   */
  static convertTextData(textData: string): ConvertedEventData {
    const lines = textData.split('\n').filter(line => line.trim());
    const data: any = {};

    lines.forEach(line => {
      if (line.includes('Event Name:')) {
        data.event_name = line.split('Event Name:')[1].trim();
      } else if (line.includes('Location:')) {
        data.location_name = line.split('Location:')[1].trim();
      } else if (line.includes('Attendance:')) {
        data.expected_attendance = parseInt(line.split('Attendance:')[1].trim());
      } else if (line.includes('Start Datetime:')) {
        data.event_start_datetime = line.split('Start Datetime:')[1].trim();
      } else if (line.includes('End Datetime:')) {
        data.event_end_datetime = line.split('End Datetime:')[1].trim();
      } else if (line.includes('Gate ID:')) {
        if (!data.gates) data.gates = [];
        const gateMatch = line.match(/Gate ID: (\w+), Name: ([^,]+), Capacity: (\d+), GPS: ([^,]+), ([^,]+)/);
        if (gateMatch) {
          data.gates.push({
            gate_id: gateMatch[1],
            gate_name: gateMatch[2],
            capacity_per_hour: parseInt(gateMatch[3]),
            gps: `${gateMatch[4]}, ${gateMatch[5]}`
          });
        }
      }
    });

    return this.ensureRequiredFields(data);
  }

  /**
   * Ensure all required fields are present with defaults
   */
  private static ensureRequiredFields(data: any): ConvertedEventData {
    return {
      event_name: data.event_name || 'Uploaded Event',
      location_name: data.location_name || 'Unknown Location',
      expected_attendance: data.expected_attendance || 10000,
      event_start_datetime: data.event_start_datetime || new Date().toISOString(),
      event_end_datetime: data.event_end_datetime || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      gates: data.gates || [
        { gate_id: 'A', gate_name: 'Gate A', capacity_per_hour: 1000, gps: '0, 0' },
        { gate_id: 'B', gate_name: 'Gate B', capacity_per_hour: 1000, gps: '0, 0' }
      ],
      transport_schedule: data.transport_schedule || [],
      parking_capacity: data.parking_capacity || Math.floor((data.expected_attendance || 10000) * 0.3),
      weather_forecast: data.weather_forecast || 'Clear skies'
    };
  }

  /**
   * Create transport schedule from crowd data
   */
  private static createTransportSchedule(data: CrowdSimulationData[], transportModes: string[]) {
    const schedule: any[] = [];
    const timeSlots = [...new Set(data.map(d => d.Time))].sort();
    
    transportModes.forEach(mode => {
      timeSlots.slice(0, 5).forEach(time => { // Limit to first 5 time slots
        const arrivals = data.filter(d => d.Transport_Mode === mode && d.Time === time);
        const totalArrivals = arrivals.reduce((sum, d) => sum + d.Actual_Arrivals, 0);
        
        if (totalArrivals > 0) {
          schedule.push({
            transport_type: mode,
            stop_name: `${mode} Station`,
            arrival_datetime: time,
            est_capacity: totalArrivals
          });
        }
      });
    });

    return schedule;
  }

  /**
   * Determine weather forecast from weather data
   */
  private static determineWeatherForecast(data: CrowdSimulationData[]): string {
    const weatherCounts = data.reduce((acc, d) => {
      acc[d.Weather] = (acc[d.Weather] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonWeather = Object.entries(weatherCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Clear';

    return `${mostCommonWeather} conditions expected`;
  }

  /**
   * Generate GPS coordinates for gates
   */
  private static generateGPSForGate(gateId: string, index: number): string {
    // Generate coordinates around Bukit Jalil Stadium area
    const baseLat = 3.0480;
    const baseLng = 101.6800;
    const offset = index * 0.001; // Small offset for each gate
    
    return `${baseLat + offset}, ${baseLng + offset}`;
  }

  /**
   * Clean and normalize messy data
   */
  private static cleanAndNormalizeData(data: any[]): CrowdSimulationData[] {
    return data.map(row => {
      const cleaned: any = {};
      
      // Handle each field with flexible parsing
      Object.keys(row).forEach(key => {
        const value = row[key];
        const normalizedKey = this.normalizeFieldName(key);
        
        switch (normalizedKey) {
          case 'person_id':
            cleaned.Person_ID = this.parseNumber(value);
            break;
          case 'time':
          case 'timestamp':
          case 'datetime':
            cleaned.Time = this.normalizeDateTime(value);
            break;
          case 'scenario_type':
          case 'scenario':
          case 'type':
            cleaned.Scenario_Type = this.normalizeScenarioType(value);
            break;
          case 'gate_zone_id':
          case 'gate_id':
          case 'zone_id':
          case 'gate':
          case 'zone':
            cleaned.Gate_Zone_ID = this.normalizeGateId(value);
            break;
          case 'seat_zone':
          case 'seat':
            cleaned.Seat_Zone = this.normalizeSeatZone(value);
            break;
          case 'transport_mode':
          case 'transport':
          case 'mode':
            cleaned.Transport_Mode = this.normalizeTransportMode(value);
            break;
          case 'transport_arrival':
          case 'arrival':
            cleaned.Transport_Arrival = this.normalizeTransportArrival(value);
            break;
          case 'weather':
            cleaned.Weather = this.normalizeWeather(value);
            break;
          case 'gate_capacity':
          case 'capacity':
            cleaned.Gate_Capacity = this.parseNumber(value);
            break;
          case 'expected_arrivals':
          case 'expected':
            cleaned.Expected_Arrivals = this.parseNumber(value);
            break;
          case 'actual_arrivals':
          case 'actual':
            cleaned.Actual_Arrivals = this.parseNumber(value);
            break;
          case 'queue_length':
          case 'queue':
            cleaned.Queue_Length = this.parseNumber(value);
            break;
          case 'density':
            cleaned.Density = this.parseNumber(value);
            break;
          case 'hotspot_label':
          case 'hotspot':
            cleaned.Hotspot_Label = this.normalizeHotspotLabel(value);
            break;
          case 'evacuation_time':
          case 'evac_time':
            cleaned.Evacuation_Time = this.parseNumber(value);
            break;
          case 'recommended_action':
          case 'action':
          case 'recommendation':
            cleaned.Recommended_Action = this.normalizeAction(value);
            break;
          case 'venue':
          case 'location':
            cleaned.Venue = this.normalizeVenue(value);
            break;
        }
      });
      
      return cleaned as CrowdSimulationData;
    });
  }

  /**
   * Extract and normalize time data from messy formats
   */
  private static extractAndNormalizeTimes(data: CrowdSimulationData[]): Date[] {
    const times: Date[] = [];
    
    data.forEach(row => {
      if (row.Time) {
        const normalizedTime = this.normalizeDateTime(row.Time);
        if (normalizedTime) {
          const date = new Date(normalizedTime);
          if (!isNaN(date.getTime())) {
            times.push(date);
          }
        }
      }
    });
    
    return times.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Normalize field names to handle variations
   */
  private static normalizeFieldName(fieldName: string): string {
    return fieldName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Parse numbers with various formats
   */
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove commas, spaces, and other formatting
      const cleaned = value.replace(/[,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Normalize date/time formats
   */
  private static normalizeDateTime(value: any): string {
    if (!value) return '';
    
    const str = String(value).trim();
    
    // Handle various date formats
    const datePatterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2})/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = str.match(pattern);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }
    }
    
    // Try to parse as-is
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return str;
  }

  /**
   * Normalize scenario types
   */
  private static normalizeScenarioType(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'entry': 'Entry',
      'entry_rush': 'Entry',
      'arrival': 'Entry',
      'mid_event': 'MidEvent',
      'mid': 'MidEvent',
      'congestion': 'MidEvent',
      'exit': 'Exit',
      'departure': 'Exit',
      'emergency': 'Emergency',
      'evacuation': 'Emergency',
      'disruption': 'Disruption',
      'delay': 'Disruption'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize gate IDs
   */
  private static normalizeGateId(value: any): string {
    const str = String(value).trim();
    // Extract gate identifier from various formats
    const gateMatch = str.match(/(gate\s*)?([a-z0-9]+)/i);
    return gateMatch ? gateMatch[2].toUpperCase() : str;
  }

  /**
   * Normalize seat zones
   */
  private static normalizeSeatZone(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'vip': 'VIP',
      'lower': 'LowerDeck',
      'upper': 'UpperDeck',
      'zone1': 'Zone1',
      'zone2': 'Zone2',
      'zone3': 'Zone3'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize transport modes
   */
  private static normalizeTransportMode(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'car': 'Car',
      'train': 'Train',
      'lrt': 'Train',
      'bus': 'Bus',
      'walk': 'Walk',
      'walking': 'Walk'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize transport arrival
   */
  private static normalizeTransportArrival(value: any): string {
    if (!value) return 'Unknown';
    return String(value).trim();
  }

  /**
   * Normalize weather conditions
   */
  private static normalizeWeather(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'clear': 'Clear',
      'sunny': 'Clear',
      'rain': 'Rain',
      'raining': 'Rain',
      'storm': 'Storm',
      'stormy': 'Storm',
      'cloudy': 'Cloudy',
      'overcast': 'Cloudy'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize hotspot labels
   */
  private static normalizeHotspotLabel(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'critical': 'High',
      'normal': 'Low'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize recommended actions
   */
  private static normalizeAction(value: any): string {
    const str = String(value).toLowerCase().trim();
    const mappings: Record<string, string> = {
      'open_extra_gate': 'OpenExtraGate',
      'delay_start': 'DelayStart',
      'redirect_crowd': 'RedirectCrowd',
      'deploy_staff': 'DeployStaff',
      'advise_shelter': 'AdviseShelter',
      'close_gate': 'CloseGate',
      'monitor': 'Monitor'
    };
    
    return mappings[str] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Normalize venue names
   */
  private static normalizeVenue(value: any): string {
    const str = String(value).trim();
    return str || 'Unknown Venue';
  }

  /**
   * Validate converted data
   */
  static validateConvertedData(data: ConvertedEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.event_name) errors.push('Event name is required');
    if (!data.location_name) errors.push('Location name is required');
    if (!data.expected_attendance || data.expected_attendance <= 0) {
      errors.push('Expected attendance must be greater than 0');
    }
    if (!data.event_start_datetime) errors.push('Start datetime is required');
    if (!data.event_end_datetime) errors.push('End datetime is required');
    if (!data.gates || data.gates.length === 0) {
      errors.push('At least one gate is required');
    }

    if (data.event_start_datetime && data.event_end_datetime) {
      const start = new Date(data.event_start_datetime);
      const end = new Date(data.event_end_datetime);
      if (start >= end) {
        errors.push('End time must be after start time');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
