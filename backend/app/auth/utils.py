from passlib.context import CryptContext
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from datetime import timedelta, datetime
import hashlib
import secrets

from jose import JWTError, ExpiredSignatureError, jwt
from app.config import settings


hasher = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_password(password: str) -> str:
    return hasher.hash(password)


def verify_password(password: str, db_password: str) -> bool:
    if db_password.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), db_password.encode("utf-8"))
        except ValueError:
            return False

    try:
        return hasher.verify(password, db_password)
    except ValueError:
        return False

def create_access_token(data: dict, expire_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    if expire_delta:
        expiry = datetime.utcnow() + expire_delta
    else:
        expiry = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expiry})
    access_token = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return access_token


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_rndm_token(expires_in_minutes: int = 15) -> tuple[str, str, datetime]:
    raw_token = secrets.token_urlsafe(32)
    hashed_token = hash_token(raw_token)
    expiry_date = datetime.utcnow() + timedelta(minutes=expires_in_minutes)

    return raw_token, hashed_token, expiry_date


def create_otp_code(length: int = 6) -> str:
    if length < 4:
        length = 4
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


def is_valid_code(
    raw_code: str,
    code_hash: Optional[str],
    expires_at: Optional[datetime],
) -> bool:
    if not raw_code or not code_hash or not expires_at:
        return False

    if datetime.utcnow() > expires_at:
        return False

    return secrets.compare_digest(hash_token(raw_code), code_hash)


def is_valid_reset_token(
    raw_token: str,
    token_hash: Optional[str],
    expires_at: Optional[datetime]
) -> bool:

    if not raw_token or not token_hash or not expires_at:
        return False

    if datetime.utcnow() > expires_at:
        return False

    return secrets.compare_digest(hash_token(raw_token), token_hash)


def get_current_user(token: str = Depends(oauth2_scheme)):

    payload = verify_token(token)
    print("payload",payload) 
    user_id = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return user_id

