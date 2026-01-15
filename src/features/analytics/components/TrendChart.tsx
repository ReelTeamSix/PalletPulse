// TrendChart - Interactive profit trend chart for paid tier
// Simple SVG-based line chart implementation
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import type { TrendDataPoint } from '../types/analytics';
import { formatCurrency } from '@/src/lib/profit-utils';

interface TrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - spacing.lg * 2 - spacing.md * 2;
const chartHeight = 180;
const chartPadding = { top: 20, bottom: 40, left: 50, right: 20 };

export function TrendChart({ data, title = 'Profit Trend' }: TrendChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate chart dimensions
  const graphWidth = chartWidth - chartPadding.left - chartPadding.right;
  const graphHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  // Calculate summary stats
  const totalProfit = useMemo(() => {
    return data.reduce((sum, point) => sum + point.profit, 0);
  }, [data]);

  const avgProfit = useMemo(() => {
    return data.length > 0 ? totalProfit / data.length : 0;
  }, [data, totalProfit]);

  // Calculate scales
  const { yMin, yMax, xScale, yScale, points, pathData } = useMemo(() => {
    if (data.length === 0) {
      return { yMin: 0, yMax: 100, xScale: () => 0, yScale: () => 0, points: [], pathData: '' };
    }

    const profits = data.map(d => d.profit);
    const minProfit = Math.min(...profits, 0);
    const maxProfit = Math.max(...profits);
    const yPadding = Math.abs(maxProfit - minProfit) * 0.15 || 10;
    const calculatedYMin = minProfit - yPadding;
    const calculatedYMax = maxProfit + yPadding;

    const calcXScale = (index: number) => {
      return chartPadding.left + (index / (data.length - 1 || 1)) * graphWidth;
    };

    const calcYScale = (value: number) => {
      const normalized = (value - calculatedYMin) / (calculatedYMax - calculatedYMin);
      return chartPadding.top + graphHeight - (normalized * graphHeight);
    };

    const calculatedPoints = data.map((point, index) => ({
      x: calcXScale(index),
      y: calcYScale(point.profit),
      ...point,
    }));

    // Create path data for line
    const path = calculatedPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return {
      yMin: calculatedYMin,
      yMax: calculatedYMax,
      xScale: calcXScale,
      yScale: calcYScale,
      points: calculatedPoints,
      pathData: path,
    };
  }, [data, graphWidth, graphHeight]);

  // Generate Y-axis labels (moved before early return for hooks rules)
  const yAxisLabels = useMemo(() => {
    if (data.length === 0) return [];
    const labels = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) {
      const value = yMin + step * i;
      labels.push({
        value,
        y: yScale(value),
        label: formatCompactCurrency(value),
      });
    }
    return labels;
  }, [data.length, yMin, yMax, yScale]);

  // Generate X-axis labels (moved before early return for hooks rules)
  const xAxisLabels = useMemo(() => {
    if (data.length === 0) return [];
    const maxLabels = Math.min(data.length, 6);
    const step = Math.ceil(data.length / maxLabels);
    const labels = [];
    for (let i = 0; i < data.length; i += step) {
      labels.push({
        index: i,
        x: xScale(i),
        label: formatShortDate(data[i].date, granularity),
      });
    }
    return labels;
  }, [data, xScale, granularity]);

  // Find zero line position
  const zeroY = yMin < 0 && yMax > 0 ? yScale(0) : null;

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyState}>
          <FontAwesome name="line-chart" size={32} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No trend data yet</Text>
          <Text style={styles.emptySubtext}>Sell items to see your profit trend</Text>
        </View>
      </View>
    );
  }

  // Selected point info
  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View style={styles.container}>
      {/* Header with title and granularity toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.granularityToggle}>
          {GRANULARITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.granularityButton,
                granularity === option.value && styles.granularityButtonActive,
              ]}
              onPress={() => setGranularity(option.value)}
            >
              <Text
                style={[
                  styles.granularityText,
                  granularity === option.value && styles.granularityTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, { color: totalProfit >= 0 ? colors.profit : colors.loss }]}>
            {formatCurrency(totalProfit)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Avg/Period</Text>
          <Text style={[styles.statValue, { color: avgProfit >= 0 ? colors.profit : colors.loss }]}>
            {formatCurrency(avgProfit)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Periods</Text>
          <Text style={styles.statValue}>{data.length}</Text>
        </View>
      </View>

      {/* Selected point tooltip */}
      {selectedPoint && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>
            {formatDateLabel(selectedPoint.date, granularity)}
          </Text>
          <Text style={[styles.tooltipProfit, { color: selectedPoint.profit >= 0 ? colors.profit : colors.loss }]}>
            {formatCurrency(selectedPoint.profit)}
          </Text>
          <Text style={styles.tooltipMeta}>
            {selectedPoint.itemsSold} items | {formatCurrency(selectedPoint.revenue)} revenue
          </Text>
        </View>
      )}

      {/* Chart */}
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y-axis grid lines */}
        <G>
          {yAxisLabels.map((label, i) => (
            <G key={i}>
              <Line
                x1={chartPadding.left}
                y1={label.y}
                x2={chartWidth - chartPadding.right}
                y2={label.y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.5}
              />
              <SvgText
                x={chartPadding.left - 8}
                y={label.y + 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {label.label}
              </SvgText>
            </G>
          ))}
        </G>

        {/* X-axis labels */}
        <G>
          {xAxisLabels.map((label, i) => (
            <SvgText
              key={i}
              x={label.x}
              y={chartHeight - chartPadding.bottom + 20}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {label.label}
            </SvgText>
          ))}
        </G>

        {/* Zero line */}
        {zeroY !== null && (
          <Line
            x1={chartPadding.left}
            y1={zeroY}
            x2={chartWidth - chartPadding.right}
            y2={zeroY}
            stroke={colors.textSecondary}
            strokeWidth={1}
            opacity={0.7}
          />
        )}

        {/* Profit line */}
        {pathData && (
          <Path
            d={pathData}
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={selectedIndex === index ? 7 : 5}
            fill={colors.primary}
            stroke={colors.background}
            strokeWidth={2}
            onPress={() => setSelectedIndex(selectedIndex === index ? null : index)}
          />
        ))}
      </Svg>
    </View>
  );
}

// Helper functions
function formatDateLabel(dateStr: string, granularity: Granularity): string {
  const date = new Date(dateStr);

  switch (granularity) {
    case 'daily':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    default:
      return dateStr;
  }
}

function formatShortDate(dateStr: string, granularity: Granularity): string {
  const date = new Date(dateStr);

  switch (granularity) {
    case 'daily':
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    case 'weekly':
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    case 'monthly':
      return date.toLocaleDateString('en-US', { month: 'short' });
    default:
      return dateStr;
  }
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  granularityToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  granularityButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  granularityButtonActive: {
    backgroundColor: colors.primary,
  },
  granularityText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  granularityTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  tooltip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tooltipDate: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tooltipProfit: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  tooltipMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
