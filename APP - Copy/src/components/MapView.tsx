import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Zap } from 'lucide-react';
import { useEventContext } from '../context/EventContext';
import { useAlertContext } from '../context/AlertContext';

const MapView: React.FC = () => {
  const { eventData } = useEventContext();
  const { alerts } = useAlertContext();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  if (!eventData) return null;

  // Mock coordinates for Bukit Jalil Stadium
  const centerCoords = { lat: 3.0480, lng: 101.6800 };
  
  const mapStyle = {
    width: '100%',
    height: '600px',
    backgroundColor: '#f0f9ff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    position: 'relative' as const,
    overflow: 'hidden'
  };

  const getGatePosition = (gateId: string) => {
    const positions = {
      'A': { top: '30%', left: '20%' },
      'B': { top: '70%', left: '20%' },
      'C': { top: '70%', left: '80%' },
      'D': { top: '30%', left: '80%' }
    };
    return positions[gateId as keyof typeof positions] || { top: '50%', left: '50%' };
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* Map Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            {eventData.location_name}
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Caution</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Critical</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div style={mapStyle}>
              {/* Stadium Representation */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-4 border-gray-400 rounded-lg bg-green-100">
                <div className="flex items-center justify-center h-full text-gray-600 font-medium">
                  🏟️ {eventData.event_name}
                </div>
              </div>

              {/* Gates */}
              {eventData.gates.map(gate => {
                const position = getGatePosition(gate.gate_id);
                const hasAlert = alerts.some(alert => alert.location?.includes(gate.gate_name));
                const alertSeverity = alerts.find(alert => alert.location?.includes(gate.gate_name))?.severity;
                
                return (
                  <div
                    key={gate.gate_id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 ${
                      selectedLocation === gate.gate_id ? 'scale-125' : ''
                    }`}
                    style={position}
                    onClick={() => setSelectedLocation(selectedLocation === gate.gate_id ? null : gate.gate_id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      hasAlert && alertSeverity === 'critical' ? 'bg-red-500 animate-pulse' :
                      hasAlert && alertSeverity === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}>
                      {gate.gate_id}
                    </div>
                    <div className="text-xs font-medium mt-1 text-center whitespace-nowrap">
                      {gate.gate_name}
                    </div>
                  </div>
                );
              })}

              {/* Emergency Exits */}
              <div className="absolute top-4 left-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                E
              </div>
              <div className="absolute top-4 right-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                E
              </div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                E
              </div>
              <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                E
              </div>

              {/* Alert Markers */}
              {criticalAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className="absolute top-16 left-16 transform animate-bounce"
                  style={{ left: `${20 + index * 30}%` }}
                >
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                </div>
              ))}
            </div>

            {/* Map Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Gates</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <span>Emergency Exits</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Critical Alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-4">
          {selectedLocation ? (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {(() => {
                const gate = eventData.gates.find(g => g.gate_id === selectedLocation);
                if (!gate) return null;
                
                return (
                  <>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{gate.gate_name}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-medium">{gate.capacity_per_hour.toLocaleString()}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium text-green-600">Normal</span>
                      </div>
                      {gate.gps && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">GPS</span>
                          <span className="font-medium text-xs">{gate.gps}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        <Navigation className="h-4 w-4" />
                        <span>Get Directions</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <p className="text-gray-500 text-center">Click on a gate to view details</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                📍 Find Nearest Exit
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                🚻 Locate Facilities
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                🚗 Parking Status
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                🚌 Transport Updates
              </button>
            </div>
          </div>

          {/* Coordinates */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Location</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Latitude</span>
                <span className="font-mono">{centerCoords.lat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Longitude</span>
                <span className="font-mono">{centerCoords.lng}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;