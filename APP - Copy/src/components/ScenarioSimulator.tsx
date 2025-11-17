import React, { useState } from 'react';
import { Play, AlertTriangle, Zap } from 'lucide-react';
import { useAlertContext } from '../context/AlertContext';

const ScenarioSimulator: React.FC = () => {
  const { addAlert } = useAlertContext();
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'entry_rush',
      name: 'Entry Rush Simulation',
      description: 'Simulate heavy crowd influx 30 minutes before event start',
      icon: '🚪',
      severity: 'warning',
      duration: 5000,
      alerts: [
        {
          title: 'Gate A Congestion Alert',
          message: '🚨 Gate A overcrowded (6,500 waiting). Long queue detected.',
          actions: ['Redirect 20% of crowd to Gate C', 'Open additional screening lanes', 'Deploy staff for crowd control'],
          location: 'Gate A',
          mapLink: '#'
        }
      ]
    },
    {
      id: 'weather_emergency',
      name: 'Weather Emergency',
      description: 'Sudden thunderstorm with heavy rain during event',
      icon: '🌧️',
      severity: 'critical',
      duration: 7000,
      alerts: [
        {
          title: 'Severe Weather Alert',
          message: '⛈️ Thunderstorm detected. Lightning risk high.',
          actions: ['Move crowd to covered areas immediately', 'Suspend outdoor activities', 'Announce shelter procedures'],
          location: 'Stadium Grounds',
          mapLink: '#'
        },
        {
          title: 'Slippery Surface Warning',
          message: '⚠️ Wet surfaces creating slip hazards at exits.',
          actions: ['Deploy non-slip mats', 'Post additional warning signs', 'Station safety personnel at key points'],
          location: 'All Exit Points',
          mapLink: '#'
        }
      ]
    },
    {
      id: 'evacuation',
      name: 'Emergency Evacuation',
      description: 'Full venue evacuation due to security threat',
      icon: '🚨',
      severity: 'critical',
      duration: 10000,
      alerts: [
        {
          title: 'EVACUATION ORDER - Zone 3',
          message: '🚨 Immediate evacuation required. Security incident reported.',
          actions: ['Use Emergency Exits D & E only', 'Clear Gate B for emergency vehicles', 'Activate loudspeaker announcements'],
          location: 'Zone 3',
          mapLink: '#'
        },
        {
          title: 'Crowd Control Critical',
          message: '🚶‍♂️ 12,000+ people evacuating simultaneously. Bottleneck risk.',
          actions: ['Deploy all available staff to exits', 'Coordinate with emergency services', 'Monitor for crowd crushing'],
          location: 'Emergency Exits',
          mapLink: '#'
        }
      ]
    },
    {
      id: 'transport_disruption',
      name: 'Transport Disruption',
      description: 'Major train delays affecting 70% of attendees',
      icon: '🚇',
      severity: 'warning',
      duration: 6000,
      alerts: [
        {
          title: 'Train Service Disruption',
          message: '🚇 LRT service suspended. 15,000+ attendees affected.',
          actions: ['Activate shuttle bus service', 'Extend parking capacity', 'Delay event start by 20 minutes'],
          location: 'Bukit Jalil Station',
          mapLink: '#'
        }
      ]
    },
    {
      id: 'medical_emergency',
      name: 'Mass Medical Event',
      description: 'Multiple medical emergencies during peak hours',
      icon: '🚑',
      severity: 'critical',
      duration: 8000,
      alerts: [
        {
          title: 'Multiple Medical Incidents',
          message: '🚑 6 medical emergencies reported in Section B.',
          actions: ['Deploy additional medical teams', 'Clear ambulance routes', 'Set up triage area'],
          location: 'Section B',
          mapLink: '#'
        }
      ]
    },
    {
      id: 'fire_alarm',
      name: 'Fire Safety Alert',
      description: 'Fire alarm activation in concourse area',
      icon: '🔥',
      severity: 'critical',
      duration: 9000,
      alerts: [
        {
          title: 'Fire Alarm Activation',
          message: '🔥 Fire alarm triggered in East Concourse.',
          actions: ['Evacuate affected areas immediately', 'Fire services dispatched', 'Isolate fire zones'],
          location: 'East Concourse',
          mapLink: '#'
        }
      ]
    }
  ];

  const runScenario = async (scenario: typeof scenarios[0]) => {
    if (runningScenario) return;
    
    setRunningScenario(scenario.id);
    
    // Add alerts with delays to simulate real-time progression
    for (let i = 0; i < scenario.alerts.length; i++) {
      const alert = scenario.alerts[i];
      setTimeout(() => {
        addAlert({
          title: alert.title,
          message: alert.message,
          severity: scenario.severity as 'critical' | 'warning' | 'info',
          category: 'SIMULATION',
          location: alert.location,
          actions: alert.actions,
          mapLink: alert.mapLink
        });
      }, i * 2000);
    }
    
    // Clear running state after scenario completes
    setTimeout(() => {
      setRunningScenario(null);
    }, scenario.duration);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 hover:bg-red-100';
      case 'warning': return 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      default: return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
          <Zap className="h-6 w-6 mr-2 text-purple-600" />
          Scenario Simulator
        </h2>
        <p className="text-gray-600">
          Test the AI system's response to various emergency and crowd management scenarios.
          Each simulation will generate realistic alerts and recommendations.
        </p>
        {runningScenario && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">🔄 Running simulation...</p>
          </div>
        )}
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map(scenario => (
          <div key={scenario.id} className={`border-2 rounded-lg p-6 transition-all ${getSeverityColor(scenario.severity)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">{scenario.icon}</div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                scenario.severity === 'critical' ? 'bg-red-100 text-red-800' :
                scenario.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {scenario.severity.toUpperCase()}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{scenario.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
            
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-500 mb-1">Will generate:</p>
                <ul className="text-gray-600 space-y-1">
                  {scenario.alerts.map((alert, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 text-xs">•</span>
                      <span className="text-xs">{alert.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => runScenario(scenario)}
                disabled={runningScenario !== null}
                className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                  runningScenario === scenario.id
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : runningScenario
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>
                  {runningScenario === scenario.id ? 'Running...' :
                   runningScenario ? 'Wait...' : 'Run Scenario'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Impact Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Scenario Impact Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Before Simulation</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Normal crowd flow</p>
              <p>• All gates operational</p>
              <p>• Weather conditions stable</p>
              <p>• Transport running on schedule</p>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">During Simulation</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <p>• Real-time alerts generated</p>
              <p>• AI recommendations provided</p>
              <p>• Staff notifications sent</p>
              <p>• Action plans activated</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Expected Outcome</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>• Incident contained quickly</p>
              <p>• Crowd safety maintained</p>
              <p>• Minimal service disruption</p>
              <p>• Lessons learned captured</p>
            </div>
          </div>
        </div>
      </div>

      {/* AWS Architecture Note */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 p-6">
        <h4 className="font-semibold text-orange-900 mb-2">🔧 AWS Production Deployment</h4>
        <div className="text-sm text-orange-800 space-y-1">
          <p>• Scenarios trigger Lambda functions via EventBridge</p>
          <p>• Real-time alerts sent via SNS to mobile devices</p>
          <p>• Simulation data stored in DynamoDB for analysis</p>
          <p>• Map coordinates resolved using Amazon Location Service</p>
          <p>• All events logged for compliance and audit trails</p>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSimulator;