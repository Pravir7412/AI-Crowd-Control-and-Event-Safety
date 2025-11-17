import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface EventData {
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
}

interface EventContextType {
  eventData: EventData | null;
  hasData: boolean;
  loadSampleData: () => Promise<void>;
  uploadEventData: (data: EventData) => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const sampleData: EventData = {
  event_name: "Bukit Jalil Mock Concert",
  location_name: "Bukit Jalil National Stadium",
  expected_attendance: 50000,
  event_start_datetime: "2025-10-10T19:30:00",
  event_end_datetime: "2025-10-10T23:30:00",
  gates: [
    { gate_id: "A", gate_name: "Gate A - North", capacity_per_hour: 2000, gps: "3.0485, 101.6795" },
    { gate_id: "B", gate_name: "Gate B - East", capacity_per_hour: 3000, gps: "3.0475, 101.6805" },
    { gate_id: "C", gate_name: "Gate C - South", capacity_per_hour: 2500, gps: "3.0475, 101.6795" },
    { gate_id: "D", gate_name: "Gate D - West", capacity_per_hour: 2500, gps: "3.0485, 101.6795" }
  ],
  transport_schedule: [
    { transport_type: "LRT", stop_name: "Bukit Jalil Station", arrival_datetime: "2025-10-10T19:10:00", est_capacity: 1500 },
    { transport_type: "LRT", stop_name: "Bukit Jalil Station", arrival_datetime: "2025-10-10T19:25:00", est_capacity: 1800 },
    { transport_type: "LRT", stop_name: "Bukit Jalil Station", arrival_datetime: "2025-10-10T19:40:00", est_capacity: 1600 },
    { transport_type: "Bus Shuttle", stop_name: "Main Parking", arrival_datetime: "2025-10-10T19:15:00", est_capacity: 800 }
  ],
  parking_capacity: 15000,
  weather_forecast: "Cloudy, 40% chance of rain after 20:00"
};

export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [eventData, setEventData] = useState<EventData | null>(null);

  // Do not auto-load sample; show Data Analyzer first. Sample remains available via loadSampleData().

  const loadSampleData = async (): Promise<void> => {
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEventData(sampleData);
  };

  const uploadEventData = async (data: EventData): Promise<void> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEventData(data);
  };

  return (
    <EventContext.Provider value={{
      eventData,
      hasData: !!eventData,
      loadSampleData,
      uploadEventData
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
};