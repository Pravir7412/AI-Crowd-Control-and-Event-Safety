import json
import base64
from datetime import datetime
from src.utils.aws_helper import S3Helper
from src.handlers.data_parser import parse_file_data

def handle_file_upload(event):
    s3_helper = S3Helper()
    
    try:
        # Assuming file content is sent as base64 encoded string in the event body
        body = json.loads(event['body'])
        file_content_base64 = body['file_content']
        file_name = body['file_name']
        content_type = body.get('content_type', 'application/octet-stream')

        file_content = base64.b64decode(file_content_base64)
        
        # Add a timestamp to the filename to avoid overwrites and ensure uniqueness
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_file_name = f"{timestamp}_{file_name}"

        if s3_helper.upload_file(file_content, unique_file_name, content_type):
            # After successful upload, parse the file
            parsed_result = parse_file_data(unique_file_name, content_type)
            
            if parsed_result['status'] == 'success':
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': f'File {file_name} uploaded and parsed successfully as {unique_file_name}.',
                        's3_key': unique_file_name,
                        # Return normalized JSON as provided by the parser
                        'data': parsed_result['data']
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'message': f"File uploaded but failed to parse: {parsed_result['message']}",
                        's3_key': unique_file_name
                    })
                }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({'message': 'Failed to upload file to S3.'})
            }
    except KeyError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': f'Missing required field in request body: {e}'})
        }
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid JSON in request body.'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': f'An unexpected error occurred: {str(e)}'})
        }
