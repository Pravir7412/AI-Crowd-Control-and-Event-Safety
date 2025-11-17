import React from 'react';
import { AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react';
import { useAlertContext } from '../context/AlertContext';
import { format } from 'date-fns';

const AlertPanel: React.FC = () => {
  const { alerts, dismissAlert } = useAlertContext();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info': return <AlertTriangle className="h-5 w-5 text-blue-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning');
  const infoAlerts = alerts.filter(alert => alert.severity === 'info');

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-red-900">{criticalAlerts.length}</p>
              <p className="text-red-700">Critical Alerts</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">{warningAlerts.length}</p>
              <p className="text-yellow-700">Warnings</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{infoAlerts.length}</p>
              <p className="text-blue-700">Information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-green-600">All Clear!</p>
              <p className="text-gray-500">No active alerts at this time</p>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={`p-6 border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-sm">{alert.category}</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{alert.title}</h4>
                      <p className="text-gray-700 mb-3">{alert.message}</p>
                      
                      {alert.location && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{alert.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{format(new Date(alert.timestamp), 'PPP p')}</span>
                      </div>

                      {alert.actions && alert.actions.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {alert.actions.map((action, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {alert.mapLink && (
                        <a
                          href={alert.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          View on Map
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;