import React from 'react';
import { Users, MapPin, Clock, Calendar, Zap } from 'lucide-react';
import { useEventContext } from '../context/EventContext';
import { format } from 'date-fns';

const EventOverview: React.FC = () => {
  const { eventData } = useEventContext();

  if (!eventData) return null;

  const totalGateCapacity = eventData.gates.reduce((sum, gate) => sum + gate.capacity_per_hour, 0);
  const crowdDensity = (eventData.expected_attendance / totalGateCapacity * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Event Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expected Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{eventData.expected_attendance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Location</p>
              <p className="text-lg font-bold text-gray-900">{eventData.location_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gate Capacity</p>
              <p className="text-2xl font-bold text-gray-900">{totalGateCapacity.toLocaleString()}/hr</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Crowd Density</p>
              <p className="text-2xl font-bold text-gray-900">{crowdDensity}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Event Timeline
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="font-medium text-gray-900">Event Start</p>
              <p className="text-sm text-gray-600">{format(new Date(eventData.event_start_datetime), 'PPP p')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <p className="font-medium text-gray-900">Event End</p>
              <p className="text-sm text-gray-600">{format(new Date(eventData.event_end_datetime), 'PPP p')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gates Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gate Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {eventData.gates.map(gate => (
            <div key={gate.gate_id} className="p-4 border rounded-lg">
              <h4 className="font-medium text-gray-900">{gate.gate_name}</h4>
              <p className="text-2xl font-bold text-blue-600">{gate.capacity_per_hour.toLocaleString()}</p>
              <p className="text-sm text-gray-600">per hour</p>
              {gate.gps && (
                <p className="text-xs text-gray-500 mt-2">{gate.gps}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transport Schedule */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport Schedule</h3>
        <div className="space-y-3">
          {eventData.transport_schedule.map((transport, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{transport.transport_type}</p>
                <p className="text-sm text-gray-600">{transport.stop_name}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{format(new Date(transport.arrival_datetime), 'HH:mm')}</p>
                <p className="text-sm text-gray-600">{transport.est_capacity?.toLocaleString() || 'N/A'} capacity</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventOverview;