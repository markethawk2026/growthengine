(function(){
"use strict";
function go(id){var e=document.getElementById(id);if(e){e.scrollIntoView({behavior:"smooth",block:"start"});return true;}return false;}
function install(){
  var nav=document.querySelector(".nav")||document.querySelector("nav");
  if(nav&&!document.getElementById("ncIntegratedAdvancedNav")){
    var w=document.createElement("span");w.id="ncIntegratedAdvancedNav";w.className="nc-integrated-nav";
    [["Watchlist","ncUserWorkspace"],["Market Intelligence","ncMarketIntel"]].forEach(function(x){
      var b=document.createElement("button");b.type="button";b.className="nav-item nc-advanced-nav-item";b.textContent=x[0];b.onclick=function(){go(x[1]);};w.appendChild(b);
    });nav.appendChild(w);
  }
  var original=window.runAnalysis;
  if(typeof original==="function"){
    window.runAnalysis=async function(ticker){
      try{return await original(ticker);}
      catch(err){console.error("Analysis failed:",err);if(window.NCProductPolish&&NCProductPolish.announce)NCProductPolish.announce("Analysis could not be completed.");throw err;}
    };
  }
}
window.addEventListener("DOMContentLoaded",install);
})();