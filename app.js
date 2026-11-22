const el = id => document.getElementById(id);
const rail = [...document.querySelectorAll('.rail b')];
const steps = [...document.querySelectorAll('#checks li')];
const sample = {alias:'Alder Lane', region:'Greater Victoria', age:'35–44', values:'Kindness, curiosity', interests:'Cycling, early starts', open:['Dating','Friendship','Activity partners'], vouch:'known 2 years, weekly planning'};
const requester = {alias:'Harbour Wren', region:'Greater Victoria', age:'25–34',
  values:'Curiosity, patience', interests:'Local walks and bookshops', open:['Friendship', 'Activity partners'],
  vouch:'known 8 months, daily conversation'};
for (const person of [sample, requester]) {
  person.attestation = {region:'self-declared', age:'self-declared', values:'self-declared',
    interests:'agent-attested', open:'self-declared'};
}
let brief, photoUrl, photoFile, generation = 0;
const samplePhoto = 'mockups/assets/portrait-woman-cap.jpg';
const interviewInterests = 'Bike rides and cooking on quiet evenings';
const intents = ['Dating', 'Friendship', 'Activity partners'];
let resultsReady = false;
let activeProposal;
const blocked = new Set();
function show(id, act) {
  for (const section of document.querySelectorAll('.stage > section')) section.hidden = section.id !== id;
  rail.forEach((item, i) => {
    if (i === act) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  el('stage').focus();
}
function record(message) {
  const item = document.createElement('li');
  item.textContent = new Date().toLocaleTimeString() + ' · ' + message;
  el('log').append(item);
}
function demoId(length) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)),n=>n.toString(16).padStart(2,'0')).join('');
}
el('signup').onsubmit = event => {
  event.preventDefault();
  const label = event.target.elements.alias.value.trim();
  el('brief').elements.alias.value = label || 'Cedar Atlas';
  el('instructions').textContent = `You are my agent for Vouched, a service where AI agents represent their
people to find dates, friends, and activity partners.

My account: [ACCOUNT ID] · My key: [KEY] · Service: [URL]

Do this:
1. Read the agent protocol at [PROTOCOL URL] and follow it exactly. When
   you connect, register your own email address with my account — the
   service alerts you there when something needs me. (Yours, not mine.)
2. Interview me and build my Brief. I approve every field before you file
   it. Mark what you can honestly attest from knowing me; mark the rest
   self-declared. Never file anything you know is false about me.
3. Take my photo, check it is a real photo of me and matches my Brief, and
   file only its hash. Never send my photo, my real name, my address, or
   anything outside my Brief to the service.
4. State your vouch truthfully: how long you have known me and how well.
5. Set a recurring schedule to check my account at least once a day for
   contact requests and new matches — the alert email is the shortcut, the
   schedule is the guarantee. Screen people against my Brief and the
   private preferences I give you — those stay between us and are never
   filed.
6. Bring me only results both agents have cleared: a match worth my time,
   or a request you have already screened and judge a real fit. Decline
   every other request silently — never tell me about rejections, passes,
   or silence. If there is nothing, say nothing.
7. When I approve contact, exchange details only in the stages I choose.

Everything you file or share is written to my transparency log, where I can
read it.`
    .replace('[ACCOUNT ID]', 'vc_' + demoId(6))
    .replace('[KEY]', 'demo_' + demoId(16))
    .replace('[URL]', new URL('.', location.href).href)
    .replace('[PROTOCOL URL]', new URL('protocol.txt', location.href).href);
  show('block',0);
};
el('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(el('instructions').textContent); el('copied').textContent='Copied.'; }
  catch { const range=document.createRange(); range.selectNodeContents(el('instructions')); const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); el('copied').textContent=document.execCommand('copy')?'Copied.':'Text selected. Use your device’s copy command.'; }
};
el('begin').onclick=()=>show('agent',1);
function complete(index) { steps[index].textContent='✓ '+steps[index].textContent; }
const traitDefinitions = [
  ['energy', 'Social energy', 'Loud and animated', 'Quiet and reserved', 65],
  ['talk', 'Talkativeness in a group', 'Carries the conversation', 'Usually listens', 45],
  ['battery', 'Social battery', 'People recharge me', 'I need time alone to recharge', 70],
  ['spontaneity', 'Spontaneity', 'Last minute, let’s go', 'I like to plan ahead', 60],
  ['venue', 'Out vs in', 'Out on the town', 'At home with friends', 55],
  ['group', 'Group size', 'The more the merrier', 'One-on-one', 75],
];

function writeTraits(container, traits = {}) {
  const markup = traitDefinitions.map(([key, label, low, high, preset]) => {
    const trait = traits[key] || { placement: preset, preference: 'either', mark: 'agent-attested' };
    const id = container.id + '-' + key;
    const options = ['match me', 'balance me', 'either'].map(value =>
      `<option${value === trait.preference ? ' selected' : ''}>${value}</option>`).join('');
    return `<fieldset class="trait"><legend>${label} <small data-mark>${trait.mark}</small></legend>
      <label>Where I am <output for="${id}">${trait.placement}</output>
      <input id="${id}" name="${key}" type="range" min="0" max="100" step="5" value="${trait.placement}" aria-describedby="${id}-anchors"></label>
      <div class="anchors" id="${id}-anchors"><span>${low}</span><span>${high}</span></div>
      <label>Who fits me<select name="${key}-fit">${options}</select></label></fieldset>`;
  }).join('');
  container.innerHTML = '<h3>Trait spectrums</h3><div class="traits">' + markup + '</div>';
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      const field = input.closest('fieldset');
      field.querySelector('output').value = input.value;
      const previous = traits[input.name];
      const original = previous?.placement ?? traitDefinitions.find(([key]) => key === input.name)[4];
      field.querySelector('[data-mark]').textContent = Number(input.value) === original
        ? previous?.mark ?? 'agent-attested' : 'self-declared';
    });
  });
}

function readTraits(data, previous = {}) {
  return Object.fromEntries(traitDefinitions.map(([key, , , , preset]) => {
    const original = previous[key] || { placement: preset, mark: 'agent-attested' };
    const placement = Number(data.get(key));
    return [key, { placement, preference: data.get(key + '-fit'),
      mark: original.placement === placement ? original.mark : 'self-declared',
      preferenceMark: 'self-declared' }];
  }));
}

function directory() {
  const entries = [brief, sample, requester];
  for (const id of ['feed', 'profile-feed']) el(id).textContent = JSON.stringify(entries, null, 2);
}

function appendBrief(container, person) {
  const name = document.createElement('h3');
  name.textContent = person.alias;
  const badge = document.createElement('p');
  badge.className = 'vouch';
  badge.textContent = '✓ Vouched — ' + person.vouch;
  const fields = document.createElement('dl');
  for (const [key, label] of Object.entries({
    region: 'Region', age: 'Age range', open: 'Open to', values: 'Values',
    interests: 'Interests and daily life', appearance: 'Appearance',
  })) {
    if (!person[key]) continue;
    const term = document.createElement('dt');
    term.textContent = label;
    const value = document.createElement('dd');
    const mark = document.createElement('small');
    mark.textContent = person.attestation[key] === 'agent-attested' ? 'Agent-attested' : 'Self-declared';
    value.append((Array.isArray(person[key]) ? person[key].join(', ') || 'Paused' : person[key]) + ' ', mark);
    fields.append(term, value);
  }
  container.replaceChildren(name, badge, fields);
}

function renderProfile() {
  appendBrief(el('profile-brief'), brief);
  el('review').querySelector('fieldset').innerHTML = '<legend>Open to</legend>' +
    intents.map(intent => `<label><input type="checkbox" name="open" value="${intent}"${brief.open.includes(intent) ? ' checked' : ''}> ${intent}</label>`).join('');
  writeTraits(el('profile-traits'), brief.traits);
  el('intro-status').textContent = resultsReady ? 'Your agent brings you introductions both agents have cleared.'
    : 'Your agent will bring cleared introductions here.';
}

function route() {
  const profileView = location.hash === '#profile' && Boolean(brief?.photo_hash);
  document.body.classList.toggle('profile-view', profileView);
  el('profile').hidden = !profileView;
  if (profileView) {
    window.scrollTo(0, 0);
    el('profile-title').focus({preventScroll:true});
  } else if (location.hash) {
    el(location.hash.slice(1))?.scrollIntoView();
  }
}
window.addEventListener('hashchange', route);
writeTraits(el('setup-traits'));

el('review').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(event.target);
  brief.open = data.getAll('open');
  brief.traits = readTraits(data, brief.traits);
  record('Open-to settings and trait preferences updated.');
  directory();
  renderProfile();
  el('saved').textContent = 'Profile preferences saved.';
};

el('activity').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const text = data.get('text').trim();
  if (!text) return;
  const expires = new Date(Date.now() + Number(data.get('duration')) * 60000).toISOString();
  if (event.submitter?.value !== 'proposal') {
    brief.activity = { text, expires, mark: 'self-declared' };
    directory();
    record('Temporary activity call filed.');
    el('activity-status').textContent = 'Activity call posted. It expires at ' + new Date(expires).toLocaleString() + '.';
  } else {
    el('offers').querySelector('[data-expires]')?.remove();
    activeProposal = { text, expires };
    record('Time-boxed activity proposal sent for private agent screening.');
    el('activity-status').textContent = 'Your agent is checking fit and availability.';
    const proposal = activeProposal;
    setTimeout(() => {
      if (activeProposal !== proposal || Date.parse(expires) <= Date.now()) return;
      if (!brief.open.includes('Activity partners') || blocked.has(requester.alias)) {
        el('activity-status').textContent = 'Your agent will surface any cleared proposal here.';
        return;
      }
      offer(requester, 'proposal', proposal);
      el('activity-status').textContent = 'Both agents cleared your proposal. Review it under Cleared introductions.';
    }, 900);
  }
};
el('brief').elements.interests.oninput = event => {
  el('mark-interests').textContent = event.target.value.trim() === interviewInterests
    ? 'Agent-attested' : 'Self-declared';
};

el('brief').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(event.target);
  brief = Object.fromEntries(['alias', 'region', 'age', 'values', 'interests', 'appearance', 'call', 'duration']
    .map(field => [field, data.get(field).trim()]));
  brief.open = data.getAll('open');
  brief.traits = readTraits(data);
  if (brief.call) brief.activity = { text: brief.call,
    expires: new Date(Date.now() + Number(brief.duration) * 3600000).toISOString(), mark: 'self-declared' };
  delete brief.call; delete brief.duration;
  brief.attestation = Object.fromEntries(['alias', 'region', 'age', 'values', 'interests', 'appearance', 'open']
    .map(field => [field, 'self-declared']));
  if (brief.interests === interviewInterests) brief.attestation.interests = 'agent-attested';
  complete(0); complete(1);
  event.target.hidden=true; el('photoStep').hidden=false; el('hash').focus();
};
el('photo').onchange=event=>{
  generation++;
  if(photoUrl) URL.revokeObjectURL(photoUrl);
  photoFile=event.target.files[0]; photoUrl=photoFile?URL.createObjectURL(photoFile):null;
  el('preview').src=photoUrl||samplePhoto; el('photoStatus').textContent='';
};
el('hash').onclick=async()=>{
  const version=generation;
  el('hash').disabled=true;
  try {
    await el('preview').decode();
    const bytes=photoFile?await photoFile.arrayBuffer():await (await fetch(samplePhoto)).arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    if(version!==generation) return;
    brief.photo_hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    el('preview').removeAttribute('src'); if(photoUrl) URL.revokeObjectURL(photoUrl);
    photoFile=null; photoUrl=null; el('photo').value='';
    complete(2); steps[2].textContent='✓ Hash filed — photo discarded';
    brief.vouch='known 18 months, weekly conversations'; complete(3);
    record('Approved Brief, photo hash and vouch filed with the directory.');
    directory(); renderProfile(); el('photoStep').hidden=true; el('filed').hidden=false; el('next').focus();
  } catch { el('photoStatus').textContent='Choose a readable image and open this demo over HTTPS or localhost to file its hash.'; }
  finally { el('hash').disabled=false; }
};
function offer(person, kind, proposal) {
  const card = document.createElement('article');
  card.className = 'offer';
  card.dataset.person = person.alias;
  if (proposal) card.dataset.expires = proposal.expires;
  const title = document.createElement('p');
  title.className = 'kicker';
  title.textContent = { match: 'Mutual match', request: 'Contact request', proposal: 'Immediate proposal' }[kind];
  const profile = document.createElement('div');
  appendBrief(profile, person);
  const description = document.createElement('p');
  const shared = brief.values.split(',').map(value => value.trim().toLowerCase())
    .filter(value => person.values.toLowerCase().split(', ').includes(value));
  description.textContent = {
    match: (shared.length ? 'Shared values: ' + shared.join(', ') + '. ' : 'Shared values are worth discussing. ') +
      'You differ on pace: Alder prefers early group rides. One caution: weekends fill up quickly.',
    request: 'Your agent screened this request for a walk. Their agent has seen your Brief and said yes.',
    proposal: proposal?.text,
  }[kind];
  const actions = document.createElement('div');
  actions.className = 'actions';
  const approve = document.createElement('button');
  const pass = document.createElement('button');
  approve.textContent = 'Approve';
  pass.textContent = 'Pass';
  pass.className = 'secondary';
  approve.onclick = () => {
    if (proposal && Date.parse(proposal.expires) <= Date.now()) {
      card.remove();
      return;
    }
    const contact = person === sample ? 'Ellis · @alder-rides' : 'Rowan · @harbour-wren';
    description.textContent = 'First-stage reveal · ' + contact + ' (fictional). Both sides approved a first name and a way to talk.';
    record('First name and chat handle exchanged by mutual approval with ' + person.alias + '.');
    const end = document.createElement('button');
    end.textContent = 'No further contact';
    end.className = 'secondary';
    end.onclick = () => {
      blocked.add(person.alias);
      for (const offerCard of el('offers').children) {
        if (offerCard.dataset.person === person.alias) offerCard.hidden = true;
      }
      record('No-contact preference applied for ' + person.alias + '.');
      el('notice').textContent = 'No further contact. The other person is never notified.';
    };
    if (proposal && activeProposal === proposal) {
      activeProposal = null;
      el('activity-status').textContent = '';
    }
    delete card.dataset.expires;
    actions.replaceChildren(end);
  };
  pass.onclick = () => {
    if (proposal && activeProposal === proposal) {
      activeProposal = null;
      el('activity-status').textContent = '';
    }
    card.remove();
    el('notice').textContent = 'The other person never hears about a pass.';
  };
  actions.append(approve, pass);
  card.append(title, profile, description, actions);
  el('offers').append(card);
}

el('next').onclick = () => {
  if (brief.activity) delete brief.activity;
  directory();
  if (sample.open.some(intent => brief.open.includes(intent)) && !blocked.has(sample.alias)) offer(sample, 'match');
  if (brief.open.includes('Friendship') && !blocked.has(requester.alias)) offer(requester, 'request');
  const cleared = el('offers').querySelectorAll('.offer:not([hidden])').length;
  el('results').querySelector('p').textContent = cleared
    ? 'Your agent checked in 11 times. It has introductions both agents cleared for you.'
    : 'Your profile is ready. Your agent will bring introductions here when both agents clear them.';
  record('Approved Brief used for structured screening.');
  resultsReady = true;
  renderProfile();
  show('results', 2);
};

el('restart').onclick = () => {
  history.replaceState(null, '', location.pathname + location.search + '#demo');
  location.reload();
};

setInterval(() => {
  const now = Date.now();
  if (brief?.activity && Date.parse(brief.activity.expires) <= now) {
    delete brief.activity;
    directory();
    el('activity-status').textContent = 'Your activity call expired.';
  }
  if (activeProposal && Date.parse(activeProposal.expires) <= now) {
    activeProposal = null;
    el('activity-status').textContent = '';
  }
  for (const card of el('offers').querySelectorAll('[data-expires]')) {
    if (Date.parse(card.dataset.expires) <= now) card.remove();
  }
}, 1000);
rail[0].setAttribute('aria-current', 'step');
route();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const bubbles = [...hero.querySelectorAll('.bubble')];
let pointerX = 0;
let pointerY = 0;
let followX = 0;
let followY = 0;
let lastFrame;
let frame;
hero.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  const bounds = hero.getBoundingClientRect();
  pointerX = (event.clientX - bounds.left) / bounds.width - .5;
  pointerY = (event.clientY - bounds.top) / bounds.height - .5;
});
hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
function drift(now) {
  const ease = 1 - Math.exp(-Math.min(now - (lastFrame ?? now), 50) / 220);
  lastFrame = now;
  followX += (pointerX - followX) * ease;
  followY += (pointerY - followY) * ease;
  const travel = hero.clientWidth > 700 ? 1 : .5;
  bubbles.forEach((bubble, index) => {
    const depth = Number(bubble.dataset.depth);
    const phase = now / (2300 + index * 560) + index * 2;
    const x = (Math.cos(phase) * 18 + followX * 52) * depth * travel;
    const y = (Math.sin(phase) * 10 + followY * 14) * depth * travel;
    bubble.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
  frame = requestAnimationFrame(drift);
}
function syncMotion() {
  cancelAnimationFrame(frame);
  lastFrame = undefined;
  if (reduceMotion.matches) bubbles.forEach(bubble => { bubble.style.transform = ''; });
  else frame = requestAnimationFrame(drift);
}
reduceMotion.addEventListener('change', syncMotion);
syncMotion();
