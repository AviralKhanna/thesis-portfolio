import { createHash } from "node:crypto";

const API_ROOT = "https://api-t1.fyers.in";
const DATA_ROOT = `${API_ROOT}/data`;

export class FyersError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "FyersError";
    this.status = status;
    this.details = details;
  }
}

export function normalizeFyersCredentials({ appId, secretId, redirectUri }) {
  const normalized = {
    appId: String(appId || "").trim(),
    secretId: String(secretId || "").trim(),
    redirectUri: String(redirectUri || "").trim()
  };
  if (normalized.appId.length < 6 || normalized.appId.length > 80 || /\s/.test(normalized.appId)) throw new FyersError("Enter a valid FYERS App ID.", 400);
  if (normalized.secretId.length < 8 || normalized.secretId.length > 512 || /\s/.test(normalized.secretId)) throw new FyersError("Enter a valid FYERS Secret ID.", 400);
  let redirect;
  try { redirect = new URL(normalized.redirectUri); } catch { throw new FyersError("Enter a valid FYERS redirect URL.", 400); }
  if (!/^https?:$/.test(redirect.protocol)) throw new FyersError("FYERS redirect URL must use HTTP or HTTPS.", 400);
  return normalized;
}

export function fyersTokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"));
    return Number.isFinite(payload.exp) ? new Date(payload.exp * 1000).toISOString() : null;
  } catch { return null; }
}

export function authorizationUrl({ appId, redirectUri, state }) {
  const url = new URL(`${API_ROOT}/api/v3/generate-authcode`);
  url.search = new URLSearchParams({ client_id:appId, redirect_uri:redirectUri, response_type:"code", state }).toString();
  return url.toString();
}

export async function exchangeAuthCode({ appId, secretId, code }, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(`${API_ROOT}/api/v3/validate-authcode`, {
      method:"POST",
      headers:{Accept:"application/json","Content-Type":"application/json","User-Agent":"Mozilla/5.0 Thesis-Research"},
      body:JSON.stringify({grant_type:"authorization_code",appIdHash:createHash("sha256").update(`${appId}:${secretId}`).digest("hex"),code}),
      signal:AbortSignal.timeout(12_000)
    });
  } catch(error) { throw new FyersError(`FYERS could not be reached: ${error.message}`,502); }
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.s!=="ok"||!payload?.access_token) throw new FyersError(payload?.message||`FYERS token exchange failed with HTTP ${response.status}.`,response.status>=400&&response.status<500?response.status:502,payload);
  return payload;
}

function normalizeSymbol(value) {
  const symbol=String(value||"").trim();
  if(!symbol||symbol.length>120||/[\r\n,?&#]/.test(symbol)||!symbol.includes(":")) throw new FyersError("Use a valid FYERS symbol such as NSE:SBIN-EQ.",400);
  return symbol;
}

export function fyersResolution(unit="days", interval=1) {
  const value=Number(interval||1); if(!Number.isInteger(value)||value<1) throw new FyersError("Candle interval must be a positive integer.",400);
  const resolutions={minutes:String(value),hours:String(value*60),days:value===1?"D":null,weeks:value===1?"1W":null,months:value===1?"1M":null};
  const result=resolutions[String(unit).toLowerCase()];
  const allowed=new Set(["1","2","3","5","10","15","20","30","60","120","240","D","1W","1M"]);
  if(!result||!allowed.has(result)) throw new FyersError("Unsupported FYERS candle unit or interval.",400);
  return result;
}

function isoDate(value,name) {
  const text=String(value||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new FyersError(`${name} must use YYYY-MM-DD.`,400);
  return text;
}

export function fyersHistoryPath({ instrumentKey, unit, interval, fromDate, toDate }) {
  const symbol=normalizeSymbol(instrumentKey),from=isoDate(fromDate,"fromDate"),to=isoDate(toDate,"toDate");
  if(from>to) throw new FyersError("fromDate cannot be after toDate.",400);
  const query=new URLSearchParams({symbol,resolution:fyersResolution(unit,interval),date_format:"1",range_from:from,range_to:to,cont_flag:"0",oi_flag:"1"});
  return `/history?${query}`;
}

export function normalizeFyersCandles(payload) {
  if(!Array.isArray(payload?.candles))return [];
  return payload.candles.map(row=>({time:new Date(Number(row[0])*1000).toISOString(),open:Number(row[1]),high:Number(row[2]),low:Number(row[3]),close:Number(row[4]),volume:Number(row[5]),openInterest:Number(row[6]||0)})).filter(candle=>candle.time&&[candle.open,candle.high,candle.low,candle.close].every(Number.isFinite));
}

export async function fyersGet(path,{appId,accessToken},fetchImpl=fetch) {
  let response;
  try { response=await fetchImpl(`${DATA_ROOT}${path}`,{headers:{Accept:"application/json",Authorization:`${appId}:${accessToken}`,"User-Agent":"Mozilla/5.0 Thesis-Research"},signal:AbortSignal.timeout(12_000)}); }
  catch(error){throw new FyersError(`FYERS could not be reached: ${error.message}`,502);}
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.s==="error"){
    const authError=response.status===401||[-8,-15,-16,-17].includes(payload?.code);
    throw new FyersError(authError?"The FYERS session has expired. Reconnect FYERS to continue.":payload?.message||`FYERS returned HTTP ${response.status}.`,authError?401:(response.status>=400&&response.status<500?response.status:502),payload);
  }
  return payload;
}

export async function verifyFyersToken(credentials,fetchImpl=fetch) {
  const payload=await fyersGet(`/quotes?${new URLSearchParams({symbols:"NSE:NIFTY50-INDEX"})}`,credentials,fetchImpl);
  return {ok:payload?.s==="ok",checkedInstrument:"NSE:NIFTY50-INDEX"};
}
