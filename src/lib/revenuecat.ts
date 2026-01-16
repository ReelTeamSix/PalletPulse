// RevenueCat Integration for PalletPulse Subscriptions
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { SubscriptionTier } from '@/src/constants/tier-limits';

// RevenueCat API Keys from environment
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Entitlement identifiers (must match RevenueCat dashboard)
export const ENTITLEMENTS = {
  STARTER: 'starter',
  PRO: 'pro',
} as const;

// Product identifiers (must match App Store Connect / Google Play)
export const PRODUCT_IDS = {
  STARTER_MONTHLY: 'starter_monthly',
  STARTER_ANNUAL: 'starter_annual',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
} as const;

/**
 * Initialize RevenueCat SDK
 * Call this on app startup after user authentication
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  const apiKey = Platform.select({
    ios: REVENUECAT_IOS_KEY,
    android: REVENUECAT_ANDROID_KEY,
  });

  if (!apiKey) {
    console.warn('RevenueCat: No API key configured for this platform');
    return;
  }

  try {
    // Configure with debug logging in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });

    console.log('RevenueCat: Initialized successfully');
  } catch (error) {
    console.error('RevenueCat: Failed to initialize', error);
    throw error;
  }
}

/**
 * Identify user with RevenueCat (call after login)
 * This syncs purchases across devices
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const result = await Purchases.logIn(userId);
    return result.customerInfo;
  } catch (error) {
    console.error('RevenueCat: Failed to identify user', error);
    throw error;
  }
}

/**
 * Log out user from RevenueCat (call on logout)
 * Creates an anonymous user ID
 */
export async function logOutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Failed to log out', error);
    throw error;
  }
}

/**
 * Get current customer info (subscription status, entitlements)
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('RevenueCat: Failed to get customer info', error);
    throw error;
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('RevenueCat: Failed to get offerings', error);
    throw error;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; success: boolean }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo, success: true };
  } catch (error) {
    const purchaseError = error as PurchasesError;

    // User cancelled - not an error
    if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      console.log('RevenueCat: Purchase cancelled by user');
      const customerInfo = await getCustomerInfo();
      return { customerInfo, success: false };
    }

    console.error('RevenueCat: Purchase failed', error);
    throw error;
  }
}

/**
 * Restore previous purchases (useful for reinstalls)
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('RevenueCat: Purchases restored successfully');
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Failed to restore purchases', error);
    throw error;
  }
}

/**
 * Determine subscription tier from customer entitlements
 */
export function getTierFromEntitlements(customerInfo: CustomerInfo): SubscriptionTier {
  const { active } = customerInfo.entitlements;

  // Check Pro first (higher tier)
  if (active[ENTITLEMENTS.PRO]?.isActive) {
    return 'pro';
  }

  // Check Starter
  if (active[ENTITLEMENTS.STARTER]?.isActive) {
    return 'starter';
  }

  // Default to free
  return 'free';
}

/**
 * Check if user has an active subscription
 */
export function hasActiveSubscription(customerInfo: CustomerInfo): boolean {
  return getTierFromEntitlements(customerInfo) !== 'free';
}

/**
 * Get subscription expiration date (if any)
 */
export function getExpirationDate(customerInfo: CustomerInfo): Date | null {
  const { active } = customerInfo.entitlements;

  // Check Pro first
  const proEntitlement = active[ENTITLEMENTS.PRO];
  if (proEntitlement?.expirationDate) {
    return new Date(proEntitlement.expirationDate);
  }

  // Check Starter
  const starterEntitlement = active[ENTITLEMENTS.STARTER];
  if (starterEntitlement?.expirationDate) {
    return new Date(starterEntitlement.expirationDate);
  }

  return null;
}

/**
 * Check if subscription will renew
 */
export function willRenew(customerInfo: CustomerInfo): boolean {
  const { active } = customerInfo.entitlements;

  const proEntitlement = active[ENTITLEMENTS.PRO];
  if (proEntitlement?.willRenew) {
    return true;
  }

  const starterEntitlement = active[ENTITLEMENTS.STARTER];
  if (starterEntitlement?.willRenew) {
    return true;
  }

  return false;
}

/**
 * Get billing cycle (monthly/annual) from active subscription
 */
export function getBillingCycle(
  customerInfo: CustomerInfo
): 'monthly' | 'annual' | null {
  const { active } = customerInfo.entitlements;

  // Check which entitlement is active
  const activeEntitlement = active[ENTITLEMENTS.PRO] || active[ENTITLEMENTS.STARTER];

  if (!activeEntitlement?.productIdentifier) {
    return null;
  }

  // Determine cycle from product ID
  const productId = activeEntitlement.productIdentifier;
  if (productId.includes('annual')) {
    return 'annual';
  }
  if (productId.includes('monthly')) {
    return 'monthly';
  }

  return null;
}

/**
 * Check if RevenueCat is configured
 */
export function isConfigured(): boolean {
  return Boolean(
    Platform.select({
      ios: REVENUECAT_IOS_KEY,
      android: REVENUECAT_ANDROID_KEY,
    })
  );
}

/**
 * Format price for display
 */
export function formatPackagePrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get savings percentage for annual vs monthly
 */
export function getAnnualSavingsPercent(
  monthlyPrice: number,
  annualPrice: number
): number {
  const yearlyAtMonthly = monthlyPrice * 12;
  const savings = ((yearlyAtMonthly - annualPrice) / yearlyAtMonthly) * 100;
  return Math.round(savings);
}
