const CACHE="lishi-finder-v12-20260817";
const PRECACHE=["./","./index.html","./styles.css","./app.js","./data.js","./manifest.webmanifest","./icon.svg","./sample-external-data.csv"];
const NETWORK_FIRST=["index.html","styles.css","app.js","data.js","manifest.webmanifest","sw.js","sample-external-data.csv"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("lishi-finder-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
async function networkFirst(request){
  try{const response=await fetch(request,{cache:"no-store"});if(response&&response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone());}return response;}
  catch(error){const cached=await caches.match(request);if(cached)return cached;if(request.mode==="navigate")return caches.match("./index.html");throw error;}
}
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;const file=url.pathname.split("/").pop();if(event.request.mode==="navigate"||NETWORK_FIRST.includes(file)){event.respondWith(networkFirst(event.request));return;}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(async response=>{if(response&&response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone());}return response;})));});

