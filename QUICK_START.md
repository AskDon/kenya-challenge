# The Kenya Challenge - Quick Start Guide

## Live URLs
- **Production:** https://walking-kef.preview.emergentagent.com
- **Preview:** https://challenge-admin-1.preview.emergentagent.com

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | sabrina@kenyaeducationfund.org | admin123 |
| **Walker** | john@example.com | walker123 |
| **Walker 2** | mary@example.com | walker123 |
| **Supporter** | supporter1@test.com | test1234 |

## All Pages

### Public Pages
| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, impact stats, challenge cards (horizontal scroll), corporate sponsors, "Become a Sponsor" email link |
| Login | `/login` | Email/password login |
| Signup | `/signup` | New walker registration |
| Leaderboard | `/leaderboard` | 4 tabs: individual distance, individual raised, team distance, team raised. Walker names link to fundraising pages |
| Fundraising | `/fundraise/:userId` | Walker's public fundraising page with two-option pledge form (Total + Per KM). Shows "Full Name "Nickname"" |
| Team Join | `/teams/join/:code` | Invited teammate signup flow (matches main signup) |

### Walker Pages (Login Required)
| Page | URL | Description |
|------|-----|-------------|
| Onboarding | `/onboarding` | 4 steps: Challenge > Walker Type > Team > Payment + Invite + Share |
| Dashboard | `/dashboard` | "Karibuni" greeting, progress bar with milestones, quick actions, "Start New Challenge" CTA when complete |
| Activity | `/activity` | Log steps/km manually, Google Fit sync (needs credentials), activity history |
| Team | `/team` | Create/view team, invite link, manage members |
| Supporters | `/supporters` | View supporters and their pledges, invite new supporters |
| Profile | `/profile` | Edit name, nickname, upload profile picture |

### Supporter Pages
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/supporter-dashboard` | All pledges with calculated amounts based on FULL route distance |

### Admin Pages
| Page | URL | Description |
|------|-----|-------------|
| Admin | `/admin` | 7 tabs: Stats, Challenges, Walker Types, Achievements, Users, Corporate, Config |

## Current Pricing

**Walker Types (Registration Fee):**
- Basic: $25
- Builder: $97
- Leader: $250

**Achievement Levels (Fundraising Milestones):**
| Level | Amount | Swag |
|-------|--------|------|
| Shoes for one child | $25 | Kenya Challenge Certificate |
| Uniforms for one child | $97 | Kenya Challenge T-shirt |
| Life Skills Training | $250 | Kenya Challenge Hoodie |
| Sponsor 2 children for a year | $2,500 | Custom Tote Bag With Goodies |
| Sponsor 5 children for 4 years | $25,000 | 2 Tickets to Kenya |

## Sample Challenges (admin can add/edit/reorder)

1. **Nairobi to Naivasha** - 100km, 5 milestones
2. **Nairobi to Mombasa (Leg 1)** - 150km, 5 milestones
3. **The Great Migration Trail** - 200km, 5 milestones

## What's Working

- Multi-role auth (Walker, Supporter, Admin) with JWT
- Full admin CRUD + reordering for Challenges, Walker Types, Achievement Levels
- Admin stats dashboard with per-challenge breakdown
- Admin route map + milestone photo uploads
- Walker onboarding, activity logging, team management
- Public fundraising pages with combinable pledge options
- Supporter signup/login from fundraising page
- 4-tab leaderboards with clickable names
- Corporate sponsor management with logo upload
- Social sharing buttons
- Profile picture upload
- "Start New Challenge" flow after completion

## What's NOT Working (Needs Implementation)

- **GiveButter payments** - placeholder UI only, needs embed code
- **Email notifications** - not implemented, Mailchimp requested
- **Google Fit auto-sync** - code ready, needs API credentials

## Key Files

| File | What It Does |
|------|-------------|
| `/app/backend/server.py` | All 80 API endpoints |
| `/app/backend/services/payment_service.py` | GiveButter placeholder |
| `/app/backend/services/google_fit_service.py` | Google Fit OAuth flow |
| `/app/frontend/src/App.js` | All routes |
| `/app/frontend/src/context/AuthContext.js` | Auth state management |
| `/app/frontend/src/lib/api.js` | Axios instance with JWT |
| `/app/frontend/src/pages/AdminPage.js` | Full admin console |
| `/app/FREELANCER_HANDOFF.md` | Detailed dev handoff |
| `/app/memory/PRD.md` | Product requirements |

## Brand Colors

- Primary Navy: `#1a3660`
- Accent Orange: `#ea580c`
- Success Green: `#059669`

---

*Updated: March 24, 2026*
