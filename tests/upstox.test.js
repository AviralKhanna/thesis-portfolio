import test from "node:test";
import assert from "node:assert/strict";
import { historicalPath, normalizeAccessToken, normalizeCandles, tokenExpiry, verifyUpstoxToken } from "../backend/upstox.mjs";

test("builds an encoded Upstox historical candle path", () => {
  assert.equal(historicalPath({instrumentKey:"NSE_EQ|INE002A01018",unit:"days",interval:1,toDate:"2026-08-14",fromDate:"2025-08-14"}),"/v3/historical-candle/NSE_EQ%7CINE002A01018/days/1/2026-08-14/2025-08-14");
});

test("rejects invalid candle ranges and tokens", () => {
  assert.throws(()=>historicalPath({instrumentKey:"NSE_EQ|X",unit:"minutes",interval:301,toDate:"2026-08-14",fromDate:"2025-08-14"}),/Unsupported/);
  assert.throws(()=>normalizeAccessToken("short token"),/valid Upstox/);
});

test("normalizes Upstox candles for the chart engine", () => {
  assert.deepEqual(normalizeCandles({data:{candles:[["2026-08-14T00:00:00+05:30",10,12,9,11,500,25]]}}),[{time:"2026-08-14T00:00:00+05:30",open:10,high:12,low:9,close:11,volume:500,openInterest:25}]);
});

test("reads expiry from JWT-shaped tokens without trusting it", () => {
  const payload=Buffer.from(JSON.stringify({exp:1893456000})).toString("base64url");
  assert.equal(tokenExpiry(`header.${payload}.signature`),"2030-01-01T00:00:00.000Z");
  assert.equal(tokenExpiry("opaque-token"),null);
});

test("verifies a token using a read-only market quote", async () => {
  const calls=[];
  const fakeFetch=async (url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({status:"success",data:{}})}};
  const result=await verifyUpstoxToken("x".repeat(40),fakeFetch);
  assert.equal(result.ok,true);
  assert.match(calls[0].url,/market-quote\/quotes/);
  assert.equal(calls[0].options.headers.Authorization,`Bearer ${"x".repeat(40)}`);
});
