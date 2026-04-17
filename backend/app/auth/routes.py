from datetime import timedelta, datetime
import secrets

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import auth
from app.auth import utils
from app.auth.email_service import send_email, is_email_enabled
from app.config import settings

router = APIRouter()
oauth = OAuth()

if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


def _send_verification_code(email: str, code: str) -> bool:
    subject = "Verify your Job Tracker account"
    text_body = (
        f"Your Job Tracker verification code is: {code}\n"
        f"This code expires in {settings.EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES} minutes."
    )
    html_body = (
        "<p>Your Job Tracker verification code is:</p>"
        f"<h2>{code}</h2>"
        f"<p>This code expires in {settings.EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES} minutes.</p>"
    )
    return send_email(email, subject, text_body, html_body)


def _send_login_otp(email: str, code: str) -> bool:
    subject = "Your Job Tracker login code"
    text_body = (
        f"Your login verification code is: {code}\n"
        f"This code expires in {settings.LOGIN_OTP_EXPIRE_MINUTES} minutes."
    )
    html_body = (
        "<p>Your login verification code is:</p>"
        f"<h2>{code}</h2>"
        f"<p>This code expires in {settings.LOGIN_OTP_EXPIRE_MINUTES} minutes.</p>"
    )
    return send_email(email, subject, text_body, html_body)


def _get_oauth_client(provider: str):
    client = oauth.create_client(provider)
    if client is None:
        raise HTTPException(status_code=400, detail=f"{provider} OAuth is not configured")
    return client

@router.post("/register")
def register(user: auth.Create_user, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    email_enabled = is_email_enabled()
    if not email_enabled:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please configure SMTP settings.",
        )

    hashed_pw = utils.hash_password(user.password)
    verification_code = utils.create_otp_code()
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_pw,
        email_verified=False,
        email_verification_code_hash=utils.hash_token(verification_code),
        email_verification_expires_at=datetime.utcnow() + timedelta(
            minutes=settings.EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES
        ),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    sent = _send_verification_code(new_user.email, verification_code)
    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Unable to send verification email. Please check SMTP configuration.",
        )

    return {"message": "User created. Verification code sent to your email."}

@router.post("/login")
def login(user:auth.Login_user, db: Session = Depends(get_db)):
    email=user.email
    db_user=db.query(models.User).filter(models.User.email == email).first()

    if not db_user:
        raise HTTPException(status_code=401,detail="Invalid email or password")

    pw=utils.verify_password(user.password, db_user.password)

    if not pw:
        raise HTTPException(status_code=401,detail="Invalid email or Password")

    email_enabled = is_email_enabled()

    if not db_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before login.",
        )

    if not email_enabled:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please configure SMTP settings.",
        )

    otp_code = utils.create_otp_code()
    db_user.login_otp_code_hash = utils.hash_token(otp_code)
    db_user.login_otp_expires_at = datetime.utcnow() + timedelta(
        minutes=settings.LOGIN_OTP_EXPIRE_MINUTES
    )
    db.commit()

    sent = _send_login_otp(db_user.email, otp_code)
    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Unable to send login verification code.",
        )

    return {
        "message": "Verification code sent to email",
        "requires_2fa": True,
    }


@router.post("/login/verify")
def verify_login_otp(payload: auth.VerifyLoginOtp, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid verification request")

    is_valid = utils.is_valid_code(
        payload.code,
        db_user.login_otp_code_hash,
        db_user.login_otp_expires_at,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    db_user.login_otp_code_hash = None
    db_user.login_otp_expires_at = None
    db.commit()

    access_token = utils.create_access_token(
        {"user_id": str(db_user.id)},
        expire_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token":access_token,
        "user":{
            "email": db_user.email
        }
    }


@router.post("/verify-email/request")
def request_email_verification(payload: auth.RequestEmailCode, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not existing_user or existing_user.email_verified:
        return {"message": "If your account exists, a verification email has been sent."}

    email_enabled = is_email_enabled()
    if not email_enabled:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please configure SMTP settings.",
        )

    code = utils.create_otp_code()
    existing_user.email_verification_code_hash = utils.hash_token(code)
    existing_user.email_verification_expires_at = datetime.utcnow() + timedelta(
        minutes=settings.EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES
    )
    db.commit()

    sent = _send_verification_code(existing_user.email, code)
    if not sent:
        raise HTTPException(status_code=500, detail="Unable to send verification email")

    return {"message": "Verification code sent to email."}


@router.post("/verify-email")
def verify_email(payload: auth.VerifyEmailCode, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_valid = utils.is_valid_code(
        payload.code,
        existing_user.email_verification_code_hash,
        existing_user.email_verification_expires_at,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    existing_user.email_verified = True
    existing_user.email_verification_code_hash = None
    existing_user.email_verification_expires_at = None
    db.commit()

    return {"message": "Email verified successfully"}


@router.get("/oauth/{provider}/login")
async def oauth_login(provider: str, request: Request):
    provider = provider.lower()
    if provider != "google":
        raise HTTPException(status_code=400, detail="Unsupported provider")

    client = _get_oauth_client(provider)
    redirect_uri = request.url_for("oauth_callback", provider=provider)
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/oauth/{provider}/callback", name="oauth_callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    provider = provider.lower()
    if provider != "google":
        raise HTTPException(status_code=400, detail="Unsupported provider")

    client = _get_oauth_client(provider)
    token = await client.authorize_access_token(request)

    email = None
    display_name = None

    if provider == "google":
        user_resp = await client.get("https://openidconnect.googleapis.com/v1/userinfo", token=token)
        user_info = user_resp.json()
        email = user_info.get("email")
        display_name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Unable to read email from OAuth provider")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        generated_password = utils.hash_password(secrets.token_urlsafe(32))
        user = models.User(
            name=display_name or email.split("@")[0],
            email=email,
            password=generated_password,
            email_verified=True,
            oauth_provider=provider,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.email_verified = True
        if not user.oauth_provider:
            user.oauth_provider = provider
        db.commit()

    access_token = utils.create_access_token(
        {"user_id": str(user.id)},
        expire_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    if settings.FRONTEND_URL:
        redirect_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback"
            f"?token={access_token}&provider={provider}&email={user.email}"
        )
        return RedirectResponse(url=redirect_url)

    return {
        "access_token": access_token,
        "user": {
            "email": user.email,
        },
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

     
    






