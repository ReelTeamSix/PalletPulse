// Daily Notifications - Supabase Edge Function
// Single function that runs once daily via pg_cron
// Handles: stale inventory, trial ending, weekly summary (on Sundays)
// Sends both in-app notifications AND push notifications via Expo

/* eslint-disable import/no-unresolved -- Deno URL imports are valid in Supabase Edge Functions */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/* eslint-enable import/no-unresolved */

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_STALE_THRESHOLD = 30;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationResult {
  type: string;
  inApp: number;
  push: number;
}

interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  try {
    // Verify request is authorized (cron job or admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results: NotificationResult[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0 = Sunday

    console.log(`Running daily notifications for ${todayStr}`);

    // 1. STALE INVENTORY CHECK
    const staleResult = await checkStaleInventory(todayStr);
    results.push({ type: 'stale_inventory', ...staleResult });

    // 2. TRIAL ENDING CHECK
    const trialResult = await checkTrialEnding(todayStr);
    results.push({ type: 'trial_ending', ...trialResult });

    // 3. WEEKLY SUMMARY (Sundays only)
    if (dayOfWeek === 0) {
      const weeklyResult = await sendWeeklySummaries(todayStr);
      results.push({ type: 'weekly_summary', ...weeklyResult });
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
 * Send push notifications via Expo Push API
 * Batches up to 100 notifications per request
 */
async function sendPushNotifications(
  notifications: NotificationPayload[]
): Promise<number> {
  if (notifications.length === 0) return 0;

  // Get push tokens for all users
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (error || !tokens || tokens.length === 0) {
    console.log('No active push tokens found');
    return 0;
  }

  // Create a map of user_id -> tokens
  const tokenMap = new Map<string, string[]>();
  for (const t of tokens) {
    const existing = tokenMap.get(t.user_id) || [];
    existing.push(t.token);
    tokenMap.set(t.user_id, existing);
  }

  // Build Expo push messages
  const messages: Array<{
    to: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    sound: 'default';
  }> = [];

  for (const notif of notifications) {
    const userTokens = tokenMap.get(notif.user_id);
    if (!userTokens) continue;

    for (const token of userTokens) {
      messages.push({
        to: token,
        title: notif.title,
        body: notif.body,
        data: { ...notif.data, type: notif.type },
        sound: 'default',
      });
    }
  }

  if (messages.length === 0) return 0;

  // Send in batches of 100
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        sent += batch.length;
        const result = await response.json();

        // Check for invalid tokens and deactivate them
        if (result.data) {
          for (let j = 0; j < result.data.length; j++) {
            const ticket = result.data[j];
            if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
              // Deactivate this token
              await supabase
                .from('push_tokens')
                .update({ is_active: false })
                .eq('token', batch[j].to);
              console.log(`Deactivated invalid token: ${batch[j].to.substring(0, 20)}...`);
            }
          }
        }
      } else {
        console.error('Expo push failed:', await response.text());
      }
    } catch (err) {
      console.error('Failed to send push batch:', err);
    }
  }

  return sent;
}

/**
 * Create in-app notifications and send push
 */
async function createAndPushNotifications(
  notifications: NotificationPayload[]
): Promise<{ inApp: number; push: number }> {
  if (notifications.length === 0) return { inApp: 0, push: 0 };

  // Insert in-app notifications
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Failed to insert notifications:', insertError);
    return { inApp: 0, push: 0 };
  }

  // Send push notifications
  const pushCount = await sendPushNotifications(notifications);

  return { inApp: notifications.length, push: pushCount };
}

/**
 * Check for stale inventory across all users
 */
async function checkStaleInventory(
  todayStr: string
): Promise<{ inApp: number; push: number }> {
  const { data, error } = await supabase.rpc('get_users_with_stale_inventory', {
    today_date: todayStr,
    default_threshold: DEFAULT_STALE_THRESHOLD,
  });

  if (error) {
    console.error('Stale inventory query failed:', error);
    return await checkStaleInventoryFallback(todayStr);
  }

  if (!data || data.length === 0) return { inApp: 0, push: 0 };

  const notifications: NotificationPayload[] = data.map(
    (row: { user_id: string; stale_count: number; threshold_days: number }) => ({
      user_id: row.user_id,
      type: 'stale_inventory',
      title: 'Stale Inventory Alert',
      body:
        row.stale_count === 1
          ? `You have 1 item listed for over ${row.threshold_days} days. Consider repricing.`
          : `You have ${row.stale_count} items listed for over ${row.threshold_days} days. Consider repricing.`,
      data: { count: row.stale_count, thresholdDays: row.threshold_days },
    })
  );

  return await createAndPushNotifications(notifications);
}

/**
 * Fallback stale inventory check
 */
async function checkStaleInventoryFallback(
  todayStr: string
): Promise<{ inApp: number; push: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_STALE_THRESHOLD);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const { data: staleData, error } = await supabase
    .from('items')
    .select('user_id')
    .eq('status', 'listed')
    .lte('listing_date', cutoffStr);

  if (error || !staleData) return { inApp: 0, push: 0 };

  const userCounts = new Map<string, number>();
  for (const item of staleData) {
    userCounts.set(item.user_id, (userCounts.get(item.user_id) || 0) + 1);
  }

  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'stale_inventory')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  const notifications: NotificationPayload[] = [];
  for (const [userId, count] of userCounts) {
    if (!notifiedUsers.has(userId)) {
      notifications.push({
        user_id: userId,
        type: 'stale_inventory',
        title: 'Stale Inventory Alert',
        body:
          count === 1
            ? `You have 1 item listed for over ${DEFAULT_STALE_THRESHOLD} days. Consider repricing.`
            : `You have ${count} items listed for over ${DEFAULT_STALE_THRESHOLD} days. Consider repricing.`,
        data: { count, thresholdDays: DEFAULT_STALE_THRESHOLD },
      });
    }
  }

  return await createAndPushNotifications(notifications);
}

/**
 * Check for trials ending soon (1-3 days)
 */
async function checkTrialEnding(
  todayStr: string
): Promise<{ inApp: number; push: number }> {
  const today = new Date(todayStr);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const { data: trialsEnding, error } = await supabase
    .from('user_settings')
    .select('user_id, trial_end_date')
    .eq('trial_active', true)
    .gte('trial_end_date', todayStr)
    .lte('trial_end_date', threeDaysFromNow.toISOString().split('T')[0]);

  if (error) {
    console.error('Trial ending query failed:', error);
    return { inApp: 0, push: 0 };
  }

  if (!trialsEnding || trialsEnding.length === 0) return { inApp: 0, push: 0 };

  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'subscription_reminder')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  const notifications: NotificationPayload[] = [];
  for (const trial of trialsEnding) {
    if (notifiedUsers.has(trial.user_id)) continue;

    const endDate = new Date(trial.trial_end_date);
    const daysLeft = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 0 && daysLeft <= 3) {
      notifications.push({
        user_id: trial.user_id,
        type: 'subscription_reminder',
        title: 'Trial Ending Soon',
        body:
          daysLeft === 1
            ? 'Your Pro trial ends tomorrow. Upgrade to keep all features.'
            : `Your Pro trial ends in ${daysLeft} days. Upgrade to keep all features.`,
        data: { daysLeft },
      });
    }
  }

  return await createAndPushNotifications(notifications);
}

/**
 * Send weekly summaries (runs on Sundays)
 */
async function sendWeeklySummaries(
  todayStr: string
): Promise<{ inApp: number; push: number }> {
  const today = new Date(todayStr);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const { data: salesData, error } = await supabase
    .from('items')
    .select('user_id, sale_price, allocated_cost, purchase_cost')
    .eq('status', 'sold')
    .gte('sale_date', weekAgoStr)
    .lte('sale_date', todayStr);

  if (error) {
    console.error('Weekly summary query failed:', error);
    return { inApp: 0, push: 0 };
  }

  if (!salesData || salesData.length === 0) return { inApp: 0, push: 0 };

  const userStats = new Map<
    string,
    { count: number; revenue: number; profit: number }
  >();
  for (const item of salesData) {
    const stats = userStats.get(item.user_id) || {
      count: 0,
      revenue: 0,
      profit: 0,
    };
    const salePrice = item.sale_price || 0;
    const cost = item.allocated_cost || item.purchase_cost || 0;

    stats.count++;
    stats.revenue += salePrice;
    stats.profit += salePrice - cost;

    userStats.set(item.user_id, stats);
  }

  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'weekly_summary')
    .gte('created_at', `${todayStr}T00:00:00Z`);

  const notifiedUsers = new Set((existingNotifs || []).map((n) => n.user_id));

  const notifications: NotificationPayload[] = [];
  for (const [userId, stats] of userStats) {
    if (notifiedUsers.has(userId)) continue;

    const profitStr =
      stats.profit >= 0
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

  return await createAndPushNotifications(notifications);
}
