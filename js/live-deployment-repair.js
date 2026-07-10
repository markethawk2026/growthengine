/**
 * Phase 8 — live deployment integration repair.
 * Adds reliable navigation to dynamically mounted Phase 4/5 workspaces and diagnostics.
 */
(function(){
"use strict";
function go(id){
  var el=document.getElementById(id);
  if(el){el.scrollIntoView({behavior:"smooth",block:"start"});return true;}
  return false;
}
function install(){
  if(document.getElementById("ncFeatureNav"))return;
  var bar=document.createElement("nav");
  bar.id="ncFeatureNav"; bar.className="nc-feature-nav"; bar.setAttribute("aria-label","Advanced features");
  [
    ["User Tools","ncUserWorkspace"],
    ["Market Intelligence","ncMarketIntel"]
  ].forEach(function(item){
    var b=document.createElement("button"); b.type="button"; b.textContent=item[0];
    b.addEventListener("click",function(){if(!go(item[1])&&window.NCProductPolish)window.NCProductPolish.announce(item[0]+" is not available.");});
    bar.appendChild(b);
  });
  var target=document.querySelector("header")||document.querySelector("nav")||document.body.firstElementChild;
  if(target&&target.parentNode)target.parentNode.insertBefore(bar,target.nextSibling); else document.body.prepend(bar);
}
window.addEventListener("DOMContentLoaded",install);
})();
