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
  refreshWeather: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { eventData } = useEventContext();
  const { addAlert } = useAlertContext();
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [status, setStatus] = useState<'LIVE' | 'UPLOADED' | 'SIMULATED'>('SIMULATED');
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const [alertInterval, setAlertInterval] = useState<NodeJS.Timeout | null>(null);
  const [weatherSeed, setWeatherSeed] = useState<number>(Math.random()); // Seed for consistent weather

  const generateSimulatedData = (): RealtimeData => {
    // Use event data if available, otherwise use defaults
    const baseAttendance = eventData?.expected_attendance || 23000;
    const attendanceVariation = Math.floor(Math.random() * (baseAttendance * 0.1)) - (baseAttendance * 0.05);
    const currentAttendance = Math.max(0, baseAttendance + attendanceVariation);

    // Stable weather simulation - only change gradually
    const currentHour = new Date().getHours();
    const baseTemperature = 28 + Math.sin((currentHour - 6) * Math.PI / 12) * 3; // 25-31°C range
    const baseRainProbability = currentHour >= 18 ? 60 : 30; // Higher rain chance in evening
    
    // Use seed for consistent weather variations
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Add small random variations (not dramatic changes)
    const temperature = Math.round(baseTemperature + (seededRandom(weatherSeed + currentHour) - 0.5) * 1); // ±0.5°C variation
    const rainProbability = Math.max(0, Math.min(100, baseRainProbability + (seededRandom(weatherSeed + currentHour + 100) - 0.5) * 5)); // ±2.5% variation
    
    // Determine weather condition based on rain probability
    let weatherCondition = 'Clear';
    if (rainProbability > 70) weatherCondition = 'Rain';
    else if (rainProbability > 50) weatherCondition = 'Cloudy';
    else if (rainProbability > 30) weatherCondition = 'Partly Cloudy';
    
    // Location-specific adjustments
    let finalTemperature = temperature;
    let finalRainProbability = rainProbability;
    let finalWeatherCondition = weatherCondition;
    
    if (eventData?.location_name === 'Bukit Jalil National Stadium') {
        // Bukit Jalil tends to be slightly warmer and more humid
        finalTemperature = Math.max(28, temperature + 1);
        finalRainProbability = Math.min(100, rainProbability + 10);
        finalWeatherCondition = finalRainProbability > 60 ? 'Rain' : weatherCondition;
    } else if (eventData?.location_name === 'Merdeka Square') {
        // Merdeka Square tends to be slightly cooler
        finalTemperature = Math.max(25, temperature - 1);
    }

    return {
      weather: {
        condition: finalWeatherCondition,
        temperature: finalTemperature,
        rain_probability: finalRainProbability,
        wind_speed: 8 + Math.floor(Math.random() * 5)
      },
      crowd: {
        current_attendance: currentAttendance,
        overall_status: currentAttendance > (baseAttendance * 0.8) ? 'caution' : 'normal'
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
      }) || [
        { gate_id: 'A', gate_name: 'Gate A', status: 'normal', current_queue: 150, wait_time: 5, capacity: 2000 },
        { gate_id: 'B', gate_name: 'Gate B', status: 'caution', current_queue: 300, wait_time: 12, capacity: 2500 },
        { gate_id: 'C', gate_name: 'Gate C', status: 'normal', current_queue: 200, wait_time: 8, capacity: 2000 },
        { gate_id: 'D', gate_name: 'Gate D', status: 'normal', current_queue: 100, wait_time: 4, capacity: 2500 }
      ]
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
    setStatus('SIMULATED');
    const interval = setInterval(() => {
      setRealtimeData(generateSimulatedData());
    }, 10000); // Update every 10 seconds instead of 3 seconds
    
    // Update weather seed every 5 minutes for gradual changes
    const weatherSeedInterval = setInterval(() => {
      setWeatherSeed(prev => prev + 0.1); // Small increment for gradual change
    }, 300000); // 5 minutes
    
    // Generate random alerts every 15-30 seconds
    const alertGenInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of generating an alert
        generateRandomAlert();
      }
    }, 15000 + Math.random() * 15000);
    
    setSimulationInterval(interval);
    setAlertInterval(alertGenInterval);
    setRealtimeData(generateSimulatedData());
    
    // Store weather seed interval for cleanup
    (window as any).weatherSeedInterval = weatherSeedInterval;
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
    if ((window as any).weatherSeedInterval) {
      clearInterval((window as any).weatherSeedInterval);
    }
  };

  const refreshWeather = async () => {
    // Increment seed to change weather gradually and refresh data immediately
    setWeatherSeed(prev => prev + 1);
    setRealtimeData(generateSimulatedData());
  };

  useEffect(() => {
    // Start simulation immediately, even without event data
    startSimulation();
    
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      if (alertInterval) {
        clearInterval(alertInterval);
      }
      if ((window as any).weatherSeedInterval) {
        clearInterval((window as any).weatherSeedInterval);
      }
    };
  }, []); // Remove hasData dependency

  return (
    <RealtimeContext.Provider value={{
      realtimeData,
      status,
      startSimulation,
      stopSimulation,
      refreshWeather
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