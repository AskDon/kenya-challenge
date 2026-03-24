# The Kenya Challenge - Punch List (March 20, 2026)

## Status: Production Prototype Complete
**Live URL:** https://virtual-trek.emergent.host
**Preview URL:** https://challenge-admin-1.preview.emergentagent.com

---

## PUNCH LIST - ALL REMAINING TASKS

### 🏠 HOME PAGE

| # | Task | Priority | Notes |
|---|------|----------|-------|
| H1 | Delete "View Leaderboard" button | P1 | Duplicative - remove from hero section |
| H2 | Add "Choose Your Route" CTA button | P1 | Place directly under the challenge cards in "Choose Your Challenge" section |
| H3 | Sponsors section - only show live sponsors | P1 | Currently working correctly - sponsors only appear if they exist in database |
| H4 | Change bottom form button to "Become a Sponsor" | P1 | Currently says "Submit Inquiry" - change to "Become a Sponsor" |

---

### 🔧 BACK-END / INTEGRATION

| # | Task | Priority | Notes |
|---|------|----------|-------|
| B1 | Integrate GiveButter (Simple Embed) | P1 | Use GiveButter's embed widgets/buttons on fundraising pages. KEF already has GiveButter account. |
| B2 | Remove all Stripe references | P1 | Delete payment_service.py Stripe placeholders, update documentation |
| B3 | Email system integration | P2 | Integrate SendGrid or similar for: welcome emails, pledge notifications, team invites |
| B4 | Email CRUD for Admin | P2 | Admin should be able to edit email templates that go to Walkers and Supporters |
| B5 | Email testing functionality | P2 | Admin should be able to send test emails |

---

### 👤 ADMIN FUNCTIONS

| # | Task | Priority | Notes |
|---|------|----------|-------|
| A1 | Stats table by Challenge | P1 | Add table under basic stats with columns: Challenge \| # Walkers \| # Teams \| $ Pledged. Two sections: "Current" and "All-Time" |
| A2 | Challenge Map requirement | P1 | Each Challenge MUST include a detailed route map so Walkers can see their position at any time |
| A3 | Sponsor logo upload (verify) | P1 | Logo upload exists - verify it's working and documented. ALL sponsors should have logos. |
| A4 | User management actions | P2 | Add ability to delete user accounts (fake, test accounts) from Admin > Users tab |
| A5 | Email template management | P2 | CRUD interface for email templates |

---

### 🚶 WALKER FUNCTIONS

| # | Task | Priority | Notes |
|---|------|----------|-------|
| W1 | Display route map | P1 | Walker must see the map showing their current position on the challenge route |
| W2 | Fix Team tab logic | P1 | **BUG:** Currently always shows "Create a Team" form. Should only show if user is NOT on a team. |
| W3 | Team page redesign | P1 | If user is on a team, show: "Your Team" header → "Invite friends, family and colleagues to join your Team" → Copy link to Join Team Page → Invite Teammates (Name + Email fields) → Team stats table (Name, Challenge, Progress, Total Pledged) with Team Leader at top → Pending invites below |
| W4 | Walker profile picture upload | P2 | Add ability for Walker to upload their profile picture |

---

### 📝 SIGN-UP AS WALKER

| # | Task | Priority | Notes |
|---|------|----------|-------|
| S1 | Fix "Join a Team" function | P1 | **BUG:** Currently not working. When clicking "Join a Team", should show list of teams + Search box |
| S2 | Fix team search | P1 | **BUG:** Search Teams box doesn't work - typing "KEF" says not found. Have to click icon to find team. |
| S3 | Invite Supporters - 3 default rows | P2 | Show 3 empty Name/Email rows by default. Add "Add More" button for additional rows. |

---

### 💰 FUNDRAISING PAGE (SUPPORTER SIGN-UP) - CRITICAL

| # | Task | Priority | Notes |
|---|------|----------|-------|
| F1 | Redesign pledge form prominence | P0 | **CRITICAL:** Form is too subtle, especially on mobile (at bottom). Must be the MAIN CTA. |
| F2 | Reposition pledge form | P0 | Move to: Centered under header, ABOVE progress statistics |
| F3 | New headline structure | P0 | Headline: "Pledge Your Support For [Walker-name] Today" / Subhead: "Every dollar goes to Kenyan students' education" / Subhead: "Choose An Option Below. Type In Your Donation Amount & Click Continue." |
| F4 | Two pledge options side-by-side | P0 | Display horizontally: "Total Pledge \| $[input]" and "Pledge Per KM \| $[input]" |
| F5 | Remove number input arrows | P1 | Delete the up/down arrows from number input boxes |
| F6 | Combined pledge calculation | P1 | If BOTH fields have values, ADD them together. Example: Total Pledge $75 + Pledge Per KM $0.50 (100km route) = $125 total |
| F7 | Integrate GiveButter widget | P1 | Replace mock payment with GiveButter donate button/form |

---

### 👥 SUPPORTER FUNCTIONS

| # | Task | Priority | Notes |
|---|------|----------|-------|
| P1 | Leaderboard - clickable walkers | P1 | **BUG:** From Supporter Dashboard, "View Leaderboard" leads to dead end. Each walker on leaderboard should link to their fundraising page. |

---

### 📝 TEAMMATE SIGN-UP (From Team Invite)

| # | Task | Priority | Notes |
|---|------|----------|-------|
| T1 | Test and verify flow | P2 | Cannot test until Team tab (W2, W3) is fixed. Verify entire flow works after Team fixes. |

---

## PRIORITY SUMMARY

### P0 - Critical (Do First)
- F1-F4: Fundraising page redesign (this is where conversions happen!)

### P1 - High Priority
- H1-H4: Home page cleanup
- B1-B2: GiveButter integration
- A1-A3: Admin stats and challenge maps
- W1-W3: Walker team functionality
- S1-S2: Walker signup team search
- F5-F7: Fundraising page finishing touches
- P1: Leaderboard clickable walkers

### P2 - Required (Not Urgent)
- B3-B5: Email system
- A4-A5: Admin user management and email templates
- W4: Walker profile picture
- S3: Invite supporters default rows
- T1: Teammate signup verification

---

## WHAT'S ALREADY COMPLETE ✅

### Core Platform
- ✅ User authentication (Walker, Supporter, Admin roles)
- ✅ JWT-based login/signup
- ✅ Multi-step onboarding wizard
- ✅ Activity logging (steps/km with conversion)
- ✅ Google Fit integration (ready - needs credentials)

### Challenges & Progress
- ✅ Challenge CRUD (Admin)
- ✅ Active/Inactive toggle for challenges
- ✅ Milestone definitions
- ✅ Progress tracking
- ✅ Route map upload endpoints (images ready, display needs work)

### Teams
- ✅ Team creation
- ✅ Team invite codes
- ✅ Teammate signup page (2-part flow)
- ✅ Team member removal (leader only)
- ✅ Team statistics

### Fundraising
- ✅ Public fundraising pages
- ✅ Pledge creation (flat and per-km)
- ✅ Supporter signup during pledge
- ✅ Supporter dashboard
- ✅ Social share buttons

### Admin Panel
- ✅ Dashboard with basic stats
- ✅ Challenge management
- ✅ Walker Types management
- ✅ Achievement Levels management
- ✅ User listing
- ✅ Corporate Sponsor management (with logo upload)
- ✅ Sponsor Inquiry management
- ✅ App configuration

### Leaderboards
- ✅ Top Walkers by Distance
- ✅ Top Walkers by Raised
- ✅ Top Teams by Distance
- ✅ Top Teams by Raised
- ✅ Optimized with MongoDB aggregation

### Corporate Sponsors
- ✅ Sponsorship Levels (Title/Gold/Silver)
- ✅ Sponsor CRUD with logo upload
- ✅ Public sponsor display on home page
- ✅ "Become a Sponsor" inquiry form

---

## TEST ACCOUNTS

| Role | Email | Password |
|------|-------|----------|
| Admin | sabrina@kenyaeducationfund.org | admin123 |
| Walker 1 | john@example.com | walker123 |
| Walker 2 | mary@example.com | walker123 |
| Supporter | supporter1@test.com | test1234 |

---

## TECH STACK

- **Frontend:** React 19, Tailwind CSS, shadcn/ui, React Router
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Database:** MongoDB
- **Auth:** JWT (email/password)
- **File Storage:** Local uploads (`/app/backend/uploads/`)

---

## KEY FILES

| File | Purpose |
|------|---------|
| `/app/backend/server.py` | All API endpoints |
| `/app/frontend/src/pages/FundraisingPage.js` | Public fundraising page (NEEDS REDESIGN) |
| `/app/frontend/src/pages/TeamPage.js` | Team management (NEEDS FIX) |
| `/app/frontend/src/pages/OnboardingPage.js` | Walker signup wizard (team search NEEDS FIX) |
| `/app/frontend/src/pages/LeaderboardPage.js` | Leaderboards (NEEDS clickable walkers) |
| `/app/frontend/src/pages/LandingPage.js` | Home page (minor tweaks needed) |
| `/app/frontend/src/pages/AdminPage.js` | Admin panel (needs stats table) |

---

## GIVEBUTTER INTEGRATION NOTES

KEF already uses GiveButter for donations. Integration approach:

1. **Simple Embed (Recommended):**
   - Get embed code from GiveButter dashboard
   - Add GiveButter donate button/form to FundraisingPage.js
   - No API integration needed
   - GiveButter handles all payment processing

2. **Setup Steps:**
   - Log into GiveButter dashboard
   - Go to Campaigns or Forms
   - Get embed code for donate button/form
   - Add to fundraising page where pledge form currently is

3. **Remove Stripe:**
   - Delete `/app/backend/services/payment_service.py` Stripe methods
   - Update documentation to remove Stripe references
   - Keep PaymentService for tracking donations (read-only)

---

*Last Updated: March 20, 2026*
