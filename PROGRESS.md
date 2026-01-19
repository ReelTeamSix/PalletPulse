# Pallet Pro Development Progress

## Current Phase: Phase 11 - Polish
**Status:** In Progress (Logging & Diagnostics Complete)
**Branch:** feature/polish

---

## Completed Phases
- [x] Phase 1: Project Setup (approved)
- [x] Phase 2: Authentication (approved)
- [x] Phase 3: Database & Data Layer (approved)
- [x] Phase 4: Core Navigation (approved)
- [x] Phase 5: Pallet Management (approved)
- [x] Phase 6: Item Management (approved)
- [x] Phase 7: Sales & Profit (approved)
- [x] Phase 8: Expense System Redesign (approved)
- [x] Phase 9: Analytics (approved)
- [x] Phase 10: Subscription (approved)
- [ ] Phase 11: Polish ← **IN PROGRESS**

---

## Phase 8: Expense System Redesign - IMPLEMENTATION PLAN

### Design Philosophy
Expense tracking is **opt-in** to keep the app simple for casual/hobby flippers while providing full tax-ready tracking for business users.

### User Types & Features
| User Type | Expense Tracking | Features |
|-----------|------------------|----------|
| Casual hobbyist | OFF (default) | Simple profit: sale - purchase cost |
| Side hustler | Optional | Basic profit + per-item shipping/fees |
| Business operator | ON | Full tracking: mileage, overhead, tax export |

### Tier Alignment
| Tier | Expense Features |
|------|------------------|
| Free | Per-item costs only (no expense tracking, no mileage) |
| Starter | + Overhead expenses, manual mileage tracking, receipt photos, CSV export |
| Pro | + Advanced expense reports, PDF export, saved routes & quick-log mileage |

---

### Phase 8A: Database Schema Updates

**New Tables:**
```sql
-- Mileage trips (replaces gas tracking)
mileage_trips (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  trip_date date NOT NULL,
  purpose text NOT NULL, -- enum: pallet_pickup, thrift_run, garage_sale, post_office, auction, sourcing, other
  miles decimal NOT NULL,
  mileage_rate decimal NOT NULL, -- IRS rate at time of trip (e.g., 0.725)
  deduction decimal GENERATED ALWAYS AS (miles * mileage_rate) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Junction table for multi-pallet linking
mileage_trip_pallets (
  trip_id uuid REFERENCES mileage_trips(id) ON DELETE CASCADE,
  pallet_id uuid REFERENCES pallets(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, pallet_id)
);

-- Multi-pallet expense linking
expense_pallets (
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  pallet_id uuid REFERENCES pallets(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, pallet_id)
);

-- Admin-configurable app settings
app_settings (
  id uuid PRIMARY KEY,
  key text UNIQUE NOT NULL, -- e.g., 'irs_mileage_rate', 'platform_fee_ebay'
  value text NOT NULL, -- JSON-encoded if complex
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);
```

**Modified Tables:**
```sql
-- items: Add per-item cost fields
ALTER TABLE items ADD COLUMN platform text; -- enum: ebay, poshmark, mercari, facebook, offerup, craigslist, other
ALTER TABLE items ADD COLUMN platform_fee decimal;
ALTER TABLE items ADD COLUMN shipping_cost decimal;

-- user_settings: Add expense tracking preferences
ALTER TABLE user_settings ADD COLUMN expense_tracking_enabled boolean DEFAULT false;
ALTER TABLE user_settings ADD COLUMN user_type text DEFAULT 'hobby'; -- hobby, side_hustle, business

-- expenses: Simplify categories (overhead only)
-- Categories: storage, supplies, subscriptions, equipment, other
-- Remove: gas, mileage, fees, shipping (handled elsewhere now)
```

**Tasks:**
- [x] Create migration: Add items.platform, items.platform_fee, items.shipping_cost ✅
- [x] Create migration: Add user_settings.expense_tracking_enabled, user_settings.user_type ✅
- [x] Create migration: Create mileage_trips table with RLS ✅
- [x] Create migration: Create mileage_trip_pallets junction table ✅
- [x] Create migration: Create expense_pallets junction table ✅
- [x] Create migration: Create app_settings table ✅
- [x] Seed app_settings with IRS rate ($0.725 for 2026) and platform fee presets ✅
- [ ] Update expenses table: Simplify categories to overhead-only (deferred - keeping for backward compat)
- [x] Generate updated TypeScript types ✅

**Migrations Applied:**
- `add_per_item_cost_fields` - Added platform, platform_fee, shipping_cost to items
- `add_expense_tracking_settings` - Added expense_tracking_enabled, user_type to user_settings
- `create_mileage_trips_table` - New table with RLS for mileage tracking
- `create_mileage_trip_pallets_junction` - Junction table for multi-pallet trips
- `create_expense_pallets_junction` - Junction table for multi-pallet expenses
- `create_app_settings_table` - Admin-configurable settings table
- `seed_app_settings` - Seeded IRS rate and platform fee presets

**New Enums Created:**
- `sales_platform`: ebay, poshmark, mercari, facebook, offerup, craigslist, other
- `trip_purpose`: pallet_pickup, thrift_run, garage_sale, post_office, auction, sourcing, other
- `user_type`: hobby, side_hustle, business

**App Settings Seeded:**
- `irs_mileage_rate`: $0.725/mile (2026)
- `irs_mileage_rate_history`: 2024-2026 rates
- `platform_fee_ebay`: 13.25%
- `platform_fee_poshmark`: 20%
- `platform_fee_mercari`: 10%
- `platform_fee_facebook`: 0% local / 5% shipped
- `platform_fee_offerup`: 0% local / 12.9% shipped
- `platform_fee_craigslist`: 0%

**Legal Disclaimers Added:**
- Added comprehensive liability disclaimer section to PALLETPULSE_ONESHOT_CONTEXT.md
- Disclaimers required at: first expense tracking enable, onboarding, settings, mileage log, tax export, ToS
- Key message: "Pallet Pro is an inventory tracking tool, not tax software"
- Users responsible for consulting tax professionals

---

### Phase 8B: Enhanced "Mark as Sold" Flow

**New Sale Form Fields:**
```
Mark as Sold
├── Sale Price: $150.00
├── Platform: [eBay ▼] ← new dropdown
├── Platform Fee: $19.88 ← auto-calculated OR manual override
├── Shipping Cost: $12.50 ← new manual field
├── Sale Date: Jan 11, 2026
├── Sales Channel: "eBay" ← auto-filled from platform
├── Buyer Notes: (optional)
└── Net Profit: $XX.XX ← updated calculation
```

**Platform Fee Presets (Admin-configurable):**
| Platform | Fee % | Auto-Calculate |
|----------|-------|----------------|
| eBay | 13.25% | sale_price × 0.1325 |
| Poshmark | 20% | sale_price × 0.20 |
| Mercari | 10% | sale_price × 0.10 |
| Facebook MP | 0% local / 5% shipped | based on shipping_cost > 0 |
| OfferUp | 0% local / 12.9% shipped | based on shipping_cost > 0 |
| Craigslist | 0% | 0 |
| Other/Custom | Manual | user enters |

**Tasks:**
- [x] Update sale form schema with platform, platform_fee, shipping_cost fields ✅
- [x] Create platform presets constant with fee calculations ✅
- [x] Build platform dropdown component with auto-fee calculation ✅
- [x] Update sell screen UI with new fields ✅
- [x] Update profit preview to include: Sale - Allocated Cost - Platform Fee - Shipping ✅
- [x] Update items store markAsSold action to save new fields ✅
- [x] Update quick sell modals (items.tsx, pallets/[id].tsx) with platform picker ✅
- [x] Update profit-utils to include platform_fee and shipping_cost in calculations ✅
- [x] Write tests for new sale form validation ✅
- [x] Write tests for platform fee calculations ✅

**Bug Fixes (Jan 11, 2026):**
- [x] Added Whatnot platform (8.9% seller fee) to PLATFORM_PRESETS and PLATFORM_OPTIONS ✅
- [x] Fixed Manual/Other platform fee being overwritten to 0.00 - now skips auto-calculate for isManual platforms ✅
- [x] Removed redundant Sales Channel field from sell screen - auto-filled from platform selection ✅
- [x] Updated calculateItemProfit in profit-utils.ts to include platform_fee and shipping_cost ✅
- [x] Updated calculatePalletProfit to include per-item platformFees and shippingCosts ✅
- [x] Updated PalletProfitResult interface with platformFees and shippingCosts fields ✅
- [x] Updated calculateItemProfit in item-form-schema.ts with optional fee parameters ✅
- [x] Updated item detail screen to pass fees to profit calculation ✅

**Completed Files:**
- `src/features/sales/schemas/sale-form-schema.ts` - Added PLATFORM_PRESETS, PLATFORM_OPTIONS, platform/shipping fields, helper functions, Whatnot platform
- `src/stores/items-store.ts` - Updated markAsSold to accept SaleData object with platform/fee fields
- `app/items/sell.tsx` - Added platform grid, shipped toggle, platform fee (auto/manual), shipping cost, updated profit preview, fixed manual fee override
- `app/(tabs)/items.tsx` - Added platform picker to quick sell modal with auto-fee calculation
- `app/pallets/[id].tsx` - Added platform picker to quick sell modal with auto-fee calculation
- `src/features/sales/schemas/sale-form-schema.test.ts` - Added 30+ new tests for platform fee functions, added Whatnot test
- `src/lib/profit-utils.ts` - Updated all profit/ROI calculations to include platform_fee and shipping_cost
- `src/features/items/schemas/item-form-schema.ts` - Updated calculateItemProfit and calculateItemROI with fee parameters
- `app/items/[id].tsx` - Updated to pass platform_fee and shipping_cost to profit calculation

**Pending Database Migration:**
```sql
-- Add 'whatnot' to sales_platform enum
ALTER TYPE sales_platform ADD VALUE 'whatnot' AFTER 'mercari';
```

---

### Phase 8C: Mileage Tracking System

**Trip Form:**
```
Add Trip
├── Date: Jan 11, 2026
├── Purpose: [Pallet Pickup ▼]
├── Miles: 45
├── Linked Pallets: [Pallet #1, Pallet #2] ← multi-select
├── Notes: "Picked up 2 pallets from GRPL"
└── Deduction: $32.63 ← auto: 45 × $0.725
```

**Purpose Presets:**
- Pallet Pickup
- Thrift Store Run
- Garage Sale Circuit
- Post Office / Shipping
- Auction
- Sourcing Run
- Other

**Tasks:**
- [x] Create mileage trip form schema (Zod) ✅
- [x] Create mileage-trips store (Zustand) ✅
- [x] Build MileageForm component with multi-pallet selector ✅
- [x] Build MileageTripCard component ✅
- [x] Create Add Trip screen (`app/mileage/new.tsx`) ✅
- [x] Create Trip Detail screen (`app/mileage/[id].tsx`) ✅
- [x] Create Edit Trip screen (`app/mileage/edit.tsx`) ✅
- [x] Create Mileage Log screen with list ✅
- [x] Add IRS rate fetch from app_settings ✅
- [x] Write tests for mileage calculations (62 tests) ✅
- [x] Write tests for mileage store (26 tests) ✅

**Completed Files:**
- `src/features/mileage/schemas/mileage-form-schema.ts` - Zod schema with validation, helper functions
- `src/features/mileage/schemas/mileage-form-schema.test.ts` - 62 tests for schema and helpers
- `src/features/mileage/components/MileageForm.tsx` - Form with multi-pallet selector, deduction preview
- `src/features/mileage/components/MileageTripCard.tsx` - Trip card for list display
- `src/features/mileage/index.ts` - Feature exports
- `src/stores/mileage-store.ts` - Zustand store with multi-pallet support, IRS rate fetch
- `src/stores/__tests__/mileage-store.test.ts` - 26 tests for store
- `app/mileage/_layout.tsx` - Stack navigator layout
- `app/mileage/index.tsx` - Mileage Log screen with YTD summary
- `app/mileage/new.tsx` - Add Trip screen
- `app/mileage/[id].tsx` - Trip Detail screen
- `app/mileage/edit.tsx` - Edit Trip screen

**Features Implemented:**
- Multi-pallet trip linking via junction table
- IRS rate fetched from app_settings (defaults to $0.725/mi for 2026)
- Auto-calculated deduction (miles × rate)
- YTD summary showing total trips, miles, and deduction
- Trip purpose options: Pallet Pickup, Thrift Run, Garage Sale Circuit, Post Office, Auction, Sourcing, Other
- Tax disclaimer on Mileage Log screen

---

### Phase 8D: Overhead Expenses (Simplified)

**Categories (Overhead Only):**
| Category | Examples |
|----------|----------|
| Storage | Storage unit rent, warehouse fees |
| Supplies | Boxes, tape, bubble wrap, labels |
| Subscriptions | eBay store fee, software subscriptions |
| Equipment | Scale, measuring tools, shelving |
| Other | Miscellaneous business expenses |

**Legacy Categories (Backward Compatible):**
| Category | Status |
|----------|--------|
| Gas | (Legacy) - Use Mileage Tracking instead |
| Mileage | (Legacy) - Use Mileage Tracking instead |
| Fees | (Legacy) - Track per-item at sale time |
| Shipping | (Legacy) - Track per-item at sale time |

**Multi-Pallet Linking:**
- Overhead expenses can link to 0, 1, or multiple pallets
- Junction table `expense_pallets` replaces single `pallet_id`
- UI: Multi-select checkbox picker
- Cost automatically split evenly when linked to multiple pallets

**Tasks:**
- [x] Update expense form schema with simplified categories ✅
- [x] Update expense form to use multi-pallet selector ✅
- [x] Update expenses store to handle junction table ✅
- [x] Update ExpenseCard for multi-pallet display ✅
- [x] Update pallet detail to query via junction table ✅
- [x] Keep receipt photo functionality (already working) ✅
- [x] Write tests for multi-pallet expense linking (26 store tests) ✅

**Completed Files:**
- `src/features/expenses/schemas/expense-form-schema.ts` - Simplified categories, pallet_ids array, category descriptions
- `src/features/expenses/components/ExpenseForm.tsx` - Multi-pallet checkbox selector, category hints, cost split preview
- `src/features/expenses/components/ExpenseCard.tsx` - Multi-pallet display, split amount indicator, "cubes" icon
- `src/stores/expenses-store.ts` - ExpenseWithPallets type, junction table handling, split cost calculations
- `src/stores/__tests__/expenses-store.test.ts` - 26 tests for multi-pallet support
- `src/features/expenses/schemas/expense-form-schema.test.ts` - Updated for Phase 8D changes

**Features Implemented:**
- Simplified to 5 overhead expense categories (storage, supplies, subscriptions, equipment, other)
- Legacy categories kept for backward compatibility (gas, mileage, fees, shipping) with "(Legacy)" labels
- Multi-pallet expense linking via `expense_pallets` junction table
- Checkbox-style pallet selector in expense form
- Selected pallets shown as removable chips
- Automatic cost split calculation (total / number of pallets)
- Split amount display in ExpenseCard and ExpenseCardCompact
- "Clear All" button to deselect all pallets
- Category descriptions shown as hints in form
- Backward compatibility with legacy single `pallet_id` field

**Test Results:**
```
Test Suites: 13 passed, 13 total
Tests:       626 passed, 626 total
```

---

### Phase 8E: Settings & Opt-In

**Settings Screen Updates:**
```
Settings
├── Account
│   ├── Email: user@example.com
│   └── User Type: [Hobby Flipper ▼]
│       ├── Hobby Flipper - Track profits simply
│       ├── Side Income - Basic tracking with shipping/fees
│       └── Serious Business - Full expense tracking (auto-enables expenses)
├── Expense Tracking
│   ├── Enable Expense Tracking: [Toggle] ← with disclaimer alert
│   └── (When ON, shows features list)
│       ├── ✓ Mileage Tracking (IRS standard rate)
│       ├── ✓ Overhead Expenses
│       ├── ✓ Multi-Pallet Cost Allocation
│       └── ✓ Receipt Photo Storage
├── Preferences
│   ├── Stale Inventory Threshold: 30 days
│   └── Include Unsellable in Cost: OFF
└── About
    ├── Version: 1.0.0
    ├── Terms of Service
    └── Privacy Policy
```

**Tasks:**
- [x] Create user-settings-store.ts with expense tracking controls ✅
- [x] Add "Expense Tracking" section to Settings screen ✅
- [x] Create expense tracking toggle with legal disclaimer confirmation ✅
- [x] Add user type picker (hobby, side_hustle, business) ✅
- [x] Auto-enable expense tracking when setting user type to "business" ✅
- [x] Conditionally show/hide expense-related UI based on toggle ✅
  - Pallet detail: expenses section hidden when disabled
  - Dashboard: expenses excluded from calculations when disabled
- [x] Write tests for user-settings-store (32 tests) ✅

**Completed Files:**
- `src/stores/user-settings-store.ts` - Zustand store with persist middleware
- `src/stores/__tests__/user-settings-store.test.ts` - 32 tests
- `app/(tabs)/settings.tsx` - Complete redesign with sections
- `app/(tabs)/index.tsx` - Conditional expense fetching/calculation
- `app/pallets/[id].tsx` - Conditional expenses section

**Features Implemented:**
- User type selection: Hobby Flipper, Side Income, Serious Business
- Expense tracking toggle with legal disclaimer on enable
- Features list shown when expense tracking enabled
- Stale threshold and include unsellable toggles in Preferences
- Conditional UI: expenses section hidden when disabled
- Conditional data: expenses not fetched/calculated when disabled
- Auto-enable expense tracking for business users

**Test Results:**
```
Test Suites: 14 passed, 14 total
Tests:       658 passed, 658 total
```

---

### Tab Restructure: Inventory + Expenses Tabs

**Completed:** Jan 11, 2026

**Overview:**
Restructured app tabs from Dashboard | Pallets | Items | Analytics | Settings to:
Dashboard | Inventory | Expenses | Analytics | Settings

**Bug Fixes (Multi-Pallet Expenses):**
- [x] Fixed `app/expenses/new.tsx` - now passes `pallet_ids` array instead of legacy `pallet_id`
- [x] Fixed `app/expenses/edit.tsx` - now passes `pallet_ids` array on update
- [x] Fixed `app/expenses/[id].tsx` - now shows all linked pallets, not just legacy single pallet

**New Files Created:**
- `app/(tabs)/inventory.tsx` - Combined Pallets + Items tab with segmented control
- `app/(tabs)/expenses.tsx` - Dedicated Expenses tab (conditionally visible)

**Files Deleted:**
- `app/(tabs)/pallets.tsx` - Merged into inventory.tsx
- `app/(tabs)/items.tsx` - Merged into inventory.tsx

**Files Modified:**
- `app/(tabs)/_layout.tsx` - Updated tab config with new tabs, added expense gating
- `app/(tabs)/index.tsx` - Updated dashboard navigation to use inventory tab

**Inventory Tab Features:**
- Segmented control (Pallets | Items) with persistence to AsyncStorage
- All features from both original tabs preserved:
  - Pallets: List view, FAB, pull-to-refresh, profit metrics
  - Items: Search, filter chips, swipe gestures, quick-sell modal
- Context-aware FAB (adds pallet or item based on active segment)
- Segment selection persists across app restarts

**Expenses Tab Features:**
- List all expenses with category filter
- Shows total expenses amount
- Multi-pallet indicators on expense cards
- FAB for quick expense logging
- Conditionally visible based on `expense_tracking_enabled` setting

**Tab Gating:**
- Expenses tab uses `href: null` to hide when expenses disabled
- Controlled by `isExpenseTrackingEnabled()` from user-settings-store

**Commits:**
- `fix(expenses): send pallet_ids array for multi-pallet linking`
- `feat(tabs): restructure tabs with Inventory and Expenses`

---

### Expenses Tab: Segmented Control with Mileage

**Completed:** Jan 11, 2026

**Overview:**
Added segmented control to Expenses tab allowing users to switch between Expenses and Mileage views. Previously mileage was only accessible at `/mileage` with no UI navigation path.

**Changes:**
- `app/(tabs)/expenses.tsx` - Complete rewrite with segmented control:
  - Segmented control: **Overhead | Mileage**
  - Segment selection persists via AsyncStorage
  - **Overhead segment**: Full expense list with category filter, cost breakdown summary
  - **Mileage segment**: Mileage trip list with YTD summary, trips/miles/deduction stats
  - Date range filter applies to both segments
  - Context-aware FAB (adds expense or mileage trip based on segment)
  - Separate empty states for each segment
  - Combined total (overhead + mileage) displayed prominently at top

- `app/pallets/[id].tsx` - Removed expense add button:
  - Expenses section now read-only (view linked expenses only)
  - Section only shows when there are existing expenses
  - Simplifies pallet detail, single source of truth for expense creation

**Bug Fix:**
- Fixed `trip.date` → `trip.trip_date` in mileage filtering
- Mileage trips now correctly appear in Q1/YTD/date range filters

**Tiered Expense & Mileage Features:**
Updated `src/constants/tier-limits.ts` with feature flags:
| Tier | Expense & Mileage Features |
|------|----------------------------|
| Free | No expense tracking, no mileage tracking |
| Starter | Basic expenses, manual mileage entry, CSV export |
| Pro | + Advanced expense reports, PDF export, saved routes & quick-log |

*Note: Enterprise tier exists for multi-user features but expense/mileage features are same as Pro.*

**Files Modified:**
- `app/(tabs)/expenses.tsx` - Segmented control, mileage integration
- `app/pallets/[id].tsx` - Removed expense add button
- `src/constants/tier-limits.ts` - Added mileage feature flags
- `PALLETPULSE_ONESHOT_CONTEXT.md` - Documented tiered mileage features

---

### Date Range Filtering for Tax Purposes

**Completed:** Jan 11, 2026

**Overview:**
Added date range filtering to Expenses tab and Mileage Log for quarterly tax filing support.

**New Component:**
- `src/components/ui/DateRangeFilter.tsx` - Reusable date range filter with:
  - Preset pills: All Time, This Month, This Quarter, Last Quarter, This Year, Custom
  - Custom date range modal with DateTimePicker
  - Quarter calculation helpers (getQuarterDates, getCurrentQuarter)
  - `isWithinDateRange` helper function for filtering items by date
  - Elegant pill-style design matching app aesthetic

**Files Modified:**
- `app/(tabs)/expenses.tsx` - Added DateRangeFilter, filters expenses by date and category
- `app/mileage/index.tsx` - Added DateRangeFilter, filters trips with dynamic summary recalculation

**Features:**
- Filter expenses and mileage trips by quarter (Q1-Q4)
- This Month / This Year quick filters for common reports
- Custom date range for arbitrary periods
- Summary totals update to reflect filtered data
- Useful for quarterly estimated tax filing (Q1: Apr 15, Q2: Jun 15, Q3: Sep 15, Q4: Jan 15)

**Commits:**
- `feat(expenses): add date range filtering for expenses and mileage`

**Future UX Ideas:**
- Consider grouping expenses by month with section headers
- Compact list rows as alternative to full cards for long lists

---

### Deductions Tab UI Refinement

**Completed:** Jan 11, 2026

**Overview:**
Major UI refinement to the Expenses/Deductions tab for a cleaner, more elegant appearance. Renamed screen to "Deductions" to reflect combined overhead + mileage tracking.

**Header Redesign:**
```
Before:                              After:
┌────────────────────────────┐      ┌────────────────────────────┐
│ Expenses         $235.91   │      │ Deductions        $250.41  │
│ 5 expenses · $235.91       │      │                     TOTAL  │
│ ┌─────────┬─────────┐      │      │ ┌─────────┬─────────┐      │
│ │Overhead │ Mileage │      │      │ │Overhead │ Mileage │      │
│ └─────────┴─────────┘      │      │ └─────────┴─────────┘      │
│ 📅 All Time                │      │ All Time│This Mo│Q1│Q4│... │
│ All Time│This Mo│Q1│Q4│... │      │ All│Storage│Supplies│...   │
│ All│Storage│Supplies│...   │      └────────────────────────────┘
└────────────────────────────┘
```

**Changes:**
- Renamed screen title from "Expenses" to "Deductions"
- Combined total (overhead + mileage) always visible at top right
- Removed redundant subtitle (Cost Breakdown card shows this info)
- Removed redundant "📅 All Time" label above date pills
- Added `compact` prop to DateRangeFilter component
- Tightened spacing throughout header
- Smaller category filter pills (reduced padding/font)
- Made total amount more prominent (32px bold)

**Files Modified:**
- `app/(tabs)/expenses.tsx` - Header redesign, combined total, tighter spacing
- `src/components/ui/DateRangeFilter.tsx` - Added `compact` prop to hide selected label

**Tests Added:**
- `src/components/ui/__tests__/DateRangeFilter.test.ts` - 20+ tests for:
  - `isWithinDateRange` function (all presets, date boundaries)
  - `getDateRangeFromPreset` function (all presets, quarter calculations)
  - Edge cases (leap year, year boundary crossings)

**Commits:**
- `feat(expenses): add mileage segment to expenses tab with tier updates`
- `refactor(expenses): rename segment label from Expenses to Overhead`
- `feat(expenses): show combined total with segment-specific subtitle`
- `style(expenses): increase combined total font size for prominence`
- `style(expenses): refine header UI for cleaner look`
- `test(DateRangeFilter): add unit tests for date range utilities`

---

### Phase 8F: Onboarding Integration

**Completed:** Jan 11, 2026

**Summary:**
Implemented research-backed onboarding flow with tier selection and reverse trial pattern. Based on conversion optimization research from UserPilot, RevenueCat 2025, Adapty, Smashing Magazine, and Orbix Studio.

**Research-Backed Design Decisions:**

| Decision | Research Source | Implementation |
|----------|-----------------|----------------|
| **Reverse Trial** | UserPilot: "Users who started on premium are less likely to return to bare minimum" | Always offer 7-day Pro trial |
| **No Credit Card** | First Page Sage: "No-CC delivers 27% more paying customers" | Trial starts without payment |
| **Annual Pricing Visible** | RevenueCat 2025: "Position annual as primary offer" | Show monthly + annual with "Save 17%" badge |
| **Three-Tier Structure** | Harvard Business Review: "Three tiers optimal for decision-making" | Free / Starter / Pro cards |
| **"Most Popular" Badge** | Smashing Magazine: "Social proof badges drive 25%+ selection increase" | Badge on Starter tier |
| **Natural Progression Order** | Mobile UX research: "Vertical scroll better than horizontal" | Free → Starter → Pro (top to bottom) |

**Files Created:**
- `app/onboarding/_layout.tsx` - Onboarding stack navigator
- `app/onboarding/user-type.tsx` - Main tier selection screen
- `src/components/onboarding/TierCard.tsx` - Reusable tier card component
- `src/components/onboarding/TrialBanner.tsx` - Trial status banner
- `src/components/onboarding/index.ts` - Component exports
- `src/stores/onboarding-store.ts` - Trial and onboarding state management
- `src/stores/__tests__/onboarding-store.test.ts` - Store unit tests

**Files Modified:**
- `app/_layout.tsx` - Added onboarding flow check and routing

**Features Implemented:**
- [x] Tier selection cards with features, pricing, badges
- [x] Monthly + Annual pricing display with savings percentage
- [x] "Most Popular" and "Best Value" badges
- [x] 7-day Pro trial (reverse trial pattern)
- [x] No credit card required messaging
- [x] "Skip for now" option for Free tier
- [x] Trial state persistence (AsyncStorage)
- [x] Automatic trial expiration check
- [x] Trial banner component (shows in last 3 days)
- [x] User type auto-set based on tier selection
- [x] Auto-enable expense tracking for paid tiers
- [x] Onboarding completion routing

**Trial Flow:**
1. User selects a tier card (defaults to "Side Income" / Starter)
2. Taps "Start with Pro Trial" → 7-day Pro access begins
3. After trial: prompted to subscribe to selected tier
4. If skipped: starts on Free tier immediately

**Tests Added:**
- Initial state verification
- `startTrial()` - creates 7-day trial with Pro access
- `completeOnboarding()` - marks completion, sets tier
- `endTrial()` - downgrades to free
- `getTrialDaysRemaining()` - calculates remaining days
- `checkTrialStatus()` - auto-ends expired trials
- `resetOnboarding()` - resets for testing

**Deferred to Phase 8G:**
- [ ] Subscription screen (RevenueCat integration)
- [ ] Upgrade flow from trial to paid

---

### Phase 8G: App Settings (Read-Only Store)

**Completed:** Jan 11, 2026

**Summary:**
Implemented secure app settings architecture. Mobile app has READ-ONLY access to configurable variables. Admin writes are done via Supabase Studio (now) or a separate web admin dashboard (future, post-launch).

**Security Decision:**
After evaluating security implications, decided NOT to include admin write capabilities in the mobile app:
- Mobile apps can be reverse-engineered
- Admin endpoints create attack surface
- Better security through separation of concerns
- Web admin dashboard with server-side auth is more secure

**Current Admin Workflow (Supabase Studio):**
```
Supabase Dashboard → Table Editor → app_settings
├── Select row by key (e.g., 'irs_mileage_rate')
├── Edit value field
└── Save → Changes reflected in mobile app on next fetch
```

**Future Admin Workflow (Post-Launch):**
Separate web application with:
- Server-side authentication (admin role)
- Service role key for writes (never client-exposed)
- Audit logging for all changes
- Business metrics dashboard

**Files Created:**
- `src/stores/admin-store.ts` - Renamed to `useAppSettingsStore` (READ-ONLY)
  - `fetchSettings()` - Fetch from Supabase with 5-min cache
  - `getSetting(key)` - Get single setting value
  - `getPlatformFee(platform)` - Get fee % for platform
  - `getMileageRate()` - Get current IRS rate
  - `refreshSettings()` - Force refresh
- `src/types/database.ts` - Added app settings types:
  - `AppSettingKey` type with all configurable keys
  - `APP_SETTING_DEFAULTS` with fallback values
  - `PLATFORM_FEE_KEYS` mapping platforms to settings

**Convenience Hooks:**
- `usePlatformFee(platform)` - Get fee % with auto-fetch
- `useMileageRate()` - Get IRS rate with auto-fetch
- `useAllPlatformFees()` - Get all platform fees at once

**Helper Functions:**
- `calculatePlatformFee(price, platform)` - Calculate fee amount
- `calculateMileageDeduction(miles)` - Calculate mileage deduction

**App Settings Available:**
| Key | Default | Description |
|-----|---------|-------------|
| `irs_mileage_rate` | 0.725 | IRS rate ($/mile) |
| `platform_fee_ebay` | 13.25 | eBay fee (%) |
| `platform_fee_poshmark` | 20 | Poshmark fee (%) |
| `platform_fee_mercari` | 10 | Mercari fee (%) |
| `platform_fee_facebook` | 5 | FB Marketplace (%) |
| `platform_fee_offerup` | 12.9 | OfferUp (%) |
| `platform_fee_whatnot` | 10 | Whatnot (%) |
| `affiliate_commission_rate` | 25 | Affiliate commission (%) |
| `trial_duration_days` | 7 | Trial length (days) |
| `default_stale_threshold` | 30 | Stale inventory (days) |

**Documentation Updated:**
- [x] `PALLETPULSE_ONESHOT_CONTEXT.md` - Section 4D updated with security architecture
- [x] `PALLETPULSE_ONESHOT_CONTEXT.md` - Added "Web Admin Dashboard (Post-Launch Priority)" section
- [x] `PROGRESS.md` - This section

**Tests Created:**
- `src/stores/__tests__/app-settings-store.test.ts` - 35 tests covering:
  - Initial state verification
  - `fetchSettings()` - fetch, cache, error handling, string parsing
  - `getSetting()` - value retrieval with defaults
  - `getPlatformFee()` - all platforms (eBay, Poshmark, Mercari, etc.)
  - `getMileageRate()`, `getTrialDuration()`, `getDefaultStaleThreshold()`
  - `refreshSettings()` - force fetch
  - `clearError()` - error state management
  - `calculatePlatformFee()` - helper function tests
  - `calculateMileageDeduction()` - helper function tests

**Remaining Tasks:**
- [x] Create Supabase migration for `app_settings` table (done in Phase 8A)
- [x] Write unit tests for `useAppSettingsStore`
- [x] Integrate settings store with sale form (auto-fetch platform fees)
- [x] Integrate settings store with mileage form (auto-fetch IRS rate)

**Integration Details:**

*Sale Form Integration (`sale-form-schema.ts`):*
- Added `getPlatformFeeRate(platform)` - fetches rate from settings store
- Added `getPlatformShippedRate(platform)` - for FB/OfferUp shipped fees
- Added `getPlatformConfig(platform)` - full config with dynamic rates
- Added `getPlatformOptions()` - dropdown options with current fee descriptions
- Updated `calculatePlatformFee()` to use dynamic rates
- Platforms with local/shipped rates (Facebook, OfferUp) handled correctly

*Mileage Integration (`mileage-store.ts`, `mileage-form-schema.ts`):*
- `fetchCurrentMileageRate()` now uses `useAppSettingsStore.getState().getMileageRate()`
- Added `getCurrentMileageRate()` helper function
- `DEFAULT_IRS_MILEAGE_RATE` now sourced from `APP_SETTING_DEFAULTS`

*Test Updates:*
- Added settings store mocks to `sale-form-schema.test.ts`
- Added settings store mocks to `mileage-store.test.ts`
- Added settings store mocks to `mileage-form-schema.test.ts`
- Updated Whatnot test to use 10% (centralized default)

---

### Phase 8H: Cleanup & Migration

**Completed:** Jan 11, 2026

**Summary:**
Cleaned up deprecated expense categories from the codebase. Legacy categories (gas, mileage, fees, shipping) are no longer valid for new expenses. Existing data with legacy categories is handled gracefully through fallbacks.

**Changes Made:**
- [x] Updated `expense-form-schema.ts`:
  - Removed `ALL_EXPENSE_CATEGORIES` constant entirely
  - `EXPENSE_CATEGORIES` now only contains 5 current categories: storage, supplies, subscriptions, equipment, other
  - `EXPENSE_CATEGORY_LABELS` reduced to 5 entries
  - `EXPENSE_CATEGORY_COLORS` reduced to 5 entries (removed gas, mileage, fees, shipping colors)
  - `EXPENSE_CATEGORY_DESCRIPTIONS` provides helpful hints for each category
  - `getCategoryLabel()` returns raw category name as fallback for legacy categories
  - `getCategoryColor()` returns grey (#9E9E9E) as fallback for legacy categories
  - `groupExpensesByCategory()` and `calculateTotalByCategory()` handle legacy categories dynamically

- [x] Updated `app/(tabs)/expenses.tsx`:
  - Removed legacy category icons from `getCategoryIcon()` switch statement
  - Legacy categories display with fallback ellipsis icon

- [x] Updated `expense-form-schema.test.ts`:
  - Removed import of `ALL_EXPENSE_CATEGORIES`
  - Updated `getCategoryLabel` tests for fallback behavior (no "(Legacy)" suffix)
  - Updated `getCategoryColor` tests for grey fallback
  - Updated `groupExpensesByCategory` tests with current categories
  - Updated `calculateTotalByCategory` tests with current categories
  - Added tests for legacy category handling in grouping/totaling functions
  - Removed entire `ALL_EXPENSE_CATEGORIES constant` test block

**Backward Compatibility:**
- Legacy expenses (gas, mileage, fees, shipping) from existing data still display correctly
- Labels show raw category name (e.g., "gas" instead of "Gas (Legacy)")
- Colors default to grey for unknown categories
- Grouping/totaling functions create buckets dynamically for legacy categories

**Not Changed (Intentional):**
- Database schema unchanged - ExpenseCategory enum still includes legacy values for backward compatibility
- Existing expense records are preserved as-is
- Legacy `pallet_id` field kept alongside `pallet_ids` array for backward compatibility

**Data Migration:**
- [ ] Create migration script for existing expense data (deferred - low priority)
- [ ] Handle existing test data in Supabase (deferred - low priority)

---

### Implementation Order

1. **8A: Database Schema** - Foundation for everything
2. **8B: Enhanced Sale Form** - High value, affects daily workflow
3. **8E: Settings Opt-In** - Controls visibility of other features
4. **8C: Mileage Tracking** - Major new feature
5. **8D: Overhead Expenses** - Simplify existing system
6. **8F: Onboarding** - User type selection
7. **8G: Admin Dashboard** - IRS rate management
8. **8H: Cleanup** - Remove deprecated code

---

### Test Requirements

**Unit Tests:**
- [ ] Platform fee calculation functions
- [ ] Mileage deduction calculations
- [ ] Multi-pallet expense allocation
- [ ] Sale form validation with new fields
- [ ] Mileage trip form validation
- [ ] Settings store expense tracking toggle

**Integration Tests:**
- [ ] Mark as sold with platform fees
- [ ] Add mileage trip linked to pallets
- [ ] Add overhead expense linked to multiple pallets
- [ ] Profit calculation with all cost types

---

### Human Verification Checklist (Post-Implementation)

**Per-Item Costs:**
- [ ] Mark item sold → platform dropdown appears
- [ ] Select eBay → platform fee auto-calculates (13.25%)
- [ ] Enter shipping cost → net profit updates
- [ ] Confirm sale → platform_fee and shipping_cost saved
- [ ] Item detail shows all sale costs

**Mileage Tracking:**
- [ ] Settings → Enable Expense Tracking → ON
- [ ] Add Trip button appears (in expenses or dedicated tab)
- [ ] Enter miles, select purpose, link pallets
- [ ] Deduction auto-calculates at IRS rate
- [ ] Trip appears in mileage log
- [ ] Mileage contributes to total expenses

**Overhead Expenses:**
- [ ] Add expense → simplified categories (no gas/mileage)
- [ ] Can link to multiple pallets
- [ ] Receipt photo still works
- [ ] Expense appears in linked pallet details

**Settings:**
- [ ] Expense tracking toggle shows/hides expense UI
- [ ] User type saved from onboarding
- [ ] Toggle persists after app restart

**Admin:**
- [ ] Can update IRS mileage rate
- [ ] Can update platform fee percentages
- [ ] Changes reflect immediately in calculations

---

### Previous Implementation (To Be Refactored)

The following files from initial Phase 8 implementation will be refactored:
- `src/features/expenses/schemas/expense-form-schema.ts` - Update categories, add multi-pallet
- `src/features/expenses/components/ExpenseForm.tsx` - Simplified categories, multi-pallet picker
- `src/features/expenses/components/ExpenseCard.tsx` - Multi-pallet display
- `app/expenses/new.tsx` - Update for new flow
- `app/expenses/[id].tsx` - Update for multi-pallet
- `app/expenses/edit.tsx` - Update for new schema
- `app/pallets/[id].tsx` - Query via junction table

**New Files to Create:**
- `src/features/mileage/` - New feature module
- `src/features/sales/schemas/sale-form-schema.ts` - Enhanced with platform/shipping
- `app/mileage/` - Mileage screens
- `app/admin/settings.tsx` - Admin IRS rate management

---

## Phase 10: Subscription - IN PROGRESS

### Overview
Implementing subscription tier gating and paywall components. RevenueCat SDK integration is ready but requires app store product setup before full functionality.

### Phase 10A: Subscription Infrastructure ✅
**Completed:** Jan 16, 2026

**Files Created:**
- `src/lib/revenuecat.ts` - RevenueCat SDK initialization and helpers
- `src/stores/subscription-store.ts` - Subscription state management with tier gating

**Features:**
- RevenueCat SDK configuration for iOS/Android
- `initializeRevenueCat()` - Initialize with optional user ID
- `getCustomerInfo()` - Get current subscription status
- `getOfferings()` - Get available packages
- `getTierFromEntitlements()` - Map entitlements to tiers
- Development tier override via `EXPO_PUBLIC_DEV_TIER` env var

### Phase 10B: Subscription Store ✅
**Completed:** Jan 16, 2026

**Implementation:**
- `useSubscriptionStore` with Zustand persist middleware
- `getEffectiveTier()` - Returns tier considering trial status
- `canPerform()` - Check if action allowed for current tier
- `purchasePackage()` - Handle purchase flow
- `restorePurchases()` - Restore previous purchases

### Phase 10C: Paywall Components ✅
**Completed:** Jan 16, 2026

**Files Created:**
- `src/components/subscription/PaywallModal.tsx` - Full paywall with tier cards
- `src/components/subscription/UpgradePrompt.tsx` - Inline upgrade nudge
- `src/components/subscription/index.ts` - Exports

**Features:**
- PaywallModal shows tier comparison with features
- Monthly/Annual toggle with savings badge
- "Most Popular" badge on Starter tier
- Trial CTA for users not on trial
- Restore Purchases link
- UpgradePrompt inline component for contextual upgrades

### Phase 10D: Tier Limit Enforcement ✅
**Completed:** Jan 16, 2026

**Files Modified:**
- `src/stores/pallets-store.ts` - Pallet limit check before `addPallet()`
- `src/stores/items-store.ts` - Item limit check before `addItem()`
- `src/components/ui/PhotoPicker.tsx` - Photo limit check with `onUpgradePress` callback
- `app/(tabs)/expenses.tsx` - Gate expense tracking by tier
- `app/mileage/index.tsx` - Gate mileage tracking by tier

**Enforcement Pattern:**
```typescript
// Returns { success: false, errorCode: 'TIER_LIMIT_REACHED', requiredTier: 'starter' }
// when limit exceeded
```

**Screens Updated:**
- `app/pallets/new.tsx` - Shows PaywallModal on limit reached
- `app/items/new.tsx` - Shows PaywallModal on limit reached

### Phase 10E: Settings Integration ✅
**Completed:** Jan 16, 2026

**Files Modified:**
- `app/(tabs)/settings.tsx` - Added subscription management section

**Features:**
- Current plan display with badge
- Tier description
- Upgrade/Manage button
- Restore Purchases link
- Feature list for current tier

**UI Cleanup (Jan 16):**
- Removed Business Type section from settings (dead code)
- Updated onboarding to remove user_type dependencies
- Removed "Welcome back," text from dashboard header
- Fixed analytics.tsx upgrade prompt to open PaywallModal (was broken navigation)
- Standardized card shadows to `sm` for consistency

### Phase 10F: Affiliate Code Support ⏳
**Status:** Pending - Deferred to post-launch

**Planned Features:**
- Affiliate code input during signup
- Discount application via RevenueCat promotional offers
- Track in `profiles.affiliate_code`

### Test Results
```
Test Suites: 19 passed, 19 total
Tests:       783 passed, 783 total
```

### Commits
- `feat(subscription): add RevenueCat SDK and subscription store`
- `feat(subscription): add paywall modal and upgrade prompt components`
- `feat(subscription): enforce tier limits on pallets, items, and photos`
- `feat(subscription): add subscription management to settings`
- `feat(subscription): improve tier gating UX and upgrade prompts`

### Human Verification Checklist
**Free Tier Limits:**
- [ ] Create 1 pallet → success
- [ ] Create 2nd pallet → upgrade prompt appears (PaywallModal)
- [ ] Create 20 items → success
- [ ] Create 21st item → upgrade prompt appears (PaywallModal)
- [ ] Upload 1 photo → success
- [ ] Upload 2nd photo to same item → upgrade prompt appears

**Upgrade Flow:**
- [ ] Tap upgrade → PaywallModal appears with tier cards
- [ ] RevenueCat sandbox purchase works (requires app store setup)

**Settings:**
- [ ] Shows current tier with description
- [ ] Upgrade button opens PaywallModal
- [ ] Restore Purchases works

**Feature Gates:**
- [ ] Expenses tab hidden for Free tier
- [ ] Mileage screen shows upgrade prompt for Free tier
- [ ] Analytics export shows upgrade prompt for appropriate tiers

---

## Phase 7: Sales & Profit - COMPLETED (approved)

### All Tasks Completed
- [x] Create feature branch (`feature/sales-profit`)
- [x] Create profit calculation utilities
  - `calculateItemProfit` - profit from single item
  - `calculateItemProfitFromValues` - profit with explicit values
  - `calculateItemROI` - ROI percentage for item
  - `calculateItemROIFromValues` - ROI with explicit values
  - `calculatePalletProfit` - comprehensive pallet profit metrics
  - `calculateSimplePalletProfit` - quick profit display
  - `calculatePalletROI` - pallet ROI percentage
  - `allocateCosts` - allocate pallet cost to items (with unsellable option)
  - `estimateAllocatedCost` - estimate cost before item is saved
- [x] Create formatting utilities
  - `formatCurrency` - USD currency formatting
  - `formatProfit` - profit with color indicator
  - `formatROI` - ROI percentage display
  - `getROIColor` - color-coded ROI
- [x] Create analysis utilities
  - `isItemStale` - check if item is stale
  - `getDaysSinceListed` - days since item listed
  - `getDaysToSell` - days from listing to sale
  - `calculateAverageDaysToSell` - average days to sell
- [x] Write unit tests for profit calculations (83 tests)
- [x] Create sale form schema (Zod)
  - Sale price validation (required, positive, max limit)
  - Sale date validation (YYYY-MM-DD format, no future dates)
  - Sales channel (optional, with suggestions)
  - Buyer notes (optional)
- [x] Write tests for sale form schema (49 tests)
  - Schema validation tests
  - Helper function tests (formatSaleDate, getPriceWarning, calculateDiscount)
- [x] Build MarkAsSold screen (`app/items/sell.tsx`)
  - Item summary at top
  - Sale price input with currency formatting
  - Sale date input with validation
  - Sales channel with autocomplete suggestions
  - Buyer notes (optional)
  - Live profit/ROI preview
  - Price warning for significant differences from listing
  - Discount display
  - Improved keyboard scroll handling
- [x] Update items store with enhanced markAsSold action
  - Now saves sale_price, sale_date, sales_channel
  - Appends buyer notes to item notes
- [x] Update pallet detail screen with live profit display
  - Uses calculatePalletProfit for real profit calculation
  - Shows Cost, Profit, ROI cards with color coding
  - Progress summary: Sold count, Unsold count, Revenue
  - Fetches pallet expenses for accurate calculation
  - Refreshes data on screen focus (useFocusEffect)
- [x] Add quick-sell swipe feature
  - Swipe right on item card reveals "SELL" button
  - Bottom sheet modal with sale price input
  - Live profit/ROI preview in quick sell modal
  - Works on both Pallet Detail and Items tab
- [x] Add pallet status dropdown
  - Tap status badge in Details section to change
  - Options: Unprocessed, In Progress, Processed
  - Modal picker with color-coded status dots
- [x] Fix dashboard to show real metrics
  - Connected to pallets, items, expenses stores
  - Shows total profit (dynamically calculated)
  - Shows pallets count, items count, sold count
  - Refreshes on screen focus
  - Pull-to-refresh support
- [x] Item detail already has Mark Sold button (from Phase 6)
- [x] Fix pallet cards to show real metrics
  - Connected Pallets tab to items and expenses stores
  - Calculate item count and profit using calculatePalletProfit
  - Cards now show accurate item counts and profit/ROI
- [x] Add search/filter to Items tab
  - Search bar filters by name, description, barcode, notes, location, pallet name
  - Filter chips: All, Listed, Sold, Unlisted (with counts)
  - "No results" state with clear filters option
- [x] Add swipe-left-to-delete (Tinder-style)
  - Swipe left on item card reveals "DELETE" button
  - Confirmation dialog warns about permanent deletion
  - Works on both Items tab and Pallet Detail screen
  - Updated swipe hints to show "← Delete | Sell →"
- [x] UI polish based on user feedback
  - Removed redundant Stack headers on tab screens (no more "Pallets/Pallets")
  - Added safe area insets to all tab screens for proper notch handling
  - Added pallet dropdown to ItemForm - users can assign items to pallets from Items tab
  - Muted red (70% opacity) for dashboard hero negative profit - less harsh than dark red
  - Added `isRealized` parameter to formatProfit/getROIColor utilities for future use
- [x] Auto-calculate allocated cost for pallet items
  - When adding item to pallet, calculates allocated_cost = (pallet cost + tax) / item count
  - Recalculates ALL items in pallet when new item is added (cost redistributed)
  - Recalculates remaining items when item is deleted from pallet
  - Fixed pallet assignment from dropdown - now correctly saves pallet_id from form data
- [x] Pallet reassignment in edit screen
  - Can assign individual item to a pallet (calculates allocated_cost)
  - Can move item between pallets (recalculates both old and new pallet items)
  - Can remove item from pallet (clears allocated_cost, recalculates old pallet)
- [x] Fix timezone/date display bugs
  - Fixed `getLocalDateString()` helper to generate correct YYYY-MM-DD in local time
  - Fixed `formatDisplayDate()` to parse dates as local time (not UTC)
  - Fixed DateTimePicker value to use local date parsing
  - Dates now display correctly regardless of timezone
- [x] Fix dashboard profit calculation
  - Changed from per-item realized profit to total financial position
  - Now shows: Total Revenue - All Pallet Costs - Individual Item Costs - All Expenses
  - Accurately reflects overall profit/loss including unsold inventory investment

### Test Results
```
Test Suites: 10 passed, 10 total
Tests:       376 passed, 376 total
```

**New Tests Added:**
- profit-utils.test.ts (83 tests)
  - calculateItemProfit (6 tests)
  - calculateItemProfitFromValues (4 tests)
  - calculateItemROI (6 tests)
  - calculateItemROIFromValues (2 tests)
  - allocateCosts (8 tests)
  - estimateAllocatedCost (7 tests)
  - calculatePalletProfit (11 tests)
  - calculateSimplePalletProfit (1 test)
  - calculatePalletROI (1 test)
  - formatCurrency (6 tests)
  - formatProfit (3 tests)
  - formatROI (4 tests)
  - getROIColor (7 tests)
  - isItemStale (5 tests)
  - getDaysSinceListed (3 tests)
  - getDaysToSell (5 tests)
  - calculateAverageDaysToSell (4 tests)
- sale-form-schema.test.ts (49 tests)
  - Schema validation (19 tests)
  - getDefaultSaleFormValues (5 tests)
  - formatSaleDate (2 tests)
  - formatSalesChannel (4 tests)
  - getUniqueSalesChannels (5 tests)
  - getPriceWarning (6 tests)
  - calculateDiscount (6 tests)
  - Constants tests (2 tests)

### Files Created
- `app/items/sell.tsx` - Mark as Sold screen
- `src/lib/profit-utils.ts` - Profit calculation utilities
- `src/lib/__tests__/profit-utils.test.ts` - Profit utilities tests
- `src/features/sales/schemas/sale-form-schema.ts` - Sale form schema
- `src/features/sales/schemas/sale-form-schema.test.ts` - Schema tests
- `src/features/sales/index.ts` - Feature exports

### Files Modified
- `app/pallets/[id].tsx` - Added quick-sell swipe, swipe-delete, status dropdown, useFocusEffect refresh
- `app/(tabs)/index.tsx` - Connected to stores, shows real metrics, pull-to-refresh, muted red hero
- `app/(tabs)/items.tsx` - Added search/filter, quick-sell swipe, swipe-delete, useFocusEffect refresh, safe area insets
- `app/(tabs)/pallets.tsx` - Connected to items/expenses stores, shows real metrics on pallet cards, safe area insets
- `app/(tabs)/analytics.tsx` - Added safe area insets
- `app/(tabs)/settings.tsx` - Added safe area insets
- `app/(tabs)/_layout.tsx` - Hidden Stack headers on tab screens
- `app/items/new.tsx` - Fixed to use pallet_id from form dropdown (not just URL param)
- `app/items/edit.tsx` - Prepared for future pallet reassignment support
- `src/stores/items-store.ts` - Enhanced markAsSold, auto-calculate allocated_cost on add/delete
- `src/stores/__tests__/items-store.test.ts` - Updated tests for allocated cost calculation
- `src/lib/photo-utils.ts` - Fixed generateStoragePath extension handling
- `src/lib/profit-utils.ts` - Added isRealized parameter to formatProfit/getROIColor
- `src/features/items/components/ItemForm.tsx` - Added pallet dropdown for assigning items to pallets
- `src/features/pallets/components/PalletForm.tsx` - Fixed date timezone issues (getLocalDateString, formatDisplayDate, DateTimePicker)
- `src/features/pallets/components/PalletCard.tsx` - Fixed date timezone issue in formatDate
- `package.json` - Added react-native-gesture-handler

### Human Verification Checklist
- [ ] From item detail, tap "Mark Sold" -> sell screen opens
- [ ] Sale price pre-fills with listing price
- [ ] Sale date defaults to today
- [ ] Sales channel suggestions appear when typing
- [ ] Profit preview updates as sale price changes
- [ ] Confirm sale -> item status changes to "Sold"
- [ ] After sale, item detail shows sale info
- [ ] Pallet detail shows accurate profit calculation
- [ ] Pallet detail shows sold/unsold counts
- [ ] ROI color indicates positive/negative correctly
- [ ] Verify math: Profit = Revenue - (Pallet Cost + Tax + Expenses)
- [ ] **Quick Sell:** Swipe right on item in pallet detail -> SELL button appears
- [ ] **Quick Sell:** Tap SELL -> bottom sheet modal opens
- [ ] **Quick Sell:** Sale price pre-fills, profit preview shows
- [ ] **Quick Sell:** Confirm sale -> item marked sold, list refreshes
- [ ] **Quick Sell:** Also works on Items tab
- [ ] **Quick Delete:** Swipe left on item -> DELETE button appears
- [ ] **Quick Delete:** Tap DELETE -> confirmation dialog appears
- [ ] **Quick Delete:** Confirm -> item permanently deleted
- [ ] **Quick Delete:** Works on both Items tab and Pallet Detail
- [ ] **Status:** Tap pallet status -> dropdown appears
- [ ] **Status:** Change status -> saves correctly
- [ ] **Dashboard:** Shows real profit, pallets, items, sold counts
- [ ] **Dashboard:** Updates after marking item sold
- [ ] **Pallet Cards:** Shows real item count and profit/ROI
- [ ] **Pallet Cards:** Updates after adding/selling items
- [ ] **Search:** Type in search bar -> items filter by name, barcode, etc.
- [ ] **Search:** Clear button appears when searching
- [ ] **Filter Chips:** Tap "Listed" -> shows only listed items
- [ ] **Filter Chips:** Shows counts in each chip
- [x] **UI Polish:** Tab screens no longer show redundant headers (e.g., "Pallets/Pallets")
- [x] **UI Polish:** Dashboard hero uses muted red for negative profit (not harsh dark red)
- [x] **Pallet Assignment:** From Items tab, tap "Add Item" -> can select pallet from dropdown
- [x] **Pallet Assignment:** Item assigned to pallet shows in pallet detail
- [x] **Allocated Cost:** Item added to pallet gets allocated_cost calculated automatically
- [x] **Allocated Cost:** Existing items in pallet are recalculated when new item added
- [ ] **Edit Reassignment:** Edit individual item -> can assign to pallet via dropdown
- [ ] **Edit Reassignment:** After saving, item appears in pallet detail with allocated_cost
- [ ] **Edit Reassignment:** Edit pallet item -> can move to different pallet or make individual
- [ ] **Date Display:** Add pallet screen shows correct date (today, not yesterday)
- [ ] **Date Display:** Pallet card shows correct purchase date
- [ ] **Dashboard Profit:** Shows total profit = Revenue - All Costs - Expenses
- [ ] **Dashboard Profit:** Adding new pallet correctly decreases profit by pallet cost

---

## Phase 6: Item Management - COMPLETED (approved)

### All Tasks Completed
- [x] Create feature branch (`feature/item-management`)
- [x] Create item form validation schema (Zod)
- [x] Build ItemForm component with condition chips, photo picker
- [x] Build ItemCard component for list display
- [x] Update Items tab with real data
- [x] Update item detail screen with edit/delete
- [x] Create edit item screen
- [x] Create photo utilities with compression
- [x] Implement photo persistence

### Test Results
```
Test Suites: 8 passed, 8 total
Tests:       244 passed, 244 total
```

---

## Phase 5: Pallet Management - COMPLETED (approved)

### All Tasks Completed
- [x] Pallet form schema with validation
- [x] PalletForm component with autocomplete
- [x] PalletCard component
- [x] Pallet CRUD operations
- [x] Edit pallet screen

### Test Results
```
Test Suites: 6 passed, 6 total
Tests:       133 passed, 133 total
```

---

## Phase 1-4: COMPLETED (approved)

See previous sections for details on Project Setup, Authentication, Database & Data Layer, and Core Navigation.

---

## Next Steps: Phase 8 - Expenses

Phase 8 will include:
- Add expense form and screen
- Expense CRUD operations
- Link expenses to pallets (optional)
- Receipt photo upload
- Expense categories (Supplies, Gas, Storage, Fees, Other)
- Expense impact on pallet profit

---

## Phase 11: Polish - IN PROGRESS

### 11A: Logging & Diagnostics ✅
**Completed:** Jan 16, 2026

**Overview:**
Implemented centralized logging utility with Sentry integration for production error tracking.

**Files Created:**
- `src/lib/logger.ts` - Centralized logging utility
  - Log levels: debug, info, warn, error
  - Sentry integration for breadcrumbs and error tracking
  - `createLogger()` factory for scoped loggers
  - `setGlobalContext()` / `clearGlobalContext()` for user context
  - `getBreadcrumbs()` / `clearBreadcrumbs()` for diagnostics export
  - Dev-only console output for debug/info levels

- `src/lib/sentry.ts` - Sentry configuration
  - `initializeSentry()` - Initialize with environment-specific settings
  - `isSentryConfigured()` - Check if DSN is set
  - `setSentryUser()` / `clearSentryUser()` - User context management
  - `captureException()` - Manual error capture
  - Filters sensitive data (auth tokens, passwords) from breadcrumbs
  - Ignores expected errors (network failures, user cancellations)

- `src/components/ui/ErrorFallback.tsx` - Error boundary fallback
  - User-friendly error display
  - Retry button
  - Error details in dev mode

**Files Modified:**
- `app/_layout.tsx` - Initialize Sentry on app start, set user context on auth
- `src/lib/supabase.ts` - Replaced console.* with logger
- `src/lib/storage.ts` - Replaced console.* with scoped logger
- `src/lib/revenuecat.ts` - Replaced console.* with scoped logger
- `src/stores/auth-store.ts` - Replaced console.* with scoped logger
- `src/stores/admin-store.ts` - Replaced console.* with scoped logger
- `src/stores/subscription-store.ts` - Replaced console.* with scoped logger
- `src/components/subscription/PaywallModal.tsx` - Replaced console.* with scoped logger
- `src/components/ui/index.ts` - Export ErrorFallback
- `src/constants/colors.ts` - Added error state colors
- `jest.setup.js` - Added Sentry mock for tests

**Features:**
- Scoped loggers with preset context (screen, action)
- Automatic breadcrumb trail for debugging
- Sentry error tracking in production
- Error boundaries with user-friendly fallback UI
- Filtered sensitive data in error reports
- Console output only in development

**Test Results:**
```
Test Suites: 20 passed, 20 total
Tests:       783 passed, 783 total
```

**Commits:**
- `feat(diagnostics): add centralized logging and Sentry error tracking`

---

## Phase 11 Backlog (Polish)

### Must Have
- [x] Logging & diagnostics system ✅

### Should Add
- [x] Dashboard time period selector (Week/Month/Year/All-Time profit) ✅
- [x] Smart insights on dashboard (rules-based) ✅
- [ ] AI-powered deep analysis (Premium feature)
  - LLM-generated insights on request
  - Analyze trends, suggest actions
  - API cost per use - premium only

### Maybe Add
- [ ] Optional photo cropping
- [ ] Tax % setting during onboarding (with tax-exempt option)
- [ ] Unsellable items as inventory loss expense (write-off option)

---

## 🗺️ Post-MVP Roadmap

Features captured for future development after MVP launch. Prioritization based on user feedback.

### Goals System (v1.1+)

**Purpose:** Help users set and track business targets for motivation and accountability.

**Potential Features:**
- Profit targets (weekly/monthly/quarterly)
- Sales volume goals (items sold per period)
- Listing targets (items to list per day/week)
- ROI targets (maintain minimum ROI)
- Progress tracking on dashboard (progress bars, percentage)
- Goal history and achievement tracking
- Notifications when goals are met or at risk

**Implementation Notes:**
- New `goals` table: `id, user_id, type, target_value, period, start_date, end_date, status`
- Dashboard widget showing goal progress
- InsightsCard integration for goal-related tips
- Consider gamification (streaks, badges)

### Categories System (v1.1+)

**Purpose:** Better organize inventory and enable category-based analytics.

**Potential Features:**
- Item categorization (Electronics, Apparel, Home Goods, Toys, Sports, etc.)
- Category-based analytics ("Electronics have 80% ROI, Apparel has 40%")
- Filter inventory by category
- Track which pallet sources yield best items per category
- Category performance trends over time
- Best/worst performing categories report

**Implementation Notes:**
- Add `category` field to items table
- Predefined categories with "Other/Custom" option
- Category dropdown in item form
- New analytics section for category breakdown
- Consider allowing user-defined categories (Pro feature?)

### Other Post-MVP Ideas

- [ ] Barcode scanning for faster item entry
- [ ] Bulk item import from CSV/spreadsheet
- [ ] Multi-user support (Enterprise tier)
- [ ] Inventory location tracking (bins, shelves)
- [ ] Marketplace listing integration (auto-post to FB/eBay)
- [ ] Customer CRM (track buyers, repeat customers)
- [ ] Profit forecasting based on historical data
- [ ] Mobile widgets for quick stats

---

### 11B: Dashboard Improvements ✅
**Completed:** Jan 16, 2026

**Overview:**
Added time period filtering and smart insights to the dashboard for better profit tracking and actionable tips.

**Files Created:**
- `src/features/dashboard/utils/time-period-filter.ts` - Time period filtering utilities
- `src/features/dashboard/utils/insights-engine.ts` - Rules-based insights generator
- `src/features/dashboard/utils/index.ts` - Utility exports
- `src/features/dashboard/components/InsightsCard.tsx` - Insights display component
- `src/features/dashboard/utils/__tests__/time-period-filter.test.ts` - 26 tests
- `src/features/dashboard/utils/__tests__/insights-engine.test.ts` - 20 tests

**Files Modified:**
- `app/(tabs)/index.tsx` - Added time period state, filtered metrics, insights generation
- `src/features/dashboard/components/HeroCard.tsx` - Added time period selector pills
- `src/features/dashboard/components/index.ts` - Export InsightsCard

**Features:**
- **Time Period Selector:** Week | Month | Year | All pill selector in HeroCard
- **Filtered Metrics:** Profit, sold count filtered by selected period
- **Smart Insights:** Rules-based tips including:
  - Best performing source by ROI
  - Stale inventory warnings (configurable threshold)
  - Quick flip celebrations (items sold within 7 days)
  - Unlisted items reminders (5+ items)
  - First sale celebration
  - Milestone celebrations (10, 25, 50, 100 sales)

**Test Results:**
```
Test Suites: 22 passed, 22 total
Tests:       829 passed, 829 total
```

**Commits:**
- `feat(dashboard): add time period filter and smart insights`

---

**Reply "approved" to continue, or provide feedback.**
