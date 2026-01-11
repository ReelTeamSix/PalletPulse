# PalletPulse Development Progress

## Current Phase: Phase 8 - Expense System Redesign
**Status:** Phase 8B Complete - Enhanced Sale Form Implemented
**Branch:** feature/sales-profit

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
- [ ] Update profit-utils to include platform_fee and shipping_cost in calculations
- [x] Write tests for new sale form validation ✅
- [x] Write tests for platform fee calculations ✅

**Completed Files:**
- `src/features/sales/schemas/sale-form-schema.ts` - Added PLATFORM_PRESETS, PLATFORM_OPTIONS, platform/shipping fields, helper functions
- `src/stores/items-store.ts` - Updated markAsSold to accept SaleData object with platform/fee fields
- `app/items/sell.tsx` - Added platform grid, shipped toggle, platform fee (auto/manual), shipping cost, updated profit preview
- `app/(tabs)/items.tsx` - Added platform picker to quick sell modal with auto-fee calculation
- `app/pallets/[id].tsx` - Added platform picker to quick sell modal with auto-fee calculation
- `src/features/sales/schemas/sale-form-schema.test.ts` - Added 30+ new tests for platform fee functions

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
- [ ] Create mileage trip form schema (Zod)
- [ ] Create mileage-trips store (Zustand)
- [ ] Build MileageForm component with multi-pallet selector
- [ ] Build MileageTripCard component
- [ ] Create Add Trip screen (`app/mileage/new.tsx`)
- [ ] Create Trip Detail screen (`app/mileage/[id].tsx`)
- [ ] Create Edit Trip screen (`app/mileage/edit.tsx`)
- [ ] Create Mileage Log screen with list and export
- [ ] Add IRS rate fetch from app_settings
- [ ] Write tests for mileage calculations
- [ ] Write tests for mileage store

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

**Multi-Pallet Linking:**
- Overhead expenses can link to 0, 1, or multiple pallets
- Junction table `expense_pallets` replaces single `pallet_id`
- UI: Multi-select pallet picker

**Tasks:**
- [ ] Update expense form schema with simplified categories
- [ ] Update expense form to use multi-pallet selector
- [ ] Update expenses store to handle junction table
- [ ] Update ExpenseCard for multi-pallet display
- [ ] Update pallet detail to query via junction table
- [ ] Keep receipt photo functionality (already working)
- [ ] Write tests for multi-pallet expense linking

---

### Phase 8E: Settings & Opt-In

**Settings Screen Updates:**
```
Settings
├── Account
│   └── ...
├── Preferences
│   ├── Stale Inventory Threshold: 30 days
│   └── Include Unsellable in Cost: OFF
├── Expense Tracking ← NEW SECTION
│   ├── Enable Expense Tracking: [Toggle] ← master switch
│   └── (When ON, shows sub-options)
│       ├── Track Mileage: ON
│       └── Track Overhead Expenses: ON
└── About
```

**Tasks:**
- [ ] Add "Expense Tracking" section to Settings screen
- [ ] Create expense tracking toggle with confirmation
- [ ] Conditionally show/hide expense-related UI based on toggle
- [ ] Update user_settings store with new fields
- [ ] Create settings migration for expense_tracking_enabled

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
