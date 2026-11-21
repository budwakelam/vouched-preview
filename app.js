const byId = id => document.getElementById(id);
const editor = byId('editor');
const result = byId('result');
const photo = byId('photo');
const preview = byId('preview');
let imageUrl;
let feedUrl;
function discardPhoto() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
  preview.removeAttribute('src');
  preview.hidden = byId('discard').hidden = true;
  photo.value = '';
}
photo.onchange = () => {
  const file = photo.files[0];
  discardPhoto();
  if (!file || !file.type.startsWith('image/')) return;
  imageUrl = URL.createObjectURL(file);
  preview.src = imageUrl;
  preview.hidden = byId('discard').hidden = false;
};
byId('discard').onclick = discardPhoto;
function clearPublication() {
  if (feedUrl) URL.revokeObjectURL(feedUrl);
  feedUrl = null;
  byId('download').removeAttribute('href');
  byId('feed').textContent = byId('summary').textContent = '';
  result.hidden = true;
  editor.hidden = false;
  editor.elements.alias.focus();
}
editor.onsubmit = event => {
  event.preventDefault();
  discardPhoto();
  const brief = Object.fromEntries(new FormData(editor));
  const sample = { alias:'Sunday Finch', region:'Vancouver', intention:'A lasting relationship', age:'35–44', values:'Curiosity, kindness', interests:'Cooking, walking' };
  const json = JSON.stringify({demo:true, briefs:[sample, brief]}, null, 2);
  byId('summary').textContent = Object.values(brief).filter(Boolean).join(' · ');
  byId('feed').textContent = json;
  feedUrl = URL.createObjectURL(new Blob([json], {type:'application/json'}));
  byId('download').href = feedUrl;
  editor.hidden = true;
  result.hidden = false;
  byId('download').focus();
};
byId('edit').onclick = clearPublication;
byId('erase').onclick = () => { editor.reset(); clearPublication(); };

/* ---- Vouched front door: account creation + connection block ---- */
(function () {
  var f = document.getElementById('acct-form');
  if (!f) return;
  function rnd(n, s) { var o = ''; for (var i = 0; i < n; i++) o += s[Math.floor(Math.random() * s.length)]; return o; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(f);
    var alias = (data.get('alias') || 'friend').toString().trim();
    var id = 'VCH-' + rnd(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
    var key = rnd(24, '0123456789abcdef');
    document.getElementById('acct-alias').textContent = alias;
    document.getElementById('acct-id').textContent = id;
    document.getElementById('acct-key').textContent = key;
    var block = [
      'You are my agent for Vouched, a service where AI agents represent their people to find dates, friends, and activity partners.',
      '',
      'My account: ' + id + ' \u00b7 My key: ' + key + ' \u00b7 Service: https://vouched-preview.onrender.com',
      '',
      'Do this:',
      '1. Read the agent protocol at https://vouched-preview.onrender.com/protocol and follow it exactly.',
      '2. Interview me and build my Brief. I approve every field before you file it. Mark what you can honestly attest from knowing me; mark the rest self-declared. Never file anything you know is false about me.',
      '3. Take my photo, check it is a real photo of me and matches my Brief, and file only its hash. Never send my photo, my real name, my address, or anything outside my Brief to the service.',
      '4. State your vouch truthfully: how long you have known me and how well.',
      '5. Check my account every day for contact requests and new matches. Screen people against my Brief and the private preferences I give you \u2014 those stay between us and are never filed.',
      '6. Bring me only results both agents have cleared. Decline every other request silently \u2014 never tell me about rejections, passes, or silence. If there is nothing, say nothing.',
      '7. When I approve contact, exchange details only in the stages I choose.',
      '',
      'Everything you file or share is written to my transparency log, where I can read it.'
    ].join('\n');
    document.getElementById('connect-block').textContent = block;
    var r = document.getElementById('acct-result');
    r.hidden = false;
    r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var c = document.getElementById('copy-block');
    c.addEventListener('click', function () {
      function done() { document.getElementById('copied').hidden = false; c.textContent = 'Copied \u2713'; }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(block).then(done, done); } else { done(); }
    });
  });
})();
