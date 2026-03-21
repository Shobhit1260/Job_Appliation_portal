import boto3
from botocore.exceptions import NoCredentialsError
from app.config import settings

AWS_REGION = settings.AWS_REGION
BUCKET = settings.S3_BUCKET_NAME


def _create_s3_client():
    client_kwargs = {"region_name": AWS_REGION}

    # If credentials are provided in .env, pass them directly to boto3.
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    if settings.AWS_SESSION_TOKEN:
        client_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

    return boto3.client("s3", **client_kwargs)


s3 = _create_s3_client()

def generate_upload_url(key: str):
    try:
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
    except NoCredentialsError as exc:
        raise RuntimeError(
            "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env."
        ) from exc


def generate_download_url(key: str):
    try:
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BUCKET,
                "Key": key
            },
            ExpiresIn=3600  # 1 hour
        )
        return url
    except NoCredentialsError as exc:
        raise RuntimeError(
            "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env."
        ) from exc