import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, Users, Zap, MessageCircle } from 'lucide-react';
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
import Chatbot from './Chatbot';

const Dashboard: React.FC = () => {
  const { hasData, loadSampleData } = useEventContext();
  const { alerts } = useAlertContext();
  const { status, realtimeData, startSimulation, refreshWeather } = useRealtimeContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [chatOpen, setChatOpen] = useState(false);

  // Chatbot is embedded; no separate window needed.

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
                <img src={"http://localhost:3000/Images/Logo Without Caption.png"} alt="Logo" className="h-8 w-auto" />
                <h1 className="text-2xl font-bold gradient-text">AI Crowd Safety Engine</h1>
              </div>
              <div className="flex items-center space-x-3 text-sm">
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
              <p className="text-white/80 text-xs hidden md:block">Operational AI co-pilot for crowd safety</p>
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
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {!hasData ? (
            <DataUpload />
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 glass rounded-xl p-3">
                <span className="text-white/80 text-sm">Quick Actions</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => { await loadSampleData(); }}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all hover-lift"
                  >
                    Load Sample Data
                  </button>
                  <button
                    onClick={() => startSimulation()}
                    className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all hover-lift"
                  >
                    Start Simulation
                  </button>
                  <button
                    onClick={async () => { try { await refreshWeather(); } catch {} }}
                    className="text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all hover-lift"
                  >
                    Refresh Weather
                  </button>
                </div>
                <div className="ml-auto flex items-center space-x-2 text-xs text-white/80">
                  <span className="opacity-80">Status:</span>
                  <span className={`px-2 py-1 rounded-full ${status==='LIVE'?'bg-green-500/20 text-green-200':status==='UPLOADED'?'bg-blue-500/20 text-blue-200':'bg-yellow-500/20 text-yellow-200'}`}>{status}</span>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-xl p-4 hover-lift">
                  <p className="text-xs text-white/70 mb-1">Crowd In Venue</p>
                  <p className="text-2xl font-bold text-white">{(realtimeData?.crowd.current_attendance ?? 0).toLocaleString()}</p>
                  <p className="text-[11px] text-white/60">Status: {realtimeData?.crowd.overall_status ?? 'stable'}</p>
                </div>
                <div className="glass rounded-xl p-4 hover-lift">
                  <p className="text-xs text-white/70 mb-1">Gates Open</p>
                  <p className="text-2xl font-bold text-white">{(realtimeData?.gates?.filter(g=>g.status!=='critical').length ?? 0)}/{(realtimeData?.gates?.length ?? 0)}</p>
                  <p className="text-[11px] text-white/60">Critical: {realtimeData?.gates?.filter(g=>g.status==='critical').length ?? 0}</p>
                </div>
                <div className="glass rounded-xl p-4 hover-lift">
                  <p className="text-xs text-white/70 mb-1">Avg Gate Wait</p>
                  <p className="text-2xl font-bold text-white">
                    {(() => {
                      const waits = (realtimeData?.gates ?? []).map(g=>g.wait_time).filter(n=>typeof n==='number');
                      if (!waits.length) return '—';
                      const avg = Math.round(waits.reduce((a,b)=>a+b,0)/waits.length);
                      return `${avg} m`;
                    })()}
                  </p>
                  <p className="text-[11px] text-white/60">Live updates</p>
                </div>
                <div className="glass rounded-xl p-4 hover-lift">
                  <p className="text-xs text-white/70 mb-1">Weather</p>
                  <p className="text-2xl font-bold text-white flex items-center space-x-2">
                    <span>{(() => {
                      const c = (realtimeData?.weather?.condition || '').toLowerCase();
                      if (c.includes('rain')) return '🌧️';
                      if (c.includes('storm')) return '⛈️';
                      if (c.includes('cloud')) return '☁️';
                      if (c.includes('clear')) return '🌤️';
                      return '🌡️';
                    })()}</span>
                    <span>{realtimeData?.weather?.condition ? realtimeData.weather.condition : '—'}</span>
                  </p>
                  <p className="text-[11px] text-white/60">
                    {typeof realtimeData?.weather?.temperature === 'number' ? `${realtimeData.weather.temperature}°C` : ''}
                    {typeof realtimeData?.weather?.rain_probability === 'number' ? ` • Rain ${realtimeData.weather.rain_probability.toFixed(2)}%` : ''}
                  </p>
                </div>
              </div>
              {/* Navigation Tabs */}
              <div className="glass rounded-lg p-2 mb-2">
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
            </>
          )}
        </div>
      </div>

      {/* Floating Chatbot toggle (only after data is available) */}
      {hasData && (
        <>
          <button
            onClick={() => setChatOpen(v => !v)}
            title={chatOpen ? 'Close Chat' : 'Open Chat'}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg hover:from-indigo-600 hover:to-cyan-600 transition-all flex items-center justify-center"
          >
            <MessageCircle className="h-7 w-7" />
          </button>

          {chatOpen && (
            <div
              className="fixed right-6 z-50 w-96 max-w-[90vw] bg-white rounded-lg border shadow-xl"
              style={{ bottom: 24, maxHeight: 'calc(100vh - 96px)', overflow: 'auto' }}
            >
              <Chatbot />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;