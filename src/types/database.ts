// Supabase Database Types - Auto-generated from schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Enum types
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type PalletStatus = 'unprocessed' | 'processing' | 'completed'
export type ItemCondition = 'new' | 'open_box' | 'used_good' | 'used_fair' | 'damaged' | 'for_parts' | 'unsellable'
export type ItemStatus = 'unlisted' | 'listed' | 'sold'
export type SourceType = 'pallet' | 'thrift' | 'garage_sale' | 'retail_arbitrage' | 'mystery_box' | 'other'
export type ExpenseCategory = 'supplies' | 'gas' | 'mileage' | 'storage' | 'fees' | 'shipping' | 'other'
export type NotificationType = 'stale_inventory' | 'pallet_milestone' | 'weekly_summary' | 'subscription_reminder' | 'limit_warning' | 'system'
export type BillingCycle = 'monthly' | 'annual'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PayoutMethod = 'stripe' | 'paypal'

// Table types
export interface Profile {
  id: string
  email: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  affiliate_code: string | null
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  stale_threshold_days: number
  storage_locations: Json
  default_sales_tax_rate: number | null
  mileage_rate: number
  include_unsellable_in_cost: boolean
  notification_stale_inventory: boolean
  notification_weekly_summary: boolean
  notification_pallet_milestones: boolean
  email_weekly_summary: boolean
  email_stale_digest: boolean
  email_monthly_report: boolean
  created_at: string
  updated_at: string
}

export interface Pallet {
  id: string
  user_id: string
  name: string
  supplier: string | null
  source_type: SourceType
  source_name: string | null // Freeform source description (e.g., "Amazon Monster")
  purchase_cost: number
  sales_tax: number | null
  purchase_date: string
  status: PalletStatus
  notes: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  user_id: string
  pallet_id: string | null
  name: string
  description: string | null
  quantity: number
  condition: ItemCondition
  retail_price: number | null
  listing_price: number | null
  sale_price: number | null
  purchase_cost: number | null
  allocated_cost: number | null
  storage_location: string | null
  status: ItemStatus
  listing_date: string | null
  sale_date: string | null
  sales_channel: string | null
  barcode: string | null
  source_type: SourceType
  source_name: string | null
  notes: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ItemPhoto {
  id: string
  item_id: string
  user_id: string
  storage_path: string
  display_order: number
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  pallet_id: string | null
  amount: number
  category: ExpenseCategory
  description: string | null
  expense_date: string
  receipt_photo_path: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Json | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface Affiliate {
  id: string
  code: string
  name: string
  email: string
  commission_rate: number
  payout_email: string | null
  pending_balance: number
  total_paid: number
  is_active: boolean
  created_at: string
}

export interface Referral {
  id: string
  affiliate_id: string
  user_id: string
  subscription_tier: SubscriptionTier
  created_at: string
  converted_at: string | null
}

export interface AffiliatePayout {
  id: string
  affiliate_id: string
  amount: number
  period_start: string
  period_end: string
  status: PayoutStatus
  payout_method: PayoutMethod | null
  transaction_id: string | null
  created_at: string
  completed_at: string | null
}

export interface Subscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  billing_cycle: BillingCycle | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  revenue_cat_id: string | null
  created_at: string
  updated_at: string
}

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> }
      user_settings: { Row: UserSettings; Insert: Partial<UserSettings> & { user_id: string }; Update: Partial<UserSettings> }
      pallets: { Row: Pallet; Insert: Partial<Pallet> & { user_id: string; name: string }; Update: Partial<Pallet> }
      items: { Row: Item; Insert: Partial<Item> & { user_id: string; name: string }; Update: Partial<Item> }
      item_photos: { Row: ItemPhoto; Insert: Partial<ItemPhoto> & { item_id: string; user_id: string; storage_path: string }; Update: Partial<ItemPhoto> }
      expenses: { Row: Expense; Insert: Partial<Expense> & { user_id: string; amount: number }; Update: Partial<Expense> }
      notifications: { Row: Notification; Insert: Partial<Notification> & { user_id: string; type: NotificationType; title: string; body: string }; Update: Partial<Notification> }
      affiliates: { Row: Affiliate; Insert: Partial<Affiliate> & { code: string; name: string; email: string }; Update: Partial<Affiliate> }
      referrals: { Row: Referral; Insert: Partial<Referral> & { affiliate_id: string; user_id: string }; Update: Partial<Referral> }
      affiliate_payouts: { Row: AffiliatePayout; Insert: Partial<AffiliatePayout> & { affiliate_id: string; amount: number; period_start: string; period_end: string }; Update: Partial<AffiliatePayout> }
      subscriptions: { Row: Subscription; Insert: Partial<Subscription> & { user_id: string }; Update: Partial<Subscription> }
    }
    Enums: {
      subscription_tier: SubscriptionTier
      subscription_status: SubscriptionStatus
      pallet_status: PalletStatus
      item_condition: ItemCondition
      item_status: ItemStatus
      source_type: SourceType
      expense_category: ExpenseCategory
      notification_type: NotificationType
      billing_cycle: BillingCycle
      payout_status: PayoutStatus
      payout_method: PayoutMethod
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
