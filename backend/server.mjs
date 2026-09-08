import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize } from "node:path";
import { existsSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { historicalPath, normalizeAccessToken, normalizeCandles, tokenExpiry, upstoxGet, verifyUpstoxToken } from "./upstox.mjs";
import { authorizationUrl, exchangeAuthCode, fyersGet, fyersHistoryPath, fyersTokenExpiry, normalizeFyersCandles, normalizeFyersCredentials, verifyFyersToken } from "./fyers.mjs";

const port = Number(process.env.PORT || 4000);
const root = process.cwd();
const frontendRoot = join(root, "frontend");
const portfolioRoot = join(root, "storage", "portfolios");
const integrationRoot = join(root, "storage", "integrations");
const upstoxConfigFile = join(integrationRoot, "upstox.json");
const fyersConfigFile = join(integrationRoot, "fyers.json");
const fyersRedirectUri = process.env.FYERS_REDIRECT_URI || `http://127.0.0.1:${port}/api/integrations/fyers/callback`;
const maxUploadBytes = 20 * 1024 * 1024;
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".pdf":"application/pdf" };

await Promise.all([mkdir(portfolioRoot, { recursive: true }), mkdir(integrationRoot, { recursive: true })]);

function json(response, status, value) {
  response.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" });
  response.end(JSON.stringify(value));
}
function safeName(value="portfolio") { return basename(value).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || "portfolio"; }
async function bodyJson(request) {
  const chunks=[]; let size=0;
  for await (const chunk of request) { size+=chunk.length; if(size>maxUploadBytes*1.5) throw new Error("Upload is too large"); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function number(value) {
  const text=String(value??"").trim(); if(!text) return null;
  const negative=/^\(.*\)$/.test(text); const clean=text.replace(/[₹,%()+\s]/g,"").replace(/,/g,"");
  const parsed=Number(clean); return Number.isFinite(parsed)?(negative?-parsed:parsed):null;
}
function parseDelimited(buffer) {
  const text=buffer.toString("utf8").replace(/^\uFEFF/,"").trim();
  const delimiter=text.includes("\t")?"\t":","; const lines=text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2) return [];
  const headers=lines[0].split(delimiter).map(x=>x.trim());
  return lines.slice(1).map(line=>Object.fromEntries(line.split(delimiter).map((value,index)=>[headers[index],value?.trim()??""])));
}
function normalizeHoldings(rows) {
  return rows.map(row=>({
    ticker:row["Stock Symbol"]||row.Stock||row.Symbol||row.Ticker||"",
    company:row["Company Name"]||row["Stock Name"]||row.Company||"",
    isin:row["ISIN Code"]||row.ISIN||"",
    quantity:number(row.Qty??row["Allocated Quantity"]??row.Quantity),
    averageCost:number(row["Average Cost Price"]??row["Average Price"]??row.Cost),
    currentPrice:number(row["Current Market Price"]??row.Price),
    marketValue:number(row["Value At Market Price"]??row["Market Value"]),
    unrealizedPnL:number(row["Unrealized Profit/Loss"]??row["Unrealized P/L"]),
    unrealizedPnLPct:number(row["Unrealized Profit/Loss %"]??row["P/L %"])
  })).filter(row=>row.ticker||row.company);
}
function summarize(holdings) {
  const marketValue=holdings.reduce((sum,row)=>sum+(row.marketValue||0),0);
  const recordedCost=holdings.reduce((sum,row)=>sum+((row.averageCost||0)*(row.quantity||0)),0);
  const unrealizedGain=holdings.reduce((sum,row)=>sum+(row.unrealizedPnL||0),0);
  const weights=holdings.map(row=>marketValue?(row.marketValue||0)/marketValue*100:0).sort((a,b)=>b-a);
  return { positions:holdings.length, marketValue, recordedCost, unrealizedGain, unrealizedGainPct:recordedCost?unrealizedGain/recordedCost*100:null, winners:holdings.filter(x=>(x.unrealizedPnL||0)>0).length, losers:holdings.filter(x=>(x.unrealizedPnL||0)<0).length, topThreeWeight:weights.slice(0,3).reduce((a,b)=>a+b,0), topSixWeight:weights.slice(0,6).reduce((a,b)=>a+b,0), decisionReadiness:"pending_analysis", researchConfidence:0 };
}
async function readUpstoxConfig() {
  if (process.env.UPSTOX_ACCESS_TOKEN) return { token:process.env.UPSTOX_ACCESS_TOKEN, source:"environment", connectedAt:null, verifiedAt:null, expiresAt:tokenExpiry(process.env.UPSTOX_ACCESS_TOKEN) };
  try { return JSON.parse(await readFile(upstoxConfigFile,"utf8")); } catch(error) { if(error.code==="ENOENT") return null; throw error; }
}
function upstoxStatus(config) {
  if(!config) return {provider:"upstox",status:"not_connected",readOnly:true};
  const expired=config.expiresAt&&Date.parse(config.expiresAt)<=Date.now();
  return {provider:"upstox",status:expired?"expired":"connected",readOnly:true,source:config.source||"local_secure_store",connectedAt:config.connectedAt||null,verifiedAt:config.verifiedAt||null,expiresAt:config.expiresAt||null};
}
async function requireUpstoxToken() {
  const config=await readUpstoxConfig();
  if(!config?.token) { const error=new Error("Connect an Upstox Analytics Token first."); error.status=409; throw error; }
  if(config.expiresAt&&Date.parse(config.expiresAt)<=Date.now()) { const error=new Error("The saved Upstox token has expired."); error.status=401; throw error; }
  return config.token;
}
async function readFyersConfig() {
  try{return JSON.parse(await readFile(fyersConfigFile,"utf8"));}catch(error){if(error.code==="ENOENT")return null;throw error;}
}
function fyersStatus(config) {
  if(!config)return {provider:"fyers",status:"not_configured",readOnly:true,redirectUri:fyersRedirectUri};
  const expired=config.expiresAt&&Date.parse(config.expiresAt)<=Date.now();
  return {provider:"fyers",status:!config.accessToken?"needs_auth":expired?"expired":"connected",readOnly:true,appId:config.appId,redirectUri:config.redirectUri,configuredAt:config.configuredAt||null,verifiedAt:config.verifiedAt||null,expiresAt:config.expiresAt||null};
}
async function requireFyersCredentials(){
  const config=await readFyersConfig();
  if(!config?.appId||!config?.accessToken){const error=new Error("Connect FYERS first.");error.status=409;throw error;}
  if(config.expiresAt&&Date.parse(config.expiresAt)<=Date.now()){const error=new Error("The FYERS session has expired. Reconnect FYERS.");error.status=401;throw error;}
  return {appId:config.appId,accessToken:config.accessToken};
}
async function readPortfolio(id) {
  if(id==="sample") return JSON.parse(await readFile(join(root,"reports","PORTFOLIO","evaluation-2026-08-14-complete.json"),"utf8"));
  const directory=join(portfolioRoot,safeName(id));
  const portfolio=JSON.parse(await readFile(join(directory,"portfolio.json"),"utf8"));
  const analysisFile=join(directory,"analysis.json");
  if(existsSync(analysisFile)) {
    const analysis=JSON.parse(await readFile(analysisFile,"utf8"));
    return {...analysis,id:portfolio.id,name:portfolio.name,createdAt:analysis.report?.createdAt||portfolio.createdAt,source:portfolio.source,status:analysis.report?.status||portfolio.status};
  }
  if(portfolio.holdings?.length) portfolio.summary={...summarize(portfolio.holdings),...portfolio.summary,topThreeWeight:summarize(portfolio.holdings).topThreeWeight,topSixWeight:summarize(portfolio.holdings).topSixWeight};
  portfolio.dataQuality||={holdings:{score:portfolio.holdings?.length?90:0},charts:{score:0},fundamentals:{score:0},valuation:{score:0}};
  return portfolio;
}
async function listPortfolios() {
  const entries=await readdir(portfolioRoot,{withFileTypes:true}); const uploaded=[];
  for(const entry of entries.filter(x=>x.isDirectory())) { try { const p=await readPortfolio(entry.name); uploaded.push({id:p.id,name:p.name,createdAt:p.createdAt,summary:p.summary,status:p.status}); } catch {} }
  const sample=await readPortfolio("sample");
  return [{id:"sample",name:sample.name,createdAt:sample.createdAt,summary:sample.summary,status:sample.status},...uploaded.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))];
}
async function api(request,response,url) {
  if(request.method==="GET"&&url.pathname==="/api/health") return json(response,200,{ok:true,service:"thesis-portfolio-api",storage:"local"});
  if(request.method==="GET"&&url.pathname==="/api/integrations/upstox") return json(response,200,upstoxStatus(await readUpstoxConfig()));
  if(request.method==="POST"&&url.pathname==="/api/integrations/upstox") {
    const payload=await bodyJson(request); const token=normalizeAccessToken(payload.token);
    const verification=await verifyUpstoxToken(token); const now=new Date().toISOString();
    const config={provider:"upstox",token,source:"local_secure_store",connectedAt:now,verifiedAt:now,expiresAt:tokenExpiry(token),verification};
    await writeFile(upstoxConfigFile,JSON.stringify(config,null,2),{mode:0o600});
    return json(response,201,upstoxStatus(config));
  }
  if(request.method==="DELETE"&&url.pathname==="/api/integrations/upstox") {
    if(process.env.UPSTOX_ACCESS_TOKEN) return json(response,409,{error:"Remove UPSTOX_ACCESS_TOKEN from the server environment to disconnect."});
    await unlink(upstoxConfigFile).catch(error=>{if(error.code!=="ENOENT")throw error});
    return json(response,200,upstoxStatus(null));
  }
  if(request.method==="GET"&&url.pathname==="/api/integrations/fyers") return json(response,200,fyersStatus(await readFyersConfig()));
  if(request.method==="POST"&&url.pathname==="/api/integrations/fyers/setup") {
    const credentials=normalizeFyersCredentials({...await bodyJson(request),redirectUri:fyersRedirectUri}); const now=new Date().toISOString();
    const config={provider:"fyers",...credentials,configuredAt:now,accessToken:null,refreshToken:null,expiresAt:null,verifiedAt:null,oauthState:null};
    await writeFile(fyersConfigFile,JSON.stringify(config,null,2),{mode:0o600});
    return json(response,201,fyersStatus(config));
  }
  if(request.method==="GET"&&url.pathname==="/api/integrations/fyers/authorize") {
    const config=await readFyersConfig();if(!config?.appId||!config?.secretId)return json(response,409,{error:"Save the FYERS App ID and Secret ID first."});
    const state=randomBytes(24).toString("hex");const next={...config,oauthState:state,oauthStateCreatedAt:new Date().toISOString()};
    await writeFile(fyersConfigFile,JSON.stringify(next,null,2),{mode:0o600});
    response.writeHead(302,{Location:authorizationUrl({...config,state}),"Cache-Control":"no-store"});response.end();return;
  }
  if(request.method==="GET"&&url.pathname==="/api/integrations/fyers/callback") {
    const config=await readFyersConfig();const state=url.searchParams.get("state"),code=url.searchParams.get("auth_code")||url.searchParams.get("code");
    const stateAge=Date.now()-Date.parse(config?.oauthStateCreatedAt||0);
    if(!config||!state||state!==config.oauthState||stateAge>10*60*1000||!code){const error=new Error("FYERS authorization could not be validated. Start the connection again.");error.status=400;throw error;}
    const tokens=await exchangeAuthCode({...config,code});const credentials={appId:config.appId,accessToken:tokens.access_token};await verifyFyersToken(credentials);const now=new Date().toISOString();
    const next={...config,accessToken:tokens.access_token,refreshToken:tokens.refresh_token||null,expiresAt:fyersTokenExpiry(tokens.access_token),verifiedAt:now,oauthState:null,oauthStateCreatedAt:null};
    await writeFile(fyersConfigFile,JSON.stringify(next,null,2),{mode:0o600});
    response.writeHead(302,{Location:"/?integration=fyers-connected","Cache-Control":"no-store"});response.end();return;
  }
  if(request.method==="DELETE"&&url.pathname==="/api/integrations/fyers") {
    await unlink(fyersConfigFile).catch(error=>{if(error.code!=="ENOENT")throw error});return json(response,200,fyersStatus(null));
  }
  if(request.method==="GET"&&url.pathname==="/api/market/quote") {
    const instrumentKey=String(url.searchParams.get("instrumentKey")||"").trim();
    if(!instrumentKey||instrumentKey.length>180||/[\r\n?#]/.test(instrumentKey)) return json(response,400,{error:"A valid instrumentKey is required."});
    if(url.searchParams.get("provider")==="fyers"){
      const data=await fyersGet(`/quotes?${new URLSearchParams({symbols:instrumentKey})}`,await requireFyersCredentials());
      return json(response,200,{source:"fyers",fetchedAt:new Date().toISOString(),instrumentKey,data:data.d||[]});
    }
    const data=await upstoxGet(`/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`,await requireUpstoxToken());
    return json(response,200,{source:"upstox",fetchedAt:new Date().toISOString(),instrumentKey,data:data.data||{}});
  }
  if(request.method==="GET"&&url.pathname==="/api/market/candles") {
    const params=Object.fromEntries(url.searchParams); const path=historicalPath(params);
    if(params.provider==="fyers"){
      const data=await fyersGet(fyersHistoryPath(params),await requireFyersCredentials());
      return json(response,200,{source:"fyers",fetchedAt:new Date().toISOString(),instrumentKey:params.instrumentKey,unit:params.unit||"days",interval:Number(params.interval||1),candles:normalizeFyersCandles(data)});
    }
    const data=await upstoxGet(path,await requireUpstoxToken());
    return json(response,200,{source:"upstox",fetchedAt:new Date().toISOString(),instrumentKey:params.instrumentKey,unit:params.unit||"days",interval:Number(params.interval||1),candles:normalizeCandles(data)});
  }
  if(request.method==="GET"&&url.pathname==="/api/portfolios") return json(response,200,{portfolios:await listPortfolios()});
  const match=url.pathname.match(/^\/api\/portfolios\/([a-zA-Z0-9_-]+)$/);
  if(request.method==="GET"&&match) return json(response,200,await readPortfolio(match[1]));
  if(request.method==="POST"&&url.pathname==="/api/portfolios") {
    const payload=await bodyJson(request); const fileName=safeName(payload.fileName); const data=Buffer.from(payload.dataBase64||"","base64");
    if(!data.length) return json(response,400,{error:"File data is required"});
    if(data.length>maxUploadBytes) return json(response,413,{error:"Maximum upload size is 20 MB"});
    const allowed=new Set([".csv",".xls",".xlsx",".pdf"]); const extension=extname(fileName).toLowerCase();
    if(!allowed.has(extension)) return json(response,415,{error:"Use CSV, XLS, XLSX or PDF"});
    const id=`pf-${Date.now()}-${randomUUID().slice(0,8)}`; const directory=join(portfolioRoot,id); await mkdir(directory,{recursive:true});
    await writeFile(join(directory,fileName),data);
    const holdings=[".csv",".xls"].includes(extension)?normalizeHoldings(parseDelimited(data)):[];
    const portfolio={schemaVersion:1,id,name:String(payload.name||fileName.replace(extension,"")).slice(0,100),createdAt:new Date().toISOString(),status:holdings.length?"parsed":"uploaded_needs_processing",source:{fileName,mimeType:payload.mimeType||"application/octet-stream",size:data.length,storedAt:`storage/portfolios/${id}/${fileName}`},summary:summarize(holdings),dataQuality:{holdings:{score:holdings.length?90:0,confidence:holdings.length?"high":"none",note:holdings.length?"Holdings parsed from the uploaded statement.":"Extraction pending."},charts:{score:0,confidence:"none",note:"No chart evidence has been attached."},fundamentals:{score:0,confidence:"none",note:"Fundamental evidence has not been collected."},valuation:{score:0,confidence:"none",note:"Valuation evidence has not been collected."}},horizons:[{id:"long_term",label:"Long term",title:"Fundamental research pending",status:"unavailable",confidence:"none",summary:"Upload saved; business, governance and valuation evidence still needs to be collected."},{id:"monthly",label:"Monthly",title:"Monthly chart pending",status:"unavailable",confidence:"none",summary:"No accepted monthly chart evidence is attached."},{id:"weekly_daily",label:"Weekly / daily",title:"Trend evidence pending",status:"unavailable",confidence:"none",summary:"No accepted weekly or daily chart evidence is attached."},{id:"intraday",label:"Intraday",title:"Live setup unavailable",status:"unavailable",confidence:"none",summary:"Fresh 5m/15m charts, liquidity and a risk limit are required."}],holdings,analysis:{status:"pending",message:holdings.length?"Holdings parsed. Evidence analysis is ready to be generated.":"File saved. XLSX/PDF extraction is pending."}};
    await writeFile(join(directory,"portfolio.json"),JSON.stringify(portfolio,null,2));
    return json(response,201,portfolio);
  }
  return false;
}

createServer(async (request,response)=>{
  try {
    const url=new URL(request.url,`http://${request.headers.host}`); const handled=await api(request,response,url); if(handled!==false)return;
    const rawPath=decodeURIComponent(url.pathname); const relative=rawPath==="/"?"index.html":rawPath.replace(/^\/+/,""); const target=normalize(join(frontendRoot,relative));
    if(!target.startsWith(frontendRoot)) throw new Error("Invalid path"); const info=await stat(target); const file=info.isDirectory()?join(target,"index.html"):target;
    response.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream"}); response.end(await readFile(file));
  } catch(error) { if(request.url?.startsWith("/api/")) return json(response,error.status||(/ENOENT/.test(error.code||"")?404:500),{error:error.message||"Request failed"}); response.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"}); response.end("Not found"); }
}).listen(port,"127.0.0.1",()=>console.log(`Investment Intelligence running at http://localhost:${port}`));
