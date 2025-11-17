from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict
import json
import uvicorn
import os

from services.crowd_safety_bot import create_chatbot
from handlers.file_upload_handler import handle_file_upload
from handlers import data_parser as dp

app = FastAPI(title="Crowd Safety Chatbot API")

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create chatbot instance
chatbot = create_chatbot()

class ChatMessage(BaseModel):
    message: str
    sender: str = "user"

class UploadBody(BaseModel):
    file_content: str
    file_name: str
    content_type: str

@app.get("/")
async def root():
    return {"message": "Crowd Safety Chatbot API is running"}

@app.post("/api/chat")
async def chat(chat_message: ChatMessage):
    """Handle chat messages via HTTP POST"""
    response = chatbot.process_message(chat_message.message)
    return {"response": response}

@app.post("/upload")
async def upload(data: UploadBody):
    """Local-friendly upload endpoint: tries S3-based handler first, falls back to direct parse."""
    # Try the Lambda-style handler (will attempt S3 + parsing)
    try:
        event = {
            'httpMethod': 'POST',
            'path': '/upload',
            'body': json.dumps(data.dict())
        }
        resp = handle_file_upload(event)
        status = resp.get('statusCode', 500)
        if status == 200:
            body = json.loads(resp.get('body', '{}'))
            return body
    except Exception as e:
        print(f"handle_file_upload failed, falling back to direct parse: {e}")

    # Fallback: parse locally without S3
    import base64
    try:
        file_bytes = base64.b64decode(data.file_content)
        normalized = None
        if data.content_type in ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'):
            normalized = dp.parse_excel_file(file_bytes)
        elif data.content_type == 'application/pdf':
            normalized = dp.parse_pdf_file(file_bytes)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported content_type: {data.content_type}")

        if not normalized:
            normalized = dp._build_sample_event()

        return {
            'message': 'Parsed locally (fallback).',
            's3_key': None,
            'data': normalized
        }
    except Exception as e:
        print(f"Local parse failed: {e}")
        # Final fallback: sample data
        return {
            'message': 'Loaded sample fallback.',
            's3_key': None,
            'data': dp._build_sample_event()
        }

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Handle WebSocket connections for real-time chat"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message with chatbot
            response = chatbot.process_message(message_data["message"])
            
            # Send response back to client
            await manager.send_message(
                json.dumps({"sender": "bot", "message": response}),
                client_id
            )
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        manager.disconnect(client_id)

# Mount static files for the frontend
app.mount("/", StaticFiles(directory="public", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
