import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatbotRoute from './components/ChatbotRoute';
import DemoPresentation from './components/DemoPresentation';
import { EventProvider } from './context/EventContext';
import { AlertProvider } from './context/AlertContext';
import { RealtimeProvider } from './context/RealtimeContext';

function App() {
  return (
    <EventProvider>
      <AlertProvider>
        <RealtimeProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chatbot" element={<ChatbotRoute />} />
              <Route path="/demo" element={<DemoPresentation />} />
            </Routes>
          </Router>
        </RealtimeProvider>
      </AlertProvider>
    </EventProvider>
  );
}

export default App;