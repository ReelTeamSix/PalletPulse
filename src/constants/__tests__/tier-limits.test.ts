// Tier Limits Tests - Updated for active/archived distinction
import {
  TIER_LIMITS,
  TIER_PRICING,
  PHOTO_CLEANUP_CONFIG,
  isUnlimited,
  canPerformAction,
  getUsagePercentage,
  shouldCleanArchivedPhotos,
} from '../tier-limits';

describe('tier-limits', () => {
  describe('TIER_LIMITS', () => {
    it('should have correct free tier limits', () => {
      expect(TIER_LIMITS.free.activePallets).toBe(2);
      expect(TIER_LIMITS.free.archivedPallets).toBe(10);
      expect(TIER_LIMITS.free.activeItems).toBe(100);
      expect(TIER_LIMITS.free.archivedItems).toBe(200);
      expect(TIER_LIMITS.free.photosPerItem).toBe(1);
      expect(TIER_LIMITS.free.archivedPhotoRetentionDays).toBe(30);
      expect(TIER_LIMITS.free.aiDescriptionsPerMonth).toBe(0);
      expect(TIER_LIMITS.free.analyticsRetentionDays).toBe(30);
      expect(TIER_LIMITS.free.csvExport).toBe(false);
      expect(TIER_LIMITS.free.pdfExport).toBe(false);
      expect(TIER_LIMITS.free.expenseTracking).toBe(false);
      expect(TIER_LIMITS.free.mileageTracking).toBe(false);
    });

    it('should have correct starter tier limits', () => {
      expect(TIER_LIMITS.starter.activePallets).toBe(5);
      expect(TIER_LIMITS.starter.archivedPallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.starter.activeItems).toBe(500);
      expect(TIER_LIMITS.starter.archivedItems).toBe(-1); // Unlimited
      expect(TIER_LIMITS.starter.photosPerItem).toBe(3);
      expect(TIER_LIMITS.starter.archivedPhotoRetentionDays).toBe(90);
      expect(TIER_LIMITS.starter.aiDescriptionsPerMonth).toBe(50);
      expect(TIER_LIMITS.starter.analyticsRetentionDays).toBe(-1); // Unlimited
      expect(TIER_LIMITS.starter.csvExport).toBe(true);
      expect(TIER_LIMITS.starter.pdfExport).toBe(false);
      expect(TIER_LIMITS.starter.expenseTracking).toBe(true);
      expect(TIER_LIMITS.starter.mileageTracking).toBe(true);
      expect(TIER_LIMITS.starter.mileageSavedRoutes).toBe(false);
    });

    it('should have correct pro tier limits', () => {
      expect(TIER_LIMITS.pro.activePallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.archivedPallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.activeItems).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.archivedItems).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.photosPerItem).toBe(10);
      expect(TIER_LIMITS.pro.archivedPhotoRetentionDays).toBe(-1); // Unlimited
      expect(TIER_LIMITS.pro.aiDescriptionsPerMonth).toBe(200);
      expect(TIER_LIMITS.pro.csvExport).toBe(true);
      expect(TIER_LIMITS.pro.pdfExport).toBe(true);
      expect(TIER_LIMITS.pro.expenseTracking).toBe(true);
      expect(TIER_LIMITS.pro.mileageTracking).toBe(true);
      expect(TIER_LIMITS.pro.mileageSavedRoutes).toBe(true);
      expect(TIER_LIMITS.pro.prioritySupport).toBe(true);
    });

    it('should have correct enterprise tier limits', () => {
      expect(TIER_LIMITS.enterprise.activePallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.archivedPallets).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.activeItems).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.archivedItems).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.photosPerItem).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.archivedPhotoRetentionDays).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.aiDescriptionsPerMonth).toBe(-1); // Unlimited
      expect(TIER_LIMITS.enterprise.multiUser).toBe(true);
    });
  });

  describe('PHOTO_CLEANUP_CONFIG', () => {
    it('should have correct free tier photo cleanup config', () => {
      expect(PHOTO_CLEANUP_CONFIG.free.retentionDays).toBe(30);
      expect(PHOTO_CLEANUP_CONFIG.free.keepFirstPhoto).toBe(false);
    });

    it('should have correct starter tier photo cleanup config', () => {
      expect(PHOTO_CLEANUP_CONFIG.starter.retentionDays).toBe(90);
      expect(PHOTO_CLEANUP_CONFIG.starter.keepFirstPhoto).toBe(true);
    });

    it('should have correct pro tier photo cleanup config', () => {
      expect(PHOTO_CLEANUP_CONFIG.pro.retentionDays).toBe(-1);
      expect(PHOTO_CLEANUP_CONFIG.pro.keepFirstPhoto).toBe(true);
    });

    it('should have correct enterprise tier photo cleanup config', () => {
      expect(PHOTO_CLEANUP_CONFIG.enterprise.retentionDays).toBe(-1);
      expect(PHOTO_CLEANUP_CONFIG.enterprise.keepFirstPhoto).toBe(true);
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
    describe('active pallet limits', () => {
      it('should allow action when under limit', () => {
        expect(canPerformAction('free', 'activePallets', 0)).toBe(true);
        expect(canPerformAction('free', 'activePallets', 1)).toBe(true);
        expect(canPerformAction('starter', 'activePallets', 4)).toBe(true);
      });

      it('should deny action at or above limit', () => {
        expect(canPerformAction('free', 'activePallets', 2)).toBe(false);
        expect(canPerformAction('free', 'activePallets', 5)).toBe(false);
        expect(canPerformAction('starter', 'activePallets', 5)).toBe(false);
      });

      it('should allow any count for unlimited limits', () => {
        expect(canPerformAction('pro', 'activePallets', 0)).toBe(true);
        expect(canPerformAction('pro', 'activePallets', 100)).toBe(true);
        expect(canPerformAction('pro', 'activePallets', 1000)).toBe(true);
      });
    });

    describe('archived pallet limits', () => {
      it('should allow action when under limit for free tier', () => {
        expect(canPerformAction('free', 'archivedPallets', 0)).toBe(true);
        expect(canPerformAction('free', 'archivedPallets', 9)).toBe(true);
      });

      it('should deny action at or above limit for free tier', () => {
        expect(canPerformAction('free', 'archivedPallets', 10)).toBe(false);
        expect(canPerformAction('free', 'archivedPallets', 15)).toBe(false);
      });

      it('should allow unlimited archived pallets for starter and above', () => {
        expect(canPerformAction('starter', 'archivedPallets', 100)).toBe(true);
        expect(canPerformAction('pro', 'archivedPallets', 1000)).toBe(true);
      });
    });

    describe('active item limits', () => {
      it('should allow action when under limit', () => {
        expect(canPerformAction('free', 'activeItems', 50)).toBe(true);
        expect(canPerformAction('starter', 'activeItems', 499)).toBe(true);
      });

      it('should deny action at or above limit', () => {
        expect(canPerformAction('free', 'activeItems', 100)).toBe(false);
        expect(canPerformAction('starter', 'activeItems', 500)).toBe(false);
      });

      it('should allow unlimited active items for pro', () => {
        expect(canPerformAction('pro', 'activeItems', 10000)).toBe(true);
      });
    });

    describe('archived item limits', () => {
      it('should allow action when under limit for free tier', () => {
        expect(canPerformAction('free', 'archivedItems', 199)).toBe(true);
      });

      it('should deny action at or above limit for free tier', () => {
        expect(canPerformAction('free', 'archivedItems', 200)).toBe(false);
      });

      it('should allow unlimited archived items for starter and above', () => {
        expect(canPerformAction('starter', 'archivedItems', 10000)).toBe(true);
        expect(canPerformAction('pro', 'archivedItems', 100000)).toBe(true);
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
    it('should return correct percentage for active pallet limits', () => {
      // Free tier with 2 active pallet limit
      expect(getUsagePercentage('free', 'activePallets', 0)).toBe(0);
      expect(getUsagePercentage('free', 'activePallets', 1)).toBe(50);
      expect(getUsagePercentage('free', 'activePallets', 2)).toBe(100);

      // Starter tier with 5 active pallet limit
      expect(getUsagePercentage('starter', 'activePallets', 2)).toBeCloseTo(40);
      expect(getUsagePercentage('starter', 'activePallets', 5)).toBe(100);
    });

    it('should return correct percentage for active item limits', () => {
      // Free tier with 100 active items limit
      expect(getUsagePercentage('free', 'activeItems', 50)).toBe(50);
      expect(getUsagePercentage('free', 'activeItems', 75)).toBe(75);
      expect(getUsagePercentage('free', 'activeItems', 100)).toBe(100);
    });

    it('should return correct percentage for archived limits', () => {
      // Free tier with 10 archived pallets limit
      expect(getUsagePercentage('free', 'archivedPallets', 5)).toBe(50);
      expect(getUsagePercentage('free', 'archivedPallets', 10)).toBe(100);

      // Free tier with 200 archived items limit
      expect(getUsagePercentage('free', 'archivedItems', 100)).toBe(50);
    });

    it('should return null for unlimited limits', () => {
      expect(getUsagePercentage('pro', 'activePallets', 100)).toBeNull();
      expect(getUsagePercentage('pro', 'activeItems', 5000)).toBeNull();
      expect(getUsagePercentage('starter', 'archivedPallets', 100)).toBeNull();
      expect(getUsagePercentage('enterprise', 'photosPerItem', 50)).toBeNull();
    });
  });

  describe('shouldCleanArchivedPhotos', () => {
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    it('should return true for free tier item sold more than 30 days ago', () => {
      expect(shouldCleanArchivedPhotos('free', daysAgo(31), 3)).toBe(true);
      expect(shouldCleanArchivedPhotos('free', daysAgo(60), 5)).toBe(true);
    });

    it('should return false for free tier item sold less than 30 days ago', () => {
      expect(shouldCleanArchivedPhotos('free', daysAgo(29), 3)).toBe(false);
      expect(shouldCleanArchivedPhotos('free', daysAgo(15), 5)).toBe(false);
    });

    it('should return true for starter tier item sold more than 90 days ago with multiple photos', () => {
      expect(shouldCleanArchivedPhotos('starter', daysAgo(91), 3)).toBe(true);
      expect(shouldCleanArchivedPhotos('starter', daysAgo(120), 5)).toBe(true);
    });

    it('should return false for starter tier item with only 1 photo (keepFirstPhoto)', () => {
      expect(shouldCleanArchivedPhotos('starter', daysAgo(100), 1)).toBe(false);
    });

    it('should return false for starter tier item sold less than 90 days ago', () => {
      expect(shouldCleanArchivedPhotos('starter', daysAgo(89), 5)).toBe(false);
    });

    it('should always return false for pro tier (unlimited retention)', () => {
      expect(shouldCleanArchivedPhotos('pro', daysAgo(365), 10)).toBe(false);
      expect(shouldCleanArchivedPhotos('pro', daysAgo(1000), 20)).toBe(false);
    });

    it('should always return false for enterprise tier', () => {
      expect(shouldCleanArchivedPhotos('enterprise', daysAgo(365), 10)).toBe(false);
    });

    it('should return false for items with no photos', () => {
      expect(shouldCleanArchivedPhotos('free', daysAgo(60), 0)).toBe(false);
    });
  });
});
