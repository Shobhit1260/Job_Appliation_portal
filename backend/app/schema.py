from pydantic import BaseModel, EmailStr


class Create_user(BaseModel):
    name: str
    email: EmailStr
    password: str


class Login_user(BaseModel):
    email: EmailStr
    password: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str