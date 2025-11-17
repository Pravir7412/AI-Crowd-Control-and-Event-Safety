import React, { useEffect, useState, useRef } from 'react';
import { Activity, Thermometer, Cloud, Train, Users, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useRealtimeContext } from '../context/RealtimeContext';
import { useEventContext } from '../context/EventContext';
import { DataFormatConverter, ConvertedEventData } from '../utils/dataFormatConverter';

const RealtimeMonitor: React.FC = () => {
  const { realtimeData, status } = useRealtimeContext();
  const { eventData, uploadEventData } = useEventContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [filePreview, setFilePreview] = useState<any>(null);
  const [manualData, setManualData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // File processing and format conversion logic
  const detectFileFormat = (file: File): 'excel' | 'csv' | 'json' | 'txt' | 'pdf' | 'unknown' => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'pdf':
        return 'pdf';
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'txt':
        return 'txt';
      default:
        return 'unknown';
    }
  };

  const uploadToIngestionAPI = async (file: File, contentType: string): Promise<any> => {
    const uploadApi = (import.meta as any).env?.VITE_UPLOAD_API || (window as any).UPLOAD_API_URL || '/upload';
    const arrayBuffer = await file.arrayBuffer();
    // Convert to base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const res = await fetch(uploadApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_content: base64,
        file_name: file.name,
        content_type: contentType
      })
    });
    if (!res.ok) throw new Error(`Upload API error: ${res.status}`);
    const data = await res.json();
    if (!data?.data) throw new Error('No data returned from ingestion API');
    return data.data;
  };

  const parseCSVData = async (file: File): Promise<ConvertedEventData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const convertedData = DataFormatConverter.convertCSVData(text);
          resolve(convertedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  };

  const parseJSONData = async (file: File): Promise<ConvertedEventData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const convertedData = DataFormatConverter.convertJSONData(data);
          resolve(convertedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read JSON file'));
      reader.readAsText(file);
    });
  };

  const parseTXTData = async (file: File): Promise<ConvertedEventData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const convertedData = DataFormatConverter.convertTextData(text);
          resolve(convertedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('processing');
    setUploadMessage('Processing file...');

    try {
      const format = detectFileFormat(file);
      let convertedData: ConvertedEventData;

      switch (format) {
        case 'excel': {
          const normalized = await uploadToIngestionAPI(file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          convertedData = normalized; // Already normalized to the EventData-like shape
          break;
        }
        case 'pdf': {
          const normalized = await uploadToIngestionAPI(file, 'application/pdf');
          convertedData = normalized;
          break;
        }
        case 'csv':
          convertedData = await parseCSVData(file);
          break;
        case 'json':
          convertedData = await parseJSONData(file);
          break;
        case 'txt':
          convertedData = await parseTXTData(file);
          break;
        default:
          throw new Error('Unsupported file format');
      }

      // Ensure required fields exist by auto-filling sensible defaults rather than failing
      const nowIso = new Date().toISOString();
      const defaults: any = {
        event_name: (convertedData as any).event_name || (file.name?.split('.')[0] || 'Uploaded Event'),
        location_name: (convertedData as any).location_name || 'Unknown Venue',
        expected_attendance: (convertedData as any).expected_attendance ?? 0,
        event_start_datetime: (convertedData as any).event_start_datetime || nowIso,
        event_end_datetime: (convertedData as any).event_end_datetime || nowIso,
        gates: (convertedData as any).gates || [],
        transport_schedule: (convertedData as any).transport_schedule || [],
        facilities: (convertedData as any).facilities || []
      };
      convertedData = { ...(convertedData as any), ...defaults } as any;

      setFilePreview(convertedData);
      setUploadStatus('success');
      setUploadMessage('File ingested via AWS successfully! Ready to start simulation.');
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus('error');
      setUploadMessage(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startSimulationWithUploadedData = async () => {
    if (filePreview) {
      try {
        await uploadEventData(filePreview as any);
        setShowFileUpload(false);
        setUploadStatus('idle');
        setUploadMessage('');
        setFilePreview(null);
      } catch (error) {
        console.error('Error starting simulation:', error);
        setUploadStatus('error');
        setUploadMessage('Error starting simulation with uploaded data');
      }
    }
  };

  // Manual entry form logic
  const validateManualData = (data: any): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.event_name?.trim()) {
      errors.event_name = 'Event name is required';
    }
    if (!data.location_name?.trim()) {
      errors.location_name = 'Location name is required';
    }
    if (!data.expected_attendance || data.expected_attendance <= 0) {
      errors.expected_attendance = 'Expected attendance must be greater than 0';
    }
    if (!data.event_start_datetime) {
      errors.event_start_datetime = 'Start datetime is required';
    }
    if (!data.event_end_datetime) {
      errors.event_end_datetime = 'End datetime is required';
    }
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
      data.gates.forEach((gate: any, index: number) => {
        if (!gate.gate_id?.trim()) {
          errors[`gate_${index}_id`] = 'Gate ID is required';
        }
        if (!gate.gate_name?.trim()) {
          errors[`gate_${index}_name`] = 'Gate name is required';
        }
        if (!gate.capacity_per_hour || gate.capacity_per_hour <= 0) {
          errors[`gate_${index}_capacity`] = 'Capacity must be greater than 0';
        }
      });
    }

    return errors;
  };

  const handleManualDataChange = (field: string, value: any) => {
    setManualData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGateChange = (index: number, field: string, value: any) => {
    setManualData(prev => {
      const newGates = [...(prev.gates || [])];
      if (!newGates[index]) {
        newGates[index] = { gate_id: '', gate_name: '', capacity_per_hour: 0, gps: '' };
      }
      newGates[index][field] = value;
      return { ...prev, gates: newGates };
    });

    // Clear validation error for this gate field
    const errorKey = `gate_${index}_${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const addGate = () => {
    setManualData(prev => ({
      ...prev,
      gates: [...(prev.gates || []), { gate_id: '', gate_name: '', capacity_per_hour: 0, gps: '' }]
    }));
  };

  const removeGate = (index: number) => {
    setManualData(prev => ({
      ...prev,
      gates: prev.gates?.filter((_, i) => i !== index) || []
    }));
  };

  const handleManualSubmit = async () => {
    const errors = validateManualData(manualData);
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        setIsProcessing(true);
        setUploadStatus('processing');
        setUploadMessage('Processing manual entry...');

        // Convert to the format expected by EventContext
        const formattedData = {
          event_name: manualData.event_name,
          location_name: manualData.location_name,
          expected_attendance: manualData.expected_attendance,
          event_start_datetime: manualData.event_start_datetime,
          event_end_datetime: manualData.event_end_datetime,
          gates: manualData.gates,
          transport_schedule: manualData.transport_schedule || [],
          parking_capacity: manualData.parking_capacity || Math.floor(manualData.expected_attendance * 0.3),
          weather_forecast: manualData.weather_forecast || 'Clear skies'
        };

        await uploadEventData(formattedData as any);
        
        setShowManualEntry(false);
        setUploadStatus('success');
        setUploadMessage('Manual entry processed successfully!');
        setManualData({});
        setValidationErrors({});
        
      } catch (error) {
        console.error('Error processing manual entry:', error);
        setUploadStatus('error');
        setUploadMessage('Error processing manual entry');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!realtimeData) return null;

  const getWeatherIcon = (condition: string) => {
    if (condition.toLowerCase().includes('rain')) return '🌧️';
    if (condition.toLowerCase().includes('cloud')) return '☁️';
    if (condition.toLowerCase().includes('sun')) return '☀️';
    return '🌤️';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'caution': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="h-6 w-6 mr-2 text-blue-600" />
            Real-time Monitoring
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Time</p>
              <p className="text-lg font-mono">{currentTime.toLocaleTimeString()}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              status === 'LIVE' ? 'bg-green-100 text-green-800' :
              status === 'UPLOADED' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {status}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Data</span>
              </button>
              <button
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Manual Entry</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      {showFileUpload && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Upload Event Data
            </h3>
            <button
              onClick={() => setShowFileUpload(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <div className="flex flex-col items-center space-y-4">
                <Upload className="h-12 w-12 text-blue-500" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Upload your event data</p>
                  <p className="text-sm text-gray-600">Supports Excel (.xlsx), CSV (.csv), JSON (.json), and Text (.txt) files</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
              </div>
            </div>

            {/* Upload Status */}
            {uploadStatus !== 'idle' && (
              <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                uploadStatus === 'success' ? 'bg-green-50 border border-green-200' :
                uploadStatus === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                {uploadStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {uploadStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                {uploadStatus === 'processing' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                <span className={`text-sm font-medium ${
                  uploadStatus === 'success' ? 'text-green-800' :
                  uploadStatus === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {uploadMessage}
                </span>
              </div>
            )}

            {/* File Preview */}
            {filePreview && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Data Preview</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Event:</span>
                    <span className="ml-2 text-gray-900">{filePreview.event_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="ml-2 text-gray-900">{filePreview.location_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Attendance:</span>
                    <span className="ml-2 text-gray-900">{filePreview.expected_attendance?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Gates:</span>
                    <span className="ml-2 text-gray-900">{filePreview.gates?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Start Time:</span>
                    <span className="ml-2 text-gray-900">
                      {filePreview.event_start_datetime ? new Date(filePreview.event_start_datetime).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">End Time:</span>
                    <span className="ml-2 text-gray-900">
                      {filePreview.event_end_datetime ? new Date(filePreview.event_end_datetime).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Data Quality Indicators */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">📊 Data Quality</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${filePreview.event_name ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Event Name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${filePreview.location_name ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Location</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${filePreview.expected_attendance > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Attendance</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${filePreview.gates?.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Gates</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={startSimulationWithUploadedData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Simulation
                  </button>
                  <button
                    onClick={() => {
                      setFilePreview(null);
                      setUploadStatus('idle');
                      setUploadMessage('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Section */}
      {showManualEntry && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Manual Event Data Entry
            </h3>
            <button
              onClick={() => setShowManualEntry(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Event Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={manualData.event_name || ''}
                  onChange={(e) => handleManualDataChange('event_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    validationErrors.event_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter event name"
                />
                {validationErrors.event_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.event_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={manualData.location_name || ''}
                  onChange={(e) => handleManualDataChange('location_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    validationErrors.location_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter venue location"
                />
                {validationErrors.location_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.location_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Attendance *
                </label>
                <input
                  type="number"
                  value={manualData.expected_attendance || ''}
                  onChange={(e) => handleManualDataChange('expected_attendance', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    validationErrors.expected_attendance ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter expected attendance"
                />
                {validationErrors.expected_attendance && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.expected_attendance}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weather Forecast
                </label>
                <input
                  type="text"
                  value={manualData.weather_forecast || ''}
                  onChange={(e) => handleManualDataChange('weather_forecast', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Clear skies, 20% chance of rain"
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={manualData.event_start_datetime || ''}
                  onChange={(e) => handleManualDataChange('event_start_datetime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    validationErrors.event_start_datetime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.event_start_datetime && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.event_start_datetime}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event End Time *
                </label>
                <input
                  type="datetime-local"
                  value={manualData.event_end_datetime || ''}
                  onChange={(e) => handleManualDataChange('event_end_datetime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    validationErrors.event_end_datetime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.event_end_datetime && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.event_end_datetime}</p>
                )}
              </div>
            </div>

            {/* Gates Configuration */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Gates Configuration *
                </label>
                <button
                  onClick={addGate}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Add Gate
                </button>
              </div>

              {validationErrors.gates && (
                <p className="text-red-500 text-sm mb-2">{validationErrors.gates}</p>
              )}

              <div className="space-y-3">
                {(manualData.gates || []).map((gate: any, index: number) => (
                  <div key={index} className="grid md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Gate ID *
                      </label>
                      <input
                        type="text"
                        value={gate.gate_id || ''}
                        onChange={(e) => handleGateChange(index, 'gate_id', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 ${
                          validationErrors[`gate_${index}_id`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="A"
                      />
                      {validationErrors[`gate_${index}_id`] && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors[`gate_${index}_id`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Gate Name *
                      </label>
                      <input
                        type="text"
                        value={gate.gate_name || ''}
                        onChange={(e) => handleGateChange(index, 'gate_name', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 ${
                          validationErrors[`gate_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Gate A - North"
                      />
                      {validationErrors[`gate_${index}_name`] && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors[`gate_${index}_name`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Capacity/hr *
                      </label>
                      <input
                        type="number"
                        value={gate.capacity_per_hour || ''}
                        onChange={(e) => handleGateChange(index, 'capacity_per_hour', parseInt(e.target.value))}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 ${
                          validationErrors[`gate_${index}_capacity`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="2000"
                      />
                      {validationErrors[`gate_${index}_capacity`] && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors[`gate_${index}_capacity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        GPS Coordinates
                      </label>
                      <input
                        type="text"
                        value={gate.gps || ''}
                        onChange={(e) => handleGateChange(index, 'gps', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                        placeholder="3.0485, 101.6795"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => removeGate(index)}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={handleManualSubmit}
                disabled={isProcessing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Start Simulation'}
              </button>
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  setManualData({});
                  setValidationErrors({});
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weather */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Cloud className="h-5 w-5 mr-2" />
              Weather
            </h3>
            <span className="text-2xl">{getWeatherIcon(realtimeData.weather.condition)}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Condition</span>
              <span className="font-medium">{realtimeData.weather.condition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Temperature</span>
              <span className="font-medium">{realtimeData.weather.temperature}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rain Chance</span>
              <span className="font-medium">
                {typeof realtimeData.weather.rain_probability === 'number'
                  ? `${realtimeData.weather.rain_probability.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wind Speed</span>
              <span className="font-medium">{realtimeData.weather.wind_speed} km/h</span>
            </div>
          </div>
        </div>

        {/* Crowd Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <Users className="h-5 w-5 mr-2" />
            Crowd Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Attendance</span>
              <span className="font-bold text-xl">{realtimeData.crowd.current_attendance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overall Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(realtimeData.crowd.overall_status)}`}>
                {realtimeData.crowd.overall_status}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(realtimeData.crowd.current_attendance / 50000) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {((realtimeData.crowd.current_attendance / 50000) * 100).toFixed(1)}% capacity
            </p>
          </div>
        </div>

        {/* Transport */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <Train className="h-5 w-5 mr-2" />
            Transport Status
          </h3>
          <div className="space-y-3">
            {realtimeData.transport.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.location}</p>
                {item.delay && (
                  <p className="text-sm text-red-600 mt-1">Delay: {item.delay} min</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gate Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gate Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {realtimeData.gates.map(gate => (
            <div key={gate.gate_id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">{gate.gate_name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(gate.status)}`}>
                  {gate.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Queue</span>
                  <span className="font-medium">{gate.current_queue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wait Time</span>
                  <span className="font-medium">{gate.wait_time} min</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      gate.status === 'normal' ? 'bg-green-500' :
                      gate.status === 'caution' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((gate.current_queue / gate.capacity) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealtimeMonitor;