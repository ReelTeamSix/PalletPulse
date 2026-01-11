// Export all types
export * from './database';

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  'pallets/[id]': { id: string };
  'pallets/new': undefined;
  'items/[id]': { id: string };
  'items/new': { palletId?: string };
  modal: undefined;
};

// Form types
export interface PalletFormData {
  name: string;
  supplier: string;
  sourceType: string;
  purchaseCost: number;
  salesTax: number;
  purchaseDate: Date;
}

export interface ItemFormData {
  name: string;
  description?: string;
  quantity: number;
  condition: string;
  retailPrice?: number;
  listingPrice?: number;
  storageLocation?: string;
  sourceType?: string;
  sourceName?: string;
  purchaseCost?: number;
  barcode?: string;
}

export interface SaleFormData {
  salePrice: number;
  saleDate: Date;
  salesChannel: string;
  buyerNotes?: string;
}

export interface ExpenseFormData {
  amount: number;
  category: string;
  description?: string;
  expenseDate: Date;
  palletId?: string;
}

// Analytics types
export interface PalletProfit {
  palletId: string;
  palletName: string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number;
  itemsSold: number;
  itemsListed: number;
}

export interface DashboardMetrics {
  totalProfit: number;
  profitThisMonth: number;
  profitThisWeek: number;
  activeInventoryValue: number;
  itemsSoldThisMonth: number;
  averageDaysToSale: number;
  staleItemCount: number;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
