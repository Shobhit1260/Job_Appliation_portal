# Job Tracker API

A FastAPI-based backend for tracking job applications.

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd job_tracker/backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Copy the `.env.example` file to `.env` and update the values:
```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration:
- Update `DATABASE_URL` with your PostgreSQL credentials
- Generate a secure `SECRET_KEY` (minimum 32 characters)
- Configure CORS `ALLOWED_ORIGINS` for your frontend
- Optional: Configure email settings for notifications

### 5. Database Setup
Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE Job_application_portal;
```

### 6. Run the Application
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## Project Structure
```
backend/
├── app/
│   ├── auth/           # Authentication routes and utilities
│   ├── config.py       # Configuration management
│   ├── database.py     # Database connection
│   ├── main.py         # FastAPI application
│   ├── models.py       # SQLAlchemy models
│   └── schema.py       # Pydantic schemas
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment file
├── .gitignore          # Git ignore rules
└── requirements.txt    # Python dependencies
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user

## Security Notes
- Never commit `.env` file to version control
- Change the default `SECRET_KEY` in production
- Use strong database passwords
- Update `ALLOWED_ORIGINS` to match your frontend domain in production

## Containerized Run (Local)

Use Docker Compose to run API + PostgreSQL + Redis together:

```bash
docker compose up --build -d
```

Check health:

```bash
curl http://localhost:8000/healthz
```

Stop stack:

```bash
docker compose down
```

## CI Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

- Lint: critical Ruff checks
- Tests: `pytest backend/tests`
- Container build smoke check

This runs on pull requests and pushes to `main` for backend changes.

## CD Pipeline (AWS)

GitHub Actions workflow (`.github/workflows/cd.yml`) performs:

1. Build and push image to Amazon ECR.
2. Deploy to ECS staging service.
3. Run staging smoke test.
4. Optional manual promotion to ECS production service.
5. Run production smoke test.

Deployment includes explicit migration execution via:

```bash
alembic upgrade head
```

## Production Environment Template

Use `backend/.env.production.example` as the starting point for production secrets.

## Full Guide

Read `backend/docs/PRODUCTION_CICD_GUIDE.md` for:

- Required secrets setup
- AWS staging/production deployment flow
- Extension roadmap
- Interview explanation script
