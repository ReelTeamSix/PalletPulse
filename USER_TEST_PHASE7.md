# Phase 7: Sales & Profit - User Test Guide

**Date:** January 2026
**Branch:** feature/sales-profit
**Tester:** _______________

---

## Prerequisites

1. Run the app: `npx expo start`
2. Have at least one pallet with items (or create during test)
3. Have a calculator handy to verify math

---

## Test 1: Dashboard Metrics

### Steps
1. Open the app → Dashboard tab
2. Note the current values:
   - Total Profit: $______
   - Pallets count: ______
   - Items count: ______
   - Sold count: ______

### Expected
- [ ] Dashboard loads without errors
- [ ] Pull-to-refresh works (pull down)
- [ ] Tapping "Pallets" card navigates to Pallets tab
- [ ] Tapping "Items" card navigates to Items tab

---

## Test 2: Pallet Cards Show Real Metrics

### Steps
1. Go to **Pallets** tab
2. Look at any pallet card

### Expected
- [ ] Each pallet card shows item count (e.g., "5 items")
- [ ] Each pallet card shows profit/ROI
- [ ] Profit is color-coded (green = profit, red = loss)

---

## Test 3: Pallet Detail - Profit Display

### Steps
1. Tap on a pallet to open detail view
2. Look at the stats row at the top (Cost, Profit, ROI cards)
3. Look at the progress summary (Sold, Unsold, Revenue)

### Expected
- [ ] Cost card shows pallet purchase cost + tax
- [ ] Profit card shows calculated profit (green/red)
- [ ] ROI card shows percentage with color coding
- [ ] Progress summary shows correct sold/unsold counts
- [ ] Revenue shows sum of all sale prices

### Verify Math
```
Total Cost = Purchase Cost + Sales Tax + Expenses
Revenue = Sum of all sale prices
Profit = Revenue - Total Cost
ROI = (Profit / Total Cost) × 100
```
- [ ] Math is correct (verify with calculator)

---

## Test 4: Pallet Status Dropdown

### Steps
1. In pallet detail, scroll to "Details" section
2. Find the "Status" row
3. Tap on the status badge (e.g., "Unprocessed")

### Expected
- [ ] Modal opens with status options
- [ ] Options shown: Unprocessed, In Progress, Processed
- [ ] Each option has a colored dot
- [ ] Current status is highlighted with checkmark
- [ ] Tap different status → modal closes, status updates
- [ ] Status change persists (leave and return)

---

## Test 5: Mark Item as Sold (Full Flow)

### Steps
1. From pallet detail, tap on any **unsold** item
2. On item detail, tap **"Mark as Sold"** button
3. Fill out the sale form:
   - Sale Price: Enter a price (try $50)
   - Sale Date: Should default to today
   - Sales Channel: Tap and see suggestions
   - Buyer Notes: Optional, add a note

### Expected
- [ ] Sale price pre-fills with listing price (if set)
- [ ] Sale date defaults to today's date
- [ ] Sales channel shows chip suggestions (eBay, WhatNot, etc.)
- [ ] Typing in sales channel filters suggestions
- [ ] Profit preview updates as you change sale price
- [ ] ROI preview shows with color coding
- [ ] Price warning appears if sale price differs significantly from listing
- [ ] Discount percentage shows if selling below listing price
- [ ] **Confirm Sale** → navigates back to item detail
- [ ] Item now shows "Sold" status
- [ ] Item detail shows sale price and sale date

---

## Test 6: Sales Channel Learning

### Steps
1. Go to sell another item (Mark as Sold)
2. In Sales Channel, type a new channel: **"TikTok Shop"**
3. Complete the sale
4. Go to sell a THIRD item
5. Look at the sales channel suggestions

### Expected
- [ ] "TikTok Shop" now appears in your suggestions
- [ ] It's mixed in with defaults (alphabetically sorted)
- [ ] WhatNot appears in default suggestions

---

## Test 7: Quick Sell - Swipe Right (Pallet Detail)

### Steps
1. Go to a pallet with unsold items
2. Find an unsold item in the list
3. **Swipe RIGHT** on the item card

### Expected
- [ ] Green "SELL" button reveals on the right
- [ ] Tap "SELL" → bottom sheet modal opens
- [ ] Item name shown at top
- [ ] Sale price input pre-filled with listing price
- [ ] Profit/ROI preview shows
- [ ] Enter price, tap "Confirm Sale"
- [ ] Item marked as sold, list refreshes
- [ ] Sold items no longer show SELL swipe action

---

## Test 8: Quick Sell - Swipe Right (Items Tab)

### Steps
1. Go to **Items** tab
2. Find an unsold item
3. **Swipe RIGHT** on the item card

### Expected
- [ ] Green "SELL" button reveals
- [ ] Same quick sell modal as pallet detail
- [ ] Confirm sale works
- [ ] Item updates in list

---

## Test 9: Quick Delete - Swipe Left (Items Tab)

### Steps
1. Go to **Items** tab
2. Find any item (can be sold or unsold)
3. **Swipe LEFT** on the item card

### Expected
- [ ] Red "DELETE" button reveals on the left
- [ ] Tap "DELETE" → confirmation dialog appears
- [ ] Dialog shows item name and warns about permanent deletion
- [ ] Tap "Cancel" → dialog closes, item still exists
- [ ] Swipe left again, tap "Delete" → **item is permanently deleted**
- [ ] Item removed from list

---

## Test 10: Quick Delete - Swipe Left (Pallet Detail)

### Steps
1. Go to a pallet detail
2. **Swipe LEFT** on an item

### Expected
- [ ] Red "DELETE" button reveals
- [ ] Confirmation dialog appears
- [ ] Delete works, item removed from pallet
- [ ] Pallet metrics update (item count, profit)

---

## Test 11: Swipe Hints

### Steps
1. Look at Items tab header (when items exist)
2. Look at Pallet detail items section header

### Expected
- [ ] Hint shows: "← Delete | Sell →"
- [ ] Hint only appears when there are swipeable items

---

## Test 12: Item Search

### Steps
1. Go to **Items** tab (with multiple items)
2. Look for search bar below the subtitle
3. Type an item name (partial match)
4. Type a barcode (if any items have barcodes)
5. Type a storage location
6. Type a pallet name

### Expected
- [ ] Search bar visible when items exist
- [ ] Typing filters items in real-time
- [ ] Matches by: name, description, barcode, notes, location, pallet name
- [ ] Clear button (X) appears when searching
- [ ] Tap X → clears search, shows all items

---

## Test 13: Item Filter Chips

### Steps
1. Go to **Items** tab
2. Look for filter chips below search bar
3. Tap each chip: All, Listed, Sold, Unlisted

### Expected
- [ ] Filter chips visible when items exist
- [ ] Each chip shows count (e.g., "Listed (5)")
- [ ] Active chip is highlighted (different color)
- [ ] Tapping chip filters the list
- [ ] "All" shows all items
- [ ] "Listed" shows only listed items
- [ ] "Sold" shows only sold items
- [ ] "Unlisted" shows items that are neither listed nor sold

---

## Test 14: No Results State

### Steps
1. Go to **Items** tab
2. Search for something that doesn't exist: "xyznonexistent"
3. Or filter to a status with no items

### Expected
- [ ] "No items found" message appears
- [ ] Message shows what was searched
- [ ] "Clear filters" button appears
- [ ] Tap "Clear filters" → resets search and filter

---

## Test 15: Item Card Design (No Chevron)

### Steps
1. Look at item cards on Items tab
2. Look at item cards on Pallet detail

### Expected
- [ ] No chevron (arrow) icon on cards
- [ ] Storage location shows (if set) with map marker icon
- [ ] Cards still clearly tappable
- [ ] Clean, uncluttered design

---

## Test 16: Dashboard Updates After Sale

### Steps
1. Note current dashboard metrics
2. Go sell an item (any method)
3. Return to Dashboard

### Expected
- [ ] Total Profit updated
- [ ] Sold count increased by 1
- [ ] Values refresh on screen focus (no manual refresh needed)

---

## Test 17: Pallet Card Updates After Sale

### Steps
1. Note a pallet's displayed profit on Pallets tab
2. Go into that pallet, sell an item
3. Go back to Pallets tab

### Expected
- [ ] Pallet card profit updated
- [ ] Item count still correct
- [ ] ROI color reflects new profit state

---

## Test 18: Pull to Refresh

### Steps
1. On Dashboard, pull down
2. On Pallets tab, pull down
3. On Items tab, pull down

### Expected
- [ ] Each screen shows refresh indicator
- [ ] Data reloads
- [ ] Refresh completes without errors

---

## Summary Checklist

### Core Features
- [ ] Dashboard shows real metrics
- [ ] Pallet cards show real item count and profit
- [ ] Pallet detail shows accurate profit calculation
- [ ] Mark as Sold flow works completely
- [ ] Quick Sell (swipe right) works on both screens
- [ ] Quick Delete (swipe left) works with confirmation
- [ ] Status dropdown works

### Search & Filter
- [ ] Search filters by multiple fields
- [ ] Filter chips work correctly
- [ ] No results state displays properly

### UX Polish
- [ ] Swipe hints visible
- [ ] No chevrons on item cards
- [ ] Pull to refresh works everywhere
- [ ] Data syncs across screens

### Sales Channels
- [ ] WhatNot in default suggestions
- [ ] Custom channels learned from history

---

## Issues Found

| # | Description | Severity | Steps to Reproduce |
|---|-------------|----------|-------------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Notes

_Add any observations, suggestions, or feedback here:_

```




```

---

**Test Complete:** [ ] Pass / [ ] Fail
**Date:** _______________
**Signature:** _______________
