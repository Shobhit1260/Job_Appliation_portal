from sqlalchemy.orm import Session
from fastapi import APIRouter,Depends,HTTPException, Query
from app.database import get_db
from app.auth.utils import get_current_user
from app.Utils.s3Config import generate_upload_url,generate_download_url,s3,BUCKET
from app.models import Resume
import uuid 
import hashlib, json
from sqlalchemy import func
from app.schemas.resume import ResumeConfirmRequest
from app.cache_utils import cache_endpoint, invalidate_cache
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

@router.post("/confirm_upload")
async def confirm_upload(
    data:ResumeConfirmRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    

    # 1. Get file from S3
    obj = s3.get_object(Bucket=BUCKET, Key=data.file_key)
    print("object",obj)
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
    file_path = data.file_key
 
    resume = Resume(
        user_id=current_user,
        version=version,
        label=data.label,
        file_path=file_path,
        file_hash=file_hash,
        file_size_kb=len(file_bytes) // 1024,
        commit_message=data.commit_message,
        tags=json.loads(data.tags) if data.tags else None
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Invalidate resume list cache when new resume is uploaded
    await invalidate_cache(pattern=f"resume:list:{current_user}:*")

    return {
        "id": str(resume.id),
        "user_id": current_user,
        "version": version,
        "label": data.label,
        "file_hash": file_hash,
        "file_path":file_path,
        "file_size_kb": resume.file_size_kb,
        "tags": resume.tags,
        "created_at": resume.created_at
    }

@router.get("/resumes")
@cache_endpoint(prefix="resume:list", ttl=1800)  # Cache for 30 minutes
async def list_resumes(
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
                "user_id":current_user,
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
@cache_endpoint(prefix="resume:single", ttl=3600)  # Cache for 1 hour
async def get_resume(
    id: str,
    db: Session = Depends(get_db),
    current_user:str=Depends(get_current_user)
):
    resume = (db.query(Resume)
              .filter(Resume.id==id,
                      Resume.user_id==current_user)
              .first())
    print("resume",resume)
    if not resume:
        raise HTTPException(404, "Not found")

    
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

@router.delete("/delete_resume/{id}", status_code=204)
async def delete_resume(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    resume = (db.query(Resume).filter(id==id).first())

    if not resume:
        raise HTTPException(404, "Not found")

   
    # Extract key
    key = resume.file_path.split(".com/")[1]

    # Delete from S3
    s3.delete_object(Bucket=BUCKET, Key=key)

    db.delete(resume)
    db.commit()

    # Invalidate resume caches when resume is deleted
    await invalidate_cache(pattern=f"resume:list:{current_user}:*")
    await invalidate_cache(key=f"resume:single:{id}")

    return {
        "message":"Resume deleted successfully."
    }