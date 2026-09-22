const CACHE_NAME="nc-markets-shell-v14";
const SHELL=["./","./index.html","./css/style.css","./js/security.js","./js/data-source.js","./js/request-manager.js","./js/api.js","./js/user-tools.js","./js/user-tools-ui.js","./js/product-polish.js","./js/quality-assurance.js","./js/main.js","./manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return; // never cache third-party market/API responses here
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
