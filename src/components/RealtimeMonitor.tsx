import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, Cloud, Train, Users } from 'lucide-react';
import { useRealtimeContext } from '../context/RealtimeContext';

const RealtimeMonitor: React.FC = () => {
  const { realtimeData, status } = useRealtimeContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
          </div>
        </div>
      </div>

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
              <span className="font-medium">{realtimeData.weather.rain_probability}%</span>
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