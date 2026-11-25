import {createHash} from 'node:crypto';
export const sizes=Object.freeze({feed:[1080,1080],story:[1080,1920],portrait:[1080,1350]});
const keyOf=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
export async function provisionAmbassador({campaign,member,go,content,store}){
 if(![campaign.organizationId,campaign.id,campaign.termsVersion,member.id].every(nonempty))throw Error('Invalid scope');
 if(campaign.status!=='active'||member.status!=='active'||member.organizationId!==campaign.organizationId||member.campaignId!==campaign.id||member.acceptedTermsVersion!==campaign.termsVersion)throw Error('Activation or accepted terms required');
 const key=keyOf(campaign.organizationId,campaign.id,member.id);
 return store.runExclusive(key,async()=>{
  let link=await store.getLink(key);
  if(!link){
   link=await go.ensureReferral({key,organizationId:campaign.organizationId,campaignId:campaign.id,ambassadorId:member.id});
   if(!nonempty(link?.url)||!nonempty(link?.qrPayload)||link.url!==link.qrPayload||new URL(link.url).protocol!=='https:')throw Error('Invalid referral binding');
   await store.saveLink(key,link);
  }
  const assets=[];
  for(const template of campaign.templates||[]){
   if(template.status!=='published')continue;
   if(template.organizationId!==campaign.organizationId||template.campaignId!==campaign.id||!nonempty(template.id)||!nonempty(template.version))throw Error('Template scope mismatch');
   const size=sizes[template.format];
   if(!size||!['static','motion'].includes(template.kind))throw Error('Invalid template');
   const assetKey=keyOf(key,template.id,template.version,template.format);
   let asset=await store.getAsset(assetKey);
   if(!asset){
    asset=await content.render({key:assetKey,organizationId:campaign.organizationId,campaignId:campaign.id,templateId:template.id,version:template.version,width:size[0],height:size[1],kind:template.kind,overlays:{qrPayload:link.qrPayload,shortUrl:link.url}});
    if(!nonempty(asset?.id))throw Error('Invalid rendered asset');
    await store.saveAsset(assetKey,asset);
   }
   assets.push(asset);
  }
  return {link,assets};
 });
}
