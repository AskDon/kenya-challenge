# The Kenya Challenge - Freelancer Handoff Document

## Project Overview

**The Kenya Challenge** is a virtual walking challenge app for the Kenya Education Fund (KEF). Users walk real distances that are tracked virtually along iconic Kenyan routes, while raising funds through peer-to-peer fundraising.

**Production URL:** https://walking-kef.preview.emergentagent.com
**Preview URL:** https://challenge-admin-1.preview.emergentagent.com

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS, shadcn/ui, React Router, Axios |
| Backend | FastAPI (Python), Motor (async MongoDB driver) |
| Database | MongoDB (Atlas in production) |
| Authentication | JWT (email/password, bcrypt hashing) |
| File Storage | Local uploads (`/app/backend/uploads/`) |
| Build Tool | Craco (Create React App Configuration Override) |

---

## Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main API server (~2200 lines, all 80 endpoints)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Backend environment variables
│   ├── uploads/               # Uploaded files (logos, route maps, profile pics)
│   │   ├── route_maps/
│   │   ├── route_map_markers/
│   │   ├── milestone_images/
│   │   ├── sponsor_logos/
│   │   └── profile_pictures/
│   ├── services/
│   │   ├── __init__.py
│   │   ├── payment_service.py    # GiveButter placeholder
│   │   └── google_fit_service.py # Google Fit OAuth integration
│   └── tests/
│       └── test_challenge_reorder.py
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main routing (all routes defined here)
│   │   ├── context/
│   │   │   └── AuthContext.js  # Auth state, login/logout, fetchUser
│   │   ├── lib/
│   │   │   └── api.js         # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components (button, card, dialog, etc.)
│   │   │   ├── Navbar.js      # Top navigation bar
│   │   │   └── ShareButtons.js # Social sharing (Facebook, Twitter, WhatsApp, copy link)
│   │   └── pages/
│   │       ├── LandingPage.js       # Public homepage
│   │       ├── LoginPage.js         # Login form
│   │       ├── SignupPage.js        # Walker registration
│   │       ├── OnboardingPage.js    # Multi-step: challenge > type > team > payment
│   │       ├── DashboardPage.js     # Walker dashboard with progress
│   │       ├── ActivityPage.js      # Log walks, view history, Google Fit
│   │       ├── TeamPage.js          # Team management and invites
│   │       ├── TeammatSignupPage.js # Invited teammate signup flow
│   │       ├── SupportersPage.js    # Walker's supporter list + invite
│   │       ├── SupporterDashboard.js # Supporter's pledge overview
│   │       ├── FundraisingPage.js   # Public fundraising page per walker
│   │       ├── LeaderboardPage.js   # Distance + fundraising leaderboards
│   │       ├── ProfilePage.js       # Edit profile + photo
│   │       ├── AdminPage.js         # Full admin console (7 tabs)
│   │       └── ChallengesPage.js    # Challenge detail page
│   ├── package.json
│   ├── tailwind.config.js
│   ├── craco.config.js
│   └── .env
│
├── memory/
│   └── PRD.md                 # Product requirements document
├── PUNCHLIST.md               # Original feature request list
└── QUICK_START.md             # Quick start guide
```

---

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | sabrina@kenyaeducationfund.org | admin123 | Full admin access, KEF staff |
| Walker 1 | john@example.com | walker123 | "JohnnySteps", team leader of "KEF Trailblazers" |
| Walker 2 | mary@example.com | walker123 | "MaryMoves", team member |
| Supporter | supporter1@test.com | test1234 | Has pledges to walkers |

---

## User Roles & Flows

### 1. Walker (Primary User)
1. Signs up at `/signup` (email, password, full name, nickname)
2. Onboarding at `/onboarding`:
   - Step 1: Select a challenge (virtual route)
   - Step 2: Select walker type (Basic $25 / Builder $97 / Leader $250)
   - Step 3: Create or join a team (optional)
   - Step 4: Payment via GiveButter (placeholder), invite supporters, share fundraising link
3. Logs daily activity manually (steps or km) at `/activity`
4. Shares public fundraising page `/fundraise/:userId` to collect pledges
5. Views progress, milestones, team stats on dashboard
6. Can start a new challenge after completing one

### 2. Supporter
1. Visits a walker's fundraising page at `/fundraise/:userId`
2. Makes a pledge: flat total amount AND/OR per-km amount (both combinable)
3. Creates account during pledge process (auto-redirected to supporter dashboard)
4. Views all their pledges at `/supporter-dashboard`

### 3. Admin (KEF Staff)
Admin console at `/admin` with 7 tabs:
- **Stats**: Total walkers, supporters, pledges, revenue + per-challenge breakdown table
- **Challenges**: CRUD, active/inactive toggle, reorder (up/down arrows), route map upload, milestone photo upload
- **Walker Types**: CRUD with display_order
- **Achievements**: CRUD with display_order (fundraising milestone levels)
- **Users**: View all users, delete users
- **Corporate**: Manage sponsorship levels (Title/Gold/Silver) and corporate sponsors with logo upload
- **Config**: App-wide settings

---

## API Endpoints Reference (80 total)

### Authentication
```
POST /api/auth/signup              # Create new user (walker or supporter)
POST /api/auth/login               # Login, returns { token, user }
GET  /api/auth/me                  # Get current user from JWT
PUT  /api/auth/profile             # Update profile fields
POST /api/auth/profile-picture     # Upload profile picture (multipart)
```

### Challenges
```
GET  /api/challenges               # List active challenges (sorted by display_order)
GET  /api/challenges/all           # List ALL challenges (admin only)
GET  /api/challenges/:id           # Get single challenge
POST /api/challenges               # Create challenge (admin)
PUT  /api/challenges/:id           # Update challenge (admin)
DELETE /api/challenges/:id         # Delete challenge (admin)
POST /api/challenges/reorder       # Reorder challenges { ordered_ids: [] } (admin)
POST /api/challenges/:id/route-map          # Upload route map image (admin)
POST /api/challenges/:id/route-map-markers  # Upload markers overlay image (admin)
POST /api/challenges/:id/milestones/:idx/image  # Upload milestone photo (admin)
```

### Walker Types & Achievement Levels
```
GET  /api/walker-types             # List walker types (sorted by display_order)
POST /api/walker-types             # Create (admin)
PUT  /api/walker-types/:id         # Update (admin)
DELETE /api/walker-types/:id       # Delete (admin)

GET  /api/achievement-levels       # List achievement levels (sorted by display_order)
POST /api/achievement-levels       # Create (admin)
PUT  /api/achievement-levels/:id   # Update (admin)
DELETE /api/achievement-levels/:id # Delete (admin)
```

### User Actions
```
POST /api/users/select-challenge   # Select challenge + walker type during onboarding
POST /api/users/mark-paid          # Mark user as paid (after payment)
GET  /api/users/progress           # Get walker's route progress + completed challenges
POST /api/users/start-new-challenge # Archive current challenge, start fresh
```

### Activities
```
GET  /api/activities               # User's activity history (filtered by current challenge)
POST /api/activities               # Log activity { type, value, date, notes }
DELETE /api/activities/:id         # Delete an activity
```

### Teams
```
POST /api/teams                    # Create team { name, challenge_id }
PUT  /api/teams/my                 # Update team name/description
GET  /api/teams/search             # Search teams by query + challenge
GET  /api/teams/my                 # Get user's team with members + stats
GET  /api/teams/invite/:code       # Get team info by invite code
POST /api/teams/join/:code         # Join team by invite code
POST /api/teams/leave              # Leave current team
DELETE /api/teams/members/:id      # Remove member (leader only)
```

### Pledges & Fundraising
```
POST /api/pledges/:walkerId        # Create pledge to a walker
PUT  /api/pledges/:pledgeId/link-supporter  # Link pledge to supporter account
GET  /api/pledges/:walkerId        # Get all pledges for a walker
GET  /api/fundraising/:walkerId    # Public fundraising page data (walker + pledges + challenge)
```

### Supporters
```
POST /api/supporters/signup         # Signup as supporter with initial pledge
POST /api/supporters/login-and-pledge # Login existing supporter and create pledge
GET  /api/supporters/dashboard      # Supporter's pledges with calculated amounts
POST /api/supporter-invites         # Walker sends supporter invites (name + email)
GET  /api/supporter-invites         # Get walker's sent invites
```

### Sponsors (walker's personal sponsors/donations)
```
POST /api/sponsors/:walkerId       # Add personal sponsor
GET  /api/sponsors/:walkerId       # Get walker's personal sponsors
```

### Corporate Sponsors
```
GET  /api/sponsorship-levels                # List levels (Title/Gold/Silver)
POST /api/sponsorship-levels                # Create level (admin)
PUT  /api/sponsorship-levels/:id            # Update level (admin)
DELETE /api/sponsorship-levels/:id          # Delete level (admin)
GET  /api/corporate-sponsors                # List all sponsors
GET  /api/corporate-sponsors/public         # Sponsors grouped by level (for landing page)
POST /api/corporate-sponsors                # Create sponsor (admin)
PUT  /api/corporate-sponsors/:id            # Update sponsor (admin)
DELETE /api/corporate-sponsors/:id          # Delete sponsor (admin)
POST /api/corporate-sponsors/:id/logo       # Upload logo (admin)
DELETE /api/corporate-sponsors/:id/logo     # Remove logo (admin)
```

### Leaderboards
```
GET /api/leaderboards/distance        # Individual distance leaderboard
GET /api/leaderboards/raised          # Individual fundraising leaderboard
GET /api/leaderboards/teams/distance  # Team distance leaderboard
GET /api/leaderboards/teams/raised    # Team fundraising leaderboard
```

### Google Fit
```
GET  /api/fitness/status       # Check if Google Fit is configured
GET  /api/fitness/connect      # Start OAuth flow (redirect URL)
GET  /api/fitness/callback     # OAuth callback handler
GET  /api/fitness/steps        # Get step data from Google Fit
POST /api/fitness/sync         # Sync today's steps as activity
DELETE /api/fitness/disconnect # Disconnect Google Fit
```

### Admin
```
GET  /api/admin/stats              # Platform-wide statistics
GET  /api/admin/stats/by-challenge # Stats broken down per challenge
GET  /api/admin/users              # List all users
DELETE /api/admin/users/:id        # Delete user
GET  /api/admin/config             # Get app config
PUT  /api/admin/config             # Update app config
```

---

## Database Collections

| Collection | Key Fields | Description |
|------------|-----------|-------------|
| `users` | id, email, password_hash, role, full_name, display_name, challenge_id, walker_type_id, team_id, paid, challenge_started_at, completed_challenges[] | All users |
| `challenges` | id, name, description, total_distance_km, milestones[], display_order, is_active, route_map_url | Virtual routes |
| `activities` | id, user_id, type (steps/km), value, date, challenge_started_at | Activity logs |
| `teams` | id, name, challenge_id, leader_id, members[], invite_code | Teams |
| `pledges` | id, walker_id, supporter_id, supporter_name, pledge_type (total/per_km), amount, created_at | Supporter pledges |
| `walker_types` | id, name, cost_usd, display_order | Registration tiers |
| `achievement_levels` | id, total_amount_usd, achievement, swag, display_order | Fundraising milestones |
| `corporate_sponsors` | id, name, level_id, logo_url, website_url | Corporate sponsors |
| `sponsorship_levels` | id, name, max_sponsors, display_order | Sponsor tiers (Title/Gold/Silver) |
| `supporter_invites` | id, walker_id, invites[] | Sent invitations |
| `app_config` | key, value | App settings |
| `donations` | id, walker_id, amount, type | Legacy donations |

### Important Data Model Notes
- **Pledge amounts are calculated at FULL route distance**, not partial progress. If a supporter pledges $2/km on a 200km route, the total shown is $400 regardless of current walker progress.
- **Activities filter by `challenge_started_at`** so when a walker starts a new challenge, only new activities count.
- **`completed_challenges[]`** on users stores archived challenge data when a walker finishes and starts a new one.

---

## What's WORKING (Fully Implemented)

Everything listed below is built, tested, and functional:

- Multi-role authentication (Admin, Walker, Supporter) with JWT
- Full admin console with 7 tabs (Stats, Challenges, Walker Types, Achievements, Users, Corporate, Config)
- Admin can reorder Challenges, Walker Types, and Achievement Levels
- Admin can upload route maps and milestone photos per challenge
- Walker multi-step onboarding (challenge selection, walker type, team, payment/invite)
- Manual activity logging (steps or km)
- Route progress visualization with milestone markers on dashboard
- Team creation, join by invite code, leader can remove members
- Public fundraising pages per walker with two-option pledge form (Total + Per KM, combinable)
- Supporter signup/login from fundraising page with auto-redirect to dashboard
- Leaderboards: individual distance, individual raised, team distance, team raised
- Clickable walker names on leaderboard link to fundraising pages
- Walker profile picture upload (dashboard + onboarding)
- Social sharing buttons (Facebook, Twitter, WhatsApp, copy link)
- Corporate sponsors on landing page grouped by level with proper spacing
- "Become a Sponsor" section with email contact link
- Horizontal scrolling challenge cards on homepage
- "Start New Challenge" flow for walkers who complete a route
- Walker displays as "Full Name "Nickname"" on fundraising pages

---

## What NEEDS to be Implemented

### 1. GiveButter Payment Integration (PLACEHOLDER)
**Status:** UI placeholder exists. No real payment processing.
**What's needed:** Replace the placeholder with GiveButter's actual embed/widget code.
**Where:** 
- Frontend: `OnboardingPage.js` Step 4 shows a placeholder
- Frontend: `FundraisingPage.js` has a GiveButter placeholder section
- Backend: `services/payment_service.py` has a placeholder class
**Action:** Get the GiveButter embed code from KEF and drop it in.

### 2. Email Notifications (NOT IMPLEMENTED)
**Status:** No email sending exists anywhere.
**Requested provider:** Mailchimp (transactional/Mandrill)
**Emails needed:**
- Notification to walker when they receive a new pledge
- Welcome email after signup (nice to have)
- Team invite email (nice to have)
**Where to add:** Create `backend/services/email_service.py`, call it from the pledge creation endpoint in `server.py` (line ~811, `POST /api/pledges/:walkerId`).

### 3. Google Fit Auto-Sync (BACKEND READY, NEEDS CREDENTIALS)
**Status:** Full OAuth flow is coded in `services/google_fit_service.py`. Just needs Google API credentials.
**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project, enable "Fitness API"
3. Create OAuth 2.0 credentials (Web application)
4. Set authorized redirect: `https://yourdomain.com/api/fitness/callback`
5. Add to `backend/.env`:
   ```
   GOOGLE_FIT_CLIENT_ID=your_client_id
   GOOGLE_FIT_CLIENT_SECRET=your_client_secret
   GOOGLE_FIT_REDIRECT_URI=https://yourdomain.com/api/fitness/callback
   FRONTEND_URL=https://yourdomain.com
   ```

---

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017       # Auto-set by Emergent in production (Atlas)
DB_NAME=kenya_challenge                   # Auto-set by Emergent in production
JWT_SECRET=your-secret-key                # Change in production!
FRONTEND_URL=https://yourdomain.com       # For OAuth redirects
CORS_ORIGINS=*                            # Restrict in production

# Google Fit (optional - fill in when ready)
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
GOOGLE_FIT_REDIRECT_URI=

# Email (to implement)
MAILCHIMP_API_KEY=
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://yourdomain.com   # Auto-set by Emergent
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB running locally on port 27017
- yarn (not npm)

### Backend
```bash
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
The backend auto-seeds test data (users, challenges, walker types, achievement levels, sponsorship levels) on first startup.

### Frontend
```bash
cd /app/frontend
yarn install
yarn start
```
Frontend runs on port 3000. All API calls go through `/api` prefix which routes to port 8001.

### Production Build
```bash
cd /app/frontend
CI=true yarn build
```
Note: `CI=true` treats ESLint warnings as errors. All warnings have been suppressed as of March 24, 2026.

---

## Deployment (Emergent Platform)

The app is deployed via Emergent's native deployment:
- Backend: FastAPI on port 8001 (managed by supervisor/uvicorn)
- Frontend: React build served on port 3000
- Database: MongoDB Atlas (auto-migrated by Emergent)
- File uploads: Stored in `/app/backend/uploads/` (persisted in container)

For production, consider:
- Moving file uploads to S3/Cloud Storage for durability
- Adding rate limiting to auth endpoints (`slowapi`)
- Restricting CORS_ORIGINS to your domain
- Shortening JWT expiry (currently 7 days)

---

## Security Considerations

| Item | Status | Notes |
|------|--------|-------|
| JWT authentication | Done | 7-day expiry |
| Password hashing | Done | bcrypt via passlib |
| Role-based access | Done | Admin endpoints require admin JWT |
| Rate limiting | Not done | Add to /api/auth/* endpoints |
| Input validation | Partial | Pydantic models validate types, review for XSS |
| CORS | Open (*) | Restrict to production domain |
| File upload validation | Basic | Checks file extension, not content |
| HTTPS | Done | Enforced by Emergent/K8s |

---

## Brand & Design

| Element | Value |
|---------|-------|
| Primary Navy | `#1a3660` |
| Accent Orange | `#ea580c` (Tailwind `orange-600`) |
| Success Green | `#059669` |
| Font | System default (Tailwind) |
| UI Library | shadcn/ui components in `/frontend/src/components/ui/` |
| Icons | Lucide React |

---

*Document updated: March 24, 2026*
