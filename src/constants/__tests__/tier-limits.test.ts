// Tier Limits Tests - Phase 10
import {
  TIER_LIMITS,
  TIER_PRICING,
  isUnlimited,
  canPerformAction,
  getUsagePercentage,
} from '../tier-limits';

describe('tier-limits', () => {
  describe('TIER_LIMITS', () => {
    it('should have correct free tier limits', () => {
      expect(TIER_LIMITS.free.pallets).toBe(1);
      expect(TIER_LIMITS.free.items).toBe(20);
      expect(TIER_LIMITS.free.photosPerItem).toBe(1);
      expect(TIER_LIMITS.free.aiDescriptionsPerMonth).toBe(0);
      expect(TIER_LIMITS.free.analyticsRetentionDays).toBe(30);
      expect(TIER_LIMITS.free.csvExport).toBe(false);
      expect(TIER_LIMITS.free.pdfExport).toBe(false);
      expect(TIER_LIMITS.free.expenseTracking).toBe(false);
      expect(TIER_LIMITS.free.mileageTracking).toBe(false);
    });

    it('should have correct starter tier limits', () => {
      expect(TIER_LIMITS.starter.pallets).toBe(25);
      expect(TIER_LIMITS.starter.items).toBe(500);
      expect(TIER_LIMITS.starter.photosPerItem).toBe(3);
      expect(TIER_LIMITS.starter.aiDescriptionsPerMonth).toBe(50);
      expect(TIER_LIMITS.starter.analyticsRetentionDays).toBe(-1); // Unlimited
      expect(TIER_LIMITS.starter.csvExport).toBe(true);
      expect(TIER_LIMITS.starter.pdfExport).toBe(false);
      expect(TIER_LIMITS.starter.expenseTracking).toBe(true);
      expect(TIER_LIMITS.starter.mileageTracking).toBe(true);
      expect(TIER_LIMITS.starter.mileageSavedRoutes).toBe(false);
    });

    it('should have correct pro tier limits', () => {
      expect(TIER_LIMITS.pro.pallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.items).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.photosPerItem).toBe(10);
      expect(TIER_LIMITS.pro.aiDescriptionsPerMonth).toBe(200);
      expect(TIER_LIMITS.pro.csvExport).toBe(true);
      expect(TIER_LIMITS.pro.pdfExport).toBe(true);
      expect(TIER_LIMITS.pro.expenseTracking).toBe(true);
      expect(TIER_LIMITS.pro.mileageTracking).toBe(true);
      expect(TIER_LIMITS.pro.mileageSavedRoutes).toBe(true);
      expect(TIER_LIMITS.pro.prioritySupport).toBe(true);
    });

    it('should have correct enterprise tier limits', () => {
      expect(TIER_LIMITS.enterprise.pallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.items).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.photosPerItem).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.aiDescriptionsPerMonth).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.multiUser).toBe(true);
    });
  });

  describe('TIER_PRICING', () => {
    it('should have correct pricing for each tier', () => {
      expect(TIER_PRICING.free.monthly).toBe(0);
      expect(TIER_PRICING.free.annual).toBe(0);

      expect(TIER_PRICING.starter.monthly).toBe(9.99);
      expect(TIER_PRICING.starter.annual).toBe(99.99);

      expect(TIER_PRICING.pro.monthly).toBe(24.99);
      expect(TIER_PRICING.pro.annual).toBe(249.99);

      expect(TIER_PRICING.enterprise.monthly).toBeNull();
      expect(TIER_PRICING.enterprise.annual).toBeNull();
    });
  });

  describe('isUnlimited', () => {
    it('should return true for -1', () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for positive numbers', () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    describe('numeric limits', () => {
      it('should allow action when under limit', () => {
        expect(canPerformAction('free', 'pallets', 0)).toBe(true);
        expect(canPerformAction('free', 'items', 10)).toBe(true);
        expect(canPerformAction('starter', 'pallets', 10)).toBe(true);
      });

      it('should deny action at or above limit', () => {
        expect(canPerformAction('free', 'pallets', 1)).toBe(false);
        expect(canPerformAction('free', 'pallets', 5)).toBe(false);
        expect(canPerformAction('free', 'items', 20)).toBe(false);
        expect(canPerformAction('starter', 'pallets', 25)).toBe(false);
      });

      it('should allow any count for unlimited limits', () => {
        expect(canPerformAction('pro', 'pallets', 0)).toBe(true);
        expect(canPerformAction('pro', 'pallets', 100)).toBe(true);
        expect(canPerformAction('pro', 'pallets', 1000)).toBe(true);
        expect(canPerformAction('pro', 'items', 10000)).toBe(true);
      });
    });

    describe('boolean limits', () => {
      it('should return boolean value for feature flags', () => {
        // Free tier
        expect(canPerformAction('free', 'csvExport', 0)).toBe(false);
        expect(canPerformAction('free', 'pdfExport', 0)).toBe(false);
        expect(canPerformAction('free', 'expenseTracking', 0)).toBe(false);
        expect(canPerformAction('free', 'mileageTracking', 0)).toBe(false);

        // Starter tier
        expect(canPerformAction('starter', 'csvExport', 0)).toBe(true);
        expect(canPerformAction('starter', 'pdfExport', 0)).toBe(false);
        expect(canPerformAction('starter', 'expenseTracking', 0)).toBe(true);
        expect(canPerformAction('starter', 'mileageTracking', 0)).toBe(true);
        expect(canPerformAction('starter', 'mileageSavedRoutes', 0)).toBe(false);

        // Pro tier
        expect(canPerformAction('pro', 'csvExport', 0)).toBe(true);
        expect(canPerformAction('pro', 'pdfExport', 0)).toBe(true);
        expect(canPerformAction('pro', 'expenseTracking', 0)).toBe(true);
        expect(canPerformAction('pro', 'mileageSavedRoutes', 0)).toBe(true);
        expect(canPerformAction('pro', 'prioritySupport', 0)).toBe(true);
      });
    });
  });

  describe('getUsagePercentage', () => {
    it('should return correct percentage for numeric limits', () => {
      // Free tier with 1 pallet limit
      expect(getUsagePercentage('free', 'pallets', 0)).toBe(0);
      expect(getUsagePercentage('free', 'pallets', 1)).toBe(100);

      // Free tier with 20 items limit
      expect(getUsagePercentage('free', 'items', 10)).toBe(50);
      expect(getUsagePercentage('free', 'items', 15)).toBe(75);
      expect(getUsagePercentage('free', 'items', 20)).toBe(100);

      // Starter tier
      expect(getUsagePercentage('starter', 'pallets', 12)).toBeCloseTo(48);
      expect(getUsagePercentage('starter', 'pallets', 25)).toBe(100);
    });

    it('should return null for unlimited limits', () => {
      expect(getUsagePercentage('pro', 'pallets', 100)).toBeNull();
      expect(getUsagePercentage('pro', 'items', 5000)).toBeNull();
      expect(getUsagePercentage('enterprise', 'photosPerItem', 50)).toBeNull();
    });
  });
});
