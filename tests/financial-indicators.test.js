const fs=require("fs");
const vm=require("vm");
const path=require("path");
const assert=require("assert");

const apiPath=path.join(__dirname,"..","js","api.js");
const miPath=path.join(__dirname,"..","js","market-intelligence.js");
const source=fs.readFileSync(apiPath,"utf8");
const miSource=fs.readFileSync(miPath,"utf8");
const sandbox={
  window:{TTL:{s:1000,m:60000}},
  console:console,
  navigator:{onLine:true},
  setTimeout:setTimeout,
  clearTimeout:clearTimeout,
  fetch:async()=>{throw new Error("Network disabled in unit tests");}
};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
vm.runInContext(miSource,sandbox);

const tests=[];
function test(name,fn){tests.push({name,fn});}
function approx(a,b,eps=1e-6){assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);}

test("RSI is bounded",()=>{
  const rising=Array.from({length:40},(_,i)=>100+i);
  const v=sandbox.calcRSI(rising,14);
  assert.ok(v>=0&&v<=100);
});
test("EMA returns finite value with enough history",()=>{
  const series=Array.from({length:40},(_,i)=>100+i);
  assert.ok(Number.isFinite(sandbox.calcEMA(series,20)));
});
test("EMA returns null with insufficient history",()=>{
  assert.strictEqual(sandbox.calcEMA([1,2,3],20),null);
});
test("VWAP equals constant price",()=>{
  assert.strictEqual(sandbox.calcVWAP([100,100,100],[10,20,30]),100);
});
test("VWAP returns null without positive volume",()=>{
  assert.strictEqual(sandbox.calcVWAP([100,101],[0,0]),null);
});
test("ATR is positive",()=>{
  const closes=Array.from({length:40},(_,i)=>100+i);
  const highs=closes.map(x=>x+1), lows=closes.map(x=>x-1);
  assert.ok(sandbox.calcATR(highs,lows,closes,14)>0);
});
test("MACD details are deterministic",()=>{
  const s=Array.from({length:80},(_,i)=>100+i*0.5);
  assert.deepStrictEqual(sandbox.calcMACDDetails(s),sandbox.calcMACDDetails(s));
});
test("Technical score stays within 0..100",()=>{
  const s=Array.from({length:240},(_,i)=>100+i*0.2);
  const score=sandbox.buildTechnicalScore(s,{
    rsi:sandbox.calcRSI(s,14),
    macdDetails:sandbox.calcMACDDetails(s),
    ema20:sandbox.calcEMA(s,20),
    ema50:sandbox.calcEMA(s,50),
    ema200:sandbox.calcEMA(s,200)
  }).score;
  assert.ok(score>=0&&score<=100);
});
test("leaders reuses pre-computed breadth without calling breadth",async ()=>{
  const precomputedBreadth={
    universe:["RELIANCE","TCS"],
    rows:[
      {ticker:"RELIANCE",changePct:2.5,volume:1000},
      {ticker:"TCS",changePct:-1.2,volume:2000}
    ],
    advances:1,declines:1,unchanged:0,ratio:1
  };
  const res=await sandbox.window.NCMarketIntelligence.leaders(precomputedBreadth);
  assert.strictEqual(res.gainers[0].ticker,"RELIANCE");
  assert.strictEqual(res.losers[0].ticker,"TCS");
  assert.strictEqual(res.volumeLeaders[0].ticker,"TCS");
});

(async function main(){
  let passed=0;
  for(const t of tests){
    try{await t.fn();console.log("PASS",t.name);passed++;}
    catch(e){console.error("FAIL",t.name,"\n ",e.message);process.exitCode=1;}
  }
  console.log(`\n${passed}/${tests.length} tests passed`);
})();
