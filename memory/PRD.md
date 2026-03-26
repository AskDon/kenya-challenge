# The Kenya Challenge - Product Requirements Document

## Original Problem Statement
Build "The Kenya Challenge," a web and mobile-friendly application for the charity KEF (Kenya Education Fund). The application facilitates virtual walking challenges along Kenyan routes combined with peer-to-peer fundraising.

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, shadcn/ui, Axios
- **Backend**: FastAPI, MongoDB (pymongo async), JWT authentication
- **Payment**: GiveButter (placeholder embed - needs embed code)
- **Fitness**: Google Fit (backend OAuth ready - needs client config)

## Architecture
```
/app/
├── backend/
│   ├── server.py          (main API - all routes)
│   ├── services/
│   │   ├── payment_service.py (GiveButter placeholder)
│   │   └── google_fit_service.py
│   └── uploads/           (file storage)
├── frontend/src/
│   ├── pages/            (all page components)
│   ├── components/       (shared + shadcn/ui)
│   ├── context/          (AuthContext)
│   └── lib/              (api.js)
├── PUNCHLIST.md
├── FREELANCER_HANDOFF.md
└── QUICK_START.md
```

## User Roles
1. **Admin** - Manages challenges, walker types, achievements, sponsors, users
2. **Walker** - Registers, joins challenges, logs activities, creates/joins teams
3. **Supporter** - Pledges money per km or total to specific walkers

## Core Features (Implemented)
- Multi-role authentication (Admin, Walker, Supporter)
- Admin CRUD: Challenges, Walker Types, Achievement Levels, Corporate Sponsors, Sponsorship Levels
- Admin Stats dashboard with per-challenge breakdown table
- Admin user management with deletion
- Admin route map upload + milestone photo upload per challenge
- Walker onboarding: multi-step flow with challenge/type selection, photo upload, team join/create
- Team creation, management, invite by code and email
- Manual activity logging + Google Fit placeholder
- Route progress visualization with milestone markers
- Leaderboards (distance, raised) with clickable walker names → fundraising pages
- Public fundraising pages per walker with redesigned pledge form
- Two-option pledge system (Total + Per KM, combinable) - amounts calculated at FULL route distance
- Supporter signup/login from fundraising page → redirect to supporter dashboard
- Social sharing buttons
- Corporate sponsors display on landing page with proper spacing between levels
- "Become a Sponsor" section (text + email link, no form)
- Walker profile picture upload (dashboard + onboarding)
- GiveButter payment placeholder
- Horizontal scroll for challenge cards (supports >3 challenges)

## Database Collections
- `users`, `challenges`, `teams`, `pledges`, `activities`
- `walker_types`, `achievement_levels`, `sponsors`
- `corporate_sponsors`, `sponsorship_levels`
- `supporter_invites`, `app_config`, `donations`

## Test Credentials
- Admin: sabrina@kenyaeducationfund.org / admin123
- Walker 1: john@example.com / walker123
- Walker 2: mary@example.com / walker123
- Supporter: supporter1@test.com / test1234

## What's Implemented

### Punch List Items Completed - March 22, 2026 Batch 1
- [x] F1-F4: Fundraising page redesign - pledge form as main CTA, new headlines, two side-by-side options
- [x] F5: Number input arrows removed
- [x] F6: Combined pledge calculation (Total + Per KM added together)
- [x] F7: GiveButter placeholder on fundraising page
- [x] H2: "Choose Your Route" CTA under challenge cards
- [x] H4: Renamed form button to "Become a Sponsor"
- [x] P1: Leaderboard walker names clickable → fundraising pages
- [x] A1: Admin stats table by challenge (walkers, teams, pledged)
- [x] A4: Admin user deletion
- [x] W2: Team page logic fix (MongoDB aggregation fixed)
- [x] W3: Team page redesign with invite section, invite link
- [x] W4: Walker profile picture upload
- [x] S1-S2: Team search auto-search with debounce
- [x] S3: 3 default supporter invite rows
- [x] B1: GiveButter placeholder (needs embed code)
- [x] B2: Stripe code removed, replaced with GiveButter service

### March 22, 2026 Batch 2 - User Feedback Fixes
- [x] HOME: Horizontal scroll for >3 challenges
- [x] HOME: Pricing changed to $1,250 / $5,000 with new descriptions
- [x] HOME: Sponsor spacing fixed between levels (space-y-16)
- [x] HOME: "Become a Sponsor" form removed, replaced with email contact text
- [x] WALKER: "Habari" → "Karibuni" greeting
- [x] WALKER: Leave Team button made subtle/ghost
- [x] SUPPORTER: Pledge amounts now show FULL route completion totals ($450 not $116.90)
- [x] SUPPORTER: MaryMoves = $400 (200km x $2/km), JohnnySteps = $50
- [x] FUNDRAISE: Supporter redirected to /supporter-dashboard after pledge
- [x] SIGNUP: Optional photo upload in onboarding
- [x] SIGNUP: Achievement Levels now informational table (Level/Amount/Swag)
- [x] SIGNUP: Invite Supporters + Share Fundraising merged into one section
- [x] TEAMMATE SIGNUP: Matches normal signup flow (photo upload, achievement table, invite+share)
- [x] ADMIN: Inquiries tab removed
- [x] ADMIN: Route map upload per challenge
- [x] ADMIN: Milestone photo upload per challenge
- [x] ADMIN: Sponsor level selector shows capacity (count/max)
- [x] ALL: Normal width buttons (not full-width)
- [x] BACKEND: Leaderboard raised includes pledges + walker_fee + sponsors

### March 24, 2026 - Challenge Reordering
- [x] ADMIN: Challenge re-ordering with up/down arrows (like Walker Types & Achievement Levels)
- [x] BACKEND: POST /api/challenges/reorder endpoint with ordered_ids array
- [x] BACKEND: display_order field added to challenges, auto-increment on create
- [x] BACKEND: All challenge list endpoints sort by display_order
- [x] FRONTEND: ChevronUp/ChevronDown buttons per challenge, first/last disabled appropriately

## Remaining Items
- [ ] GiveButter payment embed (needs embed code from KEF)
- [ ] Email system (Mailchimp integration + transactional emails for pledge notifications)
- [ ] Google Fit credentials (code ready, needs API keys)
- [x] Update FREELANCER_HANDOFF.md and QUICK_START.md with all changes

## MOCKED Features
- **GiveButter**: Placeholder UI only - needs real embed code from user
- **Google Fit**: Backend OAuth skeleton - needs Google API credentials
- **Email notifications**: Not yet implemented - needs Mailchimp integration
