# Pallet Pro Development Rules

> **For AI Assistants:** Read this file before making any changes. These rules are mandatory.

---

## 🎯 Core Philosophy

**This is a "vibecoding" project** — AI-assisted development with human oversight. Follow these principles:

1. **Move fast, but don't break things** — Ship working code, not broken prototypes
2. **Small, atomic changes** — One feature/fix per commit, easy to review and revert
3. **Explain your reasoning** — Comments explain "why", not "what"
4. **Test as you go** — Don't accumulate technical debt
5. **Ask when uncertain** — Better to clarify than assume wrong
6. **Propose ideas, don't implement without approval** — When you discover optimizations, feature improvements, design changes, or new ideas while working, bring them to the human's attention for approval before implementing. Share your reasoning and wait for explicit approval.
7. **ALWAYS run linting after code changes** — Before committing, run `npm run lint` and fix any errors. This is mandatory, not optional.
8. **Prioritize reusable components** — Before creating new UI components, check `src/components/ui/` for existing reusable components. Reusability keeps the codebase clean and consistent. If a component could be reused elsewhere, extract it to the shared ui folder.

---

## 🔄 Git Workflow: Brown's 7 Steps

**ALWAYS follow this workflow for every task:**

### Step 1: Understand Before Acting
- Read the full task/issue before writing any code
- Identify affected files and potential side effects
- Ask clarifying questions if requirements are ambiguous

### Step 2: Create a Feature Branch
```bash
# Branch naming: type/short-description
git checkout -b feature/add-pallet-form
git checkout -b fix/photo-upload-crash
git checkout -b refactor/expense-tracking
```
**Branch types:** `feature/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`

### Step 3: Make Small, Focused Changes
- One logical change per commit
- If a task requires multiple files, group related changes
- Keep commits under 200 lines when possible
- **Never mix refactoring with new features in the same commit**

### Step 4: Test Your Changes
- Run the app and manually verify the change works
- Run existing tests: `npm test`
- Add new tests for new functionality
- Check for TypeScript errors: `npx tsc --noEmit`
- Check for lint errors: `npm run lint`

### Step 5: Write Clear Commit Messages
```bash
# Format: type(scope): description
git commit -m "feat(pallets): add pallet creation form with validation"
git commit -m "fix(photos): resolve crash when uploading large images"
git commit -m "refactor(api): extract Supabase client to shared module"
git commit -m "test(expenses): add unit tests for expense calculations"
git commit -m "docs(readme): update setup instructions"
```

**Commit types:**
| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't add feature or fix bug |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no code change) |
| `chore` | Updating dependencies, tooling |

### Step 6: Push and Create PR (If Collaborative)
```bash
git push origin feature/add-pallet-form
```
- PR title matches commit message format
- Include brief description of what changed and why
- Link to relevant issue/task if applicable

### Step 7: Review, Iterate, Merge
- Address review feedback in new commits (don't amend history)
- Squash merge to main when approved
- Delete feature branch after merge

---

## 📁 Project Structure

```
palletpulse/
├── app/                      # Expo Router pages (file-based routing)
│   ├── (tabs)/               # Tab navigator screens
│   │   ├── index.tsx         # Dashboard (home tab)
│   │   ├── pallets.tsx       # Pallets list
│   │   ├── items.tsx         # Items list
│   │   ├── analytics.tsx     # Analytics
│   │   └── settings.tsx      # Settings
│   ├── pallets/
│   │   ├── [id].tsx          # Pallet detail
│   │   └── new.tsx           # Add pallet form
│   ├── items/
│   │   ├── [id].tsx          # Item detail
│   │   └── new.tsx           # Add item form
│   ├── _layout.tsx           # Root layout
│   └── +not-found.tsx        # 404 page
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Primitive components (Button, Input, Card)
│   │   ├── forms/            # Form components (PalletForm, ItemForm)
│   │   └── layout/           # Layout components (Header, TabBar)
│   ├── features/             # Feature-specific code
│   │   ├── pallets/
│   │   │   ├── hooks/        # usePallets, usePalletDetail
│   │   │   ├── components/   # PalletCard, PalletList
│   │   │   └── utils/        # Pallet-specific helpers
│   │   ├── items/
│   │   ├── expenses/
│   │   ├── analytics/
│   │   └── auth/
│   ├── lib/                  # Shared utilities
│   │   ├── supabase.ts       # Supabase client
│   │   ├── storage.ts        # AsyncStorage helpers
│   │   └── api.ts            # API helpers
│   ├── stores/               # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── pallets-store.ts
│   │   ├── items-store.ts
│   │   └── settings-store.ts
│   ├── hooks/                # Shared hooks
│   │   ├── use-offline.ts
│   │   └── use-subscription.ts
│   ├── types/                # TypeScript types
│   │   ├── database.ts       # Supabase generated types
│   │   └── index.ts          # Shared types
│   └── constants/            # App constants
│       ├── colors.ts
│       ├── spacing.ts
│       └── tier-limits.ts
├── assets/                   # Static assets (images, fonts)
├── CLAUDE.md                 # This file
├── PALLETPULSE_ONESHOT_CONTEXT.md  # Project requirements
└── package.json
```

---

## 📝 Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | `PascalCase.tsx` | `PalletCard.tsx` |
| Hooks | `use-kebab-case.ts` | `use-pallets.ts` |
| Stores | `kebab-case-store.ts` | `pallets-store.ts` |
| Utils/Lib | `kebab-case.ts` | `format-currency.ts` |
| Types | `kebab-case.ts` | `database.ts` |
| Constants | `kebab-case.ts` | `tier-limits.ts` |

### Code
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PalletCard` |
| Hooks | camelCase with `use` prefix | `usePallets` |
| Functions | camelCase | `calculateProfit` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PHOTOS_FREE_TIER` |
| Types/Interfaces | PascalCase | `Pallet`, `PalletFormData` |
| Zustand stores | camelCase with `use` prefix | `usePalletsStore` |

---

## ⚛️ Component Patterns

### Functional Components Only
```tsx
// ✅ Good
export function PalletCard({ pallet }: PalletCardProps) {
  return <View>...</View>;
}

// ❌ Bad - no class components
class PalletCard extends Component { ... }
```

### Props Interface Naming
```tsx
// ✅ Good - ComponentNameProps
interface PalletCardProps {
  pallet: Pallet;
  onPress?: () => void;
}

// ❌ Bad
interface Props { ... }
interface IPalletCardProps { ... }
```

### No Inline Styles
```tsx
// ✅ Good - use StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
  },
});

// ❌ Bad - inline styles
<View style={{ padding: 16, backgroundColor: '#fff' }}>
```

### Destructure Props
```tsx
// ✅ Good
export function PalletCard({ pallet, onPress }: PalletCardProps) {
  return ...;
}

// ❌ Bad
export function PalletCard(props: PalletCardProps) {
  return <Text>{props.pallet.name}</Text>;
}
```

### Component Reusability - IMPORTANT

**Before creating ANY new component, check for existing reusable components:**

1. **Check `src/components/ui/`** for shared primitives (Button, Card, Input, Badge, SettingRow, etc.)
2. **Check `src/components/`** for layout and form components
3. **Check feature folders** for domain-specific components that could be generalized

**When to extract to shared components:**
- Component is used (or could be used) in 2+ places
- Component handles common UI patterns (cards, rows, badges, toggles)
- Component could benefit other features with minor modifications

**Shared UI Components Available:**
| Component | Location | Use For |
|-----------|----------|---------|
| `Button` | `ui/Button` | All buttons |
| `Card` | `ui/Card` | Elevated card containers |
| `Input` | `ui/Input` | Text inputs |
| `Badge` | `ui/Badge` | Status/tier badges |
| `SettingRow` | `ui/SettingRow` | Settings list rows with icons |
| `ToggleRow` | `ui/SettingRow` | Settings rows with switches |
| `SectionHeader` | `ui/SectionHeader` | Section titles |
| `ConfirmationModal` | `ui/ConfirmationModal` | Confirm dialogs |
| `PhotoPicker` | `ui/PhotoPicker` | Image selection |
| `ProgressBar` | `ui/ProgressBar` | Progress indicators |

```tsx
// ✅ Good - Use existing shared components
import { SettingRow, ToggleRow, Badge } from '@/src/components/ui';

<SettingRow icon="time" label="Threshold" value="30 days" onPress={handlePress} />
<ToggleRow icon="wallet" label="Enable Feature" value={enabled} onValueChange={setEnabled} />

// ❌ Bad - Creating duplicate local components
function MySettingRow({ label, value }) { ... } // Already exists!
```

---

## 🗄️ State Management

### When to Use What

| State Type | When to Use |
|------------|-------------|
| **useState** | UI-only state (modals, form inputs, loading) |
| **Zustand store** | Shared state across components (pallets, items, user) |
| **React Query/SWR** | Server state with caching (optional, can use Zustand) |

### Zustand Store Pattern
```typescript
// src/stores/pallets-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PalletsState {
  pallets: Pallet[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPallets: () => Promise<void>;
  addPallet: (pallet: Omit<Pallet, 'id'>) => Promise<void>;
  updatePallet: (id: string, updates: Partial<Pallet>) => Promise<void>;
  deletePallet: (id: string) => Promise<void>;
}

export const usePalletsStore = create<PalletsState>()(
  persist(
    (set, get) => ({
      pallets: [],
      isLoading: false,
      error: null,

      fetchPallets: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('pallets')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ pallets: data, isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      // ... other actions
    }),
    {
      name: 'pallets-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## 🔌 API & Supabase Patterns

### Supabase Client Setup
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Always Handle Errors
```typescript
// ✅ Good
const { data, error } = await supabase.from('pallets').select('*');
if (error) {
  console.error('Failed to fetch pallets:', error);
  throw new Error('Could not load pallets. Please try again.');
}
return data;

// ❌ Bad - no error handling
const { data } = await supabase.from('pallets').select('*');
return data;
```

### RLS-Aware Queries
```typescript
// User data is automatically filtered by RLS, but be explicit in comments
// Note: RLS filters by auth.uid() = user_id
const { data } = await supabase
  .from('pallets')
  .select('*')
  .order('created_at', { ascending: false });
```

---

## 🧪 Testing Requirements

> **NO SHORTCUTS.** Every feature must be tested. Tests must be meaningful, not just for coverage numbers.

### Testing Philosophy

1. **Test behavior, not implementation** — Tests should verify what the code does, not how
2. **Tests are documentation** — A new developer should understand the feature by reading tests
3. **Fail fast, fail clearly** — Tests should catch bugs early with clear error messages
4. **No flaky tests** — If a test sometimes fails, fix it or delete it
5. **Tests enable refactoring** — Good tests give confidence to improve code

### Mandatory Unit Tests

**These MUST have unit tests before a phase is complete:**

| Category | What to Test | Example |
|----------|--------------|---------|
| **Business Logic** | Profit calculations, cost allocation, ROI | `calculatePalletProfit(pallet, items, expenses)` |
| **Validation** | Zod schemas, form rules | `palletFormSchema.parse(invalidData)` throws |
| **Tier Limits** | Photo limits, pallet limits, item limits | `canAddPhoto(tier, currentCount)` returns false at limit |
| **Data Transformations** | Formatters, parsers, mappers | `formatCurrency(1234.5)` returns "$1,234.50" |
| **Store Actions** | Zustand actions (mock Supabase) | `addPallet()` adds to store and calls API |
| **Edge Cases** | Nulls, empty arrays, boundaries | `calculateProfit([])` returns 0, not NaN |

### Test Coverage Requirements

| Type | Minimum Coverage | Notes |
|------|------------------|-------|
| **Utility functions** | 100% | No exceptions |
| **Business logic** | 100% | Profit, cost, analytics calculations |
| **Form validation** | 100% | All schemas, all error cases |
| **Store actions** | 80%+ | All happy paths, key error paths |
| **Components** | 50%+ | Focus on interactive behavior |

### Test File Structure

```
src/features/pallets/
├── utils/
│   ├── calculate-profit.ts
│   ├── calculate-profit.test.ts     # Unit tests for profit logic
│   └── __fixtures__/                # Test data
│       └── mock-pallets.ts
├── hooks/
│   ├── use-pallets.ts
│   └── use-pallets.test.ts          # Hook tests with mocked Supabase
├── components/
│   ├── PalletCard.tsx
│   └── PalletCard.test.tsx          # Component interaction tests
└── schemas/
    ├── pallet-form.schema.ts
    └── pallet-form.schema.test.ts   # Validation tests
```

### Test Naming Convention

```typescript
describe('[FunctionName/ComponentName]', () => {
  describe('[method or scenario]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw [ErrorType] when [invalid condition]', () => {
      expect(() => functionUnderTest(badInput)).toThrow(ErrorType);
    });
  });
});
```

### Example: Profit Calculation Tests

```typescript
// calculate-profit.test.ts
import { calculatePalletProfit, calculateItemProfit, allocateCosts } from './calculate-profit';
import { mockPallet, mockItems, mockExpenses } from './__fixtures__/mock-data';

describe('calculatePalletProfit', () => {
  describe('basic calculation', () => {
    it('should return total revenue minus costs for sold items', () => {
      const pallet = { ...mockPallet, purchase_cost: 500 };
      const items = [
        { ...mockItems[0], sale_price: 100, status: 'sold' },
        { ...mockItems[1], sale_price: 150, status: 'sold' },
      ];
      
      const result = calculatePalletProfit(pallet, items, []);
      
      expect(result.totalRevenue).toBe(250);
      expect(result.totalCost).toBe(500);
      expect(result.netProfit).toBe(-250);
      expect(result.roi).toBe(-50); // -50%
    });

    it('should include pallet-specific expenses in calculation', () => {
      const pallet = { ...mockPallet, purchase_cost: 500 };
      const items = [{ ...mockItems[0], sale_price: 800, status: 'sold' }];
      const expenses = [{ amount: 50, pallet_id: pallet.id }];
      
      const result = calculatePalletProfit(pallet, items, expenses);
      
      expect(result.totalCost).toBe(550); // 500 + 50
      expect(result.netProfit).toBe(250); // 800 - 550
    });
  });

  describe('edge cases', () => {
    it('should return zero profit for pallet with no items', () => {
      const result = calculatePalletProfit(mockPallet, [], []);
      
      expect(result.netProfit).toBe(-mockPallet.purchase_cost);
    });

    it('should handle items with null sale_price (unsold)', () => {
      const items = [{ ...mockItems[0], sale_price: null, status: 'listed' }];
      
      const result = calculatePalletProfit(mockPallet, items, []);
      
      expect(result.totalRevenue).toBe(0);
    });

    it('should exclude unsellable items from cost allocation by default', () => {
      const pallet = { ...mockPallet, purchase_cost: 100 };
      const items = [
        { ...mockItems[0], condition: 'new' },
        { ...mockItems[1], condition: 'unsellable' },
      ];
      
      const allocated = allocateCosts(pallet, items, { includeUnsellable: false });
      
      expect(allocated[0].allocated_cost).toBe(100); // Full cost to sellable item
      expect(allocated[1].allocated_cost).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw if pallet is null', () => {
      expect(() => calculatePalletProfit(null, [], [])).toThrow('Pallet is required');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- calculate-profit.test.ts
```

**Note for AI Assistants:** In this Windows development environment, npm is not in PATH by default. Add nodejs to PATH before running npm commands:
```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm test
```

### Pre-Commit Test Requirements

**Before committing ANY code:**

- [ ] All existing tests pass: `npm test`
- [ ] New code has corresponding tests
- [ ] No test warnings or skipped tests (unless documented)
- [ ] Coverage hasn't decreased

---

## 🔬 Detailed Phase Test Plans

**Each checkpoint requires BOTH automated tests AND manual human verification.**

### Phase 1: Project Setup

**Automated Tests:** N/A (no business logic yet)

**Human Verification:**
1. Run `npx expo start` — app launches without errors
2. Open on iOS simulator — renders welcome screen
3. Open on Android emulator — renders welcome screen
4. Open on physical device (if available) — renders welcome screen
5. Verify folder structure matches CLAUDE.md specification
6. Verify all dependencies installed: `npm ls` shows no missing deps

---

### Phase 2: Authentication

**Automated Tests Required:**
- [ ] Auth store actions (login, logout, signup)
- [ ] Session persistence logic
- [ ] Form validation (email format, password requirements)
- [ ] Error handling (invalid credentials, network errors)

**Human Verification:**
1. **Signup flow:**
   - Enter valid email + password → account created, verification email sent
   - Enter invalid email → shows validation error
   - Enter weak password → shows password requirements
   - Enter existing email → shows "account exists" error
2. **Login flow:**
   - Enter valid credentials → navigates to dashboard
   - Enter wrong password → shows "invalid credentials"
   - Enter non-existent email → shows appropriate error
3. **Session persistence:**
   - Login, close app, reopen → still logged in
   - Login, force-quit app, reopen → still logged in
4. **Logout:**
   - Tap logout → returns to login screen
   - After logout, reopen app → shows login screen
5. **Password reset:**
   - Request reset for valid email → email sent confirmation
   - Click reset link → can set new password
   - Login with new password → success

---

### Phase 3: Database & Data Layer

**Automated Tests Required:**
- [ ] Zustand store initialization
- [ ] Store action: fetch data (mock Supabase responses)
- [ ] Store action: create/update/delete (mock Supabase)
- [ ] RLS policy logic (test queries return only user's data)
- [ ] TypeScript types match schema

**Human Verification:**
1. Open Supabase dashboard → all tables created with correct columns
2. Check RLS policies → enabled on all tables
3. Create test data via Supabase UI → data appears correctly
4. Run app, verify data loads → no errors in console
5. Check TypeScript types → no type errors in IDE

---

### Phase 4: Core Navigation

**Automated Tests Required:**
- [ ] Deep link parsing (if applicable)
- [ ] Navigation state persistence (if applicable)

**Human Verification:**
1. **Tab navigation:**
   - Tap each tab → correct screen loads
   - Tab indicator shows current screen
   - Scroll position preserved when switching tabs
2. **Stack navigation:**
   - Navigate to detail screen → screen animates in
   - Press back → returns to previous screen
   - Hardware back button (Android) → correct behavior
3. **Deep linking (if implemented):**
   - Open deep link → correct screen loads
4. **Screen shells:**
   - Each screen shows placeholder content
   - No blank screens or crashes

---

### Phase 5: Pallet Management

**Automated Tests Required:**
- [ ] `createPallet()` - creates with all required fields
- [ ] `updatePallet()` - updates only specified fields
- [ ] `deletePallet()` - removes from store and calls API
- [ ] `fetchPallets()` - handles empty list, populated list, errors
- [ ] Pallet form validation schema
- [ ] Cost split calculation (when buying multiple pallets)

**Human Verification:**
1. **View pallets list:**
   - Empty state shows "No pallets yet" message
   - With pallets, shows cards with name, supplier, cost, profit
   - Pull to refresh → data reloads
   - Cards sorted by date (newest first)
2. **Create pallet:**
   - Tap "Add Pallet" → form opens
   - Enter all fields → saves successfully
   - Skip required field → shows validation error
   - Enter invalid cost (negative, letters) → shows error
   - After save → appears in list immediately
3. **View pallet detail:**
   - Tap pallet card → detail screen opens
   - Shows: name, supplier, cost, date, item count, profit
   - Shows list of items (empty if new pallet)
4. **Edit pallet:**
   - Tap edit → form pre-filled with data
   - Change fields → saves correctly
   - Changes reflected in list and detail
5. **Delete pallet:**
   - Tap delete → confirmation dialog
   - Confirm → pallet removed from list
   - Cancel → pallet still exists
   - pallet with items → warning about deleting items too

---

### Phase 6: Item Management

**Automated Tests Required:**
- [ ] `createItem()` - with pallet_id (pallet item), without (individual)
- [ ] `updateItem()` - all field types
- [ ] `deleteItem()` - removes from store and storage
- [ ] Item form validation schema
- [ ] Photo upload logic (mock storage)
- [ ] Tier limit checking (`canUploadPhoto`, `canAddItem`)
- [ ] Source type handling (pallet, thrift, garage_sale, etc.)

**Human Verification:**
1. **Add item to pallet:**
   - From pallet detail, tap "Add Item" → form opens
   - pallet_id pre-selected
   - Fill all fields → saves to that pallet
   - Item appears in pallet's item list
2. **Add individual item (non-pallet):**
   - From Items tab, tap "Add Item" → form opens
   - Select source type (thrift, garage sale, etc.)
   - Enter purchase_cost → saves correctly
   - Item appears in Items list, not in any pallet
3. **Photo upload:**
   - Tap add photo → camera/gallery picker opens
   - Take photo → appears in form
   - Add max photos for tier → "upgrade" prompt at limit
   - Photos compressed (check file size < 500KB)
   - Photos persist after form save
4. **Item conditions:**
   - Each condition option selectable
   - "Unsellable" excludes from profit calculation
5. **Barcode scanning:**
   - Tap barcode icon → scanner opens
   - Scan valid barcode → populates barcode field
   - Invalid scan → shows error/retry
6. **Edit/Delete item:**
   - Edit → form pre-filled, saves changes
   - Delete → confirmation, removes from list

---

### Phase 7: Sales & Profit

**Automated Tests Required:**
- [ ] `calculateItemProfit(item)` - all scenarios
- [ ] `calculatePalletProfit(pallet, items, expenses)` - all scenarios
- [ ] `allocateCosts(pallet, items, settings)` - include/exclude unsellable
- [ ] `markAsSold(item, saleData)` - updates status, records sale
- [ ] ROI calculation
- [ ] Edge cases: zero items, all unsold, negative profit

**Human Verification:**
1. **Mark item as sold:**
   - From item detail, tap "Mark Sold" → sale form opens
   - Enter sale price, date, channel → item status changes to "Sold"
   - Sale price pre-fills with listing price
   - Can enter lower price (negotiated)
2. **Profit calculation:**
   - View pallet with sold items → profit shown correctly
   - Profit = total sales - allocated cost - expenses
   - Manually verify math is correct with calculator
3. **Cost allocation:**
   - Pallet with 4 items @ $100 cost → each item has $25 allocated
   - Mark 1 item unsellable with "exclude" setting → remaining 3 items get $33.33 each
   - Toggle setting → recalculates correctly
4. **ROI display:**
   - Pallet bought for $100, sold items for $180 → shows 80% ROI
   - Negative ROI (loss) shows in red
5. **Item profit:**
   - Each sold item shows its profit (sale - allocated cost)
   - Individual items show profit = sale - purchase_cost

---

### Phase 8: Expenses

**Automated Tests Required:**
- [ ] `createExpense()` - with and without pallet link
- [ ] `updateExpense()` - all fields
- [ ] `deleteExpense()` - removes from store
- [ ] Expense impact on pallet profit
- [ ] Expense form validation
- [ ] Category enum handling

**Human Verification:**
1. **Add expense:**
   - Tap "Add Expense" → form opens
   - Enter amount, category, description, date → saves
   - Optionally link to pallet → appears in pallet expenses
2. **Receipt photo:**
   - Add photo → saves with expense
   - View expense → can see receipt photo
3. **Expense categories:**
   - All categories available: Supplies, Gas, Storage, Fees, Other
   - Category displays correctly in list
4. **Expense impact:**
   - Add $50 expense to pallet → pallet profit decreases by $50
   - Delete expense → profit recalculates
5. **Expense list:**
   - View all expenses → shows list with date, amount, category
   - Filter by category (if implemented)
   - Sort by date

---

### Phase 9: Analytics

**Automated Tests Required:**
- [ ] Dashboard metric calculations
- [ ] "Items sold this month" query logic
- [ ] "Stale inventory" detection (items > threshold days unsold)
- [ ] "Profit by pallet" aggregation
- [ ] "Profit by source" grouping
- [ ] Date range filtering
- [ ] CSV export data formatting

**Human Verification:**
1. **Dashboard metrics:**
   - Total profit → matches sum of all profits (verify with manual math)
   - Items sold this month → correct count
   - Active inventory value → sum of unsold item costs
2. **Stale inventory:**
   - Items listed > 30 days ago unsold → appear in stale list
   - Change threshold in settings → list updates
3. **Profit by pallet:**
   - Table shows each pallet with revenue, cost, profit, ROI
   - Sorting works (by profit, by ROI, by date)
4. **Profit by source:**
   - Compares pallet items vs. individual sources
   - Shows: revenue, count, avg profit per item
5. **Charts (if implemented):**
   - Profit trend over time → line chart renders
   - Data accurate for selected date range
6. **CSV export:**
   - Tap export → file downloads
   - Open CSV → contains all columns, data matches app
   - No missing rows or corrupt data

---

### Phase 10: Subscription

**Automated Tests Required:**
- [ ] `checkTierLimit(tier, limitType, currentCount)` - all limits
- [ ] `canPerformAction(action, userTier)` - returns boolean
- [ ] Tier feature flags
- [ ] Upgrade/downgrade state handling
- [ ] Affiliate code validation

**Human Verification:**
1. **Free tier limits:**
   - Add 1 pallet → success
   - Add 2nd pallet → blocked with upgrade prompt
   - Add 20 items → success
   - Add 21st item → blocked with upgrade prompt
   - Add 2nd photo to item → blocked with upgrade prompt
2. **Upgrade flow:**
   - Tap upgrade → RevenueCat paywall appears
   - Complete purchase (sandbox) → tier updates
   - Limits now reflect new tier
3. **Affiliate code:**
   - Enter valid code at signup → discount applied
   - Enter invalid code → error message
   - Affiliate dashboard shows referral (if affiliate tests)
4. **Downgrade (if applicable):**
   - Downgrade tier → warning about data
   - Over-limit data becomes read-only
   - Can still mark items as sold or delete

---

### Phase 11: Polish

**Automated Tests Required:**
- [ ] Offline queue logic
- [ ] Sync conflict resolution
- [ ] Error message mapping
- [ ] Loading state management

**Human Verification:**
1. **Offline mode:**
   - Enable airplane mode
   - Add pallet → saves locally
   - Add item → saves locally
   - See "Offline - X pending" indicator
   - Disable airplane mode → data syncs
   - Verify synced data in Supabase dashboard
2. **Error handling:**
   - No network → user-friendly error, not crash
   - API error → shows actionable message
   - Retry button works
3. **Loading states:**
   - Slow network → loading spinner shows
   - No blank screens while loading
   - Skeleton loaders (if implemented)
4. **Notifications:**
   - App correctly requests notification permission
   - Test notification received (if testable)
5. **Edge cases:**
   - Very long pallet/item names → truncated properly
   - Many items (100+) → list scrolls smoothly
   - Many pallets → performance acceptable
6. **Full end-to-end:**
   - Complete full workflow: signup → add pallet → add items → sell → view profit
   - No crashes, all data persists



## 🎨 UI & Styling

### Design System Overview

Pallet Pro uses a modern design system with elevated white cards on light gray backgrounds, consistent shadows, and a polished professional feel.

**Key Principles:**
- Light gray backgrounds (`#F8FAFC`) with white elevated cards
- Consistent shadow system for depth
- **NO EMOJIS** - Ionicons throughout the entire app
- Bold typography with clear hierarchy

---

### Icons - MANDATORY

**ALWAYS use Ionicons. NEVER use emojis or other icon libraries.**

```tsx
// ✅ CORRECT - Use Ionicons
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="wallet-outline" size={24} color={colors.primary} />

// ❌ WRONG - Never use emojis
<Text>💰</Text>

// ❌ WRONG - Never use FontAwesome or other libraries
import { FontAwesome } from '@expo/vector-icons';
```

**Icon Container Pattern:**
```tsx
// Wrap icons in styled containers for consistency
<View style={styles.iconContainer}>
  <Ionicons name="analytics-outline" size={20} color={colors.primary} />
</View>

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

### Color System (Updated)

```typescript
// src/constants/colors.ts - CURRENT VALUES
export const colors = {
  // Semantic - Business Metrics
  profit: '#22C55E',      // Modern green - positive profit, success
  loss: '#EF4444',        // Modern red - negative profit, errors
  warning: '#F59E0B',     // Amber - actionable items, stale inventory
  neutral: '#9E9E9E',     // Grey - inactive, unsold

  // Primary Brand
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',

  // Backgrounds
  background: '#FFFFFF',           // Cards, modals
  backgroundSecondary: '#F8FAFC',  // Screen backgrounds (light gray)
  surface: '#F5F5F5',              // Input fields, secondary containers
  card: '#FFFFFF',                 // White cards on gray background

  // Text
  textPrimary: '#1E293B',   // Dark slate for readability
  textSecondary: '#64748B', // Slate gray
  textDisabled: '#9E9E9E',

  // Borders
  border: '#E2E8F0',  // Light border

  // Status Colors
  statusUnprocessed: '#9E9E9E',
  statusListed: '#2563EB',
  statusSold: '#22C55E',
  statusStale: '#F59E0B',
};
```

---

### Background Usage

| Context | Color | Hex |
|---------|-------|-----|
| Screen backgrounds | `colors.backgroundSecondary` | `#F8FAFC` |
| Cards & Modals | `colors.background` | `#FFFFFF` |
| Input fields | `colors.surface` | `#F5F5F5` |

```tsx
// ✅ Screen container
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});

// ✅ Card on screen
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
});
```

---

### Shadow System

```typescript
// src/constants/shadows.ts
export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 4 },
};

// Usage
import { shadows } from '@/src/constants/shadows';
const styles = StyleSheet.create({
  card: {
    ...shadows.md,
    backgroundColor: colors.background,
  },
});
```

---

### Button Placement - Fixed Footer Pattern

**All form screens MUST have buttons in a fixed footer outside the ScrollView.**

```tsx
// ✅ CORRECT - Fixed footer buttons
export function MyForm() {
  return (
    <KeyboardAvoidingView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Form fields here */}
      </ScrollView>

      {/* Fixed Footer - OUTSIDE ScrollView */}
      <View style={styles.footer}>
        <Button title="Cancel" variant="outline" style={styles.button} />
        <Button title="Save" style={styles.button} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: { flex: 1 },
});
```

---

### Spacing Constants

```typescript
// src/constants/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
```

**Always use constants, never magic numbers:**
```tsx
// ✅ Good
const styles = StyleSheet.create({
  container: { padding: spacing.md },
  card: { borderRadius: borderRadius.lg },
});

// ❌ Bad - magic numbers
const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { borderRadius: 12 },
});
```

---

### Typography

```typescript
// src/constants/typography.ts
export const typography = {
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};
```

| Element | Style |
|---------|-------|
| Screen titles | `typography.screenTitle` or `fontSize.xxl` + `fontWeight.bold` |
| Section headers | `typography.sectionHeader` (uppercase, small) |
| Body text | `fontSize.md` + `colors.textPrimary` |
| Subtitles | `fontSize.md` + `colors.textSecondary` |
| Labels | `fontSize.sm` + `colors.textSecondary` |

---

### Semantic Color Usage

| Purpose | Color | Example |
|---------|-------|---------|
| Profit / Success | `colors.profit` | Sale price, positive ROI |
| Loss / Error | `colors.loss` | Negative profit, validation errors |
| Warning | `colors.warning` | Stale inventory |
| Primary actions | `colors.primary` | Buttons, links |
| Neutral / Inactive | `colors.neutral` | Disabled states |

---

### Modals

Use `ConfirmationModal` instead of `Alert.alert` for all confirmations:

```tsx
import { ConfirmationModal } from '@/src/components/ui';

<ConfirmationModal
  visible={visible}
  type="delete"  // 'delete' | 'warning' | 'success' | 'info'
  title="Delete Item?"
  message="This action cannot be undone."
  primaryLabel="Delete"
  secondaryLabel="Cancel"
  onPrimary={handleDelete}
  onClose={() => setVisible(false)}
/>
```

---

## 🔐 Environment Variables

### Required Variables
```bash
# .env.local (do not commit)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_SENTRY_DSN=xxx
EXPO_PUBLIC_OPENAI_API_KEY=xxx  # For AI descriptions
```

### Accessing in Code
```typescript
// Always use EXPO_PUBLIC_ prefix for client-side vars
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Never expose server-only secrets to client
// ❌ process.env.SUPABASE_SERVICE_ROLE_KEY  // This should only be in Edge Functions
```

---

## 🚫 Never Do This

1. **Never commit `.env` files** — Use `.env.example` for templates
2. **Never store secrets in code** — Use environment variables
3. **Never skip TypeScript errors** — Fix them, don't use `@ts-ignore`
4. **Never use `any` type** — Use `unknown` and narrow, or define proper types
5. **Never mutate state directly** — Use Zustand/setState
6. **Never mix concerns** — Keep API calls in stores/hooks, not components
7. **Never commit `console.log`** — Use proper error handling or remove
8. **Never push to main directly** — Always use feature branches
9. **Never skip the lint check** — Run `npm run lint` before committing
10. **Never leave TODO comments unchecked** — Track in issues instead

---

## ✅ Always Do This

1. **Always run TypeScript check** before committing: `npx tsc --noEmit`
2. **Always run linter** before committing: `npm run lint`
3. **Always test on device** before marking complete (not just simulator)
4. **Always use semantic commit messages** 
5. **Always create feature branches**
6. **Always handle loading and error states** in UI
7. **Always use constants for colors, spacing, limits**
8. **Always write self-documenting code** with clear variable names
9. **Always check tier limits** before allowing actions (photos, pallets, items)
10. **Always consider offline mode** — queue changes for sync

---

## 📋 Pre-Commit Checklist

Before every commit, verify:

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Linter passes: `npm run lint`
- [ ] App runs without crashes
- [ ] New feature works as expected
- [ ] No `console.log` statements left
- [ ] No hardcoded values (use constants)
- [ ] Commit message follows format
- [ ] Branch name follows convention

---

## 🔒 Security Audits

**Run security checks periodically, especially after database changes.**

### When to Run Security Audits

| Trigger | Action |
|---------|--------|
| After any migration | Run Supabase security advisor |
| After adding/modifying RLS policies | Verify policies work correctly |
| After adding new tables | Confirm RLS is enabled with policies |
| After modifying functions/triggers | Check for search_path warnings |
| End of each phase | Full security review |

### How to Run (via Supabase MCP)

```
# Check for security issues
mcp__supabase__get_advisors(project_id, type: "security")

# Verify RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

# Check for performance issues
mcp__supabase__get_advisors(project_id, type: "performance")
```

### Common Issues to Watch For

1. **RLS Enabled No Policy** — Table has RLS but no policies (data inaccessible)
2. **Function Search Path Mutable** — Functions need `SET search_path = public`
3. **Missing RLS** — New tables must have RLS enabled
4. **Overly Permissive Policies** — Policies should scope to `auth.uid()`

### Fix Template for Function Search Path

```sql
CREATE OR REPLACE FUNCTION public.function_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Add this line
AS $$
BEGIN
  -- function body
END;
$$;
```

---

## 🆘 When Stuck

1. **Read the error message carefully** — React Native errors are verbose but helpful
2. **Check the one-shot context document** — `PALLETPULSE_ONESHOT_CONTEXT.md`
3. **Search Expo/React Native docs** — Most issues are documented
4. **Check Supabase dashboard** — Verify data and RLS policies
5. **Ask for clarification** — Better to ask than assume wrong

---

## 🤖 Autonomous Workflow

**This section defines how AI should work autonomously while maintaining human oversight.**

### Development Phases & Checkpoints

Work is divided into phases. **STOP after each phase** and wait for human approval before continuing.

**⚠️ BOTH automated tests AND manual human verification are REQUIRED before a phase is approved.**

Refer to the **🔬 Detailed Phase Test Plans** section for complete test requirements per phase.

| Phase | Deliverables | Unit Tests Required | Human Tests |
|-------|--------------|---------------------|-------------|
| **1. Project Setup** | Expo project, deps, folder structure | N/A | App runs, structure verified |
| **2. Authentication** | Signup, login, logout, reset | Auth store, validation, errors | Full auth flow on device |
| **3. Database & Data Layer** | Schema, RLS, stores, types | Store actions (mocked) | Schema review in Supabase |
| **4. Core Navigation** | Tab nav, screen shells, routing | Deep links (if applicable) | All navigation paths work |
| **5. Pallet Management** | Pallet CRUD | All CRUD actions, validation | Create, edit, delete pallets |
| **6. Item Management** | Item CRUD, photos | CRUD, photos, tier limits | Items with photos, limits |
| **7. Sales & Profit** | Mark sold, calculations | Profit, ROI, cost allocation | Verify math with calculator |
| **8. Expenses** | Expense CRUD, receipts | CRUD, profit impact | Add expense, verify impact |
| **9. Analytics** | Dashboard, reports, export | All calculations, formatting | Verify totals, export CSV |
| **10. Subscription** | RevenueCat, limits, upgrade | Tier limits, feature flags | Test limits, upgrade flow |
| **11. Polish** | Offline, notifications, errors | Queue logic, error mapping | Full e2e workflow |

### Phase Completion Checklist

**Before marking a phase complete, verify:**

- [ ] All automated tests pass: `npm test`
- [ ] New tests written for all new functionality  
- [ ] Test coverage hasn't decreased
- [ ] Human verification steps completed (see 🔬 Detailed Phase Test Plans)
- [ ] No console errors or warnings
- [ ] PROGRESS.md updated with test results

### Progress Tracking

**Create and maintain `PROGRESS.md`** in the project root:

```markdown
# Pallet Pro Development Progress

## Current Phase: [Phase Name]
**Status:** [In Progress / Awaiting Review / Approved]
**Branch:** [current-branch-name]

## Completed Phases
- [x] Phase 1: Project Setup (approved 2024-01-15)
- [x] Phase 2: Authentication (approved 2024-01-16)
- [ ] Phase 3: Database & Data Layer (in progress)

## Current Tasks
- [x] Create Supabase project
- [x] Define database schema
- [ ] Write RLS policies
- [ ] Generate TypeScript types

## Blockers / Questions for Human
1. Should `expenses` table include mileage as a separate field or just in description?

## Next Steps (After Approval)
- Begin Phase 4: Core Navigation
```

### When to STOP and Ask Human

**Always pause for human input when:**

1. **Phase completion** — Never start a new phase without approval
2. **Architecture decisions** — Major structural choices not in the context doc
3. **Third-party services** — Before integrating any service not specified
4. **Database schema changes** — After initial schema is approved
5. **Breaking changes** — Anything that would require rework of completed phases
6. **Uncertainty** — When requirements are ambiguous
7. **Test failures** — When tests fail and cause is unclear
8. **Cost implications** — Any decision that affects hosting/API costs

### When to Continue Autonomously

**Keep working without asking when:**

1. **Within a phase** — Continue tasks within the current approved phase
2. **Bug fixes** — Fix bugs discovered during development
3. **Refactoring** — Improve code quality without changing behavior
4. **Following patterns** — Applying established patterns to new features
5. **Documentation** — Updating comments, README, PROGRESS.md

### Human Interaction Format

When pausing for human review, provide:

```markdown
## 🛑 Checkpoint: [Phase Name] Complete

### What Was Done
- Created X, Y, Z
- Implemented A, B, C
- Tests passing: X/Y

### How to Test
1. Run `npx expo start`
2. Open on device/simulator
3. Try [specific actions]

### Key Decisions Made
- Chose X approach because Y
- Used Z library for [reason]

### Questions / Needs Clarification
1. [Specific question]?

### Ready for Next Phase
Once approved, I will begin Phase [N]: [Name], which includes:
- Task 1
- Task 2
- Task 3

**Reply "approved" to continue, or provide feedback.**
```

### Error Recovery

If something goes wrong:

1. **Don't panic** — Git allows recovery
2. **Identify the breaking commit** — Use `git log` to find it
3. **Create a fix branch** — Don't fix on the broken branch
4. **Inform human** — Explain what happened and the fix plan
5. **Get approval** — Before merging the fix

```bash
# If a phase breaks something
git checkout main
git checkout -b fix/phase-3-schema-fix
# Make fixes
git commit -m "fix(db): correct RLS policy syntax"
# Wait for human approval before merging
```

---

## 📋 Pre-Phase Checklist

Before starting any phase:

- [ ] Previous phase is approved by human
- [ ] Previous phase branch is merged to main (all changes committed first)
- [ ] PROGRESS.md is updated
- [ ] New feature branch created from main (not from previous phase branch)
- [ ] No uncommitted changes from previous work
- [ ] Context document re-read for relevant sections

---

**Remember: Quality over speed. A working feature tomorrow beats a broken feature today.**
