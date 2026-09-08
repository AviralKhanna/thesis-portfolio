const API_ROOT = "https://api.upstox.com";
const UNITS = new Map([
  ["minutes", 300],
  ["hours", 5],
  ["days", 1],
  ["weeks", 1],
  ["months", 1]
]);

export class UpstoxError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "UpstoxError";
    this.status = status;
    this.details = details;
  }
}

export function normalizeAccessToken(value) {
  const token = String(value || "").trim();
  if (token.length < 32 || token.length > 8192 || /\s/.test(token)) {
    throw new UpstoxError("Enter a valid Upstox Analytics Token.", 400);
  }
  return token;
}

export function tokenExpiry(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return Number.isFinite(payload.exp) ? new Date(payload.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

function isoDate(value, name) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new UpstoxError(`${name} must use YYYY-MM-DD.`, 400);
  }
  return text;
}

export function historicalPath({ instrumentKey, unit, interval, toDate, fromDate }) {
  const key = String(instrumentKey || "").trim();
  if (!key || key.length > 180 || /[\r\n?#]/.test(key)) throw new UpstoxError("A valid Upstox instrument key is required.", 400);
  const normalizedUnit = String(unit || "days").toLowerCase();
  const maxInterval = UNITS.get(normalizedUnit);
  const normalizedInterval = Number(interval || 1);
  if (!maxInterval || !Number.isInteger(normalizedInterval) || normalizedInterval < 1 || normalizedInterval > maxInterval) {
    throw new UpstoxError("Unsupported candle unit or interval.", 400);
  }
  const to = isoDate(toDate, "toDate");
  const from = isoDate(fromDate, "fromDate");
  if (from > to) throw new UpstoxError("fromDate cannot be after toDate.", 400);
  return `/v3/historical-candle/${encodeURIComponent(key)}/${normalizedUnit}/${normalizedInterval}/${to}/${from}`;
}

export function normalizeCandles(payload) {
  const rows = payload?.data?.candles;
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    openInterest: Number(row[6] || 0)
  })).filter(candle => candle.time && [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

export async function upstoxGet(path, token, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(`${API_ROOT}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${normalizeAccessToken(token)}` },
      signal: AbortSignal.timeout(12_000)
    });
  } catch (error) {
    throw new UpstoxError(`Upstox could not be reached: ${error.message}`, 502);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status === "error") {
    const detail = payload?.errors?.[0]?.message || payload?.message;
    const message = response.status === 401 ? "Upstox rejected the token. Generate a new Analytics Token and try again." : detail || `Upstox returned HTTP ${response.status}.`;
    throw new UpstoxError(message, response.status >= 400 && response.status < 500 ? response.status : 502, payload);
  }
  return payload;
}

export async function verifyUpstoxToken(token, fetchImpl = fetch) {
  const instrumentKey = encodeURIComponent("NSE_INDEX|Nifty 50");
  const payload = await upstoxGet(`/v2/market-quote/quotes?instrument_key=${instrumentKey}`, token, fetchImpl);
  return { ok: payload?.status === "success", checkedInstrument: "NSE_INDEX|Nifty 50" };
}
