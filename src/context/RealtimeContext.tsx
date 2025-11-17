import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useEventContext } from './EventContext';
import { useAlertContext } from './AlertContext';

export interface RealtimeData {
  weather: {
    condition: string;
    temperature: number;
    rain_probability: number;
    wind_speed: number;
  };
  crowd: {
    current_attendance: number;
    overall_status: string;
  };
  transport: Array<{
    type: string;
    location: string;
    status: string;
    delay?: number;
  }>;
  gates: Array<{
    gate_id: string;
    gate_name: string;
    status: string;
    current_queue: number;
    wait_time: number;
    capacity: number;
  }>;
}

interface RealtimeContextType {
  realtimeData: RealtimeData | null;
  status: 'LIVE' | 'UPLOADED' | 'SIMULATED';
  startSimulation: () => void;
  stopSimulation: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { eventData, hasData } = useEventContext();
  const { addAlert } = useAlertContext();
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [status, setStatus] = useState<'LIVE' | 'UPLOADED' | 'SIMULATED'>('SIMULATED');
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const [alertInterval, setAlertInterval] = useState<NodeJS.Timeout | null>(null);

  const generateSimulatedData = (): RealtimeData => {
    const baseAttendance = 23000;
    const attendanceVariation = Math.floor(Math.random() * 2000) - 1000;
    const currentAttendance = Math.max(0, baseAttendance + attendanceVariation);

    return {
      weather: {
        condition: ['Partly Cloudy', 'Cloudy', 'Clear'][Math.floor(Math.random() * 3)],
        temperature: 26 + Math.floor(Math.random() * 6),
        rain_probability: 30 + Math.floor(Math.random() * 30),
        wind_speed: 8 + Math.floor(Math.random() * 10)
      },
      crowd: {
        current_attendance: currentAttendance,
        overall_status: currentAttendance > 25000 ? 'caution' : 'normal'
      },
      transport: [
        {
          type: 'LRT',
          location: 'Bukit Jalil Station',
          status: Math.random() > 0.8 ? 'delayed' : 'normal',
          delay: Math.random() > 0.8 ? 5 + Math.floor(Math.random() * 10) : undefined
        },
        {
          type: 'Bus Shuttle',
          location: 'Main Parking',
          status: 'normal'
        }
      ],
      gates: eventData?.gates.map(gate => {
        const baseQueue = Math.floor(Math.random() * 1000);
        const waitTime = Math.ceil(baseQueue / (gate.capacity_per_hour / 60));
        const status = waitTime > 20 ? 'critical' : waitTime > 10 ? 'caution' : 'normal';
        
        return {
          gate_id: gate.gate_id,
          gate_name: gate.gate_name,
          status,
          current_queue: baseQueue,
          wait_time: waitTime,
          capacity: gate.capacity_per_hour
        };
      }) || []
    };
  };

  const generateRandomAlert = () => {
    const alertTypes = [
      {
        title: 'Gate Congestion Alert',
        message: '🚨 Gate A overcrowded (6,500 waiting). Action: Redirect 20% to Gate C. [Map]',
        severity: 'warning' as const,
        category: 'Crowd Management',
        location: 'Gate A',
        actions: ['Redirect 20% of crowd to Gate C', 'Open additional screening lanes', 'Deploy staff for crowd control'],
        mapLink: 'https://maps.google.com/?q=3.0485,101.6795'
      },
      {
        title: 'Weather Alert',
        message: '🌧️ Rain detected at 20:05. Action: Guide crowd indoors to concourses. Delay performer 10 min.',
        severity: 'warning' as const,
        category: 'Weather',
        location: 'Stadium Grounds',
        actions: ['Move crowd to covered areas', 'Delay outdoor activities', 'Announce shelter procedures'],
        mapLink: 'https://maps.google.com/?q=3.0480,101.6800'
      },
      {
        title: 'Transport Delay',
        message: '🚇 LRT service delayed by 15 minutes. Consider shuttle alternatives.',
        severity: 'info' as const,
        category: 'Transport',
        location: 'Bukit Jalil Station',
        actions: ['Activate shuttle bus service', 'Extend parking capacity', 'Update attendees'],
        mapLink: 'https://maps.google.com/?q=3.0470,101.6810'
      },
      {
        title: 'Emergency Exit Clear',
        message: '🚪 Emergency exits tested and clear. All systems operational.',
        severity: 'info' as const,
        category: 'Safety',
        location: 'All Exit Points',
        actions: ['Continue monitoring', 'Maintain clear pathways', 'Update emergency procedures'],
        mapLink: 'https://maps.google.com/?q=3.0480,101.6800'
      }
    ];

    const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    addAlert(randomAlert);
  };

  const startSimulation = () => {
    if (!hasData) return;
    
    setStatus('SIMULATED');
    const interval = setInterval(() => {
      setRealtimeData(generateSimulatedData());
    }, 3000);
    
    // Generate random alerts every 15-30 seconds
    const alertGenInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of generating an alert
        generateRandomAlert();
      }
    }, 15000 + Math.random() * 15000);
    
    setSimulationInterval(interval);
    setAlertInterval(alertGenInterval);
    setRealtimeData(generateSimulatedData());
  };

  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    if (alertInterval) {
      clearInterval(alertInterval);
      setAlertInterval(null);
    }
  };

  useEffect(() => {
    if (hasData) {
      startSimulation();
    }
    
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      if (alertInterval) {
        clearInterval(alertInterval);
      }
    };
  }, [hasData]);

  return (
    <RealtimeContext.Provider value={{
      realtimeData,
      status,
      startSimulation,
      stopSimulation
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeContext = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
};