from passlib.context import CryptContext
from fastapi import Depends,HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from datetime import timedelta, datetime
import hashlib
import secrets
from app.config import settings
from jose import JWTError,jwt

hasher = CryptContext(schemes=["bcrypt"], deprecated="auto")
OAuth2_scheme=OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_password(password:str)->str:
    return hasher.hash(password)

def verify_password(password:str,db_password:str)->bool:
    return hasher.verify(password,db_password)

def create_access_token(data:dict,expire_delta:Optional[timedelta]=None)->str:
    to_encode=data.copy()
    if expire_delta:
     expiry=datetime.utcnow()+expire_delta
    else:
     expiry=datetime.utcnow()+timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp':expiry}) 
    access_token=jwt.encode(to_encode,settings.SECRET_KEY,algorithm="HS256")  
    return access_token  

def verify_token(token:str)->dict:
   try:
      payload=jwt.decode(token,settings.SECRET_KEY,algorithms=["HS256"])
      return payload 
   except jwt.ExpiredSignatureError:
      raise JWTError("Token expired")
   except jwt.InvalidTokenError:
      raise JWTError("Invalid Token")
   
def hash_token(token:str)->str:
   return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_rndm_token(expires_in_minutes: int = 15)->tuple[str,str,datetime]:
   raw_token=secrets.token_urlsafe(32)
   hashed_token=hash_token(raw_token)
   expiry_date=datetime.utcnow() +timedelta(minutes=expires_in_minutes)
   return raw_token,hashed_token,expiry_date  


def is_valid_reset_token(raw_token: str, token_hash: Optional[str], expires_at: Optional[datetime]) -> bool:
   if not raw_token or not token_hash or not expires_at:
      return False
   if datetime.utcnow() > expires_at:
      return False
   return secrets.compare_digest(hash_token(raw_token), token_hash)



def get_current_user(token: str = Depends(OAuth2_scheme)):

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id

    except JWTError:
        raise HTTPException(status_code=401, detail="Token is invalid")   


