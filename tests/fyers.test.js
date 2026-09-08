import test from "node:test";
import assert from "node:assert/strict";
import { authorizationUrl, exchangeAuthCode, fyersHistoryPath, fyersResolution, normalizeFyersCandles, normalizeFyersCredentials, verifyFyersToken } from "../backend/fyers.mjs";

test("validates FYERS app credentials",()=>{
  assert.deepEqual(normalizeFyersCredentials({appId:"ABC123XYZ-200",secretId:"secret-value",redirectUri:"http://127.0.0.1:4000/api/integrations/fyers/callback"}),{appId:"ABC123XYZ-200",secretId:"secret-value",redirectUri:"http://127.0.0.1:4000/api/integrations/fyers/callback"});
  assert.throws(()=>normalizeFyersCredentials({appId:"bad id",secretId:"short",redirectUri:"nope"}),/App ID/);
});

test("builds a state-bearing FYERS authorization URL",()=>{
  const url=new URL(authorizationUrl({appId:"ABC123XYZ-200",redirectUri:"http://127.0.0.1:4000/callback",state:"random-state"}));
  assert.equal(url.pathname,"/api/v3/generate-authcode");assert.equal(url.searchParams.get("client_id"),"ABC123XYZ-200");assert.equal(url.searchParams.get("state"),"random-state");
});

test("maps common timeframes to FYERS resolutions",()=>{
  assert.equal(fyersResolution("minutes",15),"15");assert.equal(fyersResolution("hours",4),"240");assert.equal(fyersResolution("days",1),"D");assert.equal(fyersResolution("weeks",1),"1W");assert.equal(fyersResolution("months",1),"1M");
});

test("builds FYERS history queries and normalizes candles",()=>{
  const path=fyersHistoryPath({instrumentKey:"NSE:SBIN-EQ",unit:"days",interval:1,fromDate:"2025-08-14",toDate:"2026-08-14"});
  const query=new URL(`https://example.test${path}`).searchParams;assert.equal(query.get("symbol"),"NSE:SBIN-EQ");assert.equal(query.get("resolution"),"D");
  assert.deepEqual(normalizeFyersCandles({candles:[[1786665600,800,820,790,815,1000,250]]}),[{time:"2026-08-14T00:00:00.000Z",open:800,high:820,low:790,close:815,volume:1000,openInterest:250}]);
});

test("exchanges FYERS auth codes using a hash without exposing the secret",async()=>{
  let request;const fakeFetch=async(url,options)=>{request={url,options};return{ok:true,status:200,json:async()=>({s:"ok",access_token:"x".repeat(40)})}};
  await exchangeAuthCode({appId:"ABC123XYZ-200",secretId:"secret-value",code:"auth-code"},fakeFetch);const body=JSON.parse(request.options.body);
  assert.equal(body.grant_type,"authorization_code");assert.equal(body.code,"auth-code");assert.equal(body.appIdHash.length,64);assert.equal(request.options.body.includes("secret-value"),false);
});

test("verifies FYERS access with a read-only quote",async()=>{
  const fakeFetch=async()=>({ok:true,status:200,json:async()=>({s:"ok",d:[]})});const result=await verifyFyersToken({appId:"ABC123XYZ-200",accessToken:"x".repeat(40)},fakeFetch);assert.equal(result.ok,true);
});
