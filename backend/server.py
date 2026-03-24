from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import shutil
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Constants
STEPS_PER_KM = 1300

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==========================================
# Pydantic Models
# ==========================================

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None

class ChallengeCreate(BaseModel):
    name: str
    description: str
    total_distance_km: float
    milestones: List[dict] = []
    image_url: Optional[str] = ""
    route_map_url: Optional[str] = None
    route_map_markers_url: Optional[str] = None
    is_active: Optional[bool] = True

class ChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_distance_km: Optional[float] = None
    milestones: Optional[List[dict]] = None
    image_url: Optional[str] = None
    route_map_url: Optional[str] = None
    route_map_markers_url: Optional[str] = None
    is_active: Optional[bool] = None

class WalkerTypeCreate(BaseModel):
    name: str
    cost_usd: float
    display_order: int = 0

class WalkerTypeUpdate(BaseModel):
    name: Optional[str] = None
    cost_usd: Optional[float] = None
    display_order: Optional[int] = None

class AchievementLevelCreate(BaseModel):
    total_amount_usd: float
    achievement: str
    swag: str
    display_order: int = 0

class AchievementLevelUpdate(BaseModel):
    total_amount_usd: Optional[float] = None
    achievement: Optional[str] = None
    swag: Optional[str] = None
    display_order: Optional[int] = None

class SelectChallengeRequest(BaseModel):
    challenge_id: str
    walker_type_id: str

class ActivityCreate(BaseModel):
    date: str
    steps: Optional[int] = None
    km: Optional[float] = None

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    tagline: Optional[str] = ""

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tagline: Optional[str] = None

class SupporterInvite(BaseModel):
    name: str
    email: str

class SponsorCreate(BaseModel):
    name: str
    email: str
    amount: float
    message: Optional[str] = ""

class SponsorshipLevelCreate(BaseModel):
    name: str
    max_sponsors: Optional[int] = None
    display_order: Optional[int] = 0

class SponsorshipLevelUpdate(BaseModel):
    name: Optional[str] = None
    max_sponsors: Optional[int] = None
    display_order: Optional[int] = None

class CorporateSponsorCreate(BaseModel):
    name: str
    level_id: str
    website_url: Optional[str] = None

class CorporateSponsorUpdate(BaseModel):
    name: Optional[str] = None
    level_id: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None

class SponsorInquiry(BaseModel):
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = ""
    interested_level: Optional[str] = ""
    message: Optional[str] = ""

class PledgeCreate(BaseModel):
    pledge_type: str  # "per_km", "total", or "combined"
    pledge_per_km: Optional[float] = None
    pledge_total: Optional[float] = None

class SupporterSignup(BaseModel):
    full_name: str
    email: str
    password: str
    walker_id: str
    pledge_type: str  # "per_km", "total", or "combined"
    pledge_per_km: Optional[float] = None
    pledge_total: Optional[float] = None

class ConfigUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


# ==========================================
# Auth Utilities
# ==========================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==========================================
# Auth Routes
# ==========================================

@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "full_name": req.full_name,
        "display_name": req.display_name or req.full_name,
        "role": "walker",
        "challenge_id": None,
        "walker_type_id": None,
        "paid": False,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_resp}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["role"])
    user_resp = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": user_resp}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return user_resp

@api_router.put("/auth/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.post("/auth/profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"profile_{user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    profile_picture_url = f"/api/uploads/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile_picture_url": profile_picture_url}})
    return {"profile_picture_url": profile_picture_url}


# ==========================================
# Challenge Routes
# ==========================================

@api_router.get("/challenges")
async def list_challenges():
    challenges = await db.challenges.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(100)
    return challenges

@api_router.get("/challenges/all")
async def list_all_challenges(user=Depends(get_admin_user)):
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(100)
    return challenges

@api_router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str):
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge

@api_router.post("/challenges")
async def create_challenge(req: ChallengeCreate, user=Depends(get_admin_user)):
    # Check for unique name
    existing = await db.challenges.find_one({"name": req.name})
    if existing:
        raise HTTPException(status_code=400, detail="Challenge name must be unique")
    # Validate description length
    if len(req.description) < 50:
        raise HTTPException(status_code=400, detail="Description must be at least 50 characters")
    if len(req.description) > 2000:
        raise HTTPException(status_code=400, detail="Description must be at most 2000 characters")
    challenge = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "total_distance_km": req.total_distance_km,
        "milestones": req.milestones,
        "image_url": req.image_url or "",
        "route_map_url": req.route_map_url,
        "route_map_markers_url": req.route_map_markers_url,
        "is_active": req.is_active if req.is_active is not None else True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.challenges.insert_one(challenge)
    resp = {k: v for k, v in challenge.items() if k != "_id"}
    return resp

@api_router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: str, req: ChallengeUpdate, user=Depends(get_admin_user)):
    # Check for unique name if updating name
    if req.name:
        existing = await db.challenges.find_one({"name": req.name, "id": {"$ne": challenge_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Challenge name must be unique")
    # Validate description length if updating
    if req.description is not None:
        if len(req.description) < 50:
            raise HTTPException(status_code=400, detail="Description must be at least 50 characters")
        if len(req.description) > 2000:
            raise HTTPException(status_code=400, detail="Description must be at most 2000 characters")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.challenges.update_one({"id": challenge_id}, {"$set": updates})
    updated = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return updated

@api_router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: str, user=Depends(get_admin_user)):
    result = await db.challenges.delete_one({"id": challenge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return {"message": "Challenge deleted"}

@api_router.post("/challenges/{challenge_id}/route-map")
async def upload_challenge_route_map(challenge_id: str, file: UploadFile = File(...), user=Depends(get_admin_user)):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"challenge_{challenge_id}_route_map.{ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    route_map_url = f"/api/uploads/{filename}"
    await db.challenges.update_one({"id": challenge_id}, {"$set": {"route_map_url": route_map_url}})
    return {"route_map_url": route_map_url}

@api_router.post("/challenges/{challenge_id}/route-map-markers")
async def upload_challenge_route_map_markers(challenge_id: str, file: UploadFile = File(...), user=Depends(get_admin_user)):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"challenge_{challenge_id}_route_markers.{ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    route_map_markers_url = f"/api/uploads/{filename}"
    await db.challenges.update_one({"id": challenge_id}, {"$set": {"route_map_markers_url": route_map_markers_url}})
    return {"route_map_markers_url": route_map_markers_url}

@api_router.post("/challenges/{challenge_id}/milestones/{milestone_index}/image")
async def upload_milestone_image(challenge_id: str, milestone_index: int, file: UploadFile = File(...), user=Depends(get_admin_user)):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    milestones = challenge.get("milestones", [])
    if milestone_index < 0 or milestone_index >= len(milestones):
        raise HTTPException(status_code=400, detail="Invalid milestone index")
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    img_id = str(uuid.uuid4())[:8]
    filename = f"milestone_{challenge_id}_{milestone_index}_{img_id}.{ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    image_url = f"/api/uploads/{filename}"
    
    # Add image to milestone's images array
    if "images" not in milestones[milestone_index]:
        milestones[milestone_index]["images"] = []
    milestones[milestone_index]["images"].append(image_url)
    
    await db.challenges.update_one({"id": challenge_id}, {"$set": {"milestones": milestones}})
    return {"image_url": image_url, "milestones": milestones}


# ==========================================
# Walker Type Routes
# ==========================================

@api_router.get("/walker-types")
async def list_walker_types():
    types = await db.walker_types.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return types

@api_router.post("/walker-types")
async def create_walker_type(req: WalkerTypeCreate, user=Depends(get_admin_user)):
    wt = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.walker_types.insert_one(wt)
    resp = {k: v for k, v in wt.items() if k != "_id"}
    return resp

@api_router.put("/walker-types/{type_id}")
async def update_walker_type(type_id: str, req: WalkerTypeUpdate, user=Depends(get_admin_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.walker_types.update_one({"id": type_id}, {"$set": updates})
    updated = await db.walker_types.find_one({"id": type_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Walker type not found")
    return updated

@api_router.delete("/walker-types/{type_id}")
async def delete_walker_type(type_id: str, user=Depends(get_admin_user)):
    result = await db.walker_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Walker type not found")
    return {"message": "Walker type deleted"}


# ==========================================
# Achievement Level Routes
# ==========================================

@api_router.get("/achievement-levels")
async def list_achievement_levels():
    levels = await db.achievement_levels.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return levels

@api_router.post("/achievement-levels")
async def create_achievement_level(req: AchievementLevelCreate, user=Depends(get_admin_user)):
    al = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.achievement_levels.insert_one(al)
    resp = {k: v for k, v in al.items() if k != "_id"}
    return resp

@api_router.put("/achievement-levels/{level_id}")
async def update_achievement_level(level_id: str, req: AchievementLevelUpdate, user=Depends(get_admin_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.achievement_levels.update_one({"id": level_id}, {"$set": updates})
    updated = await db.achievement_levels.find_one({"id": level_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Achievement level not found")
    return updated

@api_router.delete("/achievement-levels/{level_id}")
async def delete_achievement_level(level_id: str, user=Depends(get_admin_user)):
    result = await db.achievement_levels.delete_one({"id": level_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Achievement level not found")
    return {"message": "Achievement level deleted"}


# ==========================================
# User Challenge/Level Selection
# ==========================================

@api_router.post("/users/select-challenge")
async def select_challenge(req: SelectChallengeRequest, user=Depends(get_current_user)):
    challenge = await db.challenges.find_one({"id": req.challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    wt = await db.walker_types.find_one({"id": req.walker_type_id}, {"_id": 0})
    if not wt:
        raise HTTPException(status_code=404, detail="Walker type not found")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"challenge_id": req.challenge_id, "walker_type_id": req.walker_type_id}}
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.post("/users/mark-paid")
async def mark_paid(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"paid": True}})
    return {"message": "Payment marked as complete"}


# ==========================================
# Activity Routes
# ==========================================

@api_router.get("/activities")
async def list_activities(user=Depends(get_current_user)):
    activity_filter = {"user_id": user["id"]}
    if user.get("challenge_started_at"):
        activity_filter["created_at"] = {"$gte": user["challenge_started_at"]}
    activities = await db.activities.find(
        activity_filter, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return activities

@api_router.post("/activities")
async def create_activity(req: ActivityCreate, user=Depends(get_current_user)):
    km = req.km or 0
    steps = req.steps or 0
    if steps > 0 and km == 0:
        km = round(steps / STEPS_PER_KM, 2)
    elif km > 0 and steps == 0:
        steps = int(km * STEPS_PER_KM)

    activity = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": req.date,
        "steps": steps,
        "km": km,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.activities.insert_one(activity)
    resp = {k: v for k, v in activity.items() if k != "_id"}
    return resp

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, user=Depends(get_current_user)):
    result = await db.activities.delete_one({"id": activity_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}


# ==========================================
# Team Routes
# ==========================================

@api_router.post("/teams")
async def create_team(req: TeamCreate, user=Depends(get_current_user)):
    if user.get("team_id"):
        raise HTTPException(status_code=400, detail="Already in a team")
    invite_code = str(uuid.uuid4())[:8].upper()
    team = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "tagline": req.tagline or "",
        "invite_code": invite_code,
        "creator_id": user["id"],
        "challenge_id": user.get("challenge_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.teams.insert_one(team)
    await db.users.update_one({"id": user["id"]}, {"$set": {"team_id": team["id"]}})
    resp = {k: v for k, v in team.items() if k != "_id"}
    return resp

@api_router.put("/teams/my")
async def update_my_team(req: TeamUpdate, user=Depends(get_current_user)):
    if not user.get("team_id"):
        raise HTTPException(status_code=400, detail="Not in a team")
    team = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
    if not team or team.get("creator_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only team leader can edit")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.teams.update_one({"id": user["team_id"]}, {"$set": updates})
    updated = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
    return updated

@api_router.get("/teams/search")
async def search_teams(q: str = ""):
    """Optimized team search using aggregation pipeline"""
    match_stage = {}
    if q:
        match_stage = {"name": {"$regex": q, "$options": "i"}}
    
    pipeline = [
        {"$match": match_stage},
        {"$limit": 20},
        {"$lookup": {
            "from": "users",
            "localField": "id",
            "foreignField": "team_id",
            "as": "members"
        }},
        {"$addFields": {
            "members_count": {"$size": "$members"}
        }},
        {"$project": {
            "_id": 0,
            "members": 0
        }}
    ]
    
    teams = await db.teams.aggregate(pipeline).to_list(20)
    return teams

@api_router.get("/teams/my")
async def get_my_team(user=Depends(get_current_user)):
    if not user.get("team_id"):
        return None
    team = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
    if not team:
        return None
    
    # Get challenge info if exists
    challenge = None
    if team.get("challenge_id"):
        challenge = await db.challenges.find_one({"id": team["challenge_id"]}, {"_id": 0})
    team["challenge"] = challenge
    
    # Get all members with their activities and sponsors in one pipeline
    member_pipeline = [
        {"$match": {"team_id": team["id"]}},
        {"$lookup": {
            "from": "activities",
            "localField": "id",
            "foreignField": "user_id",
            "as": "activities"
        }},
        {"$lookup": {
            "from": "sponsors",
            "localField": "id",
            "foreignField": "walker_id",
            "as": "sponsors"
        }},
        {"$lookup": {
            "from": "challenges",
            "localField": "challenge_id",
            "foreignField": "id",
            "as": "challenge_arr"
        }},
        {"$addFields": {
            "total_km": {"$round": [{"$sum": "$activities.km"}, 2]},
            "total_steps": {"$sum": "$activities.steps"},
            "total_raised": {"$round": [{"$sum": "$sponsors.amount"}, 2]},
            "challenge": {"$arrayElemAt": ["$challenge_arr", 0]}
        }},
        {"$project": {
            "_id": 0,
            "password_hash": 0,
            "activities": 0,
            "sponsors": 0,
            "challenge_arr": 0,
            "challenge._id": 0
        }}
    ]
    
    members = await db.users.aggregate(member_pipeline).to_list(100)
    
    # Process members for progress and leader status
    total_progress_pct = 0
    for member in members:
        member["is_leader"] = member["id"] == team.get("creator_id")
        
        # Compute progress percentage
        member_challenge = member.get("challenge")
        if member_challenge and member_challenge.get("total_distance_km", 0) > 0:
            member["progress_pct"] = min(100, round((member["total_km"] / member_challenge["total_distance_km"]) * 100, 1))
        else:
            member["progress_pct"] = 0
        total_progress_pct += member["progress_pct"]
    
    team["members"] = members
    team["total_km"] = round(sum(m["total_km"] for m in members), 2)
    team["total_raised"] = round(sum(m["total_raised"] for m in members), 2)
    team["avg_progress_pct"] = round(total_progress_pct / len(members), 1) if members else 0
    
    # Get team leader info
    leader = next((m for m in members if m["id"] == team.get("creator_id")), None)
    team["leader"] = leader
    
    return team

@api_router.get("/teams/invite/{invite_code}")
async def get_team_by_invite(invite_code: str):
    team = await db.teams.find_one({"invite_code": invite_code}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    members_count = await db.users.count_documents({"team_id": team["id"]})
    team["members_count"] = members_count
    return team

@api_router.post("/teams/join/{invite_code}")
async def join_team(invite_code: str, user=Depends(get_current_user)):
    team = await db.teams.find_one({"invite_code": invite_code}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if user.get("team_id"):
        raise HTTPException(status_code=400, detail="Already in a team")
    await db.users.update_one({"id": user["id"]}, {"$set": {"team_id": team["id"]}})
    return {"message": f"Joined team {team['name']}", "team_id": team["id"]}

@api_router.post("/teams/leave")
async def leave_team(user=Depends(get_current_user)):
    if not user.get("team_id"):
        raise HTTPException(status_code=400, detail="Not in a team")
    await db.users.update_one({"id": user["id"]}, {"$set": {"team_id": None}})
    return {"message": "Left team"}

@api_router.delete("/teams/members/{member_id}")
async def remove_team_member(member_id: str, user=Depends(get_current_user)):
    if not user.get("team_id"):
        raise HTTPException(status_code=400, detail="Not in a team")
    team = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
    if not team or team.get("creator_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only team leader can remove members")
    if member_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    member = await db.users.find_one({"id": member_id, "team_id": user["team_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in team")
    await db.users.update_one({"id": member_id}, {"$set": {"team_id": None}})
    return {"message": "Member removed from team"}


# ==========================================
# Supporter Invite Routes
# ==========================================

@api_router.post("/supporter-invites")
async def create_supporter_invite(req: SupporterInvite, user=Depends(get_current_user)):
    invite = {
        "id": str(uuid.uuid4()),
        "walker_id": user["id"],
        "name": req.name,
        "email": req.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.supporter_invites.insert_one(invite)
    resp = {k: v for k, v in invite.items() if k != "_id"}
    return resp

@api_router.get("/supporter-invites")
async def list_supporter_invites(user=Depends(get_current_user)):
    invites = await db.supporter_invites.find(
        {"walker_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return invites


# ==========================================
# Pledge & Supporter Signup Routes
# ==========================================

@api_router.post("/pledges/{walker_id}")
async def create_pledge(walker_id: str, req: PledgeCreate, authorization: Optional[str] = Header(None)):
    walker = await db.users.find_one({"id": walker_id})
    if not walker:
        raise HTTPException(status_code=404, detail="Walker not found")

    supporter_user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            supporter_user_id = payload.get("sub")
        except JWTError:
            pass

    # Calculate amount based on pledge type
    calculated_amount = 0
    if req.pledge_type == "total":
        calculated_amount = req.pledge_total or 0
    elif req.pledge_type == "combined":
        calculated_amount = (req.pledge_total or 0)
        challenge = await db.challenges.find_one({"id": walker.get("challenge_id")})
        if challenge and req.pledge_per_km:
            calculated_amount += req.pledge_per_km * challenge.get("total_distance_km", 0)

    pledge = {
        "id": str(uuid.uuid4()),
        "walker_id": walker_id,
        "challenge_id": walker.get("challenge_id"),
        "supporter_user_id": supporter_user_id,
        "pledge_type": req.pledge_type,
        "pledge_per_km": req.pledge_per_km,
        "pledge_total": req.pledge_total,
        "calculated_amount": round(calculated_amount, 2),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pledges.insert_one(pledge)
    resp = {k: v for k, v in pledge.items() if k != "_id"}
    return resp

@api_router.put("/pledges/{pledge_id}/link-supporter")
async def link_pledge_to_supporter(pledge_id: str, user=Depends(get_current_user)):
    pledge = await db.pledges.find_one({"id": pledge_id})
    if not pledge:
        raise HTTPException(status_code=404, detail="Pledge not found")
    await db.pledges.update_one({"id": pledge_id}, {"$set": {"supporter_user_id": user["id"]}})
    updated = await db.pledges.find_one({"id": pledge_id}, {"_id": 0})
    return updated

@api_router.post("/supporters/signup")
async def supporter_signup(req: SupporterSignup):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please log in instead.")

    user = {
        "id": str(uuid.uuid4()),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "full_name": req.full_name,
        "display_name": req.full_name,
        "role": "supporter",
        "challenge_id": None,
        "walker_type_id": None,
        "paid": False,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])

    walker = await db.users.find_one({"id": req.walker_id})
    # Calculate amount based on pledge type
    calc_amount = 0
    if req.pledge_type == "total":
        calc_amount = req.pledge_total or 0
    elif req.pledge_type == "combined":
        calc_amount = (req.pledge_total or 0)
        if walker:
            challenge = await db.challenges.find_one({"id": walker.get("challenge_id")})
            if challenge and req.pledge_per_km:
                calc_amount += req.pledge_per_km * challenge.get("total_distance_km", 0)

    pledge = {
        "id": str(uuid.uuid4()),
        "walker_id": req.walker_id,
        "challenge_id": walker.get("challenge_id") if walker else None,
        "supporter_user_id": user["id"],
        "pledge_type": req.pledge_type,
        "pledge_per_km": req.pledge_per_km,
        "pledge_total": req.pledge_total,
        "calculated_amount": round(calc_amount, 2),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pledges.insert_one(pledge)

    user_resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    pledge_resp = {k: v for k, v in pledge.items() if k != "_id"}
    return {"token": token, "user": user_resp, "pledge": pledge_resp}

@api_router.post("/supporters/login-and-pledge")
async def supporter_login_and_pledge(
    email: str = "",
    password: str = "",
    walker_id: str = "",
    pledge_type: str = "",
    pledge_per_km: Optional[float] = None,
    pledge_total: Optional[float] = None,
):
    pass

@api_router.get("/supporters/dashboard")
async def supporter_dashboard(user=Depends(get_current_user)):
    """Optimized supporter dashboard using aggregation pipeline"""
    pipeline = [
        {"$match": {"supporter_user_id": user["id"]}},
        {"$sort": {"created_at": -1}},
        {"$limit": 1000},
        {"$lookup": {
            "from": "users",
            "localField": "walker_id",
            "foreignField": "id",
            "as": "walker_arr"
        }},
        {"$lookup": {
            "from": "challenges",
            "localField": "challenge_id",
            "foreignField": "id",
            "as": "challenge_arr"
        }},
        {"$lookup": {
            "from": "activities",
            "localField": "walker_id",
            "foreignField": "user_id",
            "as": "activities"
        }},
        {"$addFields": {
            "walker": {"$arrayElemAt": ["$walker_arr", 0]},
            "challenge": {"$arrayElemAt": ["$challenge_arr", 0]},
            "walker_total_km": {"$round": [{"$sum": "$activities.km"}, 2]}
        }},
        {"$project": {
            "_id": 0,
            "walker_arr": 0,
            "challenge_arr": 0,
            "activities": 0,
            "walker._id": 0,
            "walker.password_hash": 0,
            "challenge._id": 0
        }}
    ]
    
    pledges = await db.pledges.aggregate(pipeline).to_list(1000)
    
    # Calculate progress and amounts (always show FULL route completion total)
    for p in pledges:
        challenge = p.get("challenge")
        total_km = p.get("walker_total_km", 0)
        route_km = challenge.get("total_distance_km", 0) if challenge else 0
        progress_pct = 0
        if route_km > 0:
            progress_pct = min(100, round((total_km / route_km) * 100, 1))
        p["walker_progress_pct"] = progress_pct
        
        # Calculate FULL pledge amount based on complete route, not current progress
        calculated = p.get("pledge_total", 0) or 0
        if p.get("pledge_per_km") and route_km > 0:
            calculated += round(p["pledge_per_km"] * route_km, 2)
        p["calculated_amount"] = round(calculated, 2)
    
    return pledges

@api_router.get("/pledges/{walker_id}")
async def list_pledges_for_walker(walker_id: str):
    """Optimized pledge list using aggregation pipeline"""
    pipeline = [
        {"$match": {"walker_id": walker_id}},
        {"$sort": {"created_at": -1}},
        {"$limit": 1000},
        {"$lookup": {
            "from": "users",
            "localField": "supporter_user_id",
            "foreignField": "id",
            "as": "supporter_arr"
        }},
        {"$addFields": {
            "supporter": {"$arrayElemAt": ["$supporter_arr", 0]}
        }},
        {"$project": {
            "_id": 0,
            "supporter_arr": 0,
            "supporter._id": 0,
            "supporter.password_hash": 0
        }}
    ]
    
    pledges = await db.pledges.aggregate(pipeline).to_list(1000)
    return pledges


# ==========================================
# Sponsor Routes
# ==========================================

@api_router.post("/sponsors/{walker_id}")
async def create_sponsor(walker_id: str, req: SponsorCreate):
    walker = await db.users.find_one({"id": walker_id})
    if not walker:
        raise HTTPException(status_code=404, detail="Walker not found")
    sponsor = {
        "id": str(uuid.uuid4()),
        "walker_id": walker_id,
        "name": req.name,
        "email": req.email,
        "amount": req.amount,
        "message": req.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sponsors.insert_one(sponsor)
    resp = {k: v for k, v in sponsor.items() if k != "_id"}
    return resp

@api_router.get("/sponsors/{walker_id}")
async def list_sponsors(walker_id: str):
    sponsors = await db.sponsors.find(
        {"walker_id": walker_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return sponsors


# ==========================================
# Fundraising (Public Page Data)
# ==========================================

@api_router.get("/fundraising/{walker_id}")
async def get_fundraising_page(walker_id: str):
    walker = await db.users.find_one({"id": walker_id}, {"_id": 0, "password_hash": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Walker not found")
    challenge = None
    if walker.get("challenge_id"):
        challenge = await db.challenges.find_one({"id": walker["challenge_id"]}, {"_id": 0})
    walker_type = None
    walker_fee = 0
    if walker.get("walker_type_id"):
        walker_type = await db.walker_types.find_one({"id": walker["walker_type_id"]}, {"_id": 0})
        if walker_type and walker.get("paid"):
            walker_fee = walker_type.get("cost_usd", 0)
    activity_filter = {"user_id": walker_id}
    if walker.get("challenge_started_at"):
        activity_filter["created_at"] = {"$gte": walker["challenge_started_at"]}
    activities = await db.activities.find(activity_filter, {"_id": 0}).to_list(10000)
    total_km = round(sum(a.get("km", 0) for a in activities), 2)
    total_steps = sum(a.get("steps", 0) for a in activities)
    sponsors = await db.sponsors.find(
        {"walker_id": walker_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    supporter_pledges = round(sum(s.get("amount", 0) for s in sponsors), 2)
    # Total raised = walker fee + teammate fees + supporter pledges
    teammate_fees = 0
    team = None
    if walker.get("team_id"):
        team = await db.teams.find_one({"id": walker["team_id"]}, {"_id": 0})
        if team and team.get("creator_id") == walker_id:
            teammates = await db.users.find(
                {"team_id": team["id"], "id": {"$ne": walker_id}}, {"_id": 0}
            ).to_list(100)
            for tm in teammates:
                if tm.get("paid") and tm.get("walker_type_id"):
                    tm_type = await db.walker_types.find_one({"id": tm["walker_type_id"]}, {"_id": 0})
                    if tm_type:
                        teammate_fees += tm_type.get("cost_usd", 0)
    # Get pledges too - calculate based on FULL route distance, not current progress
    pledges = await db.pledges.find({"walker_id": walker_id}, {"_id": 0}).to_list(1000)
    route_km = challenge.get("total_distance_km", 0) if challenge else 0
    pledge_total_value = 0
    for p in pledges:
        if p.get("pledge_type") in ("per_km", "combined") and p.get("pledge_per_km"):
            pledge_total_value += p["pledge_per_km"] * route_km
        if p.get("pledge_total"):
            pledge_total_value += p["pledge_total"]
        if p.get("supporter_user_id"):
            sup = await db.users.find_one({"id": p["supporter_user_id"]}, {"_id": 0, "password_hash": 0})
            p["supporter"] = sup
    pledge_total_value = round(pledge_total_value, 2)

    total_raised = round(walker_fee + teammate_fees + supporter_pledges + pledge_total_value, 2)
    # Compute achievement level
    achievement_levels = await db.achievement_levels.find({}, {"_id": 0}).sort("total_amount_usd", 1).to_list(100)
    current_achievement = None
    next_achievement = None
    for al in achievement_levels:
        if total_raised >= al["total_amount_usd"]:
            current_achievement = al
        elif not next_achievement:
            next_achievement = al
    return {
        "walker": walker,
        "challenge": challenge,
        "walker_type": walker_type,
        "total_km": total_km,
        "total_steps": total_steps,
        "total_raised": total_raised,
        "walker_fee": walker_fee,
        "supporter_pledges": supporter_pledges,
        "teammate_fees": teammate_fees,
        "sponsors": sponsors,
        "team": team,
        "pledges": pledges,
        "pledge_total_value": pledge_total_value,
        "current_achievement": current_achievement,
        "next_achievement": next_achievement,
    }


# ==========================================
# Leaderboard Routes
# ==========================================

@api_router.get("/leaderboards/distance")
async def leaderboard_distance():
    """Optimized leaderboard by distance using aggregation pipeline"""
    pipeline = [
        {"$match": {"role": {"$ne": "admin"}}},
        {"$lookup": {
            "from": "activities",
            "localField": "id",
            "foreignField": "user_id",
            "as": "activities"
        }},
        {"$addFields": {
            "total_km": {"$round": [{"$sum": "$activities.km"}, 2]}
        }},
        {"$match": {"total_km": {"$gt": 0}}},
        {"$project": {
            "_id": 0,
            "user_id": "$id",
            "display_name": {"$ifNull": ["$display_name", "$full_name"]},
            "country": {"$ifNull": ["$country", ""]},
            "total_km": 1
        }},
        {"$sort": {"total_km": -1}},
        {"$limit": 50}
    ]
    result = await db.users.aggregate(pipeline).to_list(50)
    return result

@api_router.get("/leaderboards/raised")
async def leaderboard_raised():
    """Leaderboard by total funds raised including pledges at full route completion"""
    pipeline = [
        {"$match": {"role": {"$ne": "admin"}}},
        {"$lookup": {
            "from": "sponsors",
            "localField": "id",
            "foreignField": "walker_id",
            "as": "sponsors"
        }},
        {"$lookup": {
            "from": "pledges",
            "localField": "id",
            "foreignField": "walker_id",
            "as": "pledges"
        }},
        {"$lookup": {
            "from": "challenges",
            "localField": "challenge_id",
            "foreignField": "id",
            "as": "challenge_info"
        }},
        {"$lookup": {
            "from": "walker_types",
            "localField": "walker_type_id",
            "foreignField": "id",
            "as": "walker_type_info"
        }},
        {"$addFields": {
            "route_km": {"$ifNull": [{"$arrayElemAt": ["$challenge_info.total_distance_km", 0]}, 0]},
            "walker_fee": {"$cond": [
                {"$and": ["$paid", {"$gt": [{"$size": "$walker_type_info"}, 0]}]},
                {"$ifNull": [{"$arrayElemAt": ["$walker_type_info.cost_usd", 0]}, 0]},
                0
            ]},
            "sponsor_total": {"$sum": "$sponsors.amount"},
            "pledge_total": {"$sum": {
                "$map": {
                    "input": "$pledges",
                    "as": "p",
                    "in": {"$add": [
                        {"$ifNull": ["$$p.pledge_total", 0]},
                        {"$multiply": [
                            {"$ifNull": ["$$p.pledge_per_km", 0]},
                            {"$ifNull": [{"$arrayElemAt": ["$challenge_info.total_distance_km", 0]}, 0]}
                        ]}
                    ]}
                }
            }}
        }},
        {"$addFields": {
            "total_raised": {"$round": [{"$add": ["$walker_fee", "$sponsor_total", "$pledge_total"]}, 2]}
        }},
        {"$match": {"total_raised": {"$gt": 0}}},
        {"$project": {
            "_id": 0,
            "user_id": "$id",
            "display_name": {"$ifNull": ["$display_name", "$full_name"]},
            "country": {"$ifNull": ["$country", ""]},
            "total_raised": 1
        }},
        {"$sort": {"total_raised": -1}},
        {"$limit": 50}
    ]
    result = await db.users.aggregate(pipeline).to_list(50)
    return result

@api_router.get("/leaderboards/teams/distance")
async def leaderboard_teams_distance():
    """Optimized team leaderboard by distance using aggregation pipeline"""
    pipeline = [
        {"$lookup": {
            "from": "users",
            "localField": "id",
            "foreignField": "team_id",
            "as": "members"
        }},
        {"$unwind": {"path": "$members", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "activities",
            "localField": "members.id",
            "foreignField": "user_id",
            "as": "member_activities"
        }},
        {"$group": {
            "_id": "$id",
            "name": {"$first": "$name"},
            "total_km": {"$sum": {"$sum": "$member_activities.km"}},
            "members_count": {"$sum": {"$cond": [{"$ifNull": ["$members.id", False]}, 1, 0]}}
        }},
        {"$match": {"total_km": {"$gt": 0}}},
        {"$project": {
            "_id": 0,
            "team_id": "$_id",
            "name": 1,
            "total_km": {"$round": ["$total_km", 2]},
            "members_count": 1
        }},
        {"$sort": {"total_km": -1}},
        {"$limit": 50}
    ]
    result = await db.teams.aggregate(pipeline).to_list(50)
    return result

@api_router.get("/leaderboards/teams/raised")
async def leaderboard_teams_raised():
    """Optimized team leaderboard by funds raised using aggregation pipeline"""
    pipeline = [
        {"$lookup": {
            "from": "users",
            "localField": "id",
            "foreignField": "team_id",
            "as": "members"
        }},
        {"$unwind": {"path": "$members", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "sponsors",
            "localField": "members.id",
            "foreignField": "walker_id",
            "as": "member_sponsors"
        }},
        {"$group": {
            "_id": "$id",
            "name": {"$first": "$name"},
            "total_raised": {"$sum": {"$sum": "$member_sponsors.amount"}},
            "members_count": {"$sum": {"$cond": [{"$ifNull": ["$members.id", False]}, 1, 0]}}
        }},
        {"$match": {"total_raised": {"$gt": 0}}},
        {"$project": {
            "_id": 0,
            "team_id": "$_id",
            "name": 1,
            "total_raised": {"$round": ["$total_raised", 2]},
            "members_count": 1
        }},
        {"$sort": {"total_raised": -1}},
        {"$limit": 50}
    ]
    result = await db.teams.aggregate(pipeline).to_list(50)
    return result


# ==========================================
# Admin Routes
# ==========================================

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_admin_user)):
    """Optimized admin stats using aggregation pipelines instead of loading all records"""
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    total_teams = await db.teams.count_documents({})
    total_corporate = await db.corporate_sponsors.count_documents({})
    
    # Aggregate total distance and steps
    activity_stats = await db.activities.aggregate([
        {"$group": {
            "_id": None,
            "total_km": {"$sum": "$km"},
            "total_steps": {"$sum": "$steps"}
        }}
    ]).to_list(1)
    
    total_distance = round(activity_stats[0]["total_km"], 2) if activity_stats else 0
    total_steps = activity_stats[0]["total_steps"] if activity_stats else 0
    
    # Aggregate total pledged
    sponsor_stats = await db.sponsors.aggregate([
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": "$amount"}
        }}
    ]).to_list(1)
    
    total_pledged = round(sponsor_stats[0]["total_amount"], 2) if sponsor_stats else 0
    
    return {
        "total_users": total_users,
        "total_teams": total_teams,
        "total_distance_km": total_distance,
        "total_steps": total_steps,
        "total_pledged": total_pledged,
        "total_corporate_sponsors": total_corporate,
    }

@api_router.get("/admin/config")
async def get_config():
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    if not config:
        config = {
            "key": "main",
            "name": "The Kenya Challenge",
            "logo_url": "",
            "primary_color": "#ea580c",
            "secondary_color": "#059669",
        }
    return config

@api_router.put("/admin/config")
async def update_config(req: ConfigUpdate, user=Depends(get_admin_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.app_config.update_one({"key": "main"}, {"$set": updates}, upsert=True)
    config = await db.app_config.find_one({"key": "main"}, {"_id": 0})
    return config

@api_router.get("/admin/users")
async def admin_list_users(user=Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user=Depends(get_admin_user)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    # Remove user from team if they're in one
    if target.get("team_id"):
        # If they're a team creator, delete the team and unset team_id for all members
        team = await db.teams.find_one({"creator_id": user_id})
        if team:
            await db.users.update_many({"team_id": team["id"]}, {"$set": {"team_id": None}})
            await db.teams.delete_one({"id": team["id"]})
    # Delete user's activities, pledges, sponsors, invites
    await db.activities.delete_many({"user_id": user_id})
    await db.pledges.delete_many({"$or": [{"walker_id": user_id}, {"supporter_user_id": user_id}]})
    await db.sponsors.delete_many({"walker_id": user_id})
    await db.supporter_invites.delete_many({"walker_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": "User and associated data deleted"}

@api_router.get("/admin/stats/by-challenge")
async def admin_stats_by_challenge(user=Depends(get_admin_user)):
    """Get stats broken down by challenge: walkers, teams, pledged"""
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(100)
    result = []
    for ch in challenges:
        # Count walkers on this challenge
        walker_count = await db.users.count_documents({"challenge_id": ch["id"], "role": {"$ne": "admin"}})
        # Count teams on this challenge
        team_count = await db.teams.count_documents({"challenge_id": ch["id"]})
        # Calculate total pledged for walkers on this challenge
        walker_ids = [u["id"] async for u in db.users.find({"challenge_id": ch["id"]}, {"id": 1, "_id": 0})]
        pledge_total = 0
        if walker_ids:
            pledge_stats = await db.pledges.aggregate([
                {"$match": {"walker_id": {"$in": walker_ids}}},
                {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$pledge_total", 0]}}}}
            ]).to_list(1)
            if pledge_stats:
                pledge_total = round(pledge_stats[0]["total"], 2)
            sponsor_stats = await db.sponsors.aggregate([
                {"$match": {"walker_id": {"$in": walker_ids}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]).to_list(1)
            if sponsor_stats:
                pledge_total += round(sponsor_stats[0]["total"], 2)
        result.append({
            "challenge_id": ch["id"],
            "challenge_name": ch["name"],
            "is_active": ch.get("is_active", True),
            "walkers": walker_count,
            "teams": team_count,
            "pledged": round(pledge_total, 2),
        })
    return result


# ==========================================
# User Progress Route
# ==========================================

@api_router.get("/users/progress")
async def get_user_progress(user=Depends(get_current_user)):
    # Filter activities by challenge_started_at if present (for walkers on 2nd+ challenge)
    activity_filter = {"user_id": user["id"]}
    if user.get("challenge_started_at"):
        activity_filter["created_at"] = {"$gte": user["challenge_started_at"]}
    activities = await db.activities.find(
        activity_filter, {"_id": 0}
    ).sort("date", -1).to_list(10000)
    total_km = round(sum(a.get("km", 0) for a in activities), 2)
    total_steps = sum(a.get("steps", 0) for a in activities)

    challenge = None
    if user.get("challenge_id"):
        challenge = await db.challenges.find_one({"id": user["challenge_id"]}, {"_id": 0})

    walker_type = None
    walker_fee = 0
    if user.get("walker_type_id"):
        walker_type = await db.walker_types.find_one({"id": user["walker_type_id"]}, {"_id": 0})
        if walker_type and user.get("paid"):
            walker_fee = walker_type.get("cost_usd", 0)

    sponsors = await db.sponsors.find({"walker_id": user["id"]}, {"_id": 0}).to_list(10000)
    supporter_pledges = round(sum(s.get("amount", 0) for s in sponsors), 2)

    # Calculate teammate fees if team leader
    teammate_fees = 0
    team = None
    if user.get("team_id"):
        team = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
        if team and team.get("creator_id") == user["id"]:
            teammates = await db.users.find(
                {"team_id": team["id"], "id": {"$ne": user["id"]}}, {"_id": 0}
            ).to_list(100)
            for tm in teammates:
                if tm.get("paid") and tm.get("walker_type_id"):
                    tm_type = await db.walker_types.find_one({"id": tm["walker_type_id"]}, {"_id": 0})
                    if tm_type:
                        teammate_fees += tm_type.get("cost_usd", 0)

    total_raised = round(walker_fee + teammate_fees + supporter_pledges, 2)

    # Compute achievement level
    achievement_levels = await db.achievement_levels.find({}, {"_id": 0}).sort("total_amount_usd", 1).to_list(100)
    current_achievement = None
    next_achievement = None
    for al in achievement_levels:
        if total_raised >= al["total_amount_usd"]:
            current_achievement = al
        elif not next_achievement:
            next_achievement = al

    progress_pct = 0
    if challenge and challenge.get("total_distance_km", 0) > 0:
        progress_pct = min(100, round((total_km / challenge["total_distance_km"]) * 100, 1))

    current_milestone = None
    next_milestone = None
    if challenge and challenge.get("milestones"):
        sorted_milestones = sorted(challenge["milestones"], key=lambda m: m.get("distance_km", 0))
        for m in sorted_milestones:
            if total_km >= m.get("distance_km", 0):
                current_milestone = m
            elif not next_milestone:
                next_milestone = m

    return {
        "total_km": total_km,
        "total_steps": total_steps,
        "total_raised": total_raised,
        "walker_fee": walker_fee,
        "supporter_pledges": supporter_pledges,
        "teammate_fees": teammate_fees,
        "challenge": challenge,
        "walker_type": walker_type,
        "current_achievement": current_achievement,
        "next_achievement": next_achievement,
        "progress_pct": progress_pct,
        "current_milestone": current_milestone,
        "next_milestone": next_milestone,
        "team": team,
        "recent_activities": activities[:10],
        "sponsors_count": len(sponsors),
        "completed_challenges": user.get("completed_challenges", []),
    }


@api_router.post("/users/start-new-challenge")
async def start_new_challenge(user=Depends(get_current_user)):
    """Archive completed challenge and prepare for a new one"""
    if not user.get("challenge_id"):
        raise HTTPException(status_code=400, detail="No current challenge to complete")

    # Get current challenge info
    challenge = await db.challenges.find_one({"id": user["challenge_id"]}, {"_id": 0})

    # Calculate current progress
    activity_filter = {"user_id": user["id"]}
    if user.get("challenge_started_at"):
        activity_filter["created_at"] = {"$gte": user["challenge_started_at"]}
    activities = await db.activities.find(activity_filter, {"_id": 0}).to_list(10000)
    total_km = round(sum(a.get("km", 0) for a in activities), 2)
    total_steps = sum(a.get("steps", 0) for a in activities)

    # Archive the completed challenge
    completed_entry = {
        "challenge_id": user["challenge_id"],
        "challenge_name": challenge["name"] if challenge else "Unknown",
        "walker_type_id": user.get("walker_type_id"),
        "total_km": total_km,
        "total_steps": total_steps,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    # Reset user for new challenge selection
    await db.users.update_one({"id": user["id"]}, {
        "$push": {"completed_challenges": completed_entry},
        "$set": {
            "challenge_id": None,
            "walker_type_id": None,
            "paid": False,
            "challenge_started_at": datetime.now(timezone.utc).isoformat(),
        }
    })

    return {"message": "Challenge archived. Ready for a new challenge!", "completed": completed_entry}


# ==========================================
# Seed Data
# ==========================================

async def seed_data():
    admin = await db.users.find_one({"email": "sabrina@kenyaeducationfund.org"})
    if admin:
        logger.info("Data already seeded, skipping...")
        return

    logger.info("Seeding initial data...")

    await db.app_config.insert_one({
        "key": "main",
        "name": "The Kenya Challenge",
        "logo_url": "",
        "primary_color": "#ea580c",
        "secondary_color": "#059669",
    })

    pricing_levels = [
        {"id": "wt-basic", "name": "Basic", "cost_usd": 25, "display_order": 1},
        {"id": "wt-builder", "name": "Builder", "cost_usd": 97, "display_order": 2},
        {"id": "wt-leader", "name": "Leader", "cost_usd": 250, "display_order": 3},
    ]
    for pl in pricing_levels:
        pl["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.walker_types.insert_many(pricing_levels)

    achievement_levels = [
        {"id": "al-shoes", "total_amount_usd": 25, "achievement": "Shoes for one child", "swag": "Kenya Challenge Certificate", "display_order": 1},
        {"id": "al-uniform", "total_amount_usd": 97, "achievement": "Uniforms for one child", "swag": "Kenya Challenge T-shirt", "display_order": 2},
        {"id": "al-training", "total_amount_usd": 250, "achievement": "Life Skills Training", "swag": "Kenya Challenge Hoodie", "display_order": 3},
        {"id": "al-sponsor2", "total_amount_usd": 2500, "achievement": "Sponsor 2 children for an entire year", "swag": "Kenya Challenge Custom Tote Bag With Goodies", "display_order": 4},
        {"id": "al-sponsor5", "total_amount_usd": 25000, "achievement": "Sponsor 5 children for the full 4 years", "swag": "2 Tickets to Kenya", "display_order": 5},
    ]
    for al in achievement_levels:
        al["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.achievement_levels.insert_many(achievement_levels)

    challenges = [
        {
            "id": "ch-naivasha",
            "name": "Nairobi to Naivasha",
            "description": "Walk the scenic route from Nairobi to the beautiful Lake Naivasha, passing through the Great Rift Valley. This 100km journey takes you through some of Kenya's most stunning landscapes.",
            "total_distance_km": 100,
            "milestones": [
                {"distance_km": 10, "title": "Leaving Nairobi", "description": "You've left the bustling city behind!"},
                {"distance_km": 25, "title": "Limuru Town", "description": "Welcome to the tea country of Limuru."},
                {"distance_km": 50, "title": "Rift Valley Viewpoint", "description": "Halfway there! Enjoy the stunning Rift Valley views."},
                {"distance_km": 75, "title": "Mai Mahiu", "description": "The descent into the valley continues."},
                {"distance_km": 100, "title": "Lake Naivasha", "description": "You've arrived at the beautiful Lake Naivasha!"},
            ],
            "image_url": "",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "ch-mombasa",
            "name": "Nairobi to Mombasa (Leg 1)",
            "description": "The first leg of the legendary Nairobi-Mombasa highway. Walk 150km through the Kapiti Plains and Machakos County, following in the footsteps of ancient traders.",
            "total_distance_km": 150,
            "milestones": [
                {"distance_km": 15, "title": "Athi River", "description": "You've crossed the Athi River!"},
                {"distance_km": 40, "title": "Kapiti Plains", "description": "The vast Kapiti Plains stretch before you."},
                {"distance_km": 75, "title": "Machakos Junction", "description": "Halfway! Welcome to Machakos County."},
                {"distance_km": 110, "title": "Sultan Hamud", "description": "Great progress through Ukambani!"},
                {"distance_km": 150, "title": "Emali Town", "description": "Leg 1 complete! View of Mt. Kilimanjaro on clear days."},
            ],
            "image_url": "",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "ch-migration",
            "name": "The Great Migration Trail",
            "description": "Follow the legendary wildebeest migration route through the Maasai Mara. This 200km challenge takes you through some of the most iconic wildlife territory on Earth.",
            "total_distance_km": 200,
            "milestones": [
                {"distance_km": 20, "title": "Mara North", "description": "Enter the northern conservancies of the Mara."},
                {"distance_km": 50, "title": "Mara River Crossing", "description": "The famous river crossing point!"},
                {"distance_km": 100, "title": "Central Mara", "description": "Halfway through the heart of the Mara."},
                {"distance_km": 150, "title": "Paradise Plains", "description": "The vast plains stretch endlessly."},
                {"distance_km": 200, "title": "Serengeti Border", "description": "You've completed the Great Migration Trail!"},
            ],
            "image_url": "",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await db.challenges.insert_many(challenges)

    admin_user = {
        "id": "user-admin",
        "email": "sabrina@kenyaeducationfund.org",
        "password_hash": hash_password("admin123"),
        "full_name": "Sabrina Rodriguez",
        "display_name": "Sabrina (KEF)",
        "role": "admin",
        "challenge_id": None,
        "walker_type_id": None,
        "paid": False,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    walker1 = {
        "id": "user-john",
        "email": "john@example.com",
        "password_hash": hash_password("walker123"),
        "full_name": "John Walker",
        "display_name": "JohnnySteps",
        "role": "walker",
        "challenge_id": "ch-naivasha",
        "walker_type_id": "wt-builder",
        "paid": True,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    walker2 = {
        "id": "user-mary",
        "email": "mary@example.com",
        "password_hash": hash_password("walker123"),
        "full_name": "Mary Ochieng",
        "display_name": "MaryMoves",
        "role": "walker",
        "challenge_id": "ch-migration",
        "walker_type_id": "wt-leader",
        "paid": True,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_many([admin_user, walker1, walker2])

    team = {
        "id": "team-kef-walkers",
        "name": "KEF Trailblazers",
        "description": "Walking together for education in Kenya!",
        "tagline": "Every step educates a child",
        "invite_code": "KEF2024A",
        "creator_id": "user-john",
        "challenge_id": "ch-naivasha",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.teams.insert_one(team)
    await db.users.update_one({"id": "user-john"}, {"$set": {"team_id": "team-kef-walkers"}})
    await db.users.update_one({"id": "user-mary"}, {"$set": {"team_id": "team-kef-walkers"}})

    john_activities = [
        {"id": str(uuid.uuid4()), "user_id": "user-john", "date": "2026-01-05", "steps": 8500, "km": 6.54, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-john", "date": "2026-01-06", "steps": 12000, "km": 9.23, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-john", "date": "2026-01-07", "steps": 6500, "km": 5.0, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-john", "date": "2026-01-08", "steps": 15000, "km": 11.54, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-john", "date": "2026-01-09", "steps": 9200, "km": 7.08, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.activities.insert_many(john_activities)

    mary_activities = [
        {"id": str(uuid.uuid4()), "user_id": "user-mary", "date": "2026-01-05", "steps": 10000, "km": 7.69, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-mary", "date": "2026-01-06", "steps": 14500, "km": 11.15, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-mary", "date": "2026-01-07", "steps": 11000, "km": 8.46, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": "user-mary", "date": "2026-01-08", "steps": 8000, "km": 6.15, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.activities.insert_many(mary_activities)

    john_sponsors = [
        {"id": str(uuid.uuid4()), "walker_id": "user-john", "name": "Alice Smith", "email": "alice@example.com", "amount": 50, "message": "Go John! Walking for a great cause!", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "walker_id": "user-john", "name": "Bob Johnson", "email": "bob@example.com", "amount": 100, "message": "Proud to support KEF through your walk!", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "walker_id": "user-john", "name": "Carol Davis", "email": "carol@example.com", "amount": 25, "message": "Keep walking!", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.sponsors.insert_many(john_sponsors)

    mary_sponsors = [
        {"id": str(uuid.uuid4()), "walker_id": "user-mary", "name": "David Wilson", "email": "david@example.com", "amount": 75, "message": "Amazing work Mary!", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "walker_id": "user-mary", "name": "Emma Brown", "email": "emma@example.com", "amount": 200, "message": "Education changes everything!", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.sponsors.insert_many(mary_sponsors)

    # Seed sponsorship levels
    sponsorship_levels = [
        {"id": "level-title", "name": "Title Sponsor", "max_sponsors": 1, "display_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "level-gold", "name": "Gold Sponsor", "max_sponsors": 5, "display_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "level-silver", "name": "Silver Sponsor", "max_sponsors": 15, "display_order": 3, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.sponsorship_levels.insert_many(sponsorship_levels)

    logger.info("Seed data created successfully!")


# ==========================================
# Corporate Sponsors CRUD
# ==========================================

@api_router.get("/sponsorship-levels")
async def get_sponsorship_levels():
    levels = await db.sponsorship_levels.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return levels

@api_router.post("/sponsorship-levels")
async def create_sponsorship_level(data: SponsorshipLevelCreate, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    level = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "max_sponsors": data.max_sponsors,
        "display_order": data.display_order or 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sponsorship_levels.insert_one(level)
    del level["_id"]
    return level

@api_router.put("/sponsorship-levels/{level_id}")
async def update_sponsorship_level(level_id: str, data: SponsorshipLevelUpdate, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    result = await db.sponsorship_levels.update_one({"id": level_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Level not found")
    return {"message": "Updated"}

@api_router.delete("/sponsorship-levels/{level_id}")
async def delete_sponsorship_level(level_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    # Check if any sponsors are using this level
    sponsor_count = await db.corporate_sponsors.count_documents({"level_id": level_id})
    if sponsor_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {sponsor_count} sponsors are using this level")
    result = await db.sponsorship_levels.delete_one({"id": level_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Level not found")
    return {"message": "Deleted"}

@api_router.get("/corporate-sponsors")
async def get_corporate_sponsors():
    sponsors = await db.corporate_sponsors.find({}, {"_id": 0}).to_list(100)
    # Attach level info
    levels_list = await db.sponsorship_levels.find({}, {"_id": 0}).to_list(100)
    levels_map = {lvl["id"]: lvl for lvl in levels_list}
    for s in sponsors:
        s["level"] = levels_map.get(s.get("level_id"))
    return sponsors

@api_router.get("/corporate-sponsors/public")
async def get_public_sponsors():
    """Get sponsors grouped by level for public display"""
    levels = await db.sponsorship_levels.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    sponsors = await db.corporate_sponsors.find({}, {"_id": 0}).to_list(100)
    
    result = []
    for level in levels:
        level_sponsors = [s for s in sponsors if s.get("level_id") == level["id"]]
        if level_sponsors:  # Only include levels that have sponsors
            result.append({
                "level": level,
                "sponsors": level_sponsors
            })
    return result

@api_router.post("/corporate-sponsors")
async def create_corporate_sponsor(data: CorporateSponsorCreate, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    # Verify level exists
    level = await db.sponsorship_levels.find_one({"id": data.level_id})
    if not level:
        raise HTTPException(status_code=400, detail="Invalid sponsorship level")
    # Check max sponsors limit
    if level.get("max_sponsors"):
        current_count = await db.corporate_sponsors.count_documents({"level_id": data.level_id})
        if current_count >= level["max_sponsors"]:
            raise HTTPException(status_code=400, detail=f"Maximum sponsors ({level['max_sponsors']}) reached for this level")
    sponsor = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "level_id": data.level_id,
        "logo_url": None,
        "website_url": data.website_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.corporate_sponsors.insert_one(sponsor)
    del sponsor["_id"]
    return sponsor

@api_router.put("/corporate-sponsors/{sponsor_id}")
async def update_corporate_sponsor(sponsor_id: str, data: CorporateSponsorUpdate, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    if "level_id" in updates:
        level = await db.sponsorship_levels.find_one({"id": updates["level_id"]})
        if not level:
            raise HTTPException(status_code=400, detail="Invalid sponsorship level")
    result = await db.corporate_sponsors.update_one({"id": sponsor_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    return {"message": "Updated"}

@api_router.delete("/corporate-sponsors/{sponsor_id}")
async def delete_corporate_sponsor(sponsor_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    # Get sponsor to delete their logo
    sponsor = await db.corporate_sponsors.find_one({"id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    # Delete logo file if exists
    if sponsor.get("logo_url"):
        logo_path = UPLOADS_DIR / sponsor["logo_url"].split("/")[-1]
        if logo_path.exists():
            logo_path.unlink()
    await db.corporate_sponsors.delete_one({"id": sponsor_id})
    return {"message": "Deleted"}

@api_router.post("/corporate-sponsors/{sponsor_id}/logo")
async def upload_sponsor_logo(sponsor_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    sponsor = await db.corporate_sponsors.find_one({"id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP, SVG")
    
    # Delete old logo if exists
    if sponsor.get("logo_url"):
        old_path = UPLOADS_DIR / sponsor["logo_url"].split("/")[-1]
        if old_path.exists():
            old_path.unlink()
    
    # Save new logo
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"sponsor_{sponsor_id}.{ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    logo_url = f"/api/uploads/{filename}"
    await db.corporate_sponsors.update_one({"id": sponsor_id}, {"$set": {"logo_url": logo_url}})
    
    return {"logo_url": logo_url}

@api_router.delete("/corporate-sponsors/{sponsor_id}/logo")
async def delete_sponsor_logo(sponsor_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    sponsor = await db.corporate_sponsors.find_one({"id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    if sponsor.get("logo_url"):
        logo_path = UPLOADS_DIR / sponsor["logo_url"].split("/")[-1]
        if logo_path.exists():
            logo_path.unlink()
    await db.corporate_sponsors.update_one({"id": sponsor_id}, {"$set": {"logo_url": None}})
    return {"message": "Logo deleted"}


# ==========================================
# Sponsor Inquiry (Become a Sponsor Form)
# ==========================================

@api_router.post("/sponsor-inquiries")
async def create_sponsor_inquiry(data: SponsorInquiry):
    inquiry = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sponsor_inquiries.insert_one(inquiry)
    del inquiry["_id"]
    return inquiry

@api_router.get("/sponsor-inquiries")
async def list_sponsor_inquiries(user=Depends(get_admin_user)):
    inquiries = await db.sponsor_inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return inquiries

@api_router.put("/sponsor-inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, status: str, user=Depends(get_admin_user)):
    if status not in ["new", "contacted", "confirmed", "declined"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.sponsor_inquiries.update_one({"id": inquiry_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Status updated"}

@api_router.delete("/sponsor-inquiries/{inquiry_id}")
async def delete_sponsor_inquiry(inquiry_id: str, user=Depends(get_admin_user)):
    result = await db.sponsor_inquiries.delete_one({"id": inquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Deleted"}


# ==========================================
# Google Fit Integration
# ==========================================

from services.google_fit_service import GoogleFitService

google_fit = GoogleFitService()

# Store pending OAuth states (in production, use Redis or database)
pending_google_fit_states = {}

@api_router.get("/fitness/status")
async def get_fitness_status():
    """Check if Google Fit integration is configured"""
    return {
        "configured": google_fit.is_configured,
        "message": "Google Fit integration ready" if google_fit.is_configured else "Google Fit not configured. Contact administrator."
    }

@api_router.get("/fitness/connect")
async def connect_google_fit(user=Depends(get_current_user)):
    """Initiate Google Fit OAuth flow"""
    if not google_fit.is_configured:
        raise HTTPException(status_code=503, detail="Google Fit integration not configured")
    
    state = f"{user['id']}:{str(uuid.uuid4())}"
    pending_google_fit_states[state] = {
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    auth_url = google_fit.get_authorization_url(state)
    return {"authorization_url": auth_url, "state": state}

@api_router.get("/fitness/callback")
async def google_fit_callback(code: str, state: str):
    """Handle Google Fit OAuth callback"""
    # Verify state
    if state not in pending_google_fit_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    state_data = pending_google_fit_states.pop(state)
    user_id = state_data["user_id"]
    
    try:
        # Exchange code for tokens
        tokens = await google_fit.exchange_code_for_tokens(code)
        
        # Get Google user info
        google_user = await google_fit.get_user_info(tokens["access_token"])
        
        # Store tokens in user record
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "google_fit_connected": True,
                "google_fit_access_token": tokens["access_token"],
                "google_fit_refresh_token": tokens.get("refresh_token"),
                "google_fit_token_expires": (datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])).isoformat(),
                "google_fit_email": google_user.get("email"),
            }}
        )
        
        # Redirect to frontend success page
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/activity?fitness_connected=true")
        
    except Exception as e:
        logger.error(f"Google Fit OAuth error: {e}")
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/activity?fitness_error=true")

@api_router.get("/fitness/steps")
async def get_fitness_steps(days: int = 7, user=Depends(get_current_user)):
    """Get step data from Google Fit"""
    if not user.get("google_fit_connected"):
        raise HTTPException(status_code=400, detail="Google Fit not connected")
    
    access_token = user.get("google_fit_access_token")
    
    # Check if token needs refresh
    token_expires = user.get("google_fit_token_expires")
    if token_expires:
        expires_dt = datetime.fromisoformat(token_expires.replace("Z", "+00:00"))
        if expires_dt < datetime.now(timezone.utc):
            # Refresh token
            refresh_token = user.get("google_fit_refresh_token")
            if not refresh_token:
                raise HTTPException(status_code=401, detail="Token expired and no refresh token available")
            
            try:
                new_tokens = await google_fit.refresh_access_token(refresh_token)
                access_token = new_tokens["access_token"]
                
                # Update stored token
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "google_fit_access_token": access_token,
                        "google_fit_token_expires": (datetime.now(timezone.utc) + timedelta(seconds=new_tokens["expires_in"])).isoformat(),
                    }}
                )
            except Exception:
                raise HTTPException(status_code=401, detail="Failed to refresh token")
    
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        steps_data = await google_fit.get_daily_steps(access_token, start_date, end_date)
        
        return {
            "steps_data": steps_data,
            "date_range": {
                "start": start_date.date().isoformat(),
                "end": end_date.date().isoformat(),
            }
        }
    except Exception as e:
        logger.error(f"Failed to get Google Fit steps: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve step data")

@api_router.post("/fitness/sync")
async def sync_fitness_steps(user=Depends(get_current_user)):
    """Sync steps from Google Fit and add as activity"""
    if not user.get("google_fit_connected"):
        raise HTTPException(status_code=400, detail="Google Fit not connected")
    
    # Get today's steps
    access_token = user.get("google_fit_access_token")
    
    try:
        today_steps = await google_fit.get_step_count_today(access_token)
        
        if today_steps > 0:
            # Check if we already have activity for today
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            existing = await db.activities.find_one({
                "user_id": user["id"],
                "source": "google_fit",
                "date": today_start.date().isoformat()
            })
            
            if existing:
                # Update existing activity
                await db.activities.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "steps": today_steps,
                        "km": round(today_steps * 0.0008, 2),
                        "synced_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"message": "Steps updated", "steps": today_steps, "updated": True}
            else:
                # Create new activity
                activity = {
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "steps": today_steps,
                    "km": round(today_steps * 0.0008, 2),
                    "source": "google_fit",
                    "date": today_start.date().isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "synced_at": datetime.now(timezone.utc).isoformat()
                }
                await db.activities.insert_one(activity)
                del activity["_id"]
                return {"message": "Steps synced", "steps": today_steps, "activity": activity}
        
        return {"message": "No steps to sync", "steps": 0}
        
    except Exception as e:
        logger.error(f"Failed to sync Google Fit steps: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync steps")

@api_router.delete("/fitness/disconnect")
async def disconnect_google_fit(user=Depends(get_current_user)):
    """Disconnect Google Fit integration"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {
            "google_fit_connected": "",
            "google_fit_access_token": "",
            "google_fit_refresh_token": "",
            "google_fit_token_expires": "",
            "google_fit_email": "",
        }}
    )
    return {"message": "Google Fit disconnected"}


# ==========================================
# App Lifecycle
# ==========================================

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
