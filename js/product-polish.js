/**
 * NC Markets Phase 6 — Product Polish
 * Accessibility, command palette, share/print export, offline UI and performance helpers.
 */
(function(){
"use strict";
var palette=null, statusNode=null;
function esc(v){return window.escapeHTML?window.escapeHTML(String(v==null?"":v)):String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
function announce(msg){
  if(!statusNode){statusNode=document.createElement("div");statusNode.className="sr-only";statusNode.setAttribute("aria-live","polite");statusNode.setAttribute("aria-atomic","true");document.body.appendChild(statusNode);}
  statusNode.textContent=""; setTimeout(function(){statusNode.textContent=msg;},20);
}
function improveAccessibility(){
  document.documentElement.lang=document.documentElement.lang||"en";
  document.querySelectorAll("button:not([type])").forEach(function(b){b.type="button";});
  document.querySelectorAll("img:not([alt])").forEach(function(img){img.alt="";});
  document.querySelectorAll('a[target="_blank"]').forEach(function(a){a.rel="noopener noreferrer";});
  document.querySelectorAll("input").forEach(function(input){
    if(!input.getAttribute("aria-label")&&!input.labels.length){
      input.setAttribute("aria-label",input.placeholder||input.name||"Input");
    }
  });
  var main=document.querySelector("main")||document.querySelector(".main");
  if(main&&!main.id)main.id="main-content";
  if(main&&!document.querySelector(".skip-link")){
    var skip=document.createElement("a");skip.href="#"+main.id;skip.className="skip-link";skip.textContent="Skip to main content";document.body.insertBefore(skip,document.body.firstChild);
  }
}
function setOfflineBanner(){
  var b=document.getElementById("ncOfflineBanner");
  if(!b){b=document.createElement("div");b.id="ncOfflineBanner";b.setAttribute("role","status");b.className="nc-offline-banner";document.body.appendChild(b);}
  b.textContent=navigator.onLine?"":"You are offline. Cached data may be shown where available.";
  b.hidden=navigator.onLine;
  if(!navigator.onLine)announce("You are offline. Cached data may be shown.");
}
function actions(){
  return [
    {label:"Analyze a stock",hint:"Type a ticker after selecting",run:function(){var t=prompt("Ticker symbol");if(t&&window.runAnalysis)runAnalysis(t);}},
    {label:"Open watchlist",run:function(){var e=document.getElementById("ncUserWorkspace");if(e){e.scrollIntoView({behavior:"smooth"});var b=e.querySelector('[data-tab="watchlist"]');if(b)b.click();}}},
    {label:"Open portfolio",run:function(){var e=document.getElementById("ncUserWorkspace");if(e){e.scrollIntoView({behavior:"smooth"});var b=e.querySelector('[data-tab="portfolio"]');if(b)b.click();}}},
    {label:"Open screener",run:function(){var e=document.getElementById("ncUserWorkspace");if(e){e.scrollIntoView({behavior:"smooth"});var b=e.querySelector('[data-tab="screener"]');if(b)b.click();}}},
    {label:"Open market intelligence",run:function(){var e=document.getElementById("ncMarketIntel");if(e)e.scrollIntoView({behavior:"smooth"});}},
    {label:"Print / save current page as PDF",run:function(){window.print();}},
    {label:"Share current page",run:sharePage},
    {label:"Refresh current page",run:function(){location.reload();}}
  ];
}
function openPalette(){
  if(!palette)return;palette.hidden=false;palette.querySelector("input").value="";renderActions("");palette.querySelector("input").focus();announce("Command palette opened.");
}
function closePalette(){if(palette){palette.hidden=true;announce("Command palette closed.");}}
function renderActions(q){
  var list=palette.querySelector(".nc-cmd-list"), items=actions().filter(function(a){return a.label.toLowerCase().includes(q.toLowerCase());});
  list.innerHTML=items.map(function(a,i){return '<button type="button" data-cmd="'+i+'"><strong>'+esc(a.label)+'</strong>'+(a.hint?'<small>'+esc(a.hint)+'</small>':'')+'</button>';}).join("")||'<div class="nc-cmd-empty">No matching commands.</div>';
  list.querySelectorAll("[data-cmd]").forEach(function(b){b.onclick=function(){var a=items[Number(b.dataset.cmd)];closePalette();a.run();};});
}
async function sharePage(){
  var data={title:document.title,text:"NC Markets financial intelligence dashboard",url:location.href};
  try{
    if(navigator.share){await navigator.share(data);announce("Share sheet opened.");}
    else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);announce("Page link copied to clipboard.");}
    else{throw new Error("Sharing is not supported in this browser.");}
  }catch(e){if(e.name!=="AbortError")announce(e.message||"Unable to share.");}
}
function createPalette(){
  palette=document.createElement("div");palette.id="ncCommandPalette";palette.className="nc-cmd-overlay";palette.hidden=true;
  palette.innerHTML='<div class="nc-cmd" role="dialog" aria-modal="true" aria-labelledby="ncCmdTitle"><div class="nc-cmd-head"><strong id="ncCmdTitle">Command palette</strong><kbd>Esc</kbd></div><input type="search" aria-label="Search commands" placeholder="Search commands…"><div class="nc-cmd-list"></div></div>';
  document.body.appendChild(palette);
  palette.querySelector("input").addEventListener("input",function(e){renderActions(e.target.value);});
  palette.addEventListener("click",function(e){if(e.target===palette)closePalette();});
}
function installPolish(){
  improveAccessibility();createPalette();setOfflineBanner();
  window.addEventListener("online",setOfflineBanner);window.addEventListener("offline",setOfflineBanner);
  document.addEventListener("keydown",function(e){
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();palette.hidden?openPalette():closePalette();}
    if(e.key==="Escape"&&palette&&!palette.hidden)closePalette();
  });
  var fab=document.createElement("button");fab.className="nc-cmd-fab";fab.type="button";fab.setAttribute("aria-label","Open command palette");fab.textContent="⌘K";fab.onclick=openPalette;document.body.appendChild(fab);
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(function(e){console.warn("Service worker registration failed:",e);});
  document.addEventListener("visibilitychange",function(){document.documentElement.setAttribute("data-page-visible",document.hidden?"false":"true");});
}
window.NCProductPolish={announce:announce,openCommandPalette:openPalette,sharePage:sharePage,printReport:function(){window.print();}};
window.addEventListener("DOMContentLoaded",installPolish);
})();
