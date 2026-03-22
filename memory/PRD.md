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
- Admin Stats dashboard with per-challenge breakdown
- Admin user management with deletion
- Walker onboarding: multi-step flow with challenge/type selection, team join/create
- Team creation, management, invite by code and email
- Manual activity logging + Google Fit placeholder
- Route progress visualization with milestone markers
- Leaderboards (distance, raised) with clickable walker names
- Public fundraising pages per walker
- Two-option pledge system (Total + Per KM, combinable)
- Supporter signup/login flow from fundraising page
- Social sharing buttons
- Corporate sponsors display on landing page
- Sponsor inquiry form ("Become a Sponsor")
- Walker profile picture upload
- GiveButter payment placeholder

## Database Collections
- `users`, `challenges`, `teams`, `pledges`, `activities`
- `walker_types`, `achievement_levels`, `sponsors`
- `corporate_sponsors`, `sponsorship_levels`, `sponsor_inquiries`
- `supporter_invites`, `app_config`, `donations`

## Test Credentials
- Admin: sabrina@kenyaeducationfund.org / admin123
- Walker 1: john@example.com / walker123
- Walker 2: mary@example.com / walker123
- Supporter: supporter1@test.com / test1234

## What's Implemented (Phase 1 - March 2026)
### Punch List Items Completed (March 22, 2026)
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

## Remaining Punch List Items (P1/P2)
- [ ] A2/W1: Challenge route map display with admin-uploaded map images
- [ ] A3: Verify sponsor logo upload working (needs manual test)
- [ ] B3-B5: Email system (SendGrid integration + admin CRUD templates)
- [ ] T1: Teammate signup flow verification
- [ ] Update FREELANCER_HANDOFF.md and QUICK_START.md after all items done

## MOCKED Features
- **GiveButter**: Placeholder UI only - needs real embed code from user
- **Google Fit**: Backend OAuth skeleton - needs Google API credentials
- **Email notifications**: Not yet implemented - needs SendGrid integration
