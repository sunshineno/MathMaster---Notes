const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
let drawing = false, erasing = false, history = [];
let currentSubject = null, currentChapter = null;

const state = JSON.parse(localStorage.getItem('mmn-state') || '{"subjects":[]}');

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const saved = canvas.toDataURL();
  canvas.width = Math.max(800, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.floor(rect.height * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
  img.src = saved;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function saveState() { localStorage.setItem('mmn-state', JSON.stringify(state)); }
function render() {
  $('subjects').innerHTML = '';
  state.subjects.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'item' + (i === currentSubject ? ' selected' : '');
    el.textContent = s.name;
    el.onclick = () => { savePage(); currentSubject=i; currentChapter=null; render(); clearCanvas(); };
    $('subjects').appendChild(el);
  });
  $('chapters').innerHTML = '';
  const subject = state.subjects[currentSubject];
  if (!subject) return;
  subject.chapters.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'item' + (i === currentChapter ? ' selected' : '');
    el.textContent = c.name;
    el.onclick = () => { savePage(); currentChapter=i; render(); loadPage(); };
    $('chapters').appendChild(el);
  });
}
$('addSubject').onclick = () => {
  const name = $('subjectName').value.trim();
  if (!name) return;
  state.subjects.push({name, chapters:[]}); $('subjectName').value='';
  currentSubject = state.subjects.length-1; currentChapter=null; saveState(); render();
};
$('addChapter').onclick = () => {
  const subject = state.subjects[currentSubject], name=$('chapterName').value.trim();
  if (!subject) return alert('Crée ou sélectionne une matière.');
  if (!name) return;
  subject.chapters.push({name, image:null, latex:''}); $('chapterName').value='';
  currentChapter=subject.chapters.length-1; saveState(); render(); clearCanvas();
};

function point(e) {
  const r=canvas.getBoundingClientRect();
  return {x:e.clientX-r.left, y:e.clientY-r.top, pressure:e.pressure || .5};
}
canvas.addEventListener('pointerdown', e => {
  drawing=true; canvas.setPointerCapture(e.pointerId); history.push(canvas.toDataURL());
  const p=point(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);
});
canvas.addEventListener('pointermove', e => {
  if(!drawing) return; const p=point(e);
  ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  ctx.strokeStyle=$('color').value;
  ctx.lineWidth=Number($('size').value) * (e.pointerType === 'pen' ? Math.max(.45, p.pressure*1.3) : 1);
  ctx.lineTo(p.x,p.y); ctx.stroke();
});
['pointerup','pointercancel'].forEach(n => canvas.addEventListener(n, () => { drawing=false; ctx.closePath(); }));

$('penBtn').onclick=()=>{erasing=false;$('penBtn').classList.add('active');$('eraserBtn').classList.remove('active');};
$('eraserBtn').onclick=()=>{erasing=true;$('eraserBtn').classList.add('active');$('penBtn').classList.remove('active');};
$('undoBtn').onclick=()=>{ const src=history.pop(); if(!src)return; clearCanvas(); const i=new Image(); i.onload=()=>ctx.drawImage(i,0,0,canvas.clientWidth,canvas.clientHeight); i.src=src; };
function clearCanvas(){ctx.clearRect(0,0,canvas.width,canvas.height);}
$('clearBtn').onclick=()=>{history.push(canvas.toDataURL());clearCanvas();};

function savePage(){
  const chapter=state.subjects[currentSubject]?.chapters[currentChapter];
  if(!chapter)return;
  chapter.image=canvas.toDataURL('image/png');
  chapter.latex=$('latexText').value;
  saveState();
}
function loadPage(){
  clearCanvas();
  const chapter=state.subjects[currentSubject]?.chapters[currentChapter];
  $('latexText').value=chapter?.latex || '';
  if(chapter?.image){const i=new Image();i.onload=()=>ctx.drawImage(i,0,0,canvas.clientWidth,canvas.clientHeight);i.src=chapter.image;}
}
$('saveBtn').onclick=()=>{savePage();alert('Chapitre enregistré sur cette tablette.');};
$('exportBtn').onclick=()=>{const a=document.createElement('a');a.download='mathmaster-note.png';a.href=canvas.toDataURL();a.click();};
$('printBtn').onclick=()=>{savePage();window.print();};

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});
$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true;}};
if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
render();
