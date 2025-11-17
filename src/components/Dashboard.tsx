import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, Users, Zap, Bot } from 'lucide-react';
import { useEventContext } from '../context/EventContext';
import { useAlertContext } from '../context/AlertContext';
import { useRealtimeContext } from '../context/RealtimeContext';
import DataUpload from './DataUpload';
import EventOverview from './EventOverview';
import RealtimeMonitor from './RealtimeMonitor';
import AlertPanel from './AlertPanel';
import MapView from './MapView';
import ScenarioSimulator from './ScenarioSimulator';
import AnimatedBackground from './AnimatedBackground';

const Dashboard: React.FC = () => {
  const { hasData } = useEventContext();
  const { alerts } = useAlertContext();
  const { status } = useRealtimeContext();
  const [activeTab, setActiveTab] = useState('overview');

  const openChatbot = () => {
    const chatbotUrl = window.location.origin + '/chatbot';
    window.open(chatbotUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="relative z-10 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Zap className="h-8 w-8 text-cyan-400 neon-blue" />
                  <div className="absolute inset-0 animate-ping">
                    <Zap className="h-8 w-8 text-cyan-400 opacity-75" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold gradient-text">AI Crowd Safety Engine</h1>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium glass ${
                  status === 'LIVE' ? 'neon-green' :
                  status === 'UPLOADED' ? 'neon-blue' :
                  'neon-red'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'LIVE' ? 'bg-green-400' :
                    status === 'UPLOADED' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`}></div>
                  <span className="text-white font-semibold">{status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {criticalAlerts > 0 && (
                <div className="flex items-center space-x-2 text-red-400 neon-red px-3 py-2 rounded-lg glass">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">{criticalAlerts} Critical Alerts</span>
                </div>
              )}
              <button
                onClick={() => window.location.href = '/demo'}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover-lift shadow-lg"
              >
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Demo Presentation</span>
              </button>
              <button
                onClick={openChatbot}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover-lift shadow-lg"
              >
                <Bot className="h-5 w-5" />
                <span className="font-semibold">Open AI Safety Bot</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {!hasData ? (
        <DataUpload />
      ) : (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Navigation Tabs */}
          <div className="glass rounded-lg p-2 mb-6">
            <nav className="flex space-x-2">
              {[
                { id: 'overview', name: 'Event Overview', icon: Users },
                { id: 'realtime', name: 'Real-time Monitor', icon: Clock },
                { id: 'alerts', name: 'Alerts', icon: AlertTriangle },
                { id: 'map', name: 'Map View', icon: MapPin },
                { id: 'scenarios', name: 'Scenarios', icon: Zap }
              ].map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 hover-lift ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && <EventOverview />}
            {activeTab === 'realtime' && <RealtimeMonitor />}
            {activeTab === 'alerts' && <AlertPanel />}
            {activeTab === 'map' && <MapView />}
            {activeTab === 'scenarios' && <ScenarioSimulator />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;