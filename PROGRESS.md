# PalletPulse Development Progress

## Current Phase: Phase 8 - Expenses
**Status:** Awaiting Review
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
- [ ] Phase 8: Expenses
- [ ] Phase 9: Analytics
- [ ] Phase 10: Subscription
- [ ] Phase 11: Polish

---

## Phase 8: Expenses - AWAITING REVIEW

### All Tasks Completed
- [x] Create feature branch (`feature/expenses`)
- [x] Create expense form schema (Zod)
  - Amount validation (required, positive, max $999,999.99)
  - Category enum validation (supplies, gas, mileage, storage, fees, shipping, other)
  - Description (optional, max 500 chars)
  - Expense date (YYYY-MM-DD, no future dates)
  - Pallet ID (optional UUID for linking to pallet)
  - Receipt photo path (optional)
- [x] Create expense form helper functions
  - `getLocalDateString` - local timezone date formatting
  - `getDefaultExpenseFormValues` - default form values
  - `formatExpenseDate` - date display formatting
  - `getCategoryLabel` - human-readable category names
  - `getCategoryColor` - category color coding
  - `formatExpenseAmount` - USD currency formatting
  - `parseCurrencyInput` - parse currency strings
  - `groupExpensesByCategory` - group expenses by category
  - `calculateTotalByCategory` - totals per category
  - `calculateTotalExpenses` - overall total
  - `filterExpensesByDateRange` - date range filtering
  - `filterExpensesByCategory` - category filtering
  - `getUniquePalletIds` - unique linked pallets
  - `isLinkedToPallet` - check pallet link
  - `sortExpensesByDate` - date sorting
  - `sortExpensesByAmount` - amount sorting
- [x] Write tests for expense form schema (87 tests)
- [x] Create ExpenseForm component
  - Amount input with currency formatting
  - Category selection (chips with color coding)
  - Description text area
  - Date picker
  - Pallet dropdown (optional link)
  - Receipt photo picker
  - Summary preview
  - Cancel/Submit buttons
- [x] Create ExpenseCard component
  - Full card with category color bar
  - Amount and category badge display
  - Description preview
  - Date and pallet link indicators
  - Compact version for pallet detail
- [x] Build Add Expense screen (`app/expenses/new.tsx`)
  - Form with pre-selected pallet (from URL param)
  - Receipt photo selection via ImagePicker
  - Create expense via store
- [x] Build Expense Detail screen (`app/expenses/[id].tsx`)
  - Amount header with category indicator
  - Details section (date, description, pallet link)
  - Receipt photo viewer (full-screen modal)
  - Activity timestamps
  - Delete button with confirmation
- [x] Build Edit Expense screen (`app/expenses/edit.tsx`)
  - Pre-populated form from existing expense
  - Update receipt photo
  - Save changes via store
- [x] Add expenses section to Pallet Detail screen
  - Expenses list with count and total
  - Add Expense button (pre-links to pallet)
  - Compact expense cards
  - Navigate to expense detail on tap
- [x] Update CLAUDE.md pre-phase checklist
  - Added requirement to merge previous phase before starting new one

### Test Results
```
Test Suites: 11 passed, 11 total
Tests:       463 passed, 463 total
```

**New Tests Added:**
- expense-form-schema.test.ts (87 tests)
  - Schema validation (34 tests)
  - getLocalDateString (3 tests)
  - getDefaultExpenseFormValues (4 tests)
  - formatExpenseDate (2 tests)
  - getCategoryLabel (1 test)
  - getCategoryColor (1 test)
  - formatExpenseAmount (5 tests)
  - parseCurrencyInput (8 tests)
  - groupExpensesByCategory (3 tests)
  - calculateTotalByCategory (3 tests)
  - calculateTotalExpenses (3 tests)
  - filterExpensesByDateRange (4 tests)
  - filterExpensesByCategory (2 tests)
  - getUniquePalletIds (3 tests)
  - isLinkedToPallet (2 tests)
  - sortExpensesByDate (3 tests)
  - sortExpensesByAmount (3 tests)
  - Constants tests (3 tests)

### Files Created
- `src/features/expenses/schemas/expense-form-schema.ts` - Form schema and helpers
- `src/features/expenses/schemas/expense-form-schema.test.ts` - Schema tests
- `src/features/expenses/components/ExpenseForm.tsx` - Form component
- `src/features/expenses/components/ExpenseCard.tsx` - Card components
- `src/features/expenses/index.ts` - Feature exports
- `app/expenses/new.tsx` - Add expense screen
- `app/expenses/[id].tsx` - Expense detail screen
- `app/expenses/edit.tsx` - Edit expense screen

### Files Modified
- `app/pallets/[id].tsx` - Added expenses section with list and add button
- `CLAUDE.md` - Updated pre-phase checklist with merge requirement

### Human Verification Checklist
- [ ] **Add expense:** Tap "Add" in pallet expenses section → form opens
- [ ] **Form fields:** Amount, category chips, description, date picker work
- [ ] **Pallet link:** Pallet pre-selected when coming from pallet detail
- [ ] **Receipt photo:** Can add photo via camera/gallery
- [ ] **Save expense:** Creates expense, returns to previous screen
- [ ] **Expense in pallet:** New expense appears in pallet's expense list
- [ ] **Total updates:** Expense total in pallet header updates
- [ ] **Expense detail:** Tap expense card → detail screen opens
- [ ] **Edit expense:** Tap edit → can modify all fields
- [ ] **Delete expense:** Tap delete → confirmation → removes expense
- [ ] **Profit impact:** Add $50 expense to pallet → pallet profit decreases by $50
- [ ] **Categories:** All 7 categories available with correct colors
- [ ] **Date validation:** Cannot select future date
- [ ] **Pallet dropdown:** Can change or remove pallet link

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
