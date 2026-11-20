/**
 * Route-scoped rate limits avoid exhausting owner login and ambassador signup
 * from unrelated endpoints sharing a reverse-proxy source address.
 * Untrusted forwarding headers are intentionally not used for identity.
 */
export function createRateLimiter({now=Date.now,windowMs=60000,maxPerWindow=8,maxKeys=2500}={}){
 const counts=new Map();
 return function allowed(req){
  const source=String(req.socket?.remoteAddress||'unknown').slice(0,128);
  const path=new URL(req.url||'/', 'http://localhost').pathname;
  const key=source+'|'+String(req.method||'GET')+'|'+path;
  const at=now(),old=counts.get(key);
  if(old&&at-old.start<windowMs){
   if(old.count>=maxPerWindow)return false;
   old.count++;
   return true;
  }
  counts.set(key,{start:at,count:1});
  if(counts.size>maxKeys){
   for(const [name,entry] of counts){
    if(at-entry.start>=windowMs)counts.delete(name);
   }
   while(counts.size>maxKeys)counts.delete(counts.keys().next().value);
  }
  return true;
 };
}
