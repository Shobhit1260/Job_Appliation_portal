from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class Create_user(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class Login_user(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class VerifyEmailCode(BaseModel):
    email: EmailStr
    code: str


class RequestEmailCode(BaseModel):
    email: EmailStr


class VerifyLoginOtp(BaseModel):
    email: EmailStr
    code: str


    
