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
