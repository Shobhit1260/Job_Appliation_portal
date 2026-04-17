# Job Tracker Backend

This backend powers a Job Tracker application built with FastAPI, PostgreSQL, Redis caching, and AWS S3 resume storage.

## What This Backend Provides

- User authentication and account access flows.
- Job application tracking with filters, pagination, and timeline events.
- Resume upload workflow with S3 pre-signed URLs and version history.
- Reminder management for upcoming job-related actions.
- Dashboard analytics for funnel and KPI insights.
- Health monitoring endpoint for deployment checks.

## Core Feature Modules

### 1. Authentication
Base path: `/auth`

- Register new users.
- Login with JWT access token response.
- Forgot-password flow with reset token generation.
- Reset-password flow with token validation.

### 2. Applications
Base path: `/application`

- Create a new application record.
- Get all applications with optional filters:
  - `status`
  - `portal`
  - `search`
  - pagination (`page`, `page_size`)
- Get one application with related data:
  - screening answers
  - timeline events
  - reminders
  - linked resume
- Update application details.
- Track status changes with timeline event creation.
- Delete application.
- Save screening question/answer pairs.
- Get timeline history for an application.

### 3. Resume Management
Base path: `/resume`

- Generate pre-signed S3 upload URL.
- Confirm upload and register metadata in DB.
- Validate uploaded file type and size.
- Prevent duplicate resume upload (hash-based dedup).
- Auto-increment resume version per user.
- List user resumes.
- Fetch a single resume with pre-signed download URL.
- Delete resume and remove object from S3.

### 4. Reminders
Base path: `/reminder`

- Create reminder for a future date/time.
- Link reminders to specific applications.
- List reminders with optional filters:
  - `is_sent`
  - `application_id`

### 5. Dashboard
Base path: `/dashboard`

- Total application count.
- Distribution by status.
- Distribution by portal.
- Funnel metrics:
  - applied
  - screened
  - interviewed
  - offered
- KPI metrics:
  - response rate
  - offer rate
  - ghosted count
  - rejected count

## Health and Reliability

- Readiness endpoint: `GET /healthz`
- Checks database connectivity.
- Checks Redis state when caching is enabled.
- Returns service status as `ok` or `degraded`.

## Tech Stack

- FastAPI
- SQLAlchemy
- Alembic (migrations)
- PostgreSQL
- Redis + fastapi-cache2
- AWS S3 (boto3)
- JWT auth (`python-jose`)
- Password hashing (`passlib[bcrypt]`)

## Data Model Summary

Main entities:

- `User`
- `Application`
- `Resume`
- `ScreeningAnswer`
- `TimelineEvent`
- `Reminder`
- `InterviewPrep`

Relationships are user-centric with cascade deletes for related records.

## Caching Strategy

Redis-based endpoint caching is implemented for:

- application lists/details/timelines
- resume lists/details
- reminder lists
- dashboard summaries

Relevant cache keys are invalidated after create/update/delete operations.

## Environment and Configuration

Configuration is managed through `.env` and loaded from `app/config.py`.

Important settings include:

- App/server: `APP_NAME`, `HOST`, `PORT`
- Database: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Security: `SECRET_KEY`, `ALGORITHM`, token expiry settings
- CORS: `ALLOWED_ORIGINS`, `ALLOW_METHODS`, `ALLOW_HEADERS`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `ENABLE_CACHING`
- AWS: `AWS_REGION`, `S3_BUCKET_NAME`, credentials
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`

For local development, run Mailpit on `localhost:1025` and open the inbox at `http://localhost:8025`. Production should point these same SMTP settings at your real mail provider.

## How to Run (Local)

1. Create and activate virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Configure `.env` values.
4. Run migrations.
5. Start API server:
   - `uvicorn app.main:app --reload`

## How to Run (Docker Compose)

From the `backend` folder:

- `docker compose up --build`

Services started:

- `mailpit` on ports 1025 and 8025
- `api` on port 8000
- `postgres` on port 5432
- `redis` on port 6379

## API Discoverability

Once running, interactive API docs are available at:

- `/docs` (Swagger UI)
- `/redoc` (ReDoc)

## Suggested Frontend Use

A frontend can use this backend to:

- authenticate users and store JWT token
- manage and filter application pipelines
- upload and version resumes via S3 upload URLs
- set reminders and show pending actions
- render dashboard analytics and KPIs
