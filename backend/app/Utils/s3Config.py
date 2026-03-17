import boto3
import os

AWS_REGION = os.getenv("AWS_REGION")
BUCKET = os.getenv("S3_BUCKET_NAME")

s3 = boto3.client("s3", region_name=AWS_REGION)

def generate_upload_url(key: str):
    url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": BUCKET,
            "Key": key,
            "ContentType": "application/pdf"
        },
        ExpiresIn=300
    )
    return url


def generate_download_url(key: str):
    url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": BUCKET,
            "Key": key
        },
        ExpiresIn=3600  # 1 hour
    )
    return url