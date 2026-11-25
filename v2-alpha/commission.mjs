// V2 isolated financial calculation core. No database or V1 dependency.
const integer=(v,label,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(v)||v<0||v>max)throw new RangeError(label);return BigInt(v)};
const rate=(v,label)=>integer(v,label,10000);
const round=(n,d)=>(n+d/2n)/d;
export function calculateCommission({paidMinor,eligibleMinor=paidMinor,platformBps,ambassadorBps}){
 const paid=integer(paidMinor,'paidMinor'),base=integer(eligibleMinor,'eligibleMinor');
 if(base>paid)throw new RangeError('eligibleMinor exceeds paidMinor');
 const pool=round(base*rate(platformBps,'platformBps'),10000n);
 const ambassador=round(pool*rate(ambassadorBps,'ambassadorBps'),10000n);
 return Object.freeze({paidMinor:Number(paid),eligibleMinor:Number(base),platformGrossMinor:Number(pool),ambassadorMinor:Number(ambassador),platformNetMinor:Number(pool-ambassador),organizerMinor:Number(paid-pool)});
}
