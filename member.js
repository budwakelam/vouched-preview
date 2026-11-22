import {agentKey,sha,signedHeaders,generateKeys,encryptCard,decryptCard} from './keys.js';
const get=id=>document.getElementById(id);
const storage='vouched.account.v1';
let account,profile;
const traits={energy:['Social energy','Outgoing','Quiet'],conversation:['Conversation','Talk more','Listen more'],battery:['Social battery','Energized by company','Need time alone'],planning:['Planning','Spontaneous','Plan ahead'],outings:['Going out','Out on the town','At home'],group:['Group size','Large groups','One-on-one']};
const intents=['Friendship','Dating','Activity partners'];
async function api(path,method='GET',data,identity=account) {
  const raw=data===undefined?'':JSON.stringify(data), route='/api/'+path;
  const headers=identity?await signedHeaders(identity,method,route,raw):{};
  if(raw)headers['Content-Type']='application/json';
  const res=await fetch(route,{method,headers,body:raw||undefined,cache:'no-store'});
  const result=await res.json().catch(()=>{throw new Error('The pilot service is unavailable. Please try again.');});
  if(!res.ok)throw new Error(result.error);
  return result;
}
function tell(message){get('status').textContent=message;}
function bind(node,event,action) {
  node.addEventListener(event,async e=>{
    e.preventDefault();
    const trigger=e.submitter||node;
    if(trigger.disabled)return;
    trigger.disabled=true;tell('');
    try{await action(e);}catch(error){tell(error.message||'Please try again.');}
    finally{trigger.disabled=false;}
  });
}
function el(tag,text,cls){const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,action,cls='secondary'){const b=el('button',text,cls);b.type='button';bind(b,'click',action);return b;}
function select(options,value) {
  const s=el('select');
  for(const [v,label] of options){const o=el('option',label);o.value=v;s.append(o);}
  s.value=value||options[0][0];return s;
}
function label(name,input){const wrap=el('label',name);wrap.append(input);return wrap;}
function check(message){const box=el('input');box.type='checkbox';const wrap=label(message,box);wrap.prepend(box);wrap.className='check';return {box,wrap};}
function persist(data){localStorage.setItem(storage,JSON.stringify(data));account=data;}
async function replaceKey() {
  const next=agentKey();
  await api('agent-key','PUT',{hash:await sha(next)});
  persist({...account,agent:next});
}
function instructions(){
  return ['You are my Vouched agent. Use the live protocol at '+location.origin+'/agent-protocol.txt.',
    'Account: '+account.id,'Private agent bearer key: '+account.agent,
    'Use this key only with '+location.origin+'/api/. Interview me and get my approval before filing any field. Check my photo locally and file its hash.',
    'Keep private preferences and availability with you. Set a daily check if your tools support it. Screen incoming probes privately. Bring me introductions only when both agents have cleared them. I make the final decision in my account.'].join('\n');
}
async function loadProfile() {
  profile=await api('account'); get('alias').textContent=profile.alias;get('standing').textContent=profile.standing;
  get('join').hidden=true;get('profile').hidden=false;
  get('copy').textContent=account.agent?'Copy connection block':'Generate connection block';
  get('show').hidden=!account.agent;
  if(account.agent)get('block').textContent=instructions();
  get('meetings').replaceChildren();
  if(!profile.introductions.length)get('meetings').append(el('p',profile.brief?'When both agents find a fit, your introduction will appear here.':'Your introductions will appear here after your agent files your Brief.'));
  for(const intro of profile.introductions)get('meetings').append(await meetingCard(intro));
  renderBrief(); get('dispute').hidden=profile.standing!=='Disputed';
  get('respond').elements.statement.value=profile.response||'';
  get('log').replaceChildren(...profile.log.map(l=>el('li',new Date(l.at*1000).toLocaleDateString()+' · '+l.event)));
  if(!profile.log.length)get('log').append(el('li','No activity yet.'));
}
function renderBrief() {
  const root=get('brief'), b=profile.brief;root.replaceChildren();
  if(!b){root.append(el('p','Waiting for your agent to file your approved Brief.'));return;}
  const dl=el('dl');
  for(const key of ['region','age','interests','values','vouch']){
    dl.append(el('dt',key[0].toUpperCase()+key.slice(1)),el('dd',b[key]+(b.marks[key]?' · '+b.marks[key]:'')));
  }
  const detail=el('details');detail.append(el('summary','Edit intentions and social preferences'));
  const form=el('form',null,'stack'), fieldset=el('fieldset'), checks=[];
  fieldset.append(el('legend','Open to'));const wrap=el('div',null,'check-wrap');
  for(const intent of intents){const {box,wrap:lab}=check(intent);box.value=intent;box.checked=b.open.includes(intent);wrap.append(lab);checks.push(box);}
  fieldset.append(wrap);form.append(fieldset);
  const controls={};
  for(const [key,[title,left,right]] of Object.entries(traits)){
    const row=el('div',null,'trait'), slider=el('input');slider.type='range';slider.min=1;slider.max=5;slider.value=b.traits[key].value;
    const fit=select([['either','Either'],['match','Match me'],['balance','Balance me']],b.traits[key].fit);
    const l=label(title,slider);l.append(el('span',left+' ··· '+right));
    row.append(l,label(title+' fit',fit));form.append(row);controls[key]={slider,fit};
  }
  form.append(el('button','Save preferences'));bind(form,'submit',async()=>{
    const open=checks.filter(c=>c.checked).map(c=>c.value);
    if(!open.length)throw new Error('Choose at least one connection type.');
    const updated=Object.fromEntries(Object.entries(controls).map(([k,{slider,fit}])=>[k,{value:Number(slider.value),fit:fit.value}]));
    await api('preferences','PUT',{open,traits:updated});await loadProfile();tell('Preferences saved.');
  });
  detail.append(form);root.append(dl,el('p','Open to '+b.open.join(', ')),detail);
}
async function meetingCard(intro) {
  const card=el('article',null,'panel stack');card.append(el('h3',intro.activity+' with '+intro.alias),el('p',intro.brief));
  const send=async(action,data,message)=>{await api('meetings/'+intro.id+'/'+action,'POST',data);await loadProfile();tell(message);};
  if(intro.state==='cleared'){
    const row=el('div',null,'row');
    if(intro.approved)card.append(el('p','You approved. Your contact card opens when you both say yes.'));
    else row.append(button('Approve introduction',()=>send('decision',{answer:'yes'},'Your choice was saved.'),''));
    row.append(button('Pass privately',()=>send('decision',{answer:'pass'},'Introduction closed.')));card.append(row);
  } else {
    card.append(el('p','You both accepted this introduction.','pill'));
    if(intro.received){
      try{card.append(el('p',intro.alias+' shared: '+await decryptCard(account,intro),'note'));}
      catch{card.append(el('p','This device could not open the contact card. Restore your recovery file.'));}
    }
    const share=el('form',null,'stack'),input=el('input');input.required=true;input.maxLength=120;input.placeholder='A handle or a way to reach you';
    share.append(label('Your contact card for '+intro.alias,input),el('button',intro.shared?'Replace shared card':'Share encrypted card'));
    bind(share,'submit',async()=>{await send('handoff',{packet:await encryptCard(account,intro,input.value.trim())},'Contact card shared for seven days.');});card.append(share);
    if(intro.reviewed)card.append(el('p','Your private feedback was received.'));
    else{
      const detail=el('details');detail.append(el('summary','Leave post-meeting feedback'));
      const form=el('form',null,'stack'), met=check('I met this person.');met.box.required=true;
      const accuracy=select([['','Choose an answer'],['as-described','As described'],['different','Different from the Brief']]);
      const conduct=select([['','Choose an answer'],['respectful','Respected my boundaries'],['boundaries','There was a boundary concern']]);accuracy.required=true;conduct.required=true;
      form.append(met.wrap,label('How accurate was their Brief?',accuracy),label('How was their conduct?',conduct),el('button','Send private feedback'));
      bind(form,'submit',()=>send('feedback',{met:met.box.checked,accuracy:accuracy.value,conduct:conduct.value},'Private feedback received.'));detail.append(form);card.append(detail);
    }
  }
  card.append(button('End contact permanently',async()=>{if(confirm('Permanently end contact and remove shared cards for this introduction?'))await send('block',{},'Contact ended.');},'secondary danger'));
  return card;
}
bind(get('signup'),'submit',async()=>{
  const form=get('signup'), keys=await generateKeys();
  const {id}=await api('accounts','POST',{alias:form.elements.alias.value,adult:true,invite:form.elements.invite.value,ownerKey:keys.ownerKey,exchangeKey:keys.exchangeKey},null);
  persist({version:1,id,sign:keys.sign,box:keys.box});await loadProfile();await replaceKey();await loadProfile();tell('Account created. Save a recovery file under account access.');
});
bind(get('copy'),'click',async()=>{
  if(!account.agent){await replaceKey();await loadProfile();}
  try{await navigator.clipboard.writeText(instructions());tell('Connection block copied.');}
  catch{get('block-box').hidden=false;get('show').textContent='Hide block';tell('Select the connection block and copy it manually.');}
});
bind(get('show'),'click',()=>{get('block-box').hidden=!get('block-box').hidden;get('show').textContent=get('block-box').hidden?'Show block':'Hide block';});
bind(get('refresh'),'click',async()=>{await loadProfile();tell('Account refreshed.');});
bind(get('rotate'),'click',async()=>{if(confirm('Replace the current agent key? Your previous connection block will stop working.')){await replaceKey();await loadProfile();tell('Copy the new block to your agent.');}});
bind(get('backup'),'click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({...account,agent:undefined})],{type:'application/json'}));const a=el('a');a.href=url;a.download='vouched-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);tell('Recovery file prepared. Keep it private.');});
bind(get('restore'),'change',async()=>{const f=get('restore').files[0];if(!f)return;if(f.size>6000)throw new Error('Choose a Vouched recovery file.');
  const data=JSON.parse(await f.text());if(data.version!==1||!data.id||!data.sign?.d||!data.box?.d)throw new Error('Invalid recovery file.');
  await api('account','GET',undefined,data);persist({version:1,id:data.id,sign:data.sign,box:data.box});await loadProfile();tell('Account restored.');
});
bind(get('respond'),'submit',async()=>{await api('refutation','PUT',{statement:get('respond').elements.statement.value});await loadProfile();tell('Response saved.');});
bind(get('remove'),'click',async()=>{if(confirm('Delete this account, its Brief, connections and feedback permanently?')){await api('account','DELETE',{});localStorage.removeItem(storage);location.replace('/');}});
try{
  const saved=localStorage.getItem(storage);
  if(saved){account=JSON.parse(saved);await loadProfile();}
  else{get('join').hidden=false;const config=await api('settings','GET',undefined,null);get('invite-label').hidden=!config.inviteRequired;}
  tell('');
}catch(e){tell(e.message);get('join').hidden=false;}
