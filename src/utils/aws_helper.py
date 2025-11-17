import boto3
import os

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
