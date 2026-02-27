 # 🎯 Dependency Injection Cheat Sheet for FastAPI

## When Do I Use Depends()?

### ✅ YES - Use Dependency Injection When:

#### 1️⃣ **You Need Database Access**
```python
@router.get("/items")
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
```
**Why?** Automatically handles opening/closing database connections.

---

#### 2️⃣ **You Need the Logged-In User**
```python
@router.get("/my-jobs")
def my_jobs(current_user: User = Depends(get_current_user)):
    # current_user is automatically populated
    return {"user": current_user.name}
```
**Why?** Avoids copy-pasting token verification code in every route.

---

#### 3️⃣ **You Need to Validate Permissions**
```python
@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin)  # Custom dependency
):
    # Only admins reach this point
```
**Why?** Centralizes permission checks.

---

#### 4️⃣ **You Need Both User AND Database**
```python
@router.post("/jobs")
def create_job(
    job_data: JobSchema,
    current_user: User = Depends(get_current_user),  # ← Need user
    db: Session = Depends(get_db)                    # ← Need database
):
    new_job = Job(**job_data.dict(), user_id=current_user.id)
    db.add(new_job)
    db.commit()
    return new_job
```
**Why?** Both dependencies are automatically injected!

---

#### 5️⃣ **You Want to Reuse Complex Logic**
```python
# Instead of repeating this in every route:
def my_route():
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(401)
    user = decode_and_verify(token)
    if not user:
        raise HTTPException(401)
    # ... rest of logic

# Do this ONCE:
def get_current_user(token: str = Depends(oauth2_scheme)):
    user = decode_and_verify(token)
    if not user:
        raise HTTPException(401)
    return user

# Then use everywhere:
@router.get("/route1")
def route1(user: User = Depends(get_current_user)):
    ...

@router.get("/route2")
def route2(user: User = Depends(get_current_user)):
    ...
```

---

### ❌ NO - Don't Use Dependency Injection When:

#### 1️⃣ **Simple Calculations**
```python
# ❌ DON'T DO THIS
def calculate_tax(price: float = Depends(lambda: 100)):
    return price * 0.1

# ✅ DO THIS
def calculate_tax(price: float):
    return price * 0.1
```

#### 2️⃣ **Constants or Config (just import)**
```python
# ❌ OVERKILL
@router.get("/info")
def info(app_name: str = Depends(lambda: settings.APP_NAME)):
    return app_name

# ✅ SIMPLER
from app.config import settings

@router.get("/info")
def info():
    return settings.APP_NAME
```

#### 3️⃣ **When You Don't Share Logic**
If the logic is used in only ONE place, Depends() is overkill.

---

## 🎭 Dependency Chaining (Advanced)

Dependencies can depend on other dependencies!

```python
# Level 1: Get database
def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()

# Level 2: Get user (depends on database)
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)  # ← Uses Level 1
):
    user = verify_token(token, db)
    return user

# Level 3: Verify user is admin (depends on user)
def require_admin(
    current_user: User = Depends(get_current_user)  # ← Uses Level 2
):
    if not current_user.is_admin:
        raise HTTPException(403)
    return current_user

# Use in route:
@router.delete("/admin/delete-everything")
def nuclear_option(admin: User = Depends(require_admin)):  # ← Uses Level 3
    # All 3 levels executed automatically!
    # 1. Database opened
    # 2. Token verified, user fetched
    # 3. Admin status checked
```

---

## 🔑 Quick Decision Tree

```
Need something in your route?
│
├─ Is it from a REQUEST (token, user, headers)?
│  └─ YES → Use Depends()
│
├─ Is it from a DATABASE or external service?
│  └─ YES → Use Depends(get_db) or similar
│
├─ Is it REUSED across multiple routes?
│  └─ YES → Use Depends()
│
├─ Is it a simple parameter/calculation?
│  └─ NO → Just use a regular function parameter
│
└─ Is it a constant/config?
   └─ NO → Just import it directly
```

---

## 📝 Real Examples from Your Job Tracker

### Example 1: Create a Job Application (Protected)
```python
@router.post("/applications")
def create_application(
    app_data: ApplicationSchema,
    current_user: User = Depends(get_current_user),  # ← Who is creating?
    db: Session = Depends(get_db)                    # ← Where to save?
):
    new_app = Application(
        **app_data.dict(),
        user_id=current_user.id  # ← Use the injected user!
    )
    db.add(new_app)
    db.commit()
    return new_app
```

### Example 2: Get User's Applications Only
```python
@router.get("/my-applications")
def get_my_applications(
    current_user: User = Depends(get_current_user),  # ← Who is asking?
    db: Session = Depends(get_db)
):
    # Only return THIS user's applications
    apps = db.query(Application).filter(
        Application.user_id == current_user.id
    ).all()
    return apps
```

### Example 3: Update Application (Must Own It)
```python
def verify_application_owner(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Custom dependency - checks ownership"""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.user_id != current_user.id:
        raise HTTPException(403, "Not your application")
    return app

@router.put("/applications/{application_id}")
def update_application(
    updates: ApplicationSchema,
    application: Application = Depends(verify_application_owner),  # ← Custom!
    db: Session = Depends(get_db)
):
    # application is already verified to belong to current user!
    application.company = updates.company
    db.commit()
    return application
```

---

## 💡 Key Takeaway

**Use `Depends()` when you need:**
- Database access
- Current user
- Permission checks
- Shared logic across routes

**Don't use `Depends()` for:**
- Simple calculations
- Constants (just import)
- One-off logic

---

## 🚀 Practice Exercise

Try creating a route that:
1. Requires login (use `Depends(get_current_user)`)
2. Needs database (use `Depends(get_db)`)
3. Creates a job application for the logged-in user

```python
@router.post("/jobs/{job_id}/apply")
def apply_to_job(
    job_id: int,
    application_data: ApplicationSchema,
    current_user: User = Depends(get_current_user),  # ← You need this!
    db: Session = Depends(get_db)                    # ← And this!
):
    # Your code here!
    pass
```

Good luck! 🎉
