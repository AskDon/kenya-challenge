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
- [x] Teams
- [x] Basic fundraising pages
- [x] Leaderboards
- [x] Admin console
- [x] Walker Types & Achievement Levels separation
- [x] Multi-step onboarding wizard
- [x] **Supporter pledge system (flat amount pledges)**
- [x] **Supporter Dashboard**

### P1 (Upcoming)
- [ ] Real map visualization (replace progress bar with interactive map)
- [ ] Walker profile picture upload
- [ ] Automated supporter billing notifications
- [ ] Shareable achievement certificates

### P2 (Future)
- [ ] Stripe payment integration
- [ ] Magic link/passwordless login
- [ ] Corporate Sponsor user flow
- [ ] Fitness tracker integrations (Apple Health, Google Fit)
- [ ] Email notifications for sponsors
- [ ] Deep analytics dashboard
- [ ] Social sharing with OpenGraph previews
