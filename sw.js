const CACHE='lishi-finder-v4';
const ASSETS=['./','./index.html','./data.js','./media.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const p=new URL(e.request.url).pathname;
 if(p.endsWith('/index.html')||p.endsWith('/data.js')||p.endsWith('/media.js')) {
   e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
 } else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});