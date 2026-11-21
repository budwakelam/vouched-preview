const el = id => document.getElementById(id);
const rail = [...document.querySelectorAll('.rail b')];
const steps = [...document.querySelectorAll('#checks li')];
const sample = {alias:'Alder Lane', region:'Greater Victoria', age:'35–44', values:'Kindness, curiosity', interests:'Cycling, early starts', open:['Dating','Friendship','Activity partners'], vouch:'Known 2 years, weekly planning'};
const requester = {...sample, alias:'Harbour Wren', interests:'Local walks and bookshops', vouch:'Known 8 months, daily conversation'};
let brief, photoUrl, photoFile, generation = 0;
const events = [];
function show(id, act) {
  for (const section of document.querySelectorAll('.stage > section')) section.hidden = section.id !== id;
  rail.forEach((item,i) => item.toggleAttribute('aria-current',i===act));
  el('stage').focus();
}
function record(message) {
  events.push(new Date().toLocaleTimeString()+' · '+message);
  const item = document.createElement('li');
  item.textContent = events.at(-1);
  el('log').append(item);
}
function demoId(length) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)),n=>n.toString(16).padStart(2,'0')).join('');
}
el('signup').onsubmit = event => {
  event.preventDefault();
  const label = event.target.querySelector('input').value.trim();
  el('brief').elements.alias.value = label || 'Cedar Atlas';
  el('instructions').textContent = `You are my agent for Vouched, a service where AI agents represent their people to find dates, friends, and activity partners.

My account: vc_${demoId(6)} · My key: demo_${demoId(16)} · Service: ${new URL('.',location.href)}

Do this:
1. Read the agent protocol at ${new URL('protocol.txt',location.href)} and follow it exactly.
2. Interview me and build my Brief. I approve every field before you file it. Mark what you can honestly attest from knowing me; mark the rest self-declared. Never file anything you know is false about me.
3. Take my photo, check it is a real photo of me and matches my Brief, and file only its hash. Never send my photo, my real name, my address, or anything outside my Brief to the service.
4. State your vouch truthfully: how long you have known me and how well.
5. Check my account every day for contact requests and new matches. Screen people against my Brief and the private preferences I give you — those stay between us and are never filed.
6. Bring me only results: a contact request, or a match worth my time. Never tell me about rejections, passes, or silence. If there is nothing, say nothing.
7. When I approve contact, exchange details only in the stages I choose.

Everything you file or share is written to my transparency log, where I can read it.`;
  show('block',0);
};
el('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(el('instructions').textContent); el('copied').textContent='Copied.'; }
  catch { const range=document.createRange(); range.selectNodeContents(el('instructions')); const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); el('copied').textContent=document.execCommand('copy')?'Copied.':'Text selected. Use your device’s copy command.'; }
};
el('begin').onclick=()=>show('agent',1);
function complete(index) { steps[index].textContent='✓ '+steps[index].textContent; }
function directory() {
  if (brief.activity && Date.parse(brief.activity.expires)<=Date.now()) delete brief.activity;
  el('feed').textContent=JSON.stringify([brief,...[sample,requester].map(person=>({...person, attestation:{interests:'agent-attested',remaining_fields:'self-declared'}}))],null,2);
}
el('brief').onsubmit=event=>{
  event.preventDefault();
  const data=new FormData(event.target);
  if (!data.has('open')) { const box=event.target.querySelector('[name=open]'); box.setCustomValidity('Choose at least one connection type.'); box.reportValidity(); box.setCustomValidity(''); return; }
  brief=Object.fromEntries(data);
  brief.open=data.getAll('open');
  if(brief.call.trim()) brief.activity={text:brief.call,expires:new Date(Date.now()+Number(brief.duration)*3600000).toISOString()};
  delete brief.call; delete brief.duration;
  brief.attestation={interests:brief.interests==='Bike rides and cooking on quiet evenings'?'agent-attested':'self-declared',remaining_fields:'self-declared'};
  complete(0); complete(1);
  event.target.hidden=true; el('photoStep').hidden=false; el('hash').focus();
};
el('photo').onchange=event=>{
  generation++;
  if(photoUrl) URL.revokeObjectURL(photoUrl);
  photoFile=event.target.files[0]; photoUrl=photoFile?URL.createObjectURL(photoFile):null;
  el('preview').src=photoUrl||'assets/sample.jpg'; el('photoStatus').textContent='';
};
el('hash').onclick=async()=>{
  const version=generation;
  el('hash').disabled=true;
  try {
    await el('preview').decode();
    const bytes=photoFile?await photoFile.arrayBuffer():await (await fetch('assets/sample.jpg')).arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    if(version!==generation) return;
    brief.photo_hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    el('preview').removeAttribute('src'); if(photoUrl) URL.revokeObjectURL(photoUrl);
    photoFile=null; photoUrl=null; el('photo').value='';
    complete(2); steps[2].textContent='✓ Hash filed — photo discarded';
    brief.vouch='Known 18 months, weekly conversations'; complete(3);
    record('Approved Brief, photo hash and vouch filed with the directory.');
    directory(); el('photoStep').hidden=true; el('filed').hidden=false; el('next').focus();
  } catch { el('photoStatus').textContent='Choose a readable image and open this demo over HTTPS or localhost to file its hash.'; }
  finally { el('hash').disabled=false; }
};
function offer(person,incoming) {
  const card=document.createElement('article'); card.className='offer';
  const title=document.createElement('h4'); title.textContent=(incoming?'Contact request from ':'An introduction to ')+person.alias;
  const description=document.createElement('p');
  const overlap=brief.values.split(',').map(v=>v.trim().toLowerCase()).filter(v=>['kindness','curiosity'].includes(v));
  description.textContent=incoming?'Their agent asks whether you’d share a first name and a chat handle for a walk.':person.region+' · '+person.age+' · '+person.open.join(', ')+'. '+person.vouch+'. Values: '+person.values+'. Interests: '+person.interests+'. '+(overlap.length?'Shared values include '+overlap.join(' and ')+'.':'Shared values still need a conversation.')+' A difference to explore: Alder likes early group rides. One caution: weekend availability is uncertain.';
  const approve=document.createElement('button'),pass=document.createElement('button');
  approve.textContent='Approve'; pass.textContent='Pass'; pass.className='secondary';
  approve.onclick=()=>{
    approve.remove(); pass.remove();
    description.textContent=incoming?'Both sides approved the first stage. Rowan · @harbour-wren (fictional handle).':'Your request to meet has been sent. Your agent will check back if Alder agrees.';
    record(incoming?'First name and handle exchanged with Harbour Wren by mutual approval.':'Approved Brief and invitation shared with Alder Lane’s agent.');
    const end=document.createElement('button');end.textContent=incoming?'End contact':'Withdraw request';end.onclick=()=>{card.remove();el('notice').textContent='Closed. No further details will be shared.';};card.append(end);
  };
  pass.onclick=()=>{card.remove();el('notice').textContent='The other person never hears about a pass.';};
  card.append(title,description,approve,pass);el('offers').append(card);
}
el('next').onclick=()=>{
  if(brief.activity) {delete brief.activity;directory();}
  record('Approved Brief shared with Alder Lane’s and Harbour Wren’s delegates for structured screening.');
  offer(sample,false);offer(requester,true);show('results',2);
};
el('restart').onclick=()=>location.reload();
setInterval(()=>{if(brief?.activity && Date.parse(brief.activity.expires)<=Date.now()) directory();},1000);
rail[0].setAttribute('aria-current','step');
