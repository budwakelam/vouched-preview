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
