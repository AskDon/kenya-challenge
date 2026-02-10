# The Kenya Challenge - PRD

## Original Problem Statement
Build "The Kenya Challenge", a web + mobile-friendly app for KEF (Kenya Education Fund) that combines virtual walking challenges along Kenyan routes with peer-to-peer fundraising.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + React Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT (email/password)
- **Design**: KEF-inspired warm earth tones (orange #ea580c, green #059669, stone backgrounds)

## User Personas
1. **Walker** - Signs up, picks a challenge/level, logs activity, shares sponsor link
2. **Teammate** - Same as Walker but joins via team invite link
3. **Sponsor** - Follows a link, makes a flat donation, sees progress
4. **Corporate Sponsor** - Fills form, selects package (Title/Gold/Silver)
5. **Admin (KEF)** - Configures challenges, pricing, views stats

## Core Requirements
- Auth & profiles (email/password, JWT)
- Challenges with milestones (3 pre-seeded: 100km, 150km, 200km)
- 5 Pricing levels (JAMBO $25 to GO TO KENYA $25,000)
- Teams with invite links
- Activity logging (steps/km with conversion)
- Route progress visualization
- Public fundraising pages with sponsor donations
- Leaderboards (individuals + teams, by distance + raised)
- Admin console (CRUD challenges, pricing, stats, config)

## What's Been Implemented (2026-02-10)
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

## Seed Accounts
- Admin: sabrina@kenyaeducationfund.org / admin123
- Walker 1: john@example.com / walker123
- Walker 2: mary@example.com / walker123

## Prioritized Backlog
### P0 (Done)
- [x] Auth system
- [x] Challenge management
- [x] Activity logging
- [x] Teams
- [x] Fundraising pages
- [x] Leaderboards
- [x] Admin console

### P1 (Next)
- [ ] Real Stripe payment integration
- [ ] Magic link / passwordless login
- [ ] Fitness tracker integrations (Apple Health, Google Fit)
- [ ] Email notifications for sponsors

### P2 (Future)
- [ ] Deep analytics dashboard
- [ ] Interactive map visualization (Mapbox/Google Maps)
- [ ] Social sharing with OpenGraph previews
- [ ] Corporate sponsor package management
- [ ] Challenge completion certificates
