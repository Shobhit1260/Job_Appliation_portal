from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas import auth
from app.auth import utils
from datetime import timedelta

router = APIRouter()

@router.post("/register")
def register(user: auth.Create_user, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    hashed_pw = utils.hash_password(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@router.post("/login")
def login(user:auth.Login_user, db: Session = Depends(get_db)):
    email=user.email
    db_user=db.query(models.User).filter(models.User.email == email).first()
    
    if not db_user:
        raise HTTPException(status_code=401,detail="Invalid email or password")
    
    pw=utils.verify_password(user.password, db_user.password)

    if not pw:
        raise HTTPException(status_code=401,detail="Invalid email or Password")
    access_token = utils.create_access_token(
        {"user_id": str(db_user.id)},
        expire_delta=timedelta(minutes=30)
        
    )

    return {
        "access_token":access_token,
        "user":{
            "email": db_user.email
        }
    }

@router.post("/forgot-password")
def forget_password(data:auth.ForgotPassword,db: Session=Depends(get_db)):
    existing_user=db.query(models.User).filter(models.User.email==data.email).first()
    

    if not existing_user:
        return {"message": "If this email exists, reset link has been sent"}
    
    reset_password_token = utils.create_rndm_token()
    raw_token, hashed_token, expiry_date = reset_password_token

    existing_user.reset_token_hash = hashed_token
    existing_user.reset_token_expires_at = expiry_date

    db.commit()

    return {
       "message": "Password reset token generated", 
       "raw_token": raw_token,
       "expires_at": expiry_date
     }


@router.post("/reset-password")
def reset_password(payload: auth.ResetPassword, db: Session = Depends(get_db)):
    token_hash = utils.hash_token(payload.token)
    existing_user = db.query(models.User).filter(models.User.reset_token_hash == token_hash).first()

    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    is_valid = utils.is_valid_reset_token(
        payload.token,
        existing_user.reset_token_hash,
        existing_user.reset_token_expires_at,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    existing_user.password = utils.hash_password(payload.new_password)
    existing_user.reset_token_hash = None
    existing_user.reset_token_expires_at = None

    db.commit()

    return {"message": "Password reset successful"}

     
    






