from sqlalchemy.orm import Session
from fastapi import APIRouter,Depends,HTTPException, Query
from app.database import get_db
from app.auth.utils import get_current_user
from app.Utils.s3Config import generate_upload_url,generate_download_url,s3,BUCKET
from app.models import Resume
import uuid 
from app.schemas.resume import ResumeConfirmRequest
router=APIRouter()


@router.get("/resumes/upload-url")
def get_upload_url(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    

    file_id = str(uuid.uuid4())
    key = f"resumes/{current_user}/{file_id}.pdf"

    upload_url = generate_upload_url(key)

    return {
        "upload_url": upload_url,
        "file_key": key
    }

@router.post("/resumes")
def confirm_upload(
    data:ResumeConfirmRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import hashlib, json
    from sqlalchemy import func

    # 1. Get file from S3
    obj = s3.get_object(Bucket=BUCKET, Key=data.file_key)
    file_bytes = obj["Body"].read()

    # 2. Validate PDF
    if obj["ContentType"] != "application/pdf":
        raise HTTPException(400, "Only PDF allowed")

    # 3. Size check
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "File too large")

    # 4. Compute hash (DEDUP)
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    existing = db.query(Resume).filter_by(
        user_id=current_user,
        file_hash=file_hash
    ).first()

    if existing:
        raise HTTPException(400, "Resume already exists")

    # 5. Version
    max_version = db.query(func.max(Resume.version))\
        .filter_by(user_id=current_user).scalar()

    version = (max_version or 0) + 1

    # 6. Save DB
    file_url = f"https://{BUCKET}.s3.amazonaws.com/{data.file_key}"

    resume = Resume(
        user_id=current_user,
        version=version,
        label=data.label,
        file_path=file_url,
        file_hash=file_hash,
        file_size_kb=len(file_bytes) // 1024,
        commit_message=data.commit_message,
        tags=json.loads(data.tags) if data.tags else None
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "id": str(resume.id),
        "version": version,
        "label": data.label,
        "file_hash": file_hash,
        "file_size_kb": resume.file_size_kb,
        "tags": resume.tags,
        "created_at": resume.created_at
    }

@router.get("/resumes")
def list_resumes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    resumes = ( db.query(Resume)
        .filter(Resume.user_id==current_user)
        .order_by(Resume.version.desc())
        .all())

    return {
        "resumes": [
            {
                "id": str(r.id),
                "version": r.version,
                "label": r.label,
                "commit_message": r.commit_message,
                "tags": r.tags,
                "skills_claimed": r.skills_claimed,
                "file_size_kb": r.file_size_kb,
                "created_at": r.created_at
            } for r in resumes
        ],
        "total": len(resumes)
    }

@router.get("/get_resume/{id}")
def get_resume(
    id: str,
    db: Session = Depends(get_db),
    current_user:str=Depends(get_current_user)
):
    resume = (db.query(Resume)
              .filter(Resume.id==id)
              .first())

    if not resume:
        raise HTTPException(404, "Not found")

    if resume.user_id != current_user:
        raise HTTPException(403, "Forbidden")

    # Extract key from URL
    key = resume.file_path.split(".com/")[1]

    download_url = generate_download_url(key)

    return {
        "id": str(resume.id),
        "version": resume.version,
        "label": resume.label,
        "file_hash": resume.file_hash,
        "file_size_kb": resume.file_size_kb,
        "commit_message": resume.commit_message,
        "tags": resume.tags,
        "skills_claimed": resume.skills_claimed,
        "diff_from_prev": resume.diff_from_prev,
        "created_at": resume.created_at,
        "download_url": download_url  
    }

@router.delete("/resumes/{id}", status_code=204)
def delete_resume(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    resume = db.query(Resume).filter_by(id=id).first()

    if not resume:
        raise HTTPException(404, "Not found")

    if resume.user_id != current_user.id:
        raise HTTPException(403, "Forbidden")

    # Extract key
    key = resume.file_path.split(".com/")[1]

    # Delete from S3
    s3.delete_object(Bucket=BUCKET, Key=key)

    db.delete(resume)
    db.commit()