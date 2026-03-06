# The Kenya Challenge - PRD

## Original Problem Statement
Build "The Kenya Challenge", a web + mobile-friendly app for KEF (Kenya Education Fund) that combines virtual walking challenges along Kenyan routes with peer-to-peer fundraising.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + React Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT (email/password)
- **Design**: KEF-inspired (Navy #1a3660, Orange #ea580c, stone backgrounds)

## User Roles
1. **Walker** - Signs up, picks a challenge/walker type, logs activity, shares fundraising link, manages supporters
2. **Teammate** - Same as Walker but joins via team invite link
3. **Supporter** - Creates pledges (flat or per-km) on walker's fundraising page, tracks pledges via dashboard
4. **Corporate Sponsor** - Fills form, selects package (Title/Gold/Silver)
5. **Admin (KEF)** - Configures challenges, walker types, achievement levels, views stats

## Core Requirements
- Auth & profiles (email/password, JWT)
- Challenges with milestones (3 pre-seeded: 100km, 150km, 200km)
- Walker Types (entry fees: Basic $25, Builder $97, Leader $250)
- Achievement Levels (fundraising milestones with swag rewards)
- Teams with invite links
- Activity logging (steps/km with conversion)
- Route progress visualization
- **Public fundraising pages with pledge system (per-km or flat amount)**
- **Supporter signup/login flow with pledge creation**
- **Supporter Dashboard to track pledges**
- Leaderboards (individuals + teams, by distance + raised)
- Admin console (CRUD challenges, walker types, achievement levels, stats, config)

## What's Been Implemented

### 2026-02-10 - Initial MVP
- Full backend API (19+ endpoints, all tested 100%)
- JWT authentication system
- Complete CRUD for challenges, pricing levels, config
- Activity logging with steps<->km conversion
- Team creation, invite links, join flow
- Sponsor donation system (mock payments)
- Public fundraising pages
- 4-tab leaderboard system
- Admin console with 6 tabs
- Seed data (admin, 2 walkers, 3 challenges, 5 levels, team, activities, sponsors)
- Beautiful landing page with KEF branding
- Mobile-first responsive design
- Route progress visualization with map placeholder

### 2026-03-06 - Supporter & Pledge System
- **Public Fundraising Page** (`/fundraise/{userId}`) with:
  - Walker profile, team badge, progress stats
  - Challenge info with route map and milestones
  - Achievement level display
  - Pledge form (flat amount option with preset $25/$50/$100 and custom)
  - Supporter signup/login flow integrated in pledge form
  - **Social Share Buttons** (Facebook, X/Twitter, LinkedIn, WhatsApp, Email, Copy link)
- **Supporter Dashboard** (`/supporter-dashboard`) showing:
  - Stats: Active pledges, walkers supported, total pledged
  - Pledge cards with walker info, progress bar, pledge amount
  - Link to walker's fundraising page
  - CTA to discover more walkers via leaderboard
- **Role-based Navigation**:
  - Walkers: Dashboard, Activity, Team, Supporters, Leaderboard
  - Supporters: Dashboard, Leaderboard
  - Admin: Admin, Leaderboard
- **Login redirect** based on role (supporters → /supporter-dashboard)
- Backend APIs: POST /api/pledges, POST /api/supporters/signup, GET /api/supporters/dashboard

### 2026-03-06 - Teammate Signup & Enhanced Team Page
- **Teammate Signup Page** (`/teams/join/{inviteCode}`) with 2-part flow:
  - Part 1: Account creation (Full Name, Display Name, Email, Password, Confirm Password) with Login toggle
  - Part 2: Challenge selection, Walker Type selection, Achievement Levels table, Invite Supporters (optional), Fundraising link, Mock Payment
  - Auto-joins team after account creation
- **Enhanced Team Page** (`/team`):
  - Team Leader badge and "Led by [name]" subtitle
  - **Avg Completion %** stat card
  - Member table with progress bars and percentage
  - Leader can see "Invite Members" button
  - **Leader can remove non-leader members** (trash icon)
- Backend APIs: DELETE /api/teams/members/{member_id}, Enhanced GET /api/teams/my with leader info and avg_progress_pct

### 2026-03-06 - Corporate Sponsors Feature
- **Admin Sponsorship Levels CRUD**:
  - Create/Edit/Delete sponsorship levels (Title, Gold, Silver)
  - Configure max sponsors per level (Title=1, Gold=5, Silver=15)
  - Display order for home page sorting
- **Admin Corporate Sponsors CRUD**:
  - Create/Edit/Delete sponsors with name, level, website URL
  - **Logo upload** (PNG, JPEG, WebP, SVG supported)
  - Served from `/api/uploads/` static files
- **Home Page Sponsors Section**:
  - "Thank You to Our Sponsors" section
  - Sponsors grouped by level (Title → Gold → Silver)
  - Clickable logo/name cards linking to sponsor websites
- Backend APIs: Full CRUD for `/api/sponsorship-levels` and `/api/corporate-sponsors`, Logo upload at POST `/api/corporate-sponsors/{id}/logo`

### 2026-03-06 - Admin Enhancements & Become a Sponsor
- **"Become a Sponsor" Form** (Landing Page):
  - Contact form with Company Name, Contact Person, Email, Phone, Interested Level, Message
  - Public submission creates inquiry in database
  - Success confirmation displayed after submit
- **Admin Sponsor Inquiries Tab**:
  - View all sponsor inquiries with badge count for new ones
  - Status management: New → Contacted → Confirmed / Declined
  - Full contact details and message display
- **Enhanced Challenge CRUD**:
  - **Active/Inactive toggle** - Deactivate without deleting
  - **Unique name validation**
  - **Description limits** (50-2000 characters with counter)
  - **Route map uploads**: POST `/api/challenges/{id}/route-map` and `/route-map-markers`
  - **Milestone image uploads**: POST `/api/challenges/{id}/milestones/{index}/image`
- Backend validation: Unique names, description length, file type restrictions

## Seed Accounts
- Admin: sabrina@kenyaeducationfund.org / admin123
- Walker 1: john@example.com / walker123
- Walker 2: mary@example.com / walker123
- Supporter: supporter1@test.com / test1234

## Prioritized Backlog

### P0 (Completed)
- [x] Auth system
- [x] Challenge management
- [x] Activity logging
- [x] Teams with invite links
- [x] Basic fundraising pages
- [x] Leaderboards
- [x] Admin console
- [x] Walker Types & Achievement Levels separation
- [x] Multi-step onboarding wizard
- [x] **Supporter pledge system (flat amount pledges)**
- [x] **Supporter Dashboard**
- [x] **Social Share buttons on Fundraising page**
- [x] **Teammate Signup 2-part flow**
- [x] **Enhanced Team Page** (leader display, avg completion %, member removal)
- [x] **Corporate Sponsors** (Admin CRUD for levels & sponsors, logo upload, home page display)
- [x] **"Become a Sponsor" contact form** (landing page + admin inquiries view)
- [x] **Challenge Active/Inactive toggle**
- [x] **Enhanced Challenge validation** (unique names, description limits)
- [x] **Challenge route map & milestone image uploads**

### P1 (Upcoming)
- [ ] Walker profile picture upload
- [ ] Automated supporter billing notifications
- [ ] Shareable achievement certificates
- [ ] Route map visual progress indicator (Option B: static map with position marker)

### P2 (Future)
- [ ] Stripe payment integration (replace mock payment)
- [ ] Magic link/passwordless login
- [ ] Fitness tracker integrations (Apple Health, Google Fit)
- [ ] Email notifications for sponsors
- [ ] Deep analytics dashboard
- [ ] Open Graph meta tags for social preview images
