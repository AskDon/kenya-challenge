from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
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

class ChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_distance_km: Optional[float] = None
    milestones: Optional[List[dict]] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

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

class CorporateSponsorCreate(BaseModel):
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = ""
    package: str
    message: Optional[str] = ""

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
    user_resp = {k: v for k, v in user.items() if k != "password_hash"}
    return user_resp

@api_router.put("/auth/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# ==========================================
# Challenge Routes
# ==========================================

@api_router.get("/challenges")
async def list_challenges():
    challenges = await db.challenges.find({"active": True}, {"_id": 0}).to_list(100)
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
    challenge = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "total_distance_km": req.total_distance_km,
        "milestones": req.milestones,
        "image_url": req.image_url or "",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.challenges.insert_one(challenge)
    resp = {k: v for k, v in challenge.items() if k != "_id"}
    return resp

@api_router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: str, req: ChallengeUpdate, user=Depends(get_admin_user)):
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
    activities = await db.activities.find(
        {"user_id": user["id"]}, {"_id": 0}
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
    query = {}
    if q:
        query = {"name": {"$regex": q, "$options": "i"}}
    teams = await db.teams.find(query, {"_id": 0}).to_list(20)
    for team in teams:
        team["members_count"] = await db.users.count_documents({"team_id": team["id"]})
    return teams

@api_router.get("/teams/my")
async def get_my_team(user=Depends(get_current_user)):
    if not user.get("team_id"):
        return None
    team = await db.teams.find_one({"id": user["team_id"]}, {"_id": 0})
    if not team:
        return None
    members = await db.users.find(
        {"team_id": team["id"]}, {"_id": 0, "password_hash": 0}
    ).to_list(100)
    for member in members:
        activities = await db.activities.find({"user_id": member["id"]}, {"_id": 0}).to_list(10000)
        member["total_km"] = round(sum(a.get("km", 0) for a in activities), 2)
        member["total_steps"] = sum(a.get("steps", 0) for a in activities)
        sponsors = await db.sponsors.find({"walker_id": member["id"]}, {"_id": 0}).to_list(10000)
        member["total_raised"] = round(sum(s.get("amount", 0) for s in sponsors), 2)
    team["members"] = members
    team["total_km"] = round(sum(m["total_km"] for m in members), 2)
    team["total_raised"] = round(sum(m["total_raised"] for m in members), 2)
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
    activities = await db.activities.find({"user_id": walker_id}, {"_id": 0}).to_list(10000)
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
        "current_achievement": current_achievement,
        "next_achievement": next_achievement,
    }


# ==========================================
# Corporate Sponsor Routes
# ==========================================

@api_router.post("/corporate-sponsors")
async def create_corporate_sponsor(req: CorporateSponsorCreate):
    sponsor = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.corporate_sponsors.insert_one(sponsor)
    resp = {k: v for k, v in sponsor.items() if k != "_id"}
    return resp

@api_router.get("/corporate-sponsors")
async def list_corporate_sponsors(user=Depends(get_admin_user)):
    sponsors = await db.corporate_sponsors.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sponsors


# ==========================================
# Leaderboard Routes
# ==========================================

@api_router.get("/leaderboards/distance")
async def leaderboard_distance():
    users = await db.users.find(
        {"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}
    ).to_list(10000)
    result = []
    for u in users:
        activities = await db.activities.find({"user_id": u["id"]}, {"_id": 0}).to_list(10000)
        total_km = round(sum(a.get("km", 0) for a in activities), 2)
        if total_km > 0:
            result.append({
                "user_id": u["id"],
                "display_name": u.get("display_name", u.get("full_name", "")),
                "country": u.get("country", ""),
                "total_km": total_km,
            })
    result.sort(key=lambda x: x["total_km"], reverse=True)
    return result[:50]

@api_router.get("/leaderboards/raised")
async def leaderboard_raised():
    users = await db.users.find(
        {"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}
    ).to_list(10000)
    result = []
    for u in users:
        sponsors = await db.sponsors.find({"walker_id": u["id"]}, {"_id": 0}).to_list(10000)
        total_raised = round(sum(s.get("amount", 0) for s in sponsors), 2)
        if total_raised > 0:
            result.append({
                "user_id": u["id"],
                "display_name": u.get("display_name", u.get("full_name", "")),
                "country": u.get("country", ""),
                "total_raised": total_raised,
            })
    result.sort(key=lambda x: x["total_raised"], reverse=True)
    return result[:50]

@api_router.get("/leaderboards/teams/distance")
async def leaderboard_teams_distance():
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    result = []
    for team in teams:
        members = await db.users.find({"team_id": team["id"]}, {"_id": 0}).to_list(100)
        total_km = 0
        for member in members:
            activities = await db.activities.find({"user_id": member["id"]}, {"_id": 0}).to_list(10000)
            total_km += sum(a.get("km", 0) for a in activities)
        if total_km > 0:
            result.append({
                "team_id": team["id"],
                "name": team["name"],
                "total_km": round(total_km, 2),
                "members_count": len(members),
            })
    result.sort(key=lambda x: x["total_km"], reverse=True)
    return result[:50]

@api_router.get("/leaderboards/teams/raised")
async def leaderboard_teams_raised():
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    result = []
    for team in teams:
        members = await db.users.find({"team_id": team["id"]}, {"_id": 0}).to_list(100)
        total_raised = 0
        for member in members:
            sponsors = await db.sponsors.find({"walker_id": member["id"]}, {"_id": 0}).to_list(10000)
            total_raised += sum(s.get("amount", 0) for s in sponsors)
        if total_raised > 0:
            result.append({
                "team_id": team["id"],
                "name": team["name"],
                "total_raised": round(total_raised, 2),
                "members_count": len(members),
            })
    result.sort(key=lambda x: x["total_raised"], reverse=True)
    return result[:50]


# ==========================================
# Admin Routes
# ==========================================

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    total_teams = await db.teams.count_documents({})
    activities = await db.activities.find({}, {"_id": 0}).to_list(100000)
    total_distance = round(sum(a.get("km", 0) for a in activities), 2)
    total_steps = sum(a.get("steps", 0) for a in activities)
    sponsors = await db.sponsors.find({}, {"_id": 0}).to_list(100000)
    total_pledged = round(sum(s.get("amount", 0) for s in sponsors), 2)
    total_corporate = await db.corporate_sponsors.count_documents({})
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


# ==========================================
# User Progress Route
# ==========================================

@api_router.get("/users/progress")
async def get_user_progress(user=Depends(get_current_user)):
    activities = await db.activities.find(
        {"user_id": user["id"]}, {"_id": 0}
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
    }


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

    logger.info("Seed data created successfully!")


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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
