// PDF Export Utilities
// Generate professional PDF reports for Pro tier users
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import type { ProfitLossSummary } from './profit-loss-calculations';
import type { ExpenseWithPallets } from '@/src/stores/expenses-store';
import type { MileageTripWithPallets } from '@/src/stores/mileage-store';
import type {
  HeroMetrics,
  PalletAnalytics,
  SupplierComparison,
  PalletTypeComparison,
  TypeComparison,
} from '../types/analytics';

// ============================================================================
// Types
// ============================================================================

export interface PDFExportResult {
  success: boolean;
  error?: string;
  filename?: string;
}

// Analytics summary data for PDF export
export interface AnalyticsSummaryData {
  heroMetrics: HeroMetrics;
  supplierRankings: SupplierComparison[];
  palletTypeRankings: PalletTypeComparison[];
  palletLeaderboard: PalletAnalytics[];
  typeComparison: TypeComparison[];
  periodStart: string;
  periodEnd: string;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============================================================================
// Image Utilities for Receipt Photos
// ============================================================================

interface ReceiptImage {
  expenseDate: string;
  amount: number;
  category: string;
  base64Data: string | null;
  error?: string;
}

/**
 * Convert a local file URI to base64 data URI for embedding in HTML
 * Returns null if the file cannot be read
 */
async function localUriToBase64(uri: string): Promise<string | null> {
  try {
    // Handle file:// URIs and content:// URIs (Android)
    const response = await fetch(uri);
    if (!response.ok) return null;

    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result); // Returns data:image/jpeg;base64,... format
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Load receipt images for expenses that have them
 * Returns array of receipt data with base64 encoded images
 */
async function loadReceiptImages(
  expenses: ExpenseWithPallets[],
  categoryLabels: Record<string, string>
): Promise<ReceiptImage[]> {
  const expensesWithReceipts = expenses.filter(e => e.receipt_photo_path);

  const results = await Promise.all(
    expensesWithReceipts.map(async (expense) => {
      const base64Data = await localUriToBase64(expense.receipt_photo_path!);
      return {
        expenseDate: expense.expense_date,
        amount: expense.amount,
        category: categoryLabels[expense.category] || expense.category,
        base64Data,
        error: base64Data ? undefined : 'Could not load image',
      };
    })
  );

  return results;
}

// ============================================================================
// Common PDF Styles
// ============================================================================

const PDF_STYLES = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: letter;
      margin: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1E293B;
      line-height: 1.4;
      font-size: 13px;
    }

    .page {
      padding: 32px 40px;
      page-break-after: always;
      min-height: 100vh;
      position: relative;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Header - appears on every page */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      margin-bottom: 20px;
      border-bottom: 2px solid #2563EB;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
    }

    .brand-text {
      font-size: 20px;
      font-weight: 700;
      color: #2563EB;
    }

    .header-right {
      text-align: right;
    }

    .report-title {
      font-size: 14px;
      font-weight: 600;
      color: #1E293B;
    }

    .period {
      font-size: 12px;
      color: #64748B;
      margin-top: 2px;
    }

    /* Hero Metrics Grid */
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .hero-card {
      background: #F8FAFC;
      border-radius: 10px;
      padding: 14px;
      border: 1px solid #E2E8F0;
    }

    .hero-card.highlight {
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      border: none;
    }

    .hero-card.highlight .hero-label,
    .hero-card.highlight .hero-value {
      color: white;
    }

    .hero-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .hero-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .hero-icon.profit { background: #DCFCE7; color: #22C55E; }
    .hero-icon.loss { background: #FEE2E2; color: #EF4444; }
    .hero-icon.neutral { background: #E0E7FF; color: #2563EB; }
    .hero-icon.white { background: rgba(255,255,255,0.2); color: white; }

    .hero-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .hero-value {
      font-size: 22px;
      font-weight: 700;
      color: #1E293B;
    }

    .hero-value.positive { color: #22C55E; }
    .hero-value.negative { color: #EF4444; }

    /* Sections */
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E2E8F0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }

    tr {
      page-break-inside: avoid;
    }

    th {
      text-align: left;
      padding: 8px 6px;
      font-size: 10px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }

    td {
      padding: 8px 6px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 12px;
    }

    tr:last-child td { border-bottom: none; }

    .text-right { text-align: right; }

    .total-row td {
      font-weight: 700;
      border-top: 2px solid #1E293B;
      border-bottom: none;
      background: #F8FAFC;
      padding-top: 10px;
    }

    .subtotal-row td {
      font-weight: 600;
      background: #F8FAFC;
    }

    /* Two Column Layout */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    /* Financial Summary Box */
    .summary-box {
      background: #F8FAFC;
      border-radius: 10px;
      padding: 16px;
      border: 1px solid #E2E8F0;
      page-break-inside: avoid;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #E2E8F0;
      font-size: 12px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-row.highlight {
      font-weight: 700;
      font-size: 14px;
      padding: 10px 0;
      margin-top: 4px;
      border-top: 2px solid #1E293B;
      border-bottom: none;
    }

    .summary-row.subtotal {
      font-weight: 600;
      background: #F1F5F9;
      margin: 4px -16px;
      padding: 8px 16px;
    }

    /* Footer */
    .page-footer {
      position: absolute;
      bottom: 24px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      font-size: 10px;
      color: #94A3B8;
    }

    .page-number {
      font-weight: 600;
    }

    /* Receipt Appendix Styles */
    .receipt-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      page-break-inside: avoid;
    }

    .receipt-card {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .receipt-image {
      width: 100%;
      height: 220px;
      object-fit: contain;
      background: #F8FAFC;
    }

    .receipt-info {
      padding: 10px 12px;
      background: white;
      border-top: 1px solid #E2E8F0;
    }

    .receipt-date {
      font-size: 12px;
      font-weight: 600;
      color: #1E293B;
    }

    .receipt-details {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }

    .receipt-placeholder {
      width: 100%;
      height: 220px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
      font-size: 12px;
    }

    .appendix-note {
      margin-top: 16px;
      padding: 12px 16px;
      background: #F0F9FF;
      border-radius: 8px;
      border-left: 4px solid #2563EB;
      font-size: 11px;
      color: #1E40AF;
    }
  </style>
`;

// ============================================================================
// Profit & Loss PDF
// ============================================================================

function generatePageHeader(title: string, periodStart: string, periodEnd: string): string {
  return `
    <div class="page-header">
      <div class="brand">
        <div class="brand-icon">P</div>
        <div class="brand-text">PalletPro</div>
      </div>
      <div class="header-right">
        <div class="report-title">${title}</div>
        <div class="period">${formatDate(periodStart)} — ${formatDate(periodEnd)}</div>
      </div>
    </div>
  `;
}

function generatePageFooter(pageNum: number, totalPages: number): string {
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
    <div class="page-footer">
      <span>Generated by PalletPro on ${generatedDate}</span>
      <span class="page-number">Page ${pageNum} of ${totalPages}</span>
    </div>
  `;
}

export function generateProfitLossHTML(summary: ProfitLossSummary): string {
  const { revenue, cogs, sellingExpenses, operatingExpenses, mileageDeductions } = summary;
  const isProfit = summary.netProfit >= 0;
  const totalDeductions = sellingExpenses.totalSellingExpenses + operatingExpenses.totalOperatingExpenses + mileageDeductions.totalDeduction;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${PDF_STYLES}
    </head>
    <body>
      <!-- Page 1: Summary & Financial Overview -->
      <div class="page">
        ${generatePageHeader('Profit & Loss Statement', summary.periodStart, summary.periodEnd)}

        <!-- Hero Metrics -->
        <div class="hero-grid">
          <div class="hero-card highlight">
            <div class="hero-top">
              <div class="hero-icon white">${isProfit ? '↑' : '↓'}</div>
              <div class="hero-label">Net ${isProfit ? 'Profit' : 'Loss'}</div>
            </div>
            <div class="hero-value">${formatCurrency(Math.abs(summary.netProfit))}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">$</div>
              <div class="hero-label">Gross Sales</div>
            </div>
            <div class="hero-value">${formatCurrency(revenue.grossSales)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon ${summary.grossMargin >= 0 ? 'profit' : 'loss'}">%</div>
              <div class="hero-label">Gross Margin</div>
            </div>
            <div class="hero-value ${summary.grossMargin >= 0 ? 'positive' : 'negative'}">${formatPercent(summary.grossMargin)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">#</div>
              <div class="hero-label">Items Sold</div>
            </div>
            <div class="hero-value">${revenue.itemsSold}</div>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="section">
          <div class="section-title">Financial Summary</div>
          <div class="summary-box">
            <div class="summary-row">
              <span><strong>Revenue</strong></span>
              <span></span>
            </div>
            <div class="summary-row">
              <span style="padding-left: 12px;">Gross Sales (${revenue.itemsSold} items)</span>
              <span>${formatCurrency(revenue.grossSales)}</span>
            </div>
            <div class="summary-row subtotal">
              <span><strong>Cost of Goods Sold</strong></span>
              <span><strong>(${formatCurrency(cogs.totalCOGS)})</strong></span>
            </div>
            <div class="summary-row">
              <span style="padding-left: 12px;">Pallet Items (${cogs.palletCount} sold)</span>
              <span>${formatCurrency(cogs.palletPurchases)}</span>
            </div>
            ${cogs.individualItemPurchases > 0 ? `
            <div class="summary-row">
              <span style="padding-left: 12px;">Individual Items (${cogs.individualItemCount} sold)</span>
              <span>${formatCurrency(cogs.individualItemPurchases)}</span>
            </div>
            ` : ''}
            <div class="summary-row subtotal">
              <span><strong>Gross Profit</strong></span>
              <span style="color: ${summary.grossProfit >= 0 ? '#22C55E' : '#EF4444'}"><strong>${formatCurrency(summary.grossProfit)}</strong></span>
            </div>
            <div class="summary-row">
              <span><strong>Operating Deductions</strong></span>
              <span><strong>(${formatCurrency(totalDeductions)})</strong></span>
            </div>
            <div class="summary-row">
              <span style="padding-left: 12px;">Selling Expenses</span>
              <span>(${formatCurrency(sellingExpenses.totalSellingExpenses)})</span>
            </div>
            <div class="summary-row">
              <span style="padding-left: 12px;">Operating Expenses</span>
              <span>(${formatCurrency(operatingExpenses.totalOperatingExpenses)})</span>
            </div>
            <div class="summary-row">
              <span style="padding-left: 12px;">Mileage Deductions</span>
              <span>(${formatCurrency(mileageDeductions.totalDeduction)})</span>
            </div>
            <div class="summary-row highlight">
              <span>Net ${isProfit ? 'Profit' : 'Loss'}</span>
              <span style="color: ${isProfit ? '#22C55E' : '#EF4444'}">${formatCurrency(summary.netProfit)}</span>
            </div>
          </div>
        </div>

        <!-- Two Column: Platform & Expenses -->
        <div class="two-col">
          ${summary.platformBreakdown.length > 0 ? `
          <div class="section">
            <div class="section-title">Sales by Platform</div>
            <table>
              <tr>
                <th>Platform</th>
                <th class="text-right">Sales</th>
                <th class="text-right">Fees</th>
                <th class="text-right">#</th>
              </tr>
              ${summary.platformBreakdown.map(p => `
              <tr>
                <td>${p.platform}</td>
                <td class="text-right">${formatCurrency(p.sales)}</td>
                <td class="text-right">${formatCurrency(p.fees)}</td>
                <td class="text-right">${p.count}</td>
              </tr>
              `).join('')}
            </table>
          </div>
          ` : '<div></div>'}

          <div class="section">
            <div class="section-title">Operating Expenses</div>
            <table>
              ${operatingExpenses.byCategory.map(c => `
              <tr>
                <td>${c.label}</td>
                <td class="text-right">${formatCurrency(c.amount)}</td>
              </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total</td>
                <td class="text-right">${formatCurrency(operatingExpenses.totalOperatingExpenses)}</td>
              </tr>
            </table>
          </div>
        </div>

        ${generatePageFooter(1, 2)}
      </div>

      <!-- Page 2: Detailed Breakdown -->
      <div class="page">
        ${generatePageHeader('Profit & Loss Statement', summary.periodStart, summary.periodEnd)}

        <div class="two-col">
          <div>
            <div class="section">
              <div class="section-title">Selling Expenses Detail</div>
              <table>
                <tr>
                  <td>Platform Fees</td>
                  <td class="text-right">${formatCurrency(sellingExpenses.platformFees)}</td>
                </tr>
                <tr>
                  <td>Shipping Costs</td>
                  <td class="text-right">${formatCurrency(sellingExpenses.shippingCosts)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Selling Expenses</td>
                  <td class="text-right">${formatCurrency(sellingExpenses.totalSellingExpenses)}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Mileage Deductions</div>
              <table>
                <tr>
                  <td>Miles Driven</td>
                  <td class="text-right">${mileageDeductions.totalMiles.toFixed(1)} mi</td>
                </tr>
                <tr>
                  <td>IRS Standard Rate</td>
                  <td class="text-right">$${mileageDeductions.avgRate.toFixed(3)}/mi</td>
                </tr>
                <tr>
                  <td>Number of Trips</td>
                  <td class="text-right">${mileageDeductions.tripCount}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Deduction</td>
                  <td class="text-right">${formatCurrency(mileageDeductions.totalDeduction)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div>
            <div class="section">
              <div class="section-title">Revenue Details</div>
              <table>
                <tr>
                  <td>Total Items Sold</td>
                  <td class="text-right">${revenue.itemsSold}</td>
                </tr>
                <tr>
                  <td>Gross Sales</td>
                  <td class="text-right">${formatCurrency(revenue.grossSales)}</td>
                </tr>
                <tr>
                  <td>Average Sale Price</td>
                  <td class="text-right">${formatCurrency(revenue.avgSalePrice)}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Cost of Goods Sold Breakdown</div>
              <table>
                <tr>
                  <td>Pallet Items Cost</td>
                  <td class="text-right">${formatCurrency(cogs.palletPurchases)}</td>
                </tr>
                <tr>
                  <td>Pallet Items Sold</td>
                  <td class="text-right">${cogs.palletCount}</td>
                </tr>
                ${cogs.individualItemPurchases > 0 ? `
                <tr>
                  <td>Individual Items Cost</td>
                  <td class="text-right">${formatCurrency(cogs.individualItemPurchases)}</td>
                </tr>
                <tr>
                  <td>Individual Items Sold</td>
                  <td class="text-right">${cogs.individualItemCount}</td>
                </tr>
                ` : ''}
                ${cogs.salesTax > 0 ? `
                <tr>
                  <td>Sales Tax (Prorated)</td>
                  <td class="text-right">${formatCurrency(cogs.salesTax)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td>Total COGS</td>
                  <td class="text-right">${formatCurrency(cogs.totalCOGS)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- Tax Note -->
        <div style="margin-top: 24px; padding: 16px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <div style="font-weight: 600; color: #92400E; margin-bottom: 4px;">Tax Preparation Note</div>
          <div style="font-size: 11px; color: #78350F; line-height: 1.5;">
            This report is for informational purposes. Consult a qualified tax professional to ensure
            compliance with IRS regulations. Mileage deductions use the IRS standard rate at time of recording.
            Keep all receipts and documentation for your records.
          </div>
        </div>

        ${generatePageFooter(2, 2)}
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Expenses PDF
// ============================================================================

// Category labels shared between functions
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Supplies',
  storage: 'Storage',
  subscriptions: 'Subscriptions',
  equipment: 'Equipment',
  other: 'Other',
  gas: 'Gas',
  mileage: 'Mileage',
  fees: 'Fees',
  shipping: 'Shipping',
};

export function generateExpensesHTML(
  expenses: ExpenseWithPallets[],
  palletMap: Map<string, string>,
  dateRange?: { start: string | null; end: string | null },
  receiptImages?: ReceiptImage[]
): string {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgExpense = expenses.length > 0 ? totalAmount / expenses.length : 0;

  // Group by category
  const byCategory = new Map<string, { amount: number; count: number }>();
  expenses.forEach(e => {
    const existing = byCategory.get(e.category) || { amount: 0, count: 0 };
    byCategory.set(e.category, { amount: existing.amount + e.amount, count: existing.count + 1 });
  });

  const periodDisplay = dateRange?.start && dateRange?.end
    ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
    : 'All Time';

  // Calculate pages: 1 for main content + pages for receipts (2 per page)
  const validReceipts = receiptImages?.filter(r => r.base64Data) || [];
  const receiptPageCount = Math.ceil(validReceipts.length / 4); // 4 receipts per page (2x2 grid)
  const totalPages = 1 + receiptPageCount;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${PDF_STYLES}
    </head>
    <body>
      <div class="page">
        <div class="page-header">
          <div class="brand">
            <div class="brand-icon">P</div>
            <div class="brand-text">PalletPro</div>
          </div>
          <div class="header-right">
            <div class="report-title">Expense Report</div>
            <div class="period">${periodDisplay}</div>
          </div>
        </div>

        <!-- Hero Metrics -->
        <div class="hero-grid">
          <div class="hero-card highlight">
            <div class="hero-top">
              <div class="hero-icon white">$</div>
              <div class="hero-label">Total Expenses</div>
            </div>
            <div class="hero-value">${formatCurrency(totalAmount)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">#</div>
              <div class="hero-label">Count</div>
            </div>
            <div class="hero-value">${expenses.length}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">≈</div>
              <div class="hero-label">Average</div>
            </div>
            <div class="hero-value">${formatCurrency(avgExpense)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">☰</div>
              <div class="hero-label">Categories</div>
            </div>
            <div class="hero-value">${byCategory.size}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">By Category</div>
          <table>
            <tr>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th class="text-right">Count</th>
              <th class="text-right">% of Total</th>
            </tr>
            ${Array.from(byCategory.entries())
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([cat, data]) => `
            <tr>
              <td>${EXPENSE_CATEGORY_LABELS[cat] || cat}</td>
              <td class="text-right">${formatCurrency(data.amount)}</td>
              <td class="text-right">${data.count}</td>
              <td class="text-right">${((data.amount / totalAmount) * 100).toFixed(1)}%</td>
            </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total</td>
              <td class="text-right">${formatCurrency(totalAmount)}</td>
              <td class="text-right">${expenses.length}</td>
              <td class="text-right">100%</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">All Expenses</div>
          <table>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Linked Pallet</th>
              <th class="text-right">Amount</th>
            </tr>
            ${expenses.map(e => {
              const palletNames = e.pallet_ids?.map(id => palletMap.get(id)).filter(Boolean).join(', ') || '-';
              return `
            <tr>
              <td>${formatDate(e.expense_date)}</td>
              <td>${e.description || '-'}</td>
              <td>${EXPENSE_CATEGORY_LABELS[e.category] || e.category}</td>
              <td>${palletNames}</td>
              <td class="text-right">${formatCurrency(e.amount)}</td>
            </tr>
              `;
            }).join('')}
          </table>
        </div>

        <div class="page-footer">
          <span>Generated by PalletPro on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span class="page-number">Page 1 of ${totalPages}</span>
        </div>
      </div>

      ${validReceipts.length > 0 ? generateReceiptAppendixPages(validReceipts, periodDisplay, totalPages) : ''}
    </body>
    </html>
  `;
}

/**
 * Generate receipt appendix pages for the Expenses PDF
 * Displays receipts in a 2x2 grid (4 per page)
 */
function generateReceiptAppendixPages(
  receipts: ReceiptImage[],
  periodDisplay: string,
  totalPages: number
): string {
  const receiptsPerPage = 4;
  const pageCount = Math.ceil(receipts.length / receiptsPerPage);
  const pages: string[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const startIdx = pageIndex * receiptsPerPage;
    const pageReceipts = receipts.slice(startIdx, startIdx + receiptsPerPage);
    const pageNum = 2 + pageIndex; // Main content is page 1

    pages.push(`
      <div class="page">
        <div class="page-header">
          <div class="brand">
            <div class="brand-icon">P</div>
            <div class="brand-text">PalletPro</div>
          </div>
          <div class="header-right">
            <div class="report-title">Receipt Appendix</div>
            <div class="period">${periodDisplay}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Expense Receipts${pageCount > 1 ? ` (Page ${pageIndex + 1} of ${pageCount})` : ''}</div>
          <div class="receipt-grid">
            ${pageReceipts.map(receipt => `
              <div class="receipt-card">
                ${receipt.base64Data
                  ? `<img class="receipt-image" src="${receipt.base64Data}" alt="Receipt" />`
                  : `<div class="receipt-placeholder">Image not available</div>`
                }
                <div class="receipt-info">
                  <div class="receipt-date">${formatDate(receipt.expenseDate)}</div>
                  <div class="receipt-details">${receipt.category} • ${formatCurrency(receipt.amount)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${pageIndex === pageCount - 1 ? `
        <div class="appendix-note">
          <strong>Important Disclaimer:</strong> These receipt images are provided as a convenience only and should not be relied upon as official
          tax documentation. PalletPro makes no guarantees regarding the accuracy, completeness, or legibility of these images.
          You are solely responsible for maintaining original receipts and documentation as required by the IRS and applicable tax regulations.
          Consult a qualified tax professional for guidance on record-keeping requirements.
        </div>
        ` : ''}

        <div class="page-footer">
          <span>Generated by PalletPro on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span class="page-number">Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `);
  }

  return pages.join('');
}

// ============================================================================
// Mileage PDF
// ============================================================================

export function generateMileageHTML(
  trips: MileageTripWithPallets[],
  palletMap: Map<string, string>,
  dateRange?: { start: string | null; end: string | null }
): string {
  const totalMiles = trips.reduce((sum, t) => sum + t.miles, 0);
  const totalDeduction = trips.reduce((sum, t) => sum + t.miles * t.mileage_rate, 0);
  const avgMilesPerTrip = trips.length > 0 ? totalMiles / trips.length : 0;
  const avgRate = trips.length > 0
    ? trips.reduce((sum, t) => sum + t.mileage_rate, 0) / trips.length
    : 0;

  const purposeLabels: Record<string, string> = {
    pallet_pickup: 'Pallet Pickup',
    thrift_run: 'Thrift Run',
    garage_sale: 'Garage Sale',
    post_office: 'Post Office',
    auction: 'Auction',
    sourcing: 'Sourcing',
    other: 'Other',
  };

  const periodDisplay = dateRange?.start && dateRange?.end
    ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
    : 'All Time';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${PDF_STYLES}
    </head>
    <body>
      <div class="page">
        <div class="page-header">
          <div class="brand">
            <div class="brand-icon">P</div>
            <div class="brand-text">PalletPro</div>
          </div>
          <div class="header-right">
            <div class="report-title">Mileage Report</div>
            <div class="period">${periodDisplay}</div>
          </div>
        </div>

        <!-- Hero Metrics -->
        <div class="hero-grid">
          <div class="hero-card highlight">
            <div class="hero-top">
              <div class="hero-icon white">$</div>
              <div class="hero-label">Total Deduction</div>
            </div>
            <div class="hero-value">${formatCurrency(totalDeduction)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">⟳</div>
              <div class="hero-label">Total Miles</div>
            </div>
            <div class="hero-value">${totalMiles.toFixed(1)} mi</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">#</div>
              <div class="hero-label">Trips</div>
            </div>
            <div class="hero-value">${trips.length}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">≈</div>
              <div class="hero-label">Avg/Trip</div>
            </div>
            <div class="hero-value">${avgMilesPerTrip.toFixed(1)} mi</div>
          </div>
        </div>

        <!-- IRS Rate Info -->
        <div style="margin-bottom: 18px; padding: 12px 16px; background: #EEF2FF; border-radius: 8px; border-left: 4px solid #2563EB;">
          <div style="font-size: 11px; color: #3730A3;">
            <strong>IRS Standard Mileage Rate:</strong> Deductions calculated using the IRS standard rate at time of trip recording (avg $${avgRate.toFixed(3)}/mi for this period).
          </div>
        </div>

        <div class="section">
          <div class="section-title">All Mileage Trips</div>
          <table>
            <tr>
              <th>Date</th>
              <th>Purpose</th>
              <th>Notes</th>
              <th>Linked Pallet</th>
              <th class="text-right">Miles</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Deduction</th>
            </tr>
            ${trips.map(t => {
              const palletNames = t.pallet_ids?.map(id => palletMap.get(id)).filter(Boolean).join(', ') || '-';
              const deduction = t.miles * t.mileage_rate;
              return `
            <tr>
              <td>${formatDate(t.trip_date)}</td>
              <td>${purposeLabels[t.purpose] || t.purpose}</td>
              <td>${t.notes || '-'}</td>
              <td>${palletNames}</td>
              <td class="text-right">${t.miles.toFixed(1)}</td>
              <td class="text-right">$${t.mileage_rate.toFixed(3)}</td>
              <td class="text-right">${formatCurrency(deduction)}</td>
            </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4">Total</td>
              <td class="text-right">${totalMiles.toFixed(1)}</td>
              <td></td>
              <td class="text-right">${formatCurrency(totalDeduction)}</td>
            </tr>
          </table>
        </div>

        <div class="page-footer">
          <span>Generated by PalletPro on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span class="page-number">Page 1 of 1</span>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Analytics Summary PDF
// ============================================================================

export function generateAnalyticsSummaryHTML(data: AnalyticsSummaryData): string {
  const { heroMetrics, supplierRankings, palletTypeRankings, palletLeaderboard, typeComparison } = data;
  const isProfit = heroMetrics.totalProfit >= 0;

  // Get source type label
  const getSourceTypeLabel = (sourceType: string): string => {
    const labels: Record<string, string> = {
      pallet: 'Pallet',
      thrift: 'Thrift Store',
      garage_sale: 'Garage Sale',
      estate_sale: 'Estate Sale',
      auction: 'Auction',
      retail_arbitrage: 'Retail Arbitrage',
      wholesale: 'Wholesale',
      online_arbitrage: 'Online Arbitrage',
      other: 'Other',
    };
    return labels[sourceType] || sourceType;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${PDF_STYLES}
    </head>
    <body>
      <!-- Page 1: Summary & Rankings -->
      <div class="page">
        ${generatePageHeader('Analytics Summary', data.periodStart, data.periodEnd)}

        <!-- Hero Metrics -->
        <div class="hero-grid">
          <div class="hero-card highlight">
            <div class="hero-top">
              <div class="hero-icon white">${isProfit ? '↑' : '↓'}</div>
              <div class="hero-label">Total ${isProfit ? 'Profit' : 'Loss'}</div>
            </div>
            <div class="hero-value">${formatCurrency(Math.abs(heroMetrics.totalProfit))}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">#</div>
              <div class="hero-label">Items Sold</div>
            </div>
            <div class="hero-value">${heroMetrics.totalItemsSold}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon ${heroMetrics.avgROI >= 0 ? 'profit' : 'loss'}">%</div>
              <div class="hero-label">Avg ROI</div>
            </div>
            <div class="hero-value ${heroMetrics.avgROI >= 0 ? 'positive' : 'negative'}">${formatPercent(heroMetrics.avgROI)}</div>
          </div>
          <div class="hero-card">
            <div class="hero-top">
              <div class="hero-icon neutral">$</div>
              <div class="hero-label">Inventory Value</div>
            </div>
            <div class="hero-value">${formatCurrency(heroMetrics.activeInventoryValue)}</div>
          </div>
        </div>

        ${supplierRankings.length > 0 ? `
        <!-- Top Suppliers -->
        <div class="section">
          <div class="section-title">Top Suppliers</div>
          <table>
            <tr>
              <th>#</th>
              <th>Supplier</th>
              <th class="text-right">Profit</th>
              <th class="text-right">ROI</th>
              <th class="text-right">Pallets</th>
            </tr>
            ${supplierRankings.slice(0, 10).map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${s.supplier}</td>
              <td class="text-right" style="color: ${s.totalProfit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(s.totalProfit)}</td>
              <td class="text-right" style="color: ${s.avgROI >= 0 ? '#22C55E' : '#EF4444'}">${formatPercent(s.avgROI)}</td>
              <td class="text-right">${s.palletCount}</td>
            </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        ${palletTypeRankings.length > 0 ? `
        <!-- Top Pallet Types -->
        <div class="section">
          <div class="section-title">Top Pallet Types</div>
          <table>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th class="text-right">Profit</th>
              <th class="text-right">ROI</th>
              <th class="text-right">Pallets</th>
            </tr>
            ${palletTypeRankings.slice(0, 10).map((p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.palletType}${p.isMysteryBox ? ' 🎁' : ''}</td>
              <td class="text-right" style="color: ${p.totalProfit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(p.totalProfit)}</td>
              <td class="text-right" style="color: ${p.avgROI >= 0 ? '#22C55E' : '#EF4444'}">${formatPercent(p.avgROI)}</td>
              <td class="text-right">${p.palletCount}</td>
            </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        ${generatePageFooter(1, 2)}
      </div>

      <!-- Page 2: Leaderboard & Source Comparison -->
      <div class="page">
        ${generatePageHeader('Analytics Summary', data.periodStart, data.periodEnd)}

        ${palletLeaderboard.length > 0 ? `
        <!-- Pallet Leaderboard -->
        <div class="section">
          <div class="section-title">Pallet Leaderboard</div>
          <table>
            <tr>
              <th>#</th>
              <th>Pallet</th>
              <th>Source</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Profit</th>
              <th class="text-right">ROI</th>
              <th class="text-right">Sell-Thru</th>
            </tr>
            ${palletLeaderboard.slice(0, 15).map((p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.name}</td>
              <td>${p.sourceName || '-'}</td>
              <td class="text-right">${formatCurrency(p.totalRevenue)}</td>
              <td class="text-right" style="color: ${p.profit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(p.profit)}</td>
              <td class="text-right" style="color: ${p.roi >= 0 ? '#22C55E' : '#EF4444'}">${formatPercent(p.roi)}</td>
              <td class="text-right">${formatPercent(p.sellThroughRate)}</td>
            </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        ${typeComparison.length > 0 ? `
        <!-- Source Type Comparison -->
        <div class="section">
          <div class="section-title">Sourcing Method Comparison</div>
          <table>
            <tr>
              <th>Source Type</th>
              <th class="text-right">Pallets</th>
              <th class="text-right">Total Profit</th>
              <th class="text-right">Avg ROI</th>
              <th class="text-right">Avg Profit/Pallet</th>
              <th class="text-right">Sell-Thru</th>
            </tr>
            ${typeComparison.map(t => `
            <tr>
              <td>${getSourceTypeLabel(t.sourceType)}</td>
              <td class="text-right">${t.palletCount}</td>
              <td class="text-right" style="color: ${t.totalProfit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(t.totalProfit)}</td>
              <td class="text-right" style="color: ${t.avgROI >= 0 ? '#22C55E' : '#EF4444'}">${formatPercent(t.avgROI)}</td>
              <td class="text-right">${formatCurrency(t.avgProfitPerPallet)}</td>
              <td class="text-right">${formatPercent(t.sellThroughRate)}</td>
            </tr>
            `).join('')}
          </table>
        </div>
        ` : ''}

        <!-- Key Takeaways Note -->
        <div style="margin-top: 24px; padding: 16px; background: #EEF2FF; border-radius: 8px; border-left: 4px solid #2563EB;">
          <div style="font-weight: 600; color: #3730A3; margin-bottom: 4px;">Performance Insights</div>
          <div style="font-size: 11px; color: #4338CA; line-height: 1.5;">
            This analytics summary shows your sourcing performance. Focus on suppliers and pallet types
            with the highest ROI and sell-through rates. For detailed financial reporting including
            expenses and tax deductions, export the Profit & Loss statement.
          </div>
        </div>

        ${generatePageFooter(2, 2)}
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// PDF Generation & Sharing
// ============================================================================

export async function generateAndSharePDF(html: string, filename: string): Promise<PDFExportResult> {
  try {
    // Generate PDF from HTML
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share the PDF
    await shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export ${filename}`,
      UTI: 'com.adobe.pdf',
    });

    return {
      success: true,
      filename,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// High-Level Export Functions
// ============================================================================

export async function exportProfitLossPDF(summary: ProfitLossSummary): Promise<PDFExportResult> {
  const html = generateProfitLossHTML(summary);
  const timestamp = new Date().toISOString().slice(0, 10);
  return generateAndSharePDF(html, `profit-loss-${timestamp}.pdf`);
}

export async function exportExpensesPDF(
  expenses: ExpenseWithPallets[],
  palletMap: Map<string, string>,
  dateRange?: { start: string; end: string },
  includeReceipts: boolean = true
): Promise<PDFExportResult> {
  // Load receipt images if requested
  let receiptImages: ReceiptImage[] | undefined;
  if (includeReceipts) {
    receiptImages = await loadReceiptImages(expenses, EXPENSE_CATEGORY_LABELS);
  }

  const html = generateExpensesHTML(expenses, palletMap, dateRange, receiptImages);
  const timestamp = new Date().toISOString().slice(0, 10);
  return generateAndSharePDF(html, `expenses-${timestamp}.pdf`);
}

export async function exportMileagePDF(
  trips: MileageTripWithPallets[],
  palletMap: Map<string, string>,
  dateRange?: { start: string; end: string }
): Promise<PDFExportResult> {
  const html = generateMileageHTML(trips, palletMap, dateRange);
  const timestamp = new Date().toISOString().slice(0, 10);
  return generateAndSharePDF(html, `mileage-${timestamp}.pdf`);
}

export async function exportAnalyticsSummaryPDF(data: AnalyticsSummaryData): Promise<PDFExportResult> {
  const html = generateAnalyticsSummaryHTML(data);
  const timestamp = new Date().toISOString().slice(0, 10);
  return generateAndSharePDF(html, `analytics-summary-${timestamp}.pdf`);
}
