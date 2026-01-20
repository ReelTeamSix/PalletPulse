// Daily Notifications - Supabase Edge Function
// Single function that runs once daily via pg_cron
// Handles: stale inventory, trial ending, weekly summary (on Sundays)
// Cost-optimized: Uses batch queries instead of per-user queries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_STALE_THRESHOLD = 30;

interface NotificationResult {
  type: string;
  created: number;
}

serve(async (req) => {
  try {
    const results: NotificationResult[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0 = Sunday

    console.log(`Running daily notifications for ${todayStr}`);

    // 1. STALE INVENTORY CHECK
    // Single query: Find all users with stale items who haven't been notified today
    const staleResult = await checkStaleInventory(todayStr);
    results.push({ type: 'stale_inventory', created: staleResult });

    // 2. TRIAL ENDING CHECK
    // Single query: Find users with trials ending in 1-3 days
    const trialResult = await checkTrialEnding(todayStr);
    results.push({ type: 'trial_ending', created: trialResult });

    // 3. WEEKLY SUMMARY (Sundays only)
    if (dayOfWeek === 0) {
      const weeklyResult = await sendWeeklySummaries(todayStr);
      results.push({ type: 'weekly_summary', created: weeklyResult });
    }

    console.log('Daily notifications complete:', results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Daily notifications failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Check for stale inventory across all users
 * Uses a single efficient query with aggregation
 */
async function checkStaleInventory(todayStr: string): Promise<number> {
  // Get users who have stale items and haven't been notified today
  // This is done in a single query using SQL aggregation
  const { data, error } = await supabase.rpc('get_users_with_stale_inventory', {
    today_date: todayStr,
    default_threshold: DEFAULT_STALE_THRESHOLD,
  });

  if (error) {
    console.error('Stale inventory query failed:', error);
    // Fallback to simple approach if RPC doesn't exist
    return await checkStaleInventoryFallback(todayStr);
  }

  if (!data || data.length === 0) return 0;

  // Batch insert notifications
  const notifications = data.map((row: { user_id: string; stale_count: number; threshold_days: number }) => ({
    user_id: row.user_id,
    type: 'stale_inventory',
    title: 'Stale Inventory Alert',
    body: row.stale_count === 1
      ? `You have 1 item listed for over ${row.threshold_days} days. Consider repricing.`
      : `You have ${row.stale_count} items listed for over ${row.threshold_days} days. Consider repricing.`,
    data: { count: row.stale_count, thresholdDays: row.threshold_days },
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Failed to insert stale notifications:', insertError);
    return 0;
  }

  return notifications.length;
}

/**
 * Fallback stale inventory check (simpler but less efficient)
 */
async function checkStaleInventoryFallback(todayStr: string): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_STALE_THRESHOLD);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  // Get users with stale items
  const { data: staleData, error } = await supabase
    .from('items')
    .select('user_id')
    .eq('status', 'listed')
    .lte('listing_date', cutoffStr);

  if (error || !staleData) return 0;

  // Count per user
  const userCounts = new Map<string, number>();
  for (const item of staleData) {
    userCounts.set(item.user_id, (userCounts.get(item.user_id) || 0) + 1);
  }

  // Check which users already got notified today
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'stale_inventory')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  // Create notifications for users not yet notified
  const notifications = [];
  for (const [userId, count] of userCounts) {
    if (!notifiedUsers.has(userId)) {
      notifications.push({
        user_id: userId,
        type: 'stale_inventory',
        title: 'Stale Inventory Alert',
        body: count === 1
          ? `You have 1 item listed for over ${DEFAULT_STALE_THRESHOLD} days. Consider repricing.`
          : `You have ${count} items listed for over ${DEFAULT_STALE_THRESHOLD} days. Consider repricing.`,
        data: { count, thresholdDays: DEFAULT_STALE_THRESHOLD },
      });
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  return notifications.length;
}

/**
 * Check for trials ending soon (1-3 days)
 */
async function checkTrialEnding(todayStr: string): Promise<number> {
  // Calculate date range for trials ending in 1-3 days
  const today = new Date(todayStr);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  // Query onboarding data for users with active trials ending soon
  // Note: This assumes trial data is stored - adjust based on actual schema
  const { data: trialsEnding, error } = await supabase
    .from('user_settings')
    .select('user_id, trial_end_date')
    .eq('trial_active', true)
    .gte('trial_end_date', todayStr)
    .lte('trial_end_date', threeDaysFromNow.toISOString().split('T')[0]);

  if (error) {
    console.error('Trial ending query failed:', error);
    return 0;
  }

  if (!trialsEnding || trialsEnding.length === 0) return 0;

  // Check which users already got notified today
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'subscription_reminder')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  // Create notifications
  const notifications = [];
  for (const trial of trialsEnding) {
    if (notifiedUsers.has(trial.user_id)) continue;

    const endDate = new Date(trial.trial_end_date);
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0 && daysLeft <= 3) {
      notifications.push({
        user_id: trial.user_id,
        type: 'subscription_reminder',
        title: 'Trial Ending Soon',
        body: daysLeft === 1
          ? 'Your Pro trial ends tomorrow. Upgrade to keep all features.'
          : `Your Pro trial ends in ${daysLeft} days. Upgrade to keep all features.`,
        data: { daysLeft },
      });
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  return notifications.length;
}

/**
 * Send weekly summaries (runs on Sundays)
 */
async function sendWeeklySummaries(todayStr: string): Promise<number> {
  const today = new Date(todayStr);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  // Get sales data grouped by user for the past week
  const { data: salesData, error } = await supabase
    .from('items')
    .select('user_id, sale_price, allocated_cost, purchase_cost')
    .eq('status', 'sold')
    .gte('sale_date', weekAgoStr)
    .lte('sale_date', todayStr);

  if (error) {
    console.error('Weekly summary query failed:', error);
    return 0;
  }

  if (!salesData || salesData.length === 0) return 0;

  // Aggregate by user
  const userStats = new Map<string, { count: number; revenue: number; profit: number }>();
  for (const item of salesData) {
    const stats = userStats.get(item.user_id) || { count: 0, revenue: 0, profit: 0 };
    const salePrice = item.sale_price || 0;
    const cost = item.allocated_cost || item.purchase_cost || 0;

    stats.count++;
    stats.revenue += salePrice;
    stats.profit += salePrice - cost;

    userStats.set(item.user_id, stats);
  }

  // Check existing notifications
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'weekly_summary')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  // Create notifications
  const notifications = [];
  for (const [userId, stats] of userStats) {
    if (notifiedUsers.has(userId)) continue;

    const profitStr = stats.profit >= 0
      ? `$${stats.profit.toFixed(2)} profit`
      : `-$${Math.abs(stats.profit).toFixed(2)} loss`;

    notifications.push({
      user_id: userId,
      type: 'weekly_summary',
      title: 'Weekly Summary',
      body: `This week: ${stats.count} items sold for $${stats.revenue.toFixed(2)} (${profitStr})`,
      data: {
        itemsSold: stats.count,
        revenue: stats.revenue,
        profit: stats.profit,
        weekStarting: weekAgoStr,
      },
    });
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  return notifications.length;
}
