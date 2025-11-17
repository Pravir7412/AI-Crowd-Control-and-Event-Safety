import json
from src.handlers.file_upload_handler import handle_file_upload

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    if event.get('httpMethod') == 'POST' and event.get('path') == '/upload':
        return handle_file_upload(event)
    else:
        return {
            'statusCode': 404,
            'body': json.dumps('Not Found: Use /upload for file uploads.')
        }
