# AWS Crowd Safety Chatbot & Notification Engine

A comprehensive AI-powered crowd safety monitoring system designed for AWS deployment, featuring real-time monitoring, WhatsApp-style notifications, and intelligent alert management.

## 🚀 Features

### Core Functionality
- **Real-time Event Monitoring**: Continuous monitoring of crowd density, weather conditions, transport status, and gate operations
- **AI Safety Bot**: WhatsApp-style chatbot interface for staff communication and alerts
- **Intelligent Alert System**: Proactive notifications with severity levels (Critical, Warning, Info)
- **Scenario Simulation**: Test emergency responses with built-in scenario generators
- **Interactive Map View**: Visual representation of venue layout with real-time status indicators

### AWS-Ready Architecture
- **Serverless Backend**: Lambda functions for real-time processing
- **Data Storage**: S3 for file uploads, DynamoDB for real-time data
- **Notifications**: SNS for push notifications, API Gateway WebSockets for real-time chat
- **Location Services**: Amazon Location Service integration with OpenStreetMap fallback
- **AI Processing**: Amazon Bedrock for LLM operations and intelligent recommendations

## 🏗️ System Architecture

### Frontend (React + TypeScript)
- **Dashboard**: Main monitoring interface for non-technical staff
- **Chatbot Tab**: Separate WhatsApp-style chat interface
- **Real-time Updates**: WebSocket connections for live data streaming
- **Responsive Design**: Mobile-friendly interface for field staff

### Backend Services (AWS)
- **API Gateway**: RESTful APIs and WebSocket connections
- **Lambda Functions**: Event processing, alert generation, and AI reasoning
- **DynamoDB**: Real-time data storage and audit trails
- **S3**: File storage for Excel/CSV uploads and event documentation
- **SNS**: Push notifications to mobile devices
- **EventBridge**: Event routing and scenario triggers

## 📊 Data Schema

### Required Excel/CSV Fields
```csv
event_name,location_name,expected_attendance,event_start_datetime,event_end_datetime
gates,transport_schedule,parking_capacity,weather_forecast
```

### Gate Configuration
```json
{
  "gate_id": "A",
  "gate_name": "Gate A - North", 
  "capacity_per_hour": 2000,
  "gps": "3.0485, 101.6795"
}
```

### Transport Schedule
```json
{
  "transport_type": "LRT",
  "stop_name": "Bukit Jalil Station",
  "arrival_datetime": "2025-10-10T19:10:00",
  "est_capacity": 1500
}
```

## 🚨 Alert Types & Examples

### Critical Alerts
- **Evacuation Orders**: Immediate safety threats requiring evacuation
- **Medical Emergencies**: Multiple incidents requiring medical response
- **Security Threats**: Safety incidents requiring immediate action

### Warning Alerts  
- **Gate Congestion**: Overcrowded entry points requiring crowd redirection
- **Weather Alerts**: Rain, storms, or extreme weather conditions
- **Transport Delays**: Major service disruptions affecting attendees

### Info Alerts
- **System Status**: Routine updates and operational information
- **Facility Updates**: Restroom availability, parking status, etc.

## 🎯 AI Input Orchestrator

The system features an intelligent Input Orchestrator that provides flexible event setup with multiple input modes:

### Input Modes
1. **Quick Start** - Load pre-configured Bukit Jalil sample data instantly
2. **File Upload** - Upload Excel (.xlsx) or PDF (.pdf) files with automatic data extraction
3. **Manual Entry** - Step-by-step form filling with real-time validation
4. **Location Selection** - Interactive map picker with known venue database

### Smart Features
- **WhatsApp-style Helper Tips**: Contextual guidance throughout the setup process
- **Auto-suggestion**: Known venues automatically populate capacity and gate configurations
- **Validation Engine**: Real-time validation with clear error messages
- **Assumption Tracking**: Clear indication when default values are used
- **Confirmation Flow**: Summary card with all details before proceeding

### Known Venues Database
- **Bukit Jalil National Stadium**: 50,000 capacity, 4 gates (A-D), GPS coordinates
- **Merdeka Square**: 10,000 capacity, 2 gates, GPS coordinates
- **Extensible**: Easy to add new venues with their configurations

### Example Flow
```
1. User selects "Bukit Jalil Stadium" on map
   → Bot: "📍 Location selected: Bukit Jalil Stadium (3.0480,101.6800). 
           Known capacity=50,000, gates A–D suggested. Please confirm or edit."

2. User uploads Excel with attendance & timings
   → Bot: "📂 Loaded attendance=48,700, start=7:30 PM, end=11:00 PM. 
           Gates missing. Using suggested gates from location. Please confirm."

3. User confirms
   → Bot: "✅ Event setup complete. Here's your summary card… [Proceed to Simulation]."
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with notification support

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd aws-crowd-safety-chatbot

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Usage

### 1. Initial Setup
- Open the application in your browser
- Choose "Load Sample Data" or upload your Excel/CSV file
- Verify required fields are present

### 2. Monitoring Dashboard
- **Event Overview**: View event details, gate configuration, and transport schedule
- **Real-time Monitor**: Live updates on weather, crowd status, and gate operations
- **Alerts Panel**: Manage and respond to safety alerts
- **Map View**: Interactive venue map with real-time status indicators
- **Scenario Simulator**: Test emergency response procedures

### 3. AI Safety Bot
- Click "Open AI Safety Bot" to launch the WhatsApp-style chat interface
- Receive proactive alerts and notifications
- Ask questions about weather, crowds, exits, transport, and facilities
- Get location-aware recommendations and map links

## 🔧 AWS Deployment

### Lambda Functions
```javascript
// Example: Alert Processing Function
exports.handler = async (event) => {
  const alert = JSON.parse(event.body);
  
  // Process alert severity and routing
  if (alert.severity === 'critical') {
    await sns.publish({
      TopicArn: process.env.CRITICAL_ALERTS_TOPIC,
      Message: JSON.stringify(alert)
    }).promise();
  }
  
  // Store in DynamoDB
  await dynamodb.put({
    TableName: 'Alerts',
    Item: alert
  }).promise();
  
  return { statusCode: 200 };
};
```

### DynamoDB Schema
```json
{
  "TableName": "EventData",
  "KeySchema": [
    { "AttributeName": "eventId", "KeyType": "HASH" },
    { "AttributeName": "timestamp", "KeyType": "RANGE" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "eventId", "AttributeType": "S" },
    { "AttributeName": "timestamp", "AttributeType": "S" }
  ]
}
```

### SNS Topics
- `critical-alerts` - Critical safety notifications
- `warning-alerts` - Warning level notifications  
- `info-alerts` - Informational updates
- `staff-notifications` - General staff communications

## 📱 Mobile Integration

### Push Notifications
- Native mobile app integration via SNS
- WhatsApp-style notification styling
- Location-aware alerts with map links
- Emergency contact integration

### Offline Capability
- Service worker for offline functionality
- Local data caching for critical information
- Sync when connection restored

## 🔒 Security & Compliance

### Data Protection
- All data encrypted in transit and at rest
- GDPR compliance for personal data handling
- Audit trails for all safety decisions
- Role-based access control

### Monitoring & Logging
- CloudWatch integration for system monitoring
- X-Ray tracing for performance analysis
- Comprehensive audit logs for compliance
- Real-time alerting for system issues

## 🚀 Production Deployment

### Infrastructure as Code
```yaml
# CloudFormation template example
Resources:
  CrowdSafetyAPI:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowMethods: "'GET,POST,OPTIONS'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization'"
        AllowOrigin: "'*'"
```

### CI/CD Pipeline
- Automated testing and deployment
- Blue-green deployment strategy
- Rollback capabilities
- Performance monitoring

## 📈 Performance Metrics

### Key Performance Indicators
- **Response Time**: < 2 seconds for critical alerts
- **Uptime**: 99.9% availability target
- **Accuracy**: > 95% alert accuracy rate
- **Coverage**: Real-time monitoring of all venue areas

### Monitoring Dashboard
- Real-time system health metrics
- Alert response time tracking
- Staff notification delivery rates
- Event safety incident tracking

## 🤝 Contributing

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Document all API endpoints
- Maintain security standards

### Code Review Process
- Automated linting and testing
- Security vulnerability scanning
- Performance impact assessment
- Documentation review

## 📞 Support

### Emergency Procedures
- Critical alerts trigger immediate notifications
- Escalation procedures for unresolved issues
- 24/7 monitoring during events
- Emergency contact integration

### Technical Support
- Comprehensive documentation
- API reference guides
- Troubleshooting guides
- Community support forums

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- AWS for cloud infrastructure services
- React community for frontend framework
- OpenStreetMap for mapping data
- Emergency services for safety protocols

---

**⚠️ Important**: This system is designed for demonstration purposes. For production deployment, ensure proper security hardening, compliance verification, and thorough testing with real event data.