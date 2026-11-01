// Offline cache for the website / installed PWA. The Android app bundles everything and does not use this.
const VERSION='sbp-4.5.0';
const CORE=['./','index.html','config.js','manifest.webmanifest','fonts/fonts.css','vendor/supabase.js','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return; // never cache Supabase API calls
  e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(r,copy));}return res;}).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
