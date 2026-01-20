// Automatic Notification Triggers
// Creates meaningful notifications based on user activity

import { supabase } from './supabase';
import type { Item, Pallet, Notification } from '@/src/types/database';

interface StaleItemsData {
  itemIds: string[];
  count: number;
}

interface MilestoneData {
  palletId: string;
  palletName: string;
  milestone: number;
  roi: number;
}

/**
 * Check for stale inventory and create notification if needed
 * Only creates one notification per "batch" of stale items (daily)
 */
export async function checkStaleInventoryNotification(
  items: Item[],
  staleThresholdDays: number = 30
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const staleItems = items.filter(item => {
      if (item.status !== 'listed' || !item.listing_date) return false;
      const listingDate = new Date(item.listing_date);
      const daysSinceListed = Math.floor(
        (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceListed >= staleThresholdDays;
    });

    if (staleItems.length === 0) return;

    // Check if we already have a stale notification from today
    const today = now.toISOString().split('T')[0];
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('type', 'stale_inventory')
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(1);

    if (existingNotifications && existingNotifications.length > 0) {
      // Already notified today
      return;
    }

    // Create notification
    const itemCount = staleItems.length;
    const body = itemCount === 1
      ? `You have 1 item listed for over ${staleThresholdDays} days. Consider repricing to move it faster.`
      : `You have ${itemCount} items listed for over ${staleThresholdDays} days. Consider repricing to move them faster.`;

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'stale_inventory',
      title: 'Stale Inventory Alert',
      body,
      data: {
        itemIds: staleItems.map(i => i.id),
        count: itemCount,
      } as StaleItemsData,
    });
  } catch (error) {
    console.error('Error checking stale inventory notification:', error);
  }
}

/**
 * Check if pallet crossed an ROI milestone and create notification
 * Milestones: 25%, 50%, 75%, 100%, 150%, 200%
 */
export async function checkPalletMilestoneNotification(
  pallet: Pallet,
  items: Item[]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Calculate pallet ROI
    const soldItems = items.filter(i => i.pallet_id === pallet.id && i.status === 'sold');
    if (soldItems.length === 0) return;

    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.sale_price ?? 0), 0);
    const totalCost = pallet.purchase_cost;

    if (totalCost === 0) return;

    const roi = ((totalRevenue - totalCost) / totalCost) * 100;

    // Define milestones
    const milestones = [25, 50, 75, 100, 150, 200];

    // Find the highest milestone crossed
    const crossedMilestone = milestones
      .filter(m => roi >= m)
      .pop();

    if (!crossedMilestone) return;

    // Check if we already notified about this milestone for this pallet
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id, data')
      .eq('user_id', user.id)
      .eq('type', 'pallet_milestone')
      .order('created_at', { ascending: false });

    const alreadyNotified = existingNotifications?.some(n => {
      const data = n.data as MilestoneData | null;
      return data?.palletId === pallet.id && (data?.milestone ?? 0) >= crossedMilestone;
    });

    if (alreadyNotified) return;

    // Create notification
    const roiDisplay = roi.toFixed(0);
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'pallet_milestone',
      title: 'Milestone Reached!',
      body: `${pallet.name} has reached ${crossedMilestone}% ROI (currently ${roiDisplay}%). Great sourcing decision!`,
      data: {
        palletId: pallet.id,
        palletName: pallet.name,
        milestone: crossedMilestone,
        roi: Number(roiDisplay),
      } as MilestoneData,
    });
  } catch (error) {
    console.error('Error checking pallet milestone notification:', error);
  }
}

/**
 * Create welcome notification for new users
 * Only creates if user doesn't already have one
 */
export async function createWelcomeNotification(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if welcome notification already exists
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'system')
      .ilike('title', '%welcome%')
      .limit(1);

    if (existingNotifications && existingNotifications.length > 0) {
      return;
    }

    // Create welcome notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: 'Welcome to PalletPulse!',
      body: 'Get started by adding your first pallet and tracking your reselling profits. Tap here for a quick tour.',
      data: { action: 'onboarding' },
    });
  } catch (error) {
    console.error('Error creating welcome notification:', error);
  }
}

/**
 * Create subscription reminder notification
 * Called when trial is ending soon (e.g., 3 days left)
 */
export async function createTrialEndingNotification(daysLeft: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if we already notified about this
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'subscription_reminder')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingNotifications && existingNotifications.length > 0) {
      return;
    }

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'subscription_reminder',
      title: 'Trial Ending Soon',
      body: `Your free trial ends in ${daysLeft} days. Upgrade to Pro to keep unlimited pallets and advanced analytics.`,
      data: { daysLeft },
    });
  } catch (error) {
    console.error('Error creating trial ending notification:', error);
  }
}

/**
 * Create limit warning notification
 * Called when user is approaching tier limits
 */
export async function createLimitWarningNotification(
  limitType: 'pallets' | 'items' | 'photos',
  current: number,
  max: number
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Only notify when at 80% or more of limit
    if (current < max * 0.8) return;

    // Check if we already notified about this limit recently (within 7 days)
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id, data')
      .eq('user_id', user.id)
      .eq('type', 'limit_warning')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const alreadyNotified = existingNotifications?.some(n => {
      const data = n.data as { limitType?: string } | null;
      return data?.limitType === limitType;
    });

    if (alreadyNotified) return;

    const limitNames = {
      pallets: 'pallets',
      items: 'items',
      photos: 'photos per item',
    };

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'limit_warning',
      title: 'Approaching Limit',
      body: `You're using ${current} of ${max} ${limitNames[limitType]}. Upgrade to Pro for unlimited access.`,
      data: { limitType, current, max },
    });
  } catch (error) {
    console.error('Error creating limit warning notification:', error);
  }
}
