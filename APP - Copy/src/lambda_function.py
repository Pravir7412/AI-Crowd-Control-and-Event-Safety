import json
from src.handlers.file_upload_handler import handle_file_upload

def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    }

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': _cors_headers(),
            'body': ''
        }

    if event.get('httpMethod') == 'POST' and event.get('path') == '/upload':
        resp = handle_file_upload(event)
        # Ensure CORS headers present
        resp['headers'] = {**_cors_headers(), **resp.get('headers', {})}
        return resp
    else:
        return {
            'statusCode': 404,
            'headers': _cors_headers(),
            'body': json.dumps('Not Found: Use /upload for file uploads.')
        }
