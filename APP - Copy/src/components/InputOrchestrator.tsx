import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, MapPin, FileText, Edit3, CheckCircle, AlertCircle, Map, Users, Clock, Calendar, Zap } from 'lucide-react';
import { useEventContext } from '../context/EventContext';
import AnimatedBackground from './AnimatedBackground';

interface EventData {
  event_name: string;
  location_name: string;
  gps: { lat: number; lng: number };
  expected_attendance: number;
  event_start_datetime: string;
  event_end_datetime: string;
  gates: Array<{
    gate_id: string;
    gate_name: string;
    capacity_per_hour: number;
    gps?: string;
  }>;
}

interface ValidationErrors {
  event_name?: string;
  location_name?: string;
  expected_attendance?: string;
  event_start_datetime?: string;
  event_end_datetime?: string;
  gates?: string;
}

const InputOrchestrator: React.FC = () => {
  const { uploadEventData, loadSampleData } = useEventContext();
  const [inputMode, setInputMode] = useState<'select' | 'file' | 'manual' | 'map' | 'confirm'>('select');
  const [eventData, setEventData] = useState<Partial<EventData>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [filePreview, setFilePreview] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [helperTips, setHelperTips] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Known venues database
  const knownVenues = {
    'Bukit Jalil National Stadium': {
      capacity: 50000,
      gates: [
        { gate_id: 'A', gate_name: 'Gate A - North', capacity_per_hour: 2000, gps: '3.0485, 101.6795' },
        { gate_id: 'B', gate_name: 'Gate B - East', capacity_per_hour: 3000, gps: '3.0475, 101.6805' },
        { gate_id: 'C', gate_name: 'Gate C - South', capacity_per_hour: 2500, gps: '3.0475, 101.6795' },
        { gate_id: 'D', gate_name: 'Gate D - West', capacity_per_hour: 2500, gps: '3.0485, 101.6795' }
      ],
      gps: { lat: 3.0480, lng: 101.6800 }
    },
    'Merdeka Square': {
      capacity: 10000,
      gates: [
        { gate_id: 'A', gate_name: 'Main Entrance', capacity_per_hour: 1500, gps: '3.1478, 101.6953' },
        { gate_id: 'B', gate_name: 'Side Entrance', capacity_per_hour: 1000, gps: '3.1475, 101.6950' }
      ],
      gps: { lat: 3.1478, lng: 101.6953 }
    }
  };

  useEffect(() => {
    // Add WhatsApp-style helper tips
    const tips = [
      "📍 Click on the map to pick your venue — no need to type it in!",
      "📂 Upload Excel/PDF files to auto-fill event details",
      "✅ We'll validate everything and suggest missing information",
      "🚪 Known venues come with pre-configured gates and capacities"
    ];
    setHelperTips(tips);
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Parse all relevant sheets
      const attendeesSheet = workbook.Sheets['Attendees'];
      const gateSheet = workbook.Sheets['Gate_Capacity'];
      const timelineSheet = workbook.Sheets['Event_Timeline'];
      const transportSheet = workbook.Sheets['Transport_Schedule'];
      const facilitiesSheet = workbook.Sheets['Facilities'];

      const attendees = attendeesSheet ? XLSX.utils.sheet_to_json(attendeesSheet, { defval: '' }) : [];
      const gates = gateSheet ? XLSX.utils.sheet_to_json(gateSheet, { defval: '' }) : [];
      const timeline = timelineSheet ? XLSX.utils.sheet_to_json(timelineSheet, { defval: '' }) : [];
      const transport = transportSheet ? XLSX.utils.sheet_to_json(transportSheet, { defval: '' }) : [];
      const facilities = facilitiesSheet ? XLSX.utils.sheet_to_json(facilitiesSheet, { defval: '' }) : [];

      // Debug: log all parsed data
      console.log('Attendees:', attendees);
      console.log('Gates:', gates);
      console.log('Timeline:', timeline);
      console.log('Transport:', transport);
      console.log('Facilities:', facilities);

      // Map to dashboard fields
      const expected_attendance = attendees.length;
      const event_start_datetime = timeline[0]?.Start_Time || '';
      const event_end_datetime = timeline[timeline.length - 1]?.End_Time || '';
      // Use a default event name and location for now
      const event_name = 'Imported Event';
      const location_name = 'Imported Location';

      // Normalize gate columns for robust mapping
      const gatesData = gates.map((g: any, idx: number) => {
        // Log the gate row for debugging
        console.log('Gate row:', g);
        // Normalize keys: lowercase, remove non-alphanumeric
        const keys = Object.keys(g).reduce((acc, key) => {
          acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = key;
          return acc;
        }, {} as Record<string, string>);
        // Find gate id key
        const gateIdKey = keys['gate'] || Object.values(keys).find(k => k.toLowerCase().includes('gate')) || '';
        // Find any key containing both 'throughput' and 'min'
        const throughputKey = Object.values(keys).find(k => {
          const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return norm.includes('throughput') && norm.includes('min');
        }) || '';
        return {
          gate_id: g[gateIdKey] || `Gate${idx+1}`,
          gate_name: g[gateIdKey] || `Gate${idx+1}`,
          capacity_per_hour: g[throughputKey] ? Number(g[throughputKey]) * 60 : 0
        };
      });

      // Map transport
      const transport_schedule = transport.map((t: any) => ({
        transport_type: t.Mode || '',
        stop_name: t.Route || '',
        arrival_datetime: t.Arrival_Time || '',
        est_capacity: t.Capacity ? Number(t.Capacity) : undefined
      }));

      // Compose event data
      const eventDataFromExcel = {
        event_name,
        location_name,
        expected_attendance,
        event_start_datetime,
        event_end_datetime,
        gates: gatesData,
        transport_schedule
      };

      setFilePreview(eventDataFromExcel);
      setEventData(prev => ({ ...prev, ...eventDataFromExcel }));
      setInputMode('manual');
      setAssumptions(prev => [...prev, 'Data loaded from Excel upload']);
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocationSelect = (locationName: string, gps: { lat: number; lng: number }) => {
    const venue = knownVenues[locationName as keyof typeof knownVenues];
    
    if (venue) {
      setEventData(prev => ({
        ...prev,
        location_name: locationName,
        gps: venue.gps,
        expected_attendance: venue.capacity,
        gates: venue.gates
      }));
      
      setAssumptions(prev => [...prev, `Using known capacity ${venue.capacity} for ${locationName}`]);
      setHelperTips(prev => [...prev, `📍 Location selected: ${locationName}. Known capacity=${venue.capacity.toLocaleString()}, gates A–D suggested. Please confirm or edit.`]);
    } else {
      setEventData(prev => ({
        ...prev,
        location_name: locationName,
        gps: gps,
        gates: [
          { gate_id: 'A', gate_name: 'Gate A', capacity_per_hour: 1000, gps: `${gps.lat}, ${gps.lng}` },
          { gate_id: 'B', gate_name: 'Gate B', capacity_per_hour: 1000, gps: `${gps.lat}, ${gps.lng}` }
        ]
      }));
      
      setAssumptions(prev => [...prev, `Unknown venue - using default gate configuration`]);
    }
    
    setInputMode('manual');
  };

  const validateEventData = (data: Partial<EventData>): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    if (!data.event_name?.trim()) errors.event_name = 'Event name is required';
    if (!data.location_name?.trim()) errors.location_name = 'Location is required';
    if (!data.expected_attendance || data.expected_attendance <= 0) {
      errors.expected_attendance = 'Attendance must be greater than 0';
    }
    if (!data.event_start_datetime) errors.event_start_datetime = 'Start time is required';
    if (!data.event_end_datetime) errors.event_end_datetime = 'End time is required';
    
    if (data.event_start_datetime && data.event_end_datetime) {
      const start = new Date(data.event_start_datetime);
      const end = new Date(data.event_end_datetime);
      if (start >= end) {
        errors.event_end_datetime = 'End time must be after start time';
      }
    }
    
    if (!data.gates || data.gates.length === 0) {
      errors.gates = 'At least one gate is required';
    } else {
      const invalidGates = data.gates.some(gate => 
        !gate.gate_id || !gate.gate_name || !gate.capacity_per_hour || gate.capacity_per_hour <= 0
      );
      if (invalidGates) {
        errors.gates = 'All gates must have valid ID, name, and capacity';
      }
    }
    
    return errors;
  };

  const handleProceedToSimulation = async () => {
    const errors = validateEventData(eventData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      // Convert to the format expected by EventContext
      const formattedData = {
        event_name: eventData.event_name!,
        location_name: eventData.location_name!,
        expected_attendance: eventData.expected_attendance!,
        event_start_datetime: eventData.event_start_datetime!,
        event_end_datetime: eventData.event_end_datetime!,
        gates: eventData.gates!,
        transport_schedule: [], // Will be populated by simulation
        parking_capacity: Math.floor(eventData.expected_attendance! * 0.3), // Assume 30% parking
        weather_forecast: 'Cloudy, 40% chance of rain after 20:00'
      };
      
      await uploadEventData(formattedData as any);
    }
  };

  const renderModeSelection = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold gradient-text mb-4 slide-in-up">AI Input Orchestrator</h2>
        <p className="text-xl text-white/80 slide-in-up" style={{ animationDelay: '0.2s' }}>
          Choose how you'd like to set up your event data
        </p>
      </div>

      {/* Helper Tips */}
      <div className="mb-8 glass rounded-xl p-6 slide-in-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center">
          <span className="text-2xl mr-2">💡</span>
          Quick Tips
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {helperTips.map((tip, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <p className="text-white/90 text-sm">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sample Data */}
        <div className="glass rounded-xl p-6 border-2 border-transparent hover:border-orange-400/50 transition-all duration-300 hover-lift slide-in-left" style={{ animationDelay: '0.4s' }}>
          <div className="text-center">
            <div className="relative mb-4">
              <Zap className="h-16 w-16 text-orange-400 mx-auto float" />
              <div className="absolute inset-0 animate-ping">
                <Zap className="h-16 w-16 text-orange-400 opacity-30" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Quick Start</h3>
            <p className="text-white/70 mb-6 text-sm">
              Use Bukit Jalil sample data to demo the system
            </p>
            <button
              onClick={async () => {
                setIsProcessing(true);
                try {
                  await loadSampleData();
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover-lift shadow-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-4 h-4"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                'Load Sample Data'
              )}
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="glass rounded-xl p-6 border-2 border-transparent hover:border-blue-400/50 transition-all duration-300 hover-lift slide-in-left" style={{ animationDelay: '0.5s' }}>
          <div className="text-center">
            <div className="relative mb-4">
              <Upload className="h-16 w-16 text-blue-400 mx-auto float" />
              <div className="absolute inset-0 animate-ping">
                <Upload className="h-16 w-16 text-blue-400 opacity-30" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Upload File</h3>
            <p className="text-white/70 mb-6 text-sm">
              Upload Excel (.xlsx) or PDF (.pdf) with your event details
            </p>
            <button
              onClick={() => {
                setInputMode('file');
                fileInputRef.current?.click();
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover-lift shadow-lg"
            >
              Choose File
            </button>
          </div>
        </div>

        {/* Manual Input */}
        <div className="glass rounded-xl p-6 border-2 border-transparent hover:border-green-400/50 transition-all duration-300 hover-lift slide-in-left" style={{ animationDelay: '0.6s' }}>
          <div className="text-center">
            <div className="relative mb-4">
              <Edit3 className="h-16 w-16 text-green-400 mx-auto float" />
              <div className="absolute inset-0 animate-ping">
                <Edit3 className="h-16 w-16 text-green-400 opacity-30" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Enter Manually</h3>
            <p className="text-white/70 mb-6 text-sm">
              Fill in all event details step by step
            </p>
            <button
              onClick={() => setInputMode('manual')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover-lift shadow-lg"
            >
              Start Manual Entry
            </button>
          </div>
        </div>

        {/* Map Selection */}
        <div className="glass rounded-xl p-6 border-2 border-transparent hover:border-purple-400/50 transition-all duration-300 hover-lift slide-in-left" style={{ animationDelay: '0.7s' }}>
          <div className="text-center">
            <div className="relative mb-4">
              <Map className="h-16 w-16 text-purple-400 mx-auto float" />
              <div className="absolute inset-0 animate-ping">
                <Map className="h-16 w-16 text-purple-400 opacity-30" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Select Location</h3>
            <p className="text-white/70 mb-6 text-sm">
              Click on the map to choose your venue
            </p>
            <button
              onClick={() => setInputMode('map')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover-lift shadow-lg"
            >
              Open Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFileUpload = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="glass rounded-xl p-6">
        <h3 className="text-2xl font-semibold text-white mb-6 gradient-text">Upload Event File</h3>
        
        <div className="border-2 border-dashed border-cyan-400/50 rounded-xl p-8 text-center hover:border-cyan-400 transition-all duration-300">
          <div className="relative mb-4">
            <Upload className="h-12 w-12 text-cyan-400 mx-auto float" />
            <div className="absolute inset-0 animate-ping">
              <Upload className="h-12 w-12 text-cyan-400 opacity-30" />
            </div>
          </div>
          <p className="text-white/80 mb-4">Drag & drop your file here or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-6 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 hover-lift shadow-lg"
          >
            Choose File
          </button>
        </div>

        {isProcessing && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-3 text-cyan-400">
              <div className="spinner"></div>
              <span className="text-lg">Processing file...</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => setInputMode('select')}
            className="flex-1 glass text-white py-3 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );

  const renderMapSelection = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="glass rounded-xl p-6">
        <h3 className="text-2xl font-semibold text-white mb-6 gradient-text">Select Venue Location</h3>
        
        {/* Mock Map Interface */}
        <div className="border-2 border-cyan-400/30 rounded-xl p-8 mb-6 cyber-grid">
          <div className="text-center py-8">
            <div className="relative mb-4">
              <MapPin className="h-16 w-16 text-cyan-400 mx-auto float" />
              <div className="absolute inset-0 animate-ping">
                <MapPin className="h-16 w-16 text-cyan-400 opacity-30" />
              </div>
            </div>
            <p className="text-white/80 mb-4 text-lg">Interactive Map (Google Maps Integration)</p>
            <p className="text-white/60 mb-6">Click on a venue to select it</p>
            
            {/* Mock venue buttons */}
            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => handleLocationSelect('Bukit Jalil National Stadium', { lat: 3.0480, lng: 101.6800 })}
                className="p-6 glass rounded-xl hover:bg-white/20 transition-all duration-300 hover-lift"
              >
                <div className="text-lg font-medium text-white mb-2">🏟️ Bukit Jalil Stadium</div>
                <div className="text-sm text-cyan-400">Capacity: 50,000</div>
              </button>
              <button
                onClick={() => handleLocationSelect('Merdeka Square', { lat: 3.1478, lng: 101.6953 })}
                className="p-6 glass rounded-xl hover:bg-white/20 transition-all duration-300 hover-lift"
              >
                <div className="text-lg font-medium text-white mb-2">🏛️ Merdeka Square</div>
                <div className="text-sm text-cyan-400">Capacity: 10,000</div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setInputMode('select')}
            className="flex-1 glass text-white py-3 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );

  const renderManualInput = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="glass rounded-xl p-6">
        <h3 className="text-2xl font-semibold text-white mb-6 gradient-text">Event Details</h3>
        
        <div className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={eventData.event_name || ''}
              onChange={(e) => setEventData(prev => ({ ...prev, event_name: e.target.value }))}
              className={`w-full glass border rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 transition-all duration-300 ${
                validationErrors.event_name ? 'border-red-400 neon-red' : 'border-cyan-400/30'
              }`}
              placeholder="Enter event name"
            />
            {validationErrors.event_name && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.event_name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Location *
            </label>
            <input
              type="text"
              value={eventData.location_name || ''}
              onChange={(e) => setEventData(prev => ({ ...prev, location_name: e.target.value }))}
              className={`w-full glass border rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 transition-all duration-300 ${
                validationErrors.location_name ? 'border-red-400 neon-red' : 'border-cyan-400/30'
              }`}
              placeholder="Enter venue location"
            />
            {validationErrors.location_name && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.location_name}</p>
            )}
          </div>

          {/* Attendance */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Expected Attendance *
            </label>
            <input
              type="number"
              value={eventData.expected_attendance || ''}
              onChange={(e) => setEventData(prev => ({ ...prev, expected_attendance: parseInt(e.target.value) }))}
              className={`w-full glass border rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 transition-all duration-300 ${
                validationErrors.expected_attendance ? 'border-red-400 neon-red' : 'border-cyan-400/30'
              }`}
              placeholder="Enter expected attendance"
            />
            {validationErrors.expected_attendance && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.expected_attendance}</p>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Event Start Time *
            </label>
            <input
              type="datetime-local"
              value={eventData.event_start_datetime || ''}
              onChange={(e) => setEventData(prev => ({ ...prev, event_start_datetime: e.target.value }))}
              className={`w-full glass border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400 transition-all duration-300 ${
                validationErrors.event_start_datetime ? 'border-red-400 neon-red' : 'border-cyan-400/30'
              }`}
            />
            {validationErrors.event_start_datetime && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.event_start_datetime}</p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Event End Time *
            </label>
            <input
              type="datetime-local"
              value={eventData.event_end_datetime || ''}
              onChange={(e) => setEventData(prev => ({ ...prev, event_end_datetime: e.target.value }))}
              className={`w-full glass border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400 transition-all duration-300 ${
                validationErrors.event_end_datetime ? 'border-red-400 neon-red' : 'border-cyan-400/30'
              }`}
            />
            {validationErrors.event_end_datetime && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.event_end_datetime}</p>
            )}
          </div>

          {/* Gates */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              Gates Configuration *
            </label>
            <div className="space-y-3">
              {eventData.gates?.map((gate, index) => (
                <div key={index} className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={gate.gate_id}
                    onChange={(e) => {
                      const newGates = [...(eventData.gates || [])];
                      newGates[index] = { ...gate, gate_id: e.target.value };
                      setEventData(prev => ({ ...prev, gates: newGates }));
                    }}
                    className="glass border border-cyan-400/30 rounded px-3 py-2 text-white text-sm placeholder-white/50"
                    placeholder="Gate ID"
                  />
                  <input
                    type="text"
                    value={gate.gate_name}
                    onChange={(e) => {
                      const newGates = [...(eventData.gates || [])];
                      newGates[index] = { ...gate, gate_name: e.target.value };
                      setEventData(prev => ({ ...prev, gates: newGates }));
                    }}
                    className="glass border border-cyan-400/30 rounded px-3 py-2 text-white text-sm placeholder-white/50"
                    placeholder="Gate Name"
                  />
                  <input
                    type="number"
                    value={gate.capacity_per_hour}
                    onChange={(e) => {
                      const newGates = [...(eventData.gates || [])];
                      newGates[index] = { ...gate, capacity_per_hour: parseInt(e.target.value) };
                      setEventData(prev => ({ ...prev, gates: newGates }));
                    }}
                    className="glass border border-cyan-400/30 rounded px-3 py-2 text-white text-sm placeholder-white/50"
                    placeholder="Capacity/hr"
                  />
                </div>
              ))}
            </div>
            {validationErrors.gates && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.gates}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => setInputMode('select')}
            className="flex-1 glass text-white py-3 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            Back
          </button>
          <button
            onClick={() => setInputMode('confirm')}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover-lift shadow-lg"
          >
            Review & Confirm
          </button>
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="glass rounded-xl p-6">
        <h3 className="text-2xl font-semibold text-white mb-6 gradient-text">✅ Event Setup Complete</h3>
        
        {/* Summary Card */}
        <div className="glass rounded-xl p-6 mb-6 border border-green-400/30">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="font-medium text-white text-lg">{eventData.event_name}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-green-400" />
              <span className="text-white">{eventData.location_name}</span>
              {eventData.gps && (
                <span className="text-sm text-cyan-400">
                  ({eventData.gps.lat}, {eventData.gps.lng})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-green-400" />
              <span className="text-white">{eventData.expected_attendance?.toLocaleString()} attendees</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-green-400" />
              <span className="text-white">
                {eventData.event_start_datetime && new Date(eventData.event_start_datetime).toLocaleString()} - 
                {eventData.event_end_datetime && new Date(eventData.event_end_datetime).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-green-400" />
              <span className="text-white">{eventData.gates?.length} gates configured</span>
            </div>
          </div>
        </div>

        {/* Assumptions */}
        {assumptions.length > 0 && (
          <div className="glass rounded-xl p-4 mb-6 border border-yellow-400/30">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">⚠️ Assumptions Made</h4>
            <ul className="text-sm text-yellow-300 space-y-1">
              {assumptions.map((assumption, index) => (
                <li key={index}>• {assumption}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => setInputMode('manual')}
            className="flex-1 glass text-white py-3 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            Edit Details
          </button>
          <button
            onClick={handleProceedToSimulation}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover-lift shadow-lg"
          >
            Proceed to Simulation
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      {(() => {
        switch (inputMode) {
          case 'file':
            return renderFileUpload();
          case 'manual':
            return renderManualInput();
          case 'map':
            return renderMapSelection();
          case 'confirm':
            return renderConfirmation();
          default:
            return renderModeSelection();
        }
      })()}
    </div>
  );
};

export default InputOrchestrator;