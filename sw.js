const CACHE='twelve-stock-v1';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
const EXT=/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===self.location.origin)e.respondWith(netFirst(e,r));
  else if(EXT.test(u.hostname))e.respondWith(swr(e,r));
});
// Same-site files: try the network first so new stock shows up, but fall back to the saved copy
// when the network fails or takes longer than 3 seconds.
async function netFirst(e,r){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(r);
  const net=fetch(r.url,{cache:'no-cache'}).then(res=>{
    if(res.ok){cache.put(r,res.clone());return res}
    return hit||res;
  });
  if(!hit)return net;
  e.waitUntil(net.catch(()=>{}));
  return Promise.race([net,new Promise(ok=>setTimeout(()=>ok(hit),3000))]).catch(()=>hit);
}
// Fonts and the Excel library: show the saved copy at once, refresh it in the background.
async function swr(e,r){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(r);
  const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))cache.put(r,res.clone());return res}).catch(()=>hit);
  e.waitUntil(net);
  return hit||net;
}
