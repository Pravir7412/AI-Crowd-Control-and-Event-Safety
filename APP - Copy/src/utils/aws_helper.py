import boto3
import os
from typing import List, Dict, Any

class S3Helper:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.environ.get('S3_BUCKET_NAME', 'crowd-safety-input-files') # Default bucket name

    def upload_file(self, file_content: bytes, file_name: str, content_type: str):
        try:
            self.s3_client.put_object(Bucket=self.bucket_name, Key=file_name, Body=file_content, ContentType=content_type)
            print(f"File {file_name} uploaded to S3 bucket {self.bucket_name}")
            return True
        except Exception as e:
            print(f"Error uploading file to S3: {e}")
            return False

    def download_file(self, s3_key: str):
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            file_content = response['Body'].read()
            print(f"File {s3_key} downloaded from S3 bucket {self.bucket_name}")
            return file_content
        except Exception as e:
            print(f"Error downloading file from S3: {e}")
            return None


class DynamoDBHelper:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.event_table_name = os.environ.get('DDB_EVENT_TABLE', 'EventData')
        self.attendee_table_name = os.environ.get('DDB_ATTENDEE_TABLE', 'Attendees')

    def put_event(self, item: Dict[str, Any]):
        try:
            table = self.dynamodb.Table(self.event_table_name)
            table.put_item(Item=item)
            return True
        except Exception as e:
            print(f"Error writing event to DynamoDB: {e}")
            return False

    def batch_put_attendees(self, items: List[Dict[str, Any]]):
        try:
            table = self.dynamodb.Table(self.attendee_table_name)
            with table.batch_writer(overwrite_by_pkeys=['event_id', 'attendee_id']) as batch:
                for it in items:
                    batch.put_item(Item=it)
            return True
        except Exception as e:
            print(f"Error batch writing attendees to DynamoDB: {e}")
            return False


class SNSHelper:
    def __init__(self):
        self.sns = boto3.client('sns')
        self.topic_arn = os.environ.get('SNS_ALERTS_TOPIC_ARN', '')

    def publish_alert(self, message: str, subject: str = 'Event Safety Alert'):
        if not self.topic_arn:
            print("SNS topic ARN not configured; skipping publish.")
            return False
        try:
            self.sns.publish(TopicArn=self.topic_arn, Message=message, Subject=subject)
            return True
        except Exception as e:
            print(f"Error publishing to SNS: {e}")
            return False
