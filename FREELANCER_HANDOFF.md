# The Kenya Challenge - Freelancer Handoff Document

## Project Overview

**The Kenya Challenge** is a virtual walking challenge app for the Kenya Education Fund (KEF). Users walk real distances that are tracked virtually along iconic Kenyan routes, while raising funds through peer-to-peer fundraising.

**Live Preview:** https://challenge-admin-1.preview.emergentagent.com

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS, shadcn/ui, React Router |
| Backend | FastAPI (Python), Motor (async MongoDB) |
| Database | MongoDB |
| Authentication | JWT (email/password) |
| File Storage | Local uploads (`/app/backend/uploads/`) |

---

## Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main API server (all endpoints)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   ├── uploads/               # Uploaded files (logos, images)
│   └── services/
│       ├── __init__.py
│       ├── payment_service.py    # Stripe-ready payment module
│       └── google_fit_service.py # Google Fit integration
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main routing
│   │   ├── context/
│   │   │   └── AuthContext.js # Authentication state
│   │   ├── lib/
│   │   │   └── api.js         # Axios API client
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── Navbar.js
│   │   │   └── ShareButtons.js
│   │   └── pages/
│   │       ├── LandingPage.js
│   │       ├── LoginPage.js
│   │       ├── SignupPage.js
│   │       ├── OnboardingPage.js
│   │       ├── DashboardPage.js
│   │       ├── ActivityPage.js
│   │       ├── TeamPage.js
│   │       ├── TeammateSignupPage.js
│   │       ├── SupportersPage.js
│   │       ├── SupporterDashboard.js
│   │       ├── FundraisingPage.js
│   │       ├── LeaderboardPage.js
│   │       ├── ProfilePage.js
│   │       └── AdminPage.js
│   ├── package.json
│   └── .env
│
└── memory/
    └── PRD.md                 # Product requirements document
```

---

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | sabrina@kenyaeducationfund.org | admin123 | Full admin access |
| Walker 1 | john@example.com | walker123 | Team leader of "KEF Trailblazers" |
| Walker 2 | mary@example.com | walker123 | Team member |
| Supporter | supporter1@test.com | test1234 | Has pledges to walkers |

---

## User Roles & Flows

### 1. Walker (Primary User)
- Signs up → Onboarding (select challenge, walker type, team) → Pay registration fee
- Logs daily activity (steps/km) manually or via Google Fit
- Shares fundraising page to collect pledges
- Views progress on dashboard and leaderboard

### 2. Supporter
- Visits walker's fundraising page → Makes pledge (flat amount)
- Creates account during pledge process
- Views their pledges in Supporter Dashboard

### 3. Team Leader
- Creates team → Invites teammates via link
- Can remove team members
- Views team stats and progress

### 4. Admin (KEF Staff)
- Manages Challenges (CRUD, active/inactive toggle)
- Manages Walker Types (Basic $25, Builder $97, Leader $250)
- Manages Achievement Levels (fundraising milestones)
- Manages Corporate Sponsors (levels, logos)
- Reviews Sponsor Inquiries from "Become a Sponsor" form
- Views platform statistics

---

## API Endpoints Reference

### Authentication
```
POST /api/auth/signup          # Create new user
POST /api/auth/login           # Login, returns JWT token
GET  /api/auth/me              # Get current user
```

### Challenges
```
GET  /api/challenges           # List active challenges
GET  /api/challenges/all       # List all (admin)
GET  /api/challenges/:id       # Get single challenge
POST /api/challenges           # Create (admin)
PUT  /api/challenges/:id       # Update (admin)
DELETE /api/challenges/:id     # Delete (admin)
POST /api/challenges/:id/route-map         # Upload route map
POST /api/challenges/:id/route-map-markers # Upload markers map
```

### Activities
```
GET  /api/activities           # User's activities
POST /api/activities           # Log activity
DELETE /api/activities/:id     # Delete activity
GET  /api/users/progress       # Get user's progress
```

### Teams
```
GET  /api/teams/my             # Get user's team
POST /api/teams                # Create team
GET  /api/teams/invite/:code   # Get team by invite code
POST /api/teams/join/:code     # Join team
POST /api/teams/leave          # Leave team
DELETE /api/teams/members/:id  # Remove member (leader only)
```

### Pledges & Supporters
```
POST /api/pledges                      # Create pledge
POST /api/supporters/signup            # Signup as supporter with pledge
GET  /api/supporters/dashboard         # Supporter's pledges
GET  /api/fundraising/:userId          # Public fundraising page data
```

### Corporate Sponsors
```
GET  /api/sponsorship-levels           # List levels
POST /api/sponsorship-levels           # Create (admin)
PUT  /api/sponsorship-levels/:id       # Update (admin)
DELETE /api/sponsorship-levels/:id     # Delete (admin)
GET  /api/corporate-sponsors           # List sponsors
GET  /api/corporate-sponsors/public    # Sponsors grouped by level
POST /api/corporate-sponsors           # Create (admin)
PUT  /api/corporate-sponsors/:id       # Update (admin)
DELETE /api/corporate-sponsors/:id     # Delete (admin)
POST /api/corporate-sponsors/:id/logo  # Upload logo
DELETE /api/corporate-sponsors/:id/logo # Remove logo
```

### Sponsor Inquiries
```
POST /api/sponsor-inquiries            # Submit inquiry (public)
GET  /api/sponsor-inquiries            # List all (admin)
PUT  /api/sponsor-inquiries/:id/status # Update status (admin)
DELETE /api/sponsor-inquiries/:id      # Delete (admin)
```

### Google Fit
```
GET  /api/fitness/status       # Check if configured
GET  /api/fitness/connect      # Start OAuth flow
GET  /api/fitness/callback     # OAuth callback
GET  /api/fitness/steps        # Get step data
POST /api/fitness/sync         # Sync today's steps
DELETE /api/fitness/disconnect # Disconnect
```

### Admin
```
GET  /api/admin/stats          # Platform statistics
GET  /api/admin/users          # List all users
GET  /api/admin/config         # Get app config
PUT  /api/admin/config         # Update app config
```

---

## Database Collections

| Collection | Description |
|------------|-------------|
| users | All users (walkers, supporters, admins) |
| challenges | Walking routes with milestones |
| activities | Activity logs (steps, km, date) |
| teams | Team information |
| walker_types | Registration tiers (Basic, Builder, Leader) |
| achievement_levels | Fundraising milestones |
| pledges | Supporter pledges |
| sponsors | Legacy donations (deprecated) |
| sponsorship_levels | Corporate sponsor tiers |
| corporate_sponsors | Corporate sponsor info |
| sponsor_inquiries | "Become a Sponsor" form submissions |
| config | App configuration |

---

## Priority Tasks for Freelancer

### P0 - Critical (Do First)

#### 1. Stripe Payment Integration
**Effort:** 8-16 hours | **Budget:** $500-800

The payment service module is ready at `/app/backend/services/payment_service.py`.

**Steps:**
1. Install Stripe: `pip install stripe`
2. Add to `.env`:
   ```
   STRIPE_API_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
3. Implement methods in `PaymentService`:
   - `create_stripe_payment_intent()` - Create payment intent
   - `confirm_stripe_payment()` - Verify payment
   - `process_stripe_webhook()` - Handle webhooks
   - `create_stripe_refund()` - Process refunds
4. Update frontend onboarding to use Stripe Checkout or Elements
5. Add webhook endpoint: `POST /api/webhooks/stripe`

**Reference:** The `PaymentService` class has detailed comments and placeholder implementations.

#### 2. Email Notifications
**Effort:** 4-8 hours | **Budget:** $300-500

**Recommended:** SendGrid or Resend

**Emails needed:**
- Welcome email (after signup)
- Pledge notification (to walker when supporter pledges)
- Team invite email
- Password reset (if implementing)

**Steps:**
1. Install: `pip install sendgrid` or `pip install resend`
2. Add API key to `.env`
3. Create email templates (HTML)
4. Add email sending to relevant endpoints

---

### P1 - Important

#### 3. Google Fit Configuration
**Effort:** 2-4 hours | **Budget:** $100-200

The code is complete, just needs credentials.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project "Kenya Challenge"
3. Enable "Fitness API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect: `https://yourdomain.com/api/fitness/callback`
6. Add to backend `.env`:
   ```
   GOOGLE_FIT_CLIENT_ID=xxx
   GOOGLE_FIT_CLIENT_SECRET=xxx
   GOOGLE_FIT_REDIRECT_URI=https://yourdomain.com/api/fitness/callback
   FRONTEND_URL=https://yourdomain.com
   ```

#### 4. PWA Setup (Mobile App Experience)
**Effort:** 2-4 hours | **Budget:** $200-400

**Steps:**
1. Create `public/manifest.json`:
   ```json
   {
     "name": "The Kenya Challenge",
     "short_name": "Kenya Challenge",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#ea580c",
     "icons": [
       {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
       {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}
     ]
   }
   ```
2. Create service worker for offline caching
3. Add meta tags to `index.html`
4. Create app icons (192x192, 512x512)

---

### P2 - Nice to Have

#### 5. Route Map Visual Progress
**Effort:** 4-8 hours | **Budget:** $300-500

Show walker's position on the challenge map image.

**Approach:**
- Admin uploads route map with distance markers
- Calculate walker's position based on total_km
- Overlay a pin/marker on the image at the correct position

#### 6. Profile Picture Upload
**Effort:** 2-4 hours | **Budget:** $150-300

Similar to sponsor logo upload. Add endpoint and UI.

#### 7. Achievement Certificates
**Effort:** 4-8 hours | **Budget:** $300-500

Generate shareable certificate images when walker completes challenge or reaches achievement level.

**Options:**
- Server-side: Use Pillow or html2image
- Client-side: Use html2canvas

---

### Security Hardening Checklist

| Task | Priority | Notes |
|------|----------|-------|
| ✅ JWT authentication | Done | Already implemented |
| ✅ Password hashing | Done | Using passlib/bcrypt |
| ⬜ Rate limiting | P1 | Add to `/api/auth/*` endpoints |
| ⬜ Input validation | P1 | Review all endpoints for XSS, injection |
| ⬜ HTTPS enforcement | P1 | Ensure production uses HTTPS only |
| ⬜ Password requirements | P2 | Currently 6 chars min, consider 8+ |
| ⬜ Session timeout | P2 | JWT expires in 7 days, consider shorter |
| ⬜ Admin audit log | P3 | Log admin actions (create, delete, etc.) |
| ⬜ File upload validation | P2 | Validate file types, sizes |
| ⬜ CORS configuration | P1 | Restrict to specific domains in production |

**Rate Limiting Implementation:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    ...
```

---

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=kenya_challenge
JWT_SECRET=your-secret-key

# Google Fit (optional)
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
GOOGLE_FIT_REDIRECT_URI=
FRONTEND_URL=

# Stripe (to implement)
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# Email (to implement)
SENDGRID_API_KEY=
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://your-production-url.com
```

---

## Running Locally

### Backend
```bash
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd /app/frontend
yarn install
yarn start
```

---

## Deployment Notes

- Frontend and backend are deployed together
- Backend serves API at `/api/*`
- File uploads stored at `/app/backend/uploads/`
- For production, consider:
  - Moving uploads to S3/Cloud Storage
  - Using Redis for session/rate limiting
  - Adding monitoring (Sentry, LogRocket)

---

## Questions?

Contact the project owner for:
- Access to Google Cloud Console (for Fitness API)
- Stripe account credentials
- Domain/DNS configuration
- Design assets (logos, brand guidelines)

---

## Estimated Total Budget

| Task | Hours | Cost Range |
|------|-------|------------|
| Stripe Integration | 8-16 | $500-800 |
| Email Notifications | 4-8 | $300-500 |
| Google Fit Setup | 2-4 | $100-200 |
| PWA Setup | 2-4 | $200-400 |
| Security Hardening | 4-8 | $300-500 |
| Route Map Visual | 4-8 | $300-500 |
| Testing & QA | 4-8 | $200-400 |
| **Total** | **28-56** | **$1,900-3,300** |

---

*Document generated: March 2026*
*Last updated by: Emergent AI*
