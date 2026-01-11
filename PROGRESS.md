# PalletPulse Development Progress

## Current Phase: Phase 8 - Expense System Redesign
**Status:** Tab Restructure Complete - Inventory & Expenses Tabs
**Branch:** feature/expenses

---

## Completed Phases
- [x] Phase 1: Project Setup (approved)
- [x] Phase 2: Authentication (approved)
- [x] Phase 3: Database & Data Layer (approved)
- [x] Phase 4: Core Navigation (approved)
- [x] Phase 5: Pallet Management (approved)
- [x] Phase 6: Item Management (approved)
- [x] Phase 7: Sales & Profit (approved)
- [ ] Phase 8: Expense System Redesign ← **IN PROGRESS**
- [ ] Phase 9: Analytics
- [ ] Phase 10: Subscription
- [ ] Phase 11: Polish

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
| Free | Per-item costs only (shipping/fees at sale time) |
| Starter | + Overhead expenses, mileage tracking, receipt photos |
| Pro | + Auto mileage calculation (future), tax export |

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
- Key message: "PalletPulse is an inventory tracking tool, not tax software"
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

### Phase 8F: Onboarding Integration

**New Onboarding Screen:**
```
How do you flip? (Screen 3 of 5)

○ Just for fun
  Track profits simply - no expense tracking needed

○ Side income
  Basic tracking with shipping and platform fees

● Serious business
  Full expense tracking for tax reporting

[This affects which features you see. Change anytime in Settings.]
```

**Tasks:**
- [ ] Create user type selection screen
- [ ] Auto-enable expense tracking for "business" selection
- [ ] Store user_type in user_settings
- [ ] Use as upsell CTA for subscription tier

---

### Phase 8G: Admin Dashboard - IRS Rate Management

**Admin Settings Screen:**
```
Admin → App Settings
├── IRS Mileage Rate
│   ├── Current Rate: $0.725/mile
│   ├── Effective Date: Jan 1, 2026
│   └── [Update Rate] → modal with new rate + date
├── Platform Fee Defaults
│   ├── eBay: 13.25% [Edit]
│   ├── Poshmark: 20% [Edit]
│   ├── Mercari: 10% [Edit]
│   └── ...
└── New Year Reminder: "Update IRS rate for 2027"
```

**Tasks:**
- [ ] Create admin settings screen (gated by admin role)
- [ ] Build IRS rate editor with effective date
- [ ] Build platform fee editor
- [ ] Add new year reminder logic
- [ ] Write tests for admin settings

---

### Phase 8H: Cleanup & Migration

**Remove/Deprecate:**
- [ ] Remove old expense categories: gas, mileage, fees, shipping
- [ ] Migrate existing "gas" expenses to mileage trips (if possible, or archive)
- [ ] Update profit calculations to use new structure
- [ ] Remove single pallet_id from expenses (use junction table)

**Data Migration:**
- [ ] Create migration script for existing expense data
- [ ] Handle existing test data in Supabase

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

## Phase 11 Backlog (Polish)

### Must Have
- [ ] Logging & diagnostics system

### Should Add
- [ ] Dashboard time period slider (Week/Month/All-Time profit)
  - Swipeable hero card showing profit for different periods
  - Good fit with Analytics phase but adds dashboard value
- [ ] Smart insights on dashboard (rules-based)
  - "Your best ROI source is X - avg Y% ROI"
  - "X items listed 30+ days - consider repricing"
  - "Inventory at X% of normal level"
  - No API cost, just well-crafted conditionals
- [ ] AI-powered deep analysis (Premium feature)
  - LLM-generated insights on request
  - Analyze trends, suggest actions
  - API cost per use - premium only

### Maybe Add
- [ ] Optional photo cropping
- [ ] Tax % setting during onboarding (with tax-exempt option)
- [ ] Unsellable items as inventory loss expense (write-off option)

---

**Reply "approved" to continue to Phase 8, or provide feedback.**
