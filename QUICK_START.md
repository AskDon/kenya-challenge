# The Kenya Challenge - Quick Start Guide

## 🚀 Live Preview
**URL:** https://walking-kef.preview.emergentagent.com

## 🔐 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | sabrina@kenyaeducationfund.org | admin123 |
| **Walker** | john@example.com | walker123 |
| **Walker 2** | mary@example.com | walker123 |
| **Supporter** | supporter1@test.com | test1234 |

## 📱 All Pages

### Public Pages
| Page | URL | What's There |
|------|-----|--------------|
| Home | `/` | Hero, features, challenges, sponsors, "Become a Sponsor" form |
| Login | `/login` | Email/password login |
| Signup | `/signup` | New walker registration |
| Leaderboard | `/leaderboard` | Top walkers & teams rankings |
| Fundraising | `/fundraise/:userId` | Walker's public fundraising page with pledge form |
| Team Join | `/teams/join/:code` | Teammate signup flow |

### Walker Pages (Login Required)
| Page | URL | What's There |
|------|-----|--------------|
| Onboarding | `/onboarding` | Challenge → Walker Type → Team → Payment |
| Dashboard | `/dashboard` | Progress stats, quick actions, recent activity |
| Activity | `/activity` | Log steps/km, Google Fit sync, activity history |
| Team | `/team` | Create/view team, invite members, manage roster |
| Supporters | `/supporters` | View your supporters and their pledges |
| Profile | `/profile` | Edit your profile |

### Supporter Pages
| Page | URL | What's There |
|------|-----|--------------|
| Dashboard | `/supporter-dashboard` | View all your pledges and walker progress |

### Admin Pages
| Page | URL | What's There |
|------|-----|--------------|
| Admin | `/admin` | 8 tabs: Stats, Challenges, Walker Types, Achievements, Users, Corporate, Inquiries, Config |

## 💰 Current Pricing

**Walker Types (Registration Fee):**
- Basic: $25
- Builder: $97
- Leader: $250

**Achievement Levels (Fundraising Milestones):**
- Jambo: $100
- Safari: $250
- Kilimanjaro: $500
- Serengeti: $1,000
- Maasai Mara: $2,500

## 🏃 Sample Challenges

1. **Nairobi to Naivasha** - 100km, 4 milestones
2. **Nairobi to Mombasa** - 150km (Coast to Coast)
3. **The Great Migration Trail** - 200km, 5 milestones

## ⚡ Key Features

- ✅ User authentication (Walker, Supporter, Admin roles)
- ✅ Multi-step onboarding wizard
- ✅ Manual activity logging (steps/km)
- ✅ Google Fit integration (needs credentials)
- ✅ Team creation and management
- ✅ Public fundraising pages
- ✅ Social sharing buttons
- ✅ Supporter pledge system
- ✅ 4-tab leaderboard
- ✅ Corporate sponsor management
- ✅ Admin dashboard with full CRUD
- ⬜ Stripe payments (prepared, not integrated)
- ⬜ Email notifications (not implemented)

## 📁 Key Files

- `/app/FREELANCER_HANDOFF.md` - Detailed handoff for developers
- `/app/memory/PRD.md` - Full product requirements
- `/app/backend/server.py` - All API endpoints
- `/app/backend/services/payment_service.py` - Stripe-ready payment module
- `/app/backend/services/google_fit_service.py` - Google Fit integration

## 🎨 Brand Colors

- Primary Navy: `#1a3660`
- Accent Orange: `#ea580c`
- Success Green: `#059669`
