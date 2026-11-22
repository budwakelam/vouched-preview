const utf8 = new TextEncoder();
export const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), ch=>ch.charCodeAt(0));
export async function sha(text) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(text))), n=>n.toString(16).padStart(2,'0')).join('');
}
export const agentKey = () => encode(crypto.getRandomValues(new Uint8Array(32)));
export async function generateKeys() {
  const sign=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const box=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
  return {ownerKey:await crypto.subtle.exportKey('jwk',sign.publicKey),sign:await crypto.subtle.exportKey('jwk',sign.privateKey),
    exchangeKey:await crypto.subtle.exportKey('jwk',box.publicKey),box:await crypto.subtle.exportKey('jwk',box.privateKey)};
}
export async function signedHeaders(account,method,path,body) {
  const time=String(Math.floor(Date.now()/1000)), nonce=crypto.randomUUID();
  const key=await crypto.subtle.importKey('jwk',account.sign,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const bytes=utf8.encode([account.id,method,path,time,nonce,await sha(body)].join('\n'));
  const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,bytes);
  return {'x-member':account.id,'x-time':time,'x-nonce':nonce,'x-signature':encode(sig)};
}
async function shared(account,peerKey) {
  const algo={name:'ECDH',namedCurve:'P-256'};
  const own=await crypto.subtle.importKey('jwk',account.box,algo,false,['deriveKey']);
  const peer=await crypto.subtle.importKey('jwk',peerKey,algo,false,[]);
  return crypto.subtle.deriveKey({name:'ECDH',public:peer},own,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptCard(account,intro,value) {
  const key=await shared(account,intro.exchangeKey), iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf8.encode(intro.id+account.id)},key,utf8.encode(value));
  return encode(iv)+'.'+encode(bytes);
}
export async function decryptCard(account,intro) {
  const key=await shared(account,intro.exchangeKey), [iv,bytes]=intro.received.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:utf8.encode(intro.id+intro.peer)},key,decode(bytes)));
}
