import boto3
import json
from datetime import datetime
import random
from typing import Dict, List, Optional
import requests

class CrowdSafetyBot:
    def __init__(self):
        self.bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-west-2')
        # Initialize without weather first (since _get_weather reads event_data)
        self.event_data = {
            'event_name': 'Summer Music Festival 2025',
            'location': 'Central Park, New York',
            'gps': {'lat': 40.7829, 'lng': -73.9654},
            'attendance': 25000,
            'gates': {
                'A': {'capacity': 5000, 'current': 3500, 'status': 'open'},
                'B': {'capacity': 5000, 'current': 2500, 'status': 'open'},
                'C': {'capacity': 4000, 'current': 1000, 'status': 'open'},
                'D': {'capacity': 3000, 'current': 500, 'status': 'open'},
            },
            'start_time': '2025-07-15T18:00:00',
            'end_time': '2025-07-16T02:00:00',
            'weather': None,
            'last_updated': datetime.utcnow().isoformat()
        }
        # Now compute weather based on initialized GPS
        self.event_data['weather'] = self._get_weather()

    def _get_weather(self) -> Dict:
        """Fetch LIVE weather from Open-Meteo using current GPS."""
        lat = self.event_data.get('gps', {}).get('lat')
        lng = self.event_data.get('gps', {}).get('lng')
        if lat is None or lng is None:
            return {
                'condition': 'unknown',
                'temperature': None,
                'wind_speed': None,
                'last_updated': datetime.utcnow().isoformat(),
                'source': 'missing_gps'
            }

        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}"
                f"&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=auto"
            )
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()

            current = data.get('current', {})
            hourly = data.get('hourly', {})
            times = hourly.get('time', [])
            probs = hourly.get('precipitation_probability', [])
            now_hour = datetime.utcnow().isoformat()[:13]
            try:
                idx = next(i for i, t in enumerate(times) if t[:13] == now_hour)
            except StopIteration:
                idx = 0 if times else 0
            rain_prob = probs[idx] if isinstance(probs, list) and len(probs) > idx else None

            code = current.get('weather_code')
            condition = 'unknown'
            if code in [51,53,55,56,57,61,63,65,66,67,80,81,82]:
                condition = 'rain'
            elif code in [95,96,99]:
                condition = 'storm'
            elif code in [1,2,3]:
                condition = 'cloudy'
            elif code == 0:
                condition = 'clear'

            return {
                'condition': condition,
                'temperature': round(current.get('temperature_2m', 0), 1) if current.get('temperature_2m') is not None else None,
                'wind_speed': round(current.get('wind_speed_10m', 0), 1) if current.get('wind_speed_10m') is not None else None,
                'rain_probability': rain_prob,
                'last_updated': datetime.utcnow().isoformat(),
                'source': 'open-meteo'
            }
        except Exception as e:
            # Fallback with explicit LIVE failure marker (no fake values)
            return {
                'condition': 'unknown',
                'temperature': None,
                'wind_speed': None,
                'rain_probability': None,
                'last_updated': datetime.utcnow().isoformat(),
                'source': f'weather_error:{str(e)[:60]}'
            }

    def _call_bedrock(self, prompt: str) -> str:
        """Call AWS Bedrock to generate a response"""
        try:
            body = json.dumps({
                "prompt": f"""You are a Crowd Safety Assistant. Provide a short, actionable response in the specified format.
                
                Context:
                {json.dumps(self.event_data, indent=2)}
                
                User message: {prompt}
                
                Format your response as a WhatsApp-style message with:
                1. An emoji header
                2. One-line reason
                3. One-line action
                
                Example: "🚨 Gate A full (3.5k). Action: Redirect 20% to Gate C. [LIVE]"
                
                Response:""",
                "max_tokens_to_sample": 150,
                "temperature": 0.7,
                "top_p": 0.9,
            })

            response = self.bedrock_runtime.invoke_model(
                modelId='anthropic.claude-v2',
                body=body,
                accept='application/json',
                contentType='application/json'
            )
            
            response_body = json.loads(response.get('body').read())
            return response_body.get('completion', 'Sorry, I could not process that request.').strip()
            
        except Exception as e:
            return f"⚠️ Error: {str(e)}. Please try again."

    def process_message(self, message: str) -> str:
        """Process incoming message and return response"""
        # Update event data before processing
        self.event_data['weather'] = self._get_weather()
        self.event_data['last_updated'] = datetime.utcnow().isoformat()
        
        # Update gate statuses based on some logic
        self._update_gate_status()
        
        # Get response from Bedrock
        return self._call_bedrock(message)
    
    def _update_gate_status(self):
        """Simulate gate status changes"""
        for gate in self.event_data['gates'].values():
            # Randomly adjust gate counts slightly
            change = random.randint(-50, 50)
            gate['current'] = max(0, min(gate['capacity'], gate['current'] + change))
            
            # Randomly change gate status (5% chance)
            if random.random() < 0.05:
                gate['status'] = random.choice(['open', 'closed', 'delayed'])

def create_chatbot():
    """Factory function to create a new chatbot instance"""
    return CrowdSafetyBot()
