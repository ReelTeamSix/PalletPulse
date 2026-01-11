# PalletPulse - Comprehensive One-Shot Project Context

> **Purpose:** This document provides complete context for building PalletPulse, a SaaS platform for pallet/mystery box resellers. It is designed to enable autonomous development with minimal clarification needed.

---

## 🎯 Executive Summary

**PalletPulse** is a mobile-first SaaS application that helps resellers track inventory, calculate profits, and optimize their sourcing strategies across pallets, mystery boxes, and individual item acquisitions (thrift stores, garage sales, retail arbitrage).

**Target Market:** Home-based resellers (primary), warehouse operators (future)  
**Primary Sales Channel:** Facebook Marketplace  
**Launch Strategy:** Beta with 15-20 users → Affiliate marketing via GRPL (50k following)  
**Revenue Model:** Freemium SaaS with tiered subscriptions

---

## 💰 Business Model

### Pricing Tiers

| Tier | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | $0 | N/A | 1 pallet, 20 items total (across all sources), 1 photo/item, 30-day analytics |
| **Starter** | $9.99/mo | $99.99/yr (~$8.33/mo) | 25 pallets, 500 items, 3 photos/item, AI descriptions (50/mo), unlimited analytics, expense tracking, CSV export |
| **Pro** | $24.99/mo | $249.99/yr (~$20.83/mo) | Unlimited pallets/items, 10 photos/item, advanced analytics, AI descriptions (200/mo), bulk import/export, priority support |
| **Enterprise** | Custom | Custom | Multi-user, white-label, API access, dedicated support, conflict resolution for concurrent edits |

### Affiliate Discounts

| Billing Cycle | Affiliate Offer |
|---------------|----------------|
| **Monthly** | 50% off first month ($4.99 Starter / $12.49 Pro), then full price |
| **Annual** | 20% off first year ($79.99 Starter / $199.99 Pro) |

### Affiliate Program

- **Commission:** 25% recurring revenue for lifetime of customer
- **Commission on Tier Changes:**
  - **Upgrade:** Affiliate immediately earns 25% of new tier rate
  - **Downgrade:** Affiliate continues earning 25% of new (lower) tier rate
  - **Cancellation:** Commission stops when subscription ends
- **Tracking:** Unique referral codes per affiliate
- **Transparency:** Affiliates see aggregate referral data (not individual customer details)
- **Primary Affiliate:** GRPL (Grand Rapids Pallet Liquidations) - 50k Facebook following
- **Payout:**
  - Frequency: Monthly via Stripe/PayPal
  - Minimum threshold: $25 (balances below this roll over to next month)
  - Processing: Payouts processed on 1st of month for previous month's commissions
- **Free Tier Referrals:**
  - All signups with affiliate codes are tracked regardless of tier
  - Commission is only earned when user upgrades to a paid tier
  - Attribution window: 90 days (if user signs up free, then upgrades within 90 days, affiliate gets credit)
  - Affiliate dashboard shows: Total signups, Paid conversions, Conversion rate

### Revenue Projections (Conservative)

- 1% conversion of 50k following = 500 subscribers
- Average tier: Starter ($9.99/mo)
- Gross MRR: $4,995
- Affiliate commission (25%): -$1,249
- Net MRR: $3,746
- Annual run rate: ~$45k

---

## 👥 User Personas

### Primary: Home-Based Reseller (Sarah)

**Demographics:**
- Age: 28-45
- Location: Michigan (initially), expanding to US
- Business: Side hustle or full-time reselling
- Tech savvy: Moderate (uses Facebook, basic apps)

**Current Workflow:**
1. Visits GRPL warehouse, evaluates pallets visually
2. Purchases 1-2 pallets ($250-750 each) + sales tax
3. Transports via trailer to home
4. Unloads boxes to garage (staging area)
5. Marks pallets with numbers (Pallet 1, Pallet 2)
6. Unboxes items one-by-one over several days
7. For each item:
   - Uses Google Lens to identify product
   - Researches retail price (Target, Amazon, etc.)
   - Determines selling price (typically 40-60% of retail for new items)
   - Takes staged product photos
   - Creates Facebook Marketplace listing (AI-assisted description via ChatGPT)
   - Manages inquiries, negotiates price
   - Schedules porch pickup with money box
   - Logs sale in basic tracking app

**Pain Points:**
- Inventory sprawl across home (living room, kitchen, bedroom)
- Hard to remember which items came from which pallet
- Difficult to calculate true profit per pallet
- Manual tracking limits analysis
- Can't compare profitability across sourcing methods
- No-shows, ghosting, haggling on Facebook Marketplace
- Tax preparation is a nightmare

**Goals:**
- Know which pallets are most profitable
- Track ROI by supplier/pallet type
- Identify stale inventory quickly
- Simplify tax reporting
- Make data-driven sourcing decisions

### Secondary: Aspiring Reseller (Mike)

**Demographics:**
- Age: 22-35
- Currently employed, exploring side income
- Watches GRPL educational content
- Nervous about initial investment

**Needs:**
- Simple onboarding
- Clear profit tracking from day one
- Educational content/tips
- Low barrier to entry (free tier)

### Future: Warehouse Operator (Phase 2)

**Differences from home-based:**
- Processes 24+ pallets at a time
- Sells both broken-down items AND whole pallets to customers
- Needs multi-user access (team accounts)
- Requires bulk processing features

---

## 🔄 Core User Workflows

### Workflow 1: Pallet Acquisition & Setup

**Trigger:** User purchases pallet(s) from supplier

**Steps:**
1. User taps "Add Pallet" button
2. Enters pallet details:
   - Name (auto-suggested: "Pallet 1", "Pallet 2", or custom)
   - Supplier (dropdown with suggestions: GRPL, Liquidation Land, etc.)
   - Source/Type (e.g., "Amazon Monster", "Walmart Medium")
   - Purchase cost (e.g., $750)
   - Sales tax (auto-calculated or manual)
   - Purchase date (defaults to today)
   - Optional: Photo of pallet
3. Pallet created with status "Unprocessed"
4. User can now add items to this pallet

**Business Rules:**
- Multiple pallets can be purchased together (e.g., "2 for $1000")
- User can split cost manually or evenly
- Sales tax is tracked separately for expense reporting

### Workflow 2: Item Processing (The Core Loop)

**Trigger:** User unboxes an item from a pallet

**Steps:**
1. User selects pallet from list
2. Taps "Add Item" 
3. **Item Identification:**
   - Option A: Manual entry (name, description)
   - Option B: Barcode scan (if SKU visible on packaging)
   - Option C: Photo + AI identification (future)
4. **Item Details:**
   - Quantity (default: 1, supports case-packed items)
   - Condition (New, Open Box, Used-Good, Used-Fair, Damaged, For Parts, Unsellable)
   - Retail price (researched value)
   - Storage location (dropdown: Garage, Living Room, Bedroom, etc.)
5. **Pricing:**
   - Listing price (user determines based on condition/market)
   - App shows suggested markdown % (e.g., "40% off retail")
   - Future: AI pricing recommendations based on historical data
6. **Photos:**
   - Take/upload 1-10 photos (tier-dependent)
   - Supports batch upload
   - Optional: Can save item without photos for later
7. **Listing Helper (Optional):**
   - Generate AI description via ChatGPT API
   - Template: "New [item name], retail $[retail price], [condition]. Great for [use case]."
   - One-click copy to clipboard
   - User pastes into Facebook Marketplace
8. Item saved with status "Listed"

**Business Rules:**
- Items default to status "Unlisted" if no listing price entered
- Cost allocation: Total pallet cost ÷ number of items (excluding unsellable items)
- Items can be marked as "Unsellable" and excluded from cost calculation
- User can toggle between "Include unsellable items in cost" vs "Exclude"

### Workflow 3: Sale Transaction

**Trigger:** Customer purchases item

**Steps:**
1. User navigates to item (via search, pallet view, or "Recently Listed")
2. Taps "Mark as Sold"
3. Enters:
   - Final sale price (may differ from listing price due to negotiation)
   - Sale date (defaults to today)
   - Sales channel (Facebook Marketplace, Private Group, eBay, etc.)
   - Optional: Buyer notes
4. Item status changes to "Sold"
5. Profit automatically calculated: `(Sale Price) - (Allocated Cost)`
6. Analytics updated in real-time

**Business Rules:**
- Sale price can be lower than listing price (negotiation)
- Profit is tracked per item and rolled up to pallet level
- Pallet profit = Sum of all item profits - pallet cost - expenses

### Workflow 4: Expense Tracking

**Trigger:** User incurs business expense

**Steps:**
1. User taps "Add Expense"
2. Enters:
   - Amount
   - Category (Supplies, Gas/Mileage, Storage, Fees, Other)
   - Date
   - Description
   - Optional: Receipt photo
   - Optional: Link to specific pallet
3. Expense saved and included in profit calculations

**Business Rules:**
- Pallet-specific expenses reduce that pallet's profit
- General expenses tracked separately for tax reporting
- Mileage tracking (optional): User enters miles, app calculates deduction at IRS rate

### Workflow 5: Analytics & Insights

**Trigger:** User wants to review business performance

**Key Metrics (Dashboard):**
- **Total Profit:** All-time, this month, this week
- **Active Inventory Value:** Cost basis of unsold items
- **Items Sold:** Count and revenue
- **Average Days to Sale:** How fast inventory moves
- **Top Performing Pallets:** Highest ROI
- **Stale Inventory:** Items unsold > 30 days (user-configurable)

**Detailed Reports:**
- Profit by Pallet (table with ROI %)
- Profit by Sourcing Channel (pallet vs. individual finds)
- Sales Velocity Trends (items/week over time)
- Expense Breakdown (pie chart by category)
- Best/Worst Performing Suppliers

**Export Options:**
- CSV (all data)
- PDF (profit/loss statement for taxes)

**Future: Intelligent Pricing Model**
- Tracks what sells quickly vs. slowly
- Learns regional pricing patterns
- Suggests optimal listing prices based on:
  - Item category
  - Condition
  - Time of year
  - Historical sales data
- "Items priced like this sold in 5 days on average"

### Workflow 6: Individual Item Acquisition (Non-Pallet Sourcing)

**Trigger:** User finds an item outside of pallet sourcing (thrift store, garage sale, retail arbitrage, etc.)

**Steps:**
1. User taps "Add Item" from Items screen (not from within a pallet)
2. Selects source type:
   - Thrift Store (Goodwill, Salvation Army, etc.)
   - Garage/Estate Sale
   - Retail Arbitrage (Target, Walmart clearance)
   - Mystery Box
   - Other
3. Enters item details:
   - Name/description
   - **Purchase cost** (what user paid, e.g., $5 at garage sale)
   - Condition
   - Retail price (researched value)
   - Listing price
   - Source name (optional, e.g., "Goodwill Alpine Ave")
4. Uploads photos (tier-dependent limits)
5. Item saved with `pallet_id = null`

**Business Rules:**
- Individual items have no parent pallet/mystery box
- Cost allocation is simple: `allocated_cost = purchase_cost`
- Profit = `sale_price - purchase_cost`
- Items appear in unified inventory view alongside pallet items
- Analytics distinguish between sourcing channels:
  - Pallet Revenue vs. Individual Finds Revenue
  - ROI comparison by sourcing method
- Storage location tracking works the same as pallet items

**Database Consideration:**
- `items.pallet_id` is nullable
- Add `items.source_type` enum: `pallet`, `thrift`, `garage_sale`, `retail_arbitrage`, `mystery_box`, `other`
- Add `items.source_name` (nullable, free text for store/location name)

---

## 🛠️ Technical Requirements

### Platform & Framework

**React Native + Expo** (Selected)
- Cross-platform (iOS, Android, Web)
- Faster development cycle
- Excellent library ecosystem
- Strong RevenueCat integration
- Easier to hire developers if needed
- Use Expo SDK 52+ (latest stable)
- TypeScript required for type safety

**State Management: Zustand**
- Lightweight, minimal boilerplate
- Built-in persistence (AsyncStorage integration)
- DevTools support for debugging
- Excellent TypeScript support

**Navigation: React Navigation v7**
- Industry standard for React Native
- Native stack navigator for performance
- Deep linking support for notifications
- Type-safe navigation with TypeScript

**Form Handling: React Hook Form + Zod**
- Performant (uncontrolled components)
- Zod for schema-based validation
- Validation rules:
  - Names/descriptions: Max 500 chars, required for name
  - Prices: Positive numbers, max 2 decimal places, max $999,999.99
  - Emails: Standard RFC 5322 format
  - Dates: ISO 8601, cannot be future for purchases/sales

**Error Handling Strategy:**
- API errors: Categorized by type (network, auth, validation, server)
- User-facing messages: Friendly, actionable ("Couldn't save. Check your connection and try again.")
- Error boundaries: Catch React crashes, show recovery UI
- Logging: Sentry for crash reporting (free tier: 5k events/mo)
- Retry logic: Exponential backoff for transient failures (max 3 retries)

### Backend & Database

**Supabase (PostgreSQL + Auth + Storage)**

**Why Supabase:**
- Free tier: 500MB DB, 1GB storage, 2GB bandwidth
- Paid tier: $25/mo for 8GB DB, 100GB storage
- Built-in Row Level Security (RLS) for multi-tenancy
- Real-time subscriptions (optional)
- Edge functions for business logic
- Image storage with CDN

**Database Schema (High-Level):**

```
users
├── id (uuid, primary key)
├── email
├── created_at
├── subscription_tier (free, starter, pro, enterprise)
├── subscription_status (active, canceled, past_due)
└── affiliate_code (nullable, which code they used)

user_settings
├── id (uuid, primary key)
├── user_id (foreign key → users, unique)
├── stale_threshold_days (default 30)
├── storage_locations (jsonb, array of strings, default: ["Garage", "Living Room", "Bedroom", "Storage Unit"])
├── default_sales_tax_rate (decimal, nullable, e.g., 0.06 for 6%)
├── mileage_rate (decimal, default IRS rate, e.g., 0.67)
├── include_unsellable_in_cost (boolean, default false)
├── notification_stale_inventory (boolean, default true)
├── notification_weekly_summary (boolean, default true)
├── notification_pallet_milestones (boolean, default true)
├── email_weekly_summary (boolean, default true)
├── email_stale_digest (boolean, default true)
├── email_monthly_report (boolean, default true, Pro tier only)
├── created_at
└── updated_at

pallets
├── id (uuid, primary key)
├── user_id (foreign key → users)
├── name
├── supplier
├── source_type
├── purchase_cost
├── sales_tax
├── purchase_date
├── status (unprocessed, processing, completed)
├── version (integer, default 1, for optimistic concurrency)
├── created_at
└── updated_at

items
├── id (uuid, primary key)
├── user_id (foreign key → users)
├── pallet_id (nullable, foreign key → pallets)
├── name
├── description
├── quantity
├── condition (enum: new, open_box, used_good, used_fair, damaged, for_parts, unsellable)
├── retail_price
├── listing_price
├── sale_price (nullable)
├── purchase_cost (nullable, for individual items not from pallets)
├── allocated_cost (computed: pallet cost ÷ items, or = purchase_cost for individuals)
├── storage_location
├── status (unlisted, listed, sold)
├── listing_date
├── sale_date
├── sales_channel
├── barcode (nullable)
├── source_type (enum: pallet, thrift, garage_sale, retail_arbitrage, mystery_box, other)
├── source_name (nullable, e.g., "Goodwill Alpine Ave")
├── version (integer, default 1, for optimistic concurrency)
├── created_at
└── updated_at

item_photos
├── id (uuid, primary key)
├── item_id (foreign key → items)
├── user_id (foreign key → users)
├── storage_path
├── display_order
└── created_at

expenses
├── id (uuid, primary key)
├── user_id (foreign key → users)
├── pallet_id (nullable, foreign key → pallets)
├── amount
├── category
├── description
├── expense_date
├── receipt_photo_path (nullable)
└── created_at

notifications
├── id (uuid, primary key)
├── user_id (foreign key → users)
├── type (enum: stale_inventory, pallet_milestone, weekly_summary, subscription_reminder, limit_warning, system)
├── title
├── body
├── data (jsonb, optional metadata for deep linking)
├── is_read (boolean, default false)
├── created_at
└── read_at (nullable)

affiliates
├── id (uuid, primary key)
├── code (unique)
├── name
├── email
├── commission_rate (default 0.25)
├── payout_email (for Stripe/PayPal)
├── pending_balance (decimal, default 0)
├── total_paid (decimal, default 0)
├── created_at
└── is_active

referrals
├── id (uuid, primary key)
├── affiliate_id (foreign key → affiliates)
├── user_id (foreign key → users)
├── subscription_tier
├── created_at
└── converted_at

affiliate_payouts
├── id (uuid, primary key)
├── affiliate_id (foreign key → affiliates)
├── amount
├── period_start
├── period_end
├── status (pending, processing, completed, failed)
├── payout_method (stripe, paypal)
├── transaction_id (nullable)
├── created_at
└── completed_at (nullable)

subscriptions (managed by RevenueCat, mirrored in DB)
├── id (uuid, primary key)
├── user_id (foreign key → users)
├── tier
├── billing_cycle (monthly, annual)
├── status
├── current_period_start
├── current_period_end
└── revenue_cat_id
```

**RLS Policies:**
- Users can only access their own data
- Affiliates can only see aggregate stats for their referrals
- Admin role can access all data (for support)

### Subscription & Payments

**RevenueCat**

**Why RevenueCat:**
- Free up to $2.5k MRR, then 1% of revenue
- Handles Apple, Google, Stripe, Paddle
- Built-in analytics dashboard
- Webhook support for affiliate tracking
- A/B testing for pricing
- Cross-platform purchase restoration

**Implementation:**
- User signs up → Free tier by default
- Upgrade flow → RevenueCat paywall
- Affiliate code applied at signup → Discount automatically applied
- Webhooks trigger commission tracking in Supabase

**Stripe Integration (via RevenueCat):**
- Web subscriptions (if web app launched)
- Affiliate payouts

### Limit Enforcement

**When User Hits Limit:**

| Limit Type | Behavior |
|------------|----------|
| **Pallet limit (Free: 1)** | Soft block: User sees "Upgrade to add more pallets" modal. Cannot create new pallet until upgraded or existing pallet deleted. |
| **Item limit (Free: 20)** | Soft block: User sees upgrade prompt when adding 21st item. Existing items remain accessible. |
| **Photo limit (1/item Free, 3 Starter)** | Hard block: Camera/upload disabled after limit. Shows "Upgrade for more photos" inline. |
| **AI descriptions (Starter: 50, Pro: 200)** | Soft block: Counter shows remaining. At 0, button disabled with "Limit reached, resets next month" tooltip. |

**Grace Period:**
- Users who downgrade from paid → free are NOT forced to delete data
- Existing pallets/items remain read-only (can view, mark as sold, delete)
- Cannot add new pallets/items until under limit
- Gentle nudge: "You have 3 pallets but free tier allows 1. Upgrade or sell/delete pallets to add new ones."

**UI Indicators:**
- Dashboard shows usage: "1/1 pallets used" with progress bar
- Color coding: Green (under 75%), Yellow (75-99%), Red (at limit)
- Upgrade CTA appears when at 80%+ of any limit

### Tier Changes & Data Migration

**Upgrade Flow:**
- Instant access to new tier features
- No data migration needed (just limit increases)
- If on annual, pro-rated credit applied

**Downgrade Flow:**
- User warned: "You have 15 pallets. Free tier allows 1. Your data will be preserved but read-only."
- Downgrade completes at end of billing period
- No data deleted automatically—user controls cleanup
- Read-only mode for over-limit resources

**Cancellation:**
- Data retained for 30 days after subscription ends
- User can export all data (CSV) before deletion
- After 30 days, account reverts to Free tier (not deleted)
- If over limits, read-only mode applies

### Notifications & Alerts

**Push Notifications (Opt-in):**

| Trigger | Message |
|---------|---------|
| **Stale inventory** | "5 items haven't sold in 30+ days. Time to reprice?" |
| **Pallet milestone** | "🎉 Pallet 'Amazon Monster' hit $200 profit!" |
| **Weekly summary** | "This week: 8 items sold, $156 profit. Keep it up!" |
| **Subscription reminder** | "Your Pro trial ends in 3 days. Upgrade to keep features." |
| **Limit warning** | "You're at 18/20 items on Free tier. Upgrade for unlimited." |

**In-App Notifications:**
- Bell icon with unread count
- Categories: Sales, Alerts, Tips, System
- Mark as read / clear all

**Email Notifications (Configurable):**
- Weekly profit summary (default: on)
- Stale inventory digest (default: on)
- Monthly tax-ready report (Pro tier, default: on)
- Marketing/tips (default: off)

**Notification Services:**

| Service | Purpose | Cost |
|---------|---------|------|
| **Expo Push Notifications** | Push notifications for iOS/Android | Free (included with Expo) |
| **Resend** | Transactional emails | Free tier: 3k emails/mo, then $20/mo for 50k |

- **Expo Push:** Built into Expo SDK, no additional setup
- **Resend:** Simple API, excellent deliverability, React Email for templates
- **Fallback:** Firebase Cloud Messaging if Expo Push limitations arise

### Offline Behavior

**Offline-First Architecture:**
- All data cached locally using SQLite (via Expo SQLite or WatermelonDB)
- User can add pallets, items, mark sales offline
- Changes queued for sync when online

**Sync Strategy:**
- Last-write-wins for simple fields (Free, Starter, Pro tiers)
- Enterprise tier: Version-based conflict resolution using `version` field
- Conflict detection for concurrent edits (rare for single-user)
- Sync status indicator: ✓ Synced | ⟳ Syncing | ⚠️ Offline (X pending)

**What Works Offline:**
- ✅ Add/edit pallets and items
- ✅ Mark items as sold
- ✅ View all inventory and analytics
- ✅ Take photos (queued for upload)
- ❌ AI description generation (requires network)
- ❌ Subscription changes (requires network)

**Photo Upload Queue:**
- Photos saved locally first, uploaded in background
- Retry with exponential backoff on failure
- User sees upload progress indicator


### Image Storage

**Supabase Storage**

**Configuration:**
- Bucket: `item-photos`
- Max file size: 5MB per photo
- Allowed types: JPEG, PNG, WebP
- Path structure: `{user_id}/{item_id}/{timestamp}_{filename}`
- Client-side compression: 720px max dimension, 85% quality
- RLS: Users can only access their own photos

**Cost Optimization:**
- Compress images before upload (using `react-native-image-picker` + compression)
- Delete photos when item is deleted (cascade)
- Monitor storage usage in admin dashboard

**Storage Monitoring Thresholds (Admin):**

| Supabase Plan | Storage Limit | Alert Threshold | Action |
|---------------|---------------|-----------------|--------|
| Free | 1GB | 800MB (80%) | Email admin, consider upgrade |
| Pro ($25/mo) | 100GB | 80GB (80%) | Email admin, review usage |

- Estimated capacity: ~200KB/photo compressed = ~5,000 photos per 1GB
- At 3 photos/item average = ~1,666 items before free tier limit
- Dashboard shows real-time storage usage with trend projection

### AI Features

**ChatGPT API (OpenAI)**

**Use Case:** Generate listing descriptions

**Implementation:**
- User taps "Generate Description" on item
- API call: 
  ```
  Prompt: "Write a Facebook Marketplace listing for a {condition} {item_name} 
  with retail price ${retail_price}. Keep it under 100 words, friendly tone, 
  highlight value."
  ```
- Response displayed in text field
- User can edit before copying
- Rate limit: 50/month (Starter), 200/month (Pro)
- Cost: ~$0.002 per description = negligible

**Future: AI Pricing Recommendations**
- Train model on user's historical sales data
- Suggest optimal listing price based on:
  - Item category
  - Condition
  - Time to sell
  - Regional market data

### Authentication

**Supabase Auth**

**Methods:**
- Email/password (primary)
- Google Sign-In (optional)
- Apple Sign-In (required for iOS)

**Security:**
- Email verification required
- Password reset flow
- Session management
- Biometric unlock (device-level, optional)

### Analytics & Monitoring

**Admin Dashboard (Custom-built):**
- Total users (free/paid breakdown)
- MRR, ARR, churn rate
- New signups (daily/weekly/monthly)
- Trial → Paid conversion rate
- Revenue by tier
- Affiliate performance (referrals, commissions)
- Storage usage (for cost monitoring)
- Error rates, API latency

**User Analytics (In-App):**
- Profit by pallet (table + chart)
- Profit by sourcing channel
- Sales velocity trends
- Stale inventory alerts
- Expense breakdown
- Export to CSV/PDF

**Tools:**
- Supabase built-in analytics (basic)
- Custom dashboard using Supabase queries
- Optional: PostHog (free tier) for product analytics

---

## 🎨 UI/UX Principles

### Design Philosophy

**Reference:** See `pallet_pro_app/docs/UI_UX_GUIDELINES.md` for detailed guidelines.

**Core Principles:**
1. **Mobile-first:** Optimized for one-handed use
2. **Data-driven:** Show profit metrics prominently
3. **Fast input:** Minimize taps to add items
4. **Visual clarity:** Use color to indicate profit/loss
5. **Offline-capable:** Cache data for poor connectivity

### Color System

**Primary Palette:**
- **Money Green:** #2E7D32 (profit, success)
- **Loss Red:** #D32F2F (negative profit)
- **Opportunity Gold:** #FFA000 (actionable items)
- **Neutral Grey:** #9E9E9E (inactive/unsold)

**Status Colors:**
- Unprocessed: Grey
- Listed: Blue
- Sold: Green
- Stale: Orange

### Key Screens

**1. Dashboard (Home)**
- Hero metric: Total Profit (large, centered)
- Quick stats: Items sold this month, active inventory value
- Action cards: "Add Pallet", "Process Items", "View Stale Inventory"
- Recent activity feed

**2. Pallets List**
- Card-based layout
- Each card shows: Name, supplier, cost, items count, profit, ROI %
- Color-coded by profitability
- Tap to view pallet details

**3. Pallet Detail**
- Header: Pallet name, supplier, cost, profit
- Progress bar: Items processed / total items
- List of items (grouped by status)
- "Add Item" FAB

**4. Item Entry Form**
- Smart defaults (quantity=1, condition=New)
- Auto-suggest storage locations
- Photo upload (drag-drop or camera)
- "Generate Description" button (Starter+ tier)
- Save as draft or publish

**5. Analytics**
- Tab navigation: Overview, Pallets, Items, Expenses
- Interactive charts (profit trends, sales velocity)
- Filterable by date range
- Export button (CSV/PDF)

**6. Settings**
- Subscription management
- Affiliate code entry (if not entered at signup)
- Stale inventory threshold
- Storage locations (customizable list)
- Tax settings (sales tax rate, mileage rate)

### Responsive Design

- **Mobile:** Bottom tab navigation (Dashboard, Pallets, Items, Analytics, Settings)
- **Tablet:** Side drawer navigation
- **Web:** Full sidebar + top nav

---

## 🔒 Security Requirements

### Priority 1: Payment Data Security

- **PCI Compliance:** Use RevenueCat + Stripe (they handle PCI compliance)
- **No card data stored:** All payment processing via third parties
- **Secure webhooks:** Verify signatures on all RevenueCat webhooks
- **HTTPS only:** Enforce SSL/TLS for all API calls

### Priority 2: User Data Privacy

- **RLS Enforcement:** Every query filtered by `user_id`
- **Data encryption:** At rest (Supabase default) and in transit (HTTPS)
- **GDPR Compliance:**
  - Data export: Users can download all their data (CSV)
  - Data deletion: Account deletion removes all user data (cascade)
  - Privacy policy: Clear, simple language
- **No data selling:** Explicitly stated in terms

### Priority 3: Image Storage Security

- **RLS on storage:** Users can only access their own photos
- **Signed URLs:** Time-limited access to images
- **No public buckets:** All images require authentication
- **Malware scanning:** Supabase scans uploads (built-in)

### Additional Security

- **Rate limiting:** Prevent API abuse (Supabase built-in)
- **Input validation:** Sanitize all user inputs (SQL injection prevention)
- **Session management:** Auto-logout after 30 days inactivity
- **Audit logging:** Track admin actions (for compliance)

---

## 📊 Success Metrics

### North Star Metric

**Monthly Active Resellers (MAR):** Users who log at least one sale per month

**Why:** Indicates product-market fit and retention

### Key Performance Indicators (KPIs)

**Financial:**
- MRR (Monthly Recurring Revenue)
- Churn rate (target: <5% monthly)
- LTV:CAC ratio (target: >3:1)
- Affiliate-driven revenue %

**Product:**
- MAR (Monthly Active Resellers)
- Items processed per user per month (target: >20)
- Free → Paid conversion rate (target: >10%)
- Feature adoption: % using AI descriptions, expense tracking, analytics

**Growth:**
- New signups per week
- Affiliate referral conversion rate
- App Store rating (target: >4.5 stars)
- NPS (Net Promoter Score) (target: >50)

### Beta Success Criteria

**Phase 1 (Alpha - 2-4 weeks):**
- Core workflows functional (add pallet, add item, mark sold)
- No critical bugs
- Wife can process 1 full pallet using the app

**Phase 2 (Closed Beta - 4-6 weeks):**
- 15-20 users actively using app
- At least 10 users log sales weekly
- Average NPS >40
- <5 critical bugs reported
- 3+ testimonials collected

**Phase 3 (Soft Launch - 1-2 months):**
- 100+ signups via affiliate
- 20%+ free → paid conversion
- <3% churn rate
- Server costs <$100/mo
- 2+ case studies published

**Phase 4 (Full Launch):**
- 500+ users
- $5k+ MRR
- Profitable (revenue > costs)
- Press coverage (local news, reseller blogs)

---

## 🚀 Launch Plan

### Phase 1: Alpha Testing (Weeks 1-4)

**Goal:** Validate core workflows with developer's wife

**Features:**
- Pallet creation
- Item processing (manual entry)
- Photo upload (3 photos)
- Sale tracking
- Basic profit calculation
- Simple dashboard

**Success Criteria:**
- Wife can process 1 full pallet
- No critical bugs
- Positive feedback on UX

### Phase 2: Closed Beta (Weeks 5-10)

**Goal:** Gather feedback from 15-20 real users

**Recruitment:**
- Developer's network
- GRPL community (pre-affiliate launch)
- Facebook reseller groups

**Incentive:**
- Lifetime Pro tier free (with conditions: monthly feedback for 6 months, case study participation)

**Features Added:**
- Expense tracking
- CSV export
- Stale inventory alerts
- Storage location tracking
- Barcode scanning

**Feedback Mechanisms:**
- In-app feedback button (simple form)
- Weekly check-in emails
- Private Slack/Discord channel

**Success Criteria:**
- 10+ users log sales weekly
- NPS >40
- 3+ testimonials
- <5 critical bugs

### Phase 3: Soft Launch (Weeks 11-18)

**Goal:** Test affiliate marketing, refine onboarding

**Marketing:**
- Limited GRPL promotion (soft announcement)
- Facebook reseller groups (organic posts)
- Product Hunt launch (optional)

**Features Added:**
- AI description generator (Pro tier)
- Profit trend charts
- Sales velocity tracking
- Bulk photo upload

**Pricing:**
- Free tier live
- Starter + Pro tiers live
- Affiliate discount active (Monthly: 50% off first month; Annual: 20% off first year)

**Success Criteria:**
- 100+ signups
- 20%+ conversion to paid
- <3% churn
- Server costs <$100/mo

### Phase 4: Full Launch (Week 19+)

**Goal:** Scale to 500+ users, achieve profitability

**Marketing:**
- Full GRPL affiliate push (educational series, social posts)
- Paid ads (Facebook, Google) - small budget ($500/mo)
- Content marketing (blog posts, YouTube tutorials)
- Press release (local news, reseller blogs)

**Features Added:**
- Advanced analytics
- PDF reports
- Item templates
- Bulk import/export

**Success Criteria:**
- 500+ users
- $5k+ MRR
- Profitable
- 4.5+ star rating

---

## 🛠️ MVP Feature Scope (Phase 1-2)

### Must-Have (MVP)

**Pallet Management:**
- ✅ Create pallet (name, supplier, cost, date)
- ✅ Edit pallet details
- ✅ View pallet list (sorted by date, profit)
- ✅ Pallet detail screen (items, profit, ROI)
- ✅ Delete pallet (with confirmation)

**Item Management:**
- ✅ Add item to pallet (manual entry)
- ✅ Item details: name, quantity, condition, retail price, listing price, storage location
- ✅ Photo upload (1-10 photos, tier-dependent)
- ✅ Barcode scanning (optional field)
- ✅ Mark item as sold (sale price, date, channel)
- ✅ Edit item details
- ✅ Delete item
- ✅ Item status: Unlisted, Listed, Sold
- ✅ Support for case-packed items (quantity > 1)

**Cost Allocation:**
- ✅ Even split: Pallet cost ÷ number of items
- ✅ User setting: Include/exclude unsellable items from cost calculation
- ✅ Manual override: User can edit allocated cost per item

**Expense Tracking:**
- ✅ Add expense (amount, category, date, description)
- ✅ Link expense to pallet (optional)
- ✅ Receipt photo upload
- ✅ Expense categories: Supplies, Gas/Mileage, Storage, Fees, Other
- ✅ View expense list

**Analytics (Basic):**
- ✅ Dashboard: Total profit, items sold, active inventory value
- ✅ Profit by pallet (table with ROI %)
- ✅ Profit by item
- ✅ Stale inventory list (items unsold > 30 days, user-configurable threshold)
- ✅ CSV export (all data)

**Subscription Management:**
- ✅ Free tier (1 pallet, 20 items, 1 photo/item)
- ✅ Starter tier ($9.99/mo or $99.99/yr)
- ✅ Pro tier ($24.99/mo or $249.99/yr)
- ✅ Upgrade/downgrade flow
- ✅ Annual billing option (~17% savings)
- ✅ Affiliate code entry at signup
- ✅ Affiliate discount: Monthly = 50% off first month; Annual = 20% off first year

**Affiliate Tracking:**
- ✅ Unique referral codes
- ✅ Track signups by code
- ✅ Affiliate dashboard: Total referrals, active subscribers, monthly commission
- ✅ Admin can create/edit affiliate codes

**Admin Dashboard:**
- ✅ Total users (free/paid breakdown)
- ✅ MRR, churn rate
- ✅ New signups (daily/weekly/monthly)
- ✅ Revenue by tier
- ✅ Affiliate performance
- ✅ Storage usage

**Authentication:**
- ✅ Email/password signup/login
- ✅ Email verification
- ✅ Password reset
- ✅ Session management

### Nice-to-Have (Post-MVP)

**Item Management:**
- AI description generator (ChatGPT API)
- Item templates (save common item types)
- Bulk photo upload (select 10 at once)

**Analytics (Advanced):**
- Profit trend charts (line graph over time)
- Sales velocity by category
- Best/worst performing suppliers
- Seasonal trends
- PDF reports (profit/loss statement)

**Workflow Enhancements:**
- Batch item entry (add 5 items at once)
- Quick-add from recent items
- Duplicate item (for case-packed)

**Integrations:**
- Facebook Marketplace API (auto-post listings)
- eBay API (import sales data)
- QuickBooks/Xero export

### Future (Phase 3+)

**Intelligent Pricing:**
- AI pricing recommendations based on historical data
- Market analysis (what similar items sold for)
- Regional pricing patterns

**Warehouse Features:**
- Multi-user accounts (team access)
- Bulk processing (24+ pallets)
- Customer management (for B2B pallet sales)

**Tax Tools:**
- Mileage tracking (GPS-based)
- 1099 preparation
- Quarterly tax estimates

---

## 📝 Development Guidelines

### Code Quality

- **Modular architecture:** Feature-based folder structure
- **Reusable components:** Build component library for future apps
- **Type safety:** TypeScript required throughout
- **Error handling:** Graceful degradation, user-friendly error messages
- **Testing:** Unit tests for business logic, integration tests for critical flows

### Performance

- **Image optimization:** Compress before upload, lazy load in lists
- **Offline support:** Cache data locally, sync when online
- **Fast startup:** <3 seconds to dashboard
- **Smooth animations:** 60fps transitions

### Accessibility

- **Screen reader support:** Proper labels on all interactive elements
- **Color contrast:** WCAG AA compliance
- **Font scaling:** Support system font size preferences
- **Keyboard navigation:** For web version

### Documentation

- **Code comments:** Explain "why", not "what"
- **API documentation:** Clear endpoint descriptions
- **User guide:** In-app tooltips, help center (future)

---

## 🎯 Decision Framework

When faced with technical decisions, prioritize in this order:

1. **Security:** Is it secure? (Payment data, user privacy, image storage)
2. **User Value:** Does it solve a real pain point?
3. **Speed to Market:** Can we ship faster without sacrificing quality?
4. **Cost:** Is it affordable at scale?
5. **Maintainability:** Can we easily update/debug it?

**Example:**
- **Decision:** Use RevenueCat vs. build custom subscription system
- **Analysis:**
  - Security: ✅ RevenueCat handles PCI compliance
  - User Value: ✅ Faster checkout, cross-platform purchases
  - Speed: ✅ Saves weeks of development
  - Cost: ✅ Free up to $2.5k MRR
  - Maintainability: ✅ Less code to maintain
- **Verdict:** Use RevenueCat

---

## 🚨 Known Constraints & Considerations

### Technical Constraints

- **Supabase free tier limits:** 500MB DB, 1GB storage
  - **Mitigation:** Compress images, monitor usage, upgrade at 80% capacity
- **RevenueCat free tier:** Up to $2.5k MRR
  - **Mitigation:** Plan for 1% fee after threshold
- **ChatGPT API costs:** ~$0.002 per description
  - **Mitigation:** Rate limit to 50-200/month per user

### Business Constraints

- **Single affiliate initially:** GRPL only
  - **Mitigation:** Build scalable affiliate system from day one
- **US-only initially:** Michigan focus
  - **Mitigation:** Design for multi-currency from start (easy to expand)
- **No LLC yet:** Personal liability
  - **Mitigation:** Form LLC before full launch (cheap in Michigan)

### User Constraints

- **Moderate tech savvy:** Users comfortable with Facebook, not developers
  - **Mitigation:** Simple UX, in-app tooltips, video tutorials
- **Poor connectivity:** Some users in rural areas
  - **Mitigation:** Offline-first architecture, sync when online
- **Variable workflows:** Some users batch process, others one-at-a-time
  - **Mitigation:** Support both workflows, don't force one path

---

## 📞 Support & Community

### Beta Phase

- **Email support:** Developer responds within 24 hours
- **Private Slack/Discord:** Beta testers can ask questions, share feedback
- **Monthly check-ins:** Developer reaches out to each beta tester

### Post-Launch

- **Email support:** Starter tier (48-hour response), Pro tier (24-hour response)
- **Help center:** FAQ, video tutorials (future)
- **Community forum:** Users help each other (future)
- **Feature requests:** Public roadmap (Canny or similar)

---

## 🎉 Success Stories (Aspirational)

**Sarah's Story:**
> "Before PalletPulse, I was tracking everything in a notebook. I had no idea which pallets were actually making me money. Now I can see that Amazon Monster pallets give me 40% ROI, while Walmart Medium only gives 20%. I've completely changed my sourcing strategy and doubled my profits in 3 months."

**Mike's Story:**
> "I was nervous to start reselling, but PalletPulse made it so easy. I bought my first pallet for $250, processed it in the app, and sold everything for $450. Seeing that $200 profit in the app gave me the confidence to keep going. Now I'm doing 5 pallets a month."

**GRPL Partnership:**
> "Our customers love PalletPulse. They're making smarter buying decisions and coming back more often because they can see what's working. It's a win-win - they make more money, we sell more pallets."

---

## 🏁 Final Notes for Claude Code

**This document is comprehensive, but not exhaustive.** Use your best judgment for:
- Specific UI component choices (buttons, inputs, etc.)
- Database indexing strategies
- Caching mechanisms
- Error handling edge cases

**Priorities:**
1. Get MVP to beta testers FAST (4-6 weeks)
2. Security is non-negotiable (RLS, encryption, PCI compliance)
3. User experience should feel polished, even in beta
4. Build modular code for future reuse

**When in doubt:**
- Choose simplicity over complexity
- Optimize for developer velocity (use libraries, don't reinvent)
- Ask clarifying questions if a requirement is ambiguous

**Good luck! Let's build something amazing.** 🚀
