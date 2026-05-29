// Promotion pricing matrix (locked per owner spec). Hardcoded — no live FX.
// Prices are in MAJOR units (₹ / $). Smallest unit (paise/cents) = major * 100.

export type PromoteCurrency = "INR" | "USD";

/** GST applied to INR only. */
export const GST_RATE = 0.18;

/** India (INR) base price per duration in hours (1–24). +18% GST extra. */
export const INR_PRICES: Record<number, number> = {
  1: 499.99, 2: 999.99, 3: 1400.99, 4: 1999.99, 5: 2499.99, 6: 2999.99,
  7: 3499.99, 8: 3999.99, 9: 4499.99, 10: 4999.99, 11: 5499.99, 12: 5999.99,
  13: 6499.99, 14: 6999.99, 15: 7499.99, 16: 7999.99, 17: 8499.99, 18: 8999.99,
  19: 9499.99, 20: 9999.99, 21: 10499.99, 22: 10999.99, 23: 11499.99, 24: 11999.99,
};

/** International (USD) price per duration in hours (1–24). No GST. */
export const USD_PRICES: Record<number, number> = {
  1: 4.99, 2: 9.99, 3: 14.99, 4: 19.99, 5: 24.99, 6: 29.99,
  7: 34.99, 8: 39.99, 9: 44.99, 10: 49.99, 11: 54.99, 12: 59.99,
  13: 64.99, 14: 69.99, 15: 74.99, 16: 79.99, 17: 84.99, 18: 89.99,
  19: 94.99, 20: 99.99, 21: 104.99, 22: 109.99, 23: 114.99, 24: 119.99,
};

export const DURATIONS = Array.from({ length: 24 }, (_, i) => i + 1);

export const CURRENCY_SYMBOL: Record<PromoteCurrency, string> = {
  INR: "₹",
  USD: "$",
};

export const PAYMENT_GATEWAY: Record<PromoteCurrency, "RAZORPAY" | "STRIPE"> = {
  INR: "RAZORPAY",
  USD: "STRIPE",
};

export interface PriceBreakdown {
  currency: PromoteCurrency;
  symbol: string;
  base: number; // major units
  gst: number; // major units
  total: number; // major units
  totalSmallestUnit: number; // paise/cents (integer)
  hasGst: boolean;
}

/** Compute price breakdown for a given duration + currency. */
export function getPriceBreakdown(duration: number, currency: PromoteCurrency): PriceBreakdown {
  const table = currency === "INR" ? INR_PRICES : USD_PRICES;
  const base = table[duration] ?? table[1];
  const hasGst = currency === "INR";
  const gst = hasGst ? base * GST_RATE : 0;
  const total = base + gst;
  return {
    currency,
    symbol: CURRENCY_SYMBOL[currency],
    base: round2(base),
    gst: round2(gst),
    total: round2(total),
    totalSmallestUnit: Math.round(total * 100),
    hasGst,
  };
}

export function formatMoney(amount: number, currency: PromoteCurrency): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Lightweight country/currency auto-detection (client-side, no live geo).
 * Indian timezones → INR, everything else → USD. User can override via toggle.
 */
export function detectDefaultCurrency(): PromoteCurrency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/Asia\/(Kolkata|Calcutta)/i.test(tz)) return "INR";
    const locale = (navigator.language || "").toLowerCase();
    if (locale.endsWith("-in") || locale === "hi") return "INR";
  } catch {
    /* ignore */
  }
  return "USD";
}

export function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/Asia\/(Kolkata|Calcutta)/i.test(tz)) return "IN";
  } catch {
    /* ignore */
  }
  const locale = (navigator.language || "").toUpperCase();
  const parts = locale.split("-");
  return parts.length > 1 ? parts[1] : "US";
}
