# Backend Endpoint Inventory

This file lists all currently defined backend endpoints with their full paths.

## System

- GET /healthz

## Auth (prefix: /auth)

- POST /auth/register
- POST /auth/login
- POST /auth/login/verify
- POST /auth/verify-email/request
- POST /auth/verify-email
- GET /auth/oauth/{provider}/login
- GET /auth/oauth/{provider}/callback
- POST /auth/forgot-password
- POST /auth/reset-password

## Applications (prefix: /application)

- POST /application/create_application
- GET /application/getallApplication
- GET /application/getApplication/{id}
- PATCH /application/update_application/{id}
- DELETE /application/delete_application/{id}
- POST /application/applications/{id}/screening-answers
- GET /application/gettimeline/{id}

## Resume (prefix: /resume)

- GET /resume/resumes/upload-url
- POST /resume/confirm_upload
- GET /resume/resumes
- GET /resume/get_resume/{id}
- DELETE /resume/delete_resume/{id}

## Reminder (prefix: /reminder)

- POST /reminder/create_reminder
- GET /reminder/reminders

## Dashboard (prefix: /dashboard)

- GET /dashboard/get_dashboard

## Auto-generated FastAPI docs endpoints

- GET /docs
- GET /redoc
- GET /openapi.json
