/* Helene's Candy Quest. Helene walks six original candy lands.
   Her portrait is the same art used in Helene's Treasure Chest. */
'use strict';
const W = window.CandyWorld;
const $=id=>document.getElementById(id);
const LEVELS = W.LEVELS;
const SK = 'hcq_save_v1';
let SV;
try{SV=JSON.parse(localStorage.getItem(SK))||{}}catch(e){SV={}}
SV=Object.assign({stars:{}, best:{}, music:1, sound:1}, SV);
function persist(){try{localStorage.setItem(SK, JSON.stringify(SV))}catch(e){}}
function journeyTotal(){let t=0; for(const k in SV.best) t+=SV.best[k]|0; return t}
function soundMuted(){return !SV.sound}
var state='title';

const cv=$('cv'), ctx=cv.getContext('2d');
const faceImg=new Image(); faceImg.src='art/helene-face.png';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let run=null, camX=null, acc=0, anim=0, shake=0, lastTs=0, rafRun=false;
let swipeDir=0, bot=null, onFrame=null;
const held={left:false, right:false};
const keys={left:false, right:false};
const cheers=['Ooh, sweet!','Wonderful!','Look at that!','You are a natural!','So pretty!','Keep it up!'];
let cheerI=0;
const parts=[], texts=[];

function toast(t){const e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>e.classList.remove('on'), 1800)}
function say(t, ms){const b=$('bubble'); if(!b) return; b.textContent=t; b.classList.add('on'); clearTimeout(say._t); say._t=setTimeout(()=>b.classList.remove('on'), ms||2600)}
function banner(t, ms){const b=$('banner'); b.textContent=t; b.classList.add('on'); clearTimeout(banner._t); banner._t=setTimeout(()=>b.classList.remove('on'), ms||1500)}
function pickCheer(){cheerI=(cheerI+1)%cheers.length; return cheers[cheerI]}

function applyChrome(){
  const land=innerWidth>innerHeight*1.08;
  const fine=matchMedia('(pointer:fine)').matches && innerWidth>=900;
  document.body.classList.toggle('land', land);
  document.body.classList.toggle('fine', fine);
  document.body.dataset.mode=state;
}
function setState(s){state=s; applyChrome()}

function nextIndex(){
  for(let i=0;i<LEVELS.length;i++) if(!(SV.stars[LEVELS[i].id]>0)) return i;
  return 0;
}
function starCount(){let n=0; for(const k in SV.stars) n+=SV.stars[k]|0; return n}
function refreshTitle(){
  const i=nextIndex(), done=LEVELS.every(L=>SV.stars[L.id]>0);
  const sub=$('bPlaySub');
  if(sub) sub.textContent=done? LEVELS[0].name+' · again' : LEVELS[i].name+' · Level '+(i+1);
  const best=$('bestLine');
  if(best){
    const tot=journeyTotal();
    best.textContent=tot? 'Best quest score '+tot.toLocaleString()+'  ·  ★ '+starCount()+' / '+(LEVELS.length*3) : 'Collect candy. Reach the gate.';
  }
}
function renderMap(){
  const box=$('mapList'); if(!box) return;
  box.innerHTML='';
  $('mapStars').textContent='★ '+starCount();
  LEVELS.forEach((L,i)=>{
    const open=i===0 || SV.stars[LEVELS[i-1].id]>0;
    const st=SV.stars[L.id]|0;
    const b=document.createElement('button');
    b.type='button';
    b.className='mbtn'+(open?'':' lock')+(i===nextIndex()&&open?' cur':'');
    b.disabled=!open;
    const stars=open? '★'.repeat(st)+'☆'.repeat(3-st) : 'Locked';
    b.innerHTML='<b>'+(open?(i+1)+'. '+L.name:'🔒 '+L.name)+'</b><small>'+stars+'</small>';
    b.onclick=()=>{ if(!open) return; AU.S.tap(); startLevel(i); };
    box.appendChild(b);
  });
}

function card(html, btns){
  const c=$('card');
  c.innerHTML='<div class="cbody">'+html+'</div><div class="btns"></div>';
  const box=c.querySelector('.btns');
  (btns||[]).forEach(b=>{
    const e=document.createElement('button');
    e.type='button'; e.className='btn '+(b.cls||'');
    e.innerHTML=b.t;
    e.onclick=()=>{ AU.start(); AU.S.tap(); b.fn(); };
    box.appendChild(e);
  });
  $('ov').classList.add('on');
  const body=c.querySelector('.cbody'); if(body) body.scrollTop=0;
}
function closeCard(){$('ov').classList.remove('on')}
function cardOpen(){return $('ov').classList.contains('on')}

function startLevel(i){
  closeCard();
  run=W.createRun(i);
  camX=null; acc=0; parts.length=0; texts.length=0; shake=0;
  setState('play');
  AU.start(); AU.play(run.lvl.id);
  hud();
  say(run.lvl.intro, 4200);
  banner(run.lvl.name, 1400);
}
function goTitle(){
  closeCard(); run=null; setState('title'); refreshTitle(); AU.play('title');
}
function goMap(){closeCard(); setState('map'); renderMap(); AU.play('title')}

function showDead(){
  releaseHolds();
  setState('dead');
  AU.play('title');
  card('<div class="face"></div><h2>Oops, too sticky!</h2><p>Helene shakes it off. This land will still be here.</p>',
    [{t:'▶ Try again', cls:'gold', fn:()=>startLevel(run.i)},
     {t:'🗺️ Levels', cls:'dim', fn:goMap},
     {t:'🏠 Home', cls:'dim', fn:goTitle}]);
}
function showWin(ev){
  releaseHolds();
  const meta=LEVELS[run.i];
  SV.stars[meta.id]=Math.max(SV.stars[meta.id]|0, ev.stars);
  SV.best[meta.id]=Math.max(SV.best[meta.id]|0, ev.score);
  persist();
  const last=run.i===LEVELS.length-1;
  const stars='<div class="stars">'+[0,1,2].map(i=>i<ev.stars?'★':'<span class="off">★</span>').join('')+'</div>';
  const line='<p>Score <b>'+ev.score.toLocaleString()+'</b> · candy '+ev.got+'/'+ev.total+'</p>';
  if(last){
    setState('finale');
    AU.play('finale');
    setTimeout(()=>{ if(state!=='finale') return; try{ PALB.gameOver(journeyTotal(), {board:'quest', heading:'🏆 THE CROWN IS HOME', label:'Your quest score'}); }catch(e){} }, 1400);
    card('<img class="hero" src="art/helene.webp" alt="Helene holding her treasure chest"><h2>The candy crown is home!</h2>'+stars+line+
      '<p>Helene tucks the crown into her treasure chest. Six sweet lands, and she is so proud of you.</p><p>Quest score <b>'+journeyTotal().toLocaleString()+'</b> · ★ '+starCount()+' / '+(LEVELS.length*3)+'</p>',
      [{t:'▶ Play again', cls:'gold', fn:()=>startLevel(0)},
       {t:'🏆 Leaderboard', cls:'teal', fn:()=>{try{PALB.show('quest')}catch(e){}}},
       {t:'🗺️ Levels', cls:'dim', fn:goMap},
       {t:'🏠 Home', cls:'dim', fn:goTitle}]);
  }else{
    setState('clear');
    card('<div class="face"></div><h2>'+meta.name+' complete!</h2>'+stars+line+'<p>Next land: <b>'+LEVELS[run.i+1].name+'</b></p>',
      [{t:'▶ Next', cls:'gold', fn:()=>startLevel(run.i+1)},
       {t:'🗺️ Levels', cls:'dim', fn:goMap},
       {t:'🏠 Home', cls:'dim', fn:goTitle}]);
  }
}
function pauseGame(){
  if(state!=='play'||!run) return;
  releaseHolds();
  setState('pause');
  card('<h2>Paused</h2><p>'+run.lvl.name+'</p><p>Take your time. The candy will wait.</p>',
    [{t:'▶ Resume', cls:'gold', fn:resumeGame},
     {t:'🔄 Restart land', cls:'dim', fn:()=>startLevel(run.i)},
     {t:'⚙️ Settings', cls:'dim', fn:()=>settings(pauseGame)},
     {t:'🗺️ Levels', cls:'dim', fn:goMap},
     {t:'🏠 Home', cls:'dim', fn:goTitle}]);
}
function resumeGame(){if(state!=='pause') return; closeCard(); setState('play')}
function goBack(){
  const palb=document.getElementById('palbOv');
  if(palb&&palb.classList.contains('on')){try{PALB.close()}catch(e){} return true}
  if(cardOpen()){if(state==='pause') resumeGame(); else if(state==='map') goTitle(); else closeCard(); return true}
  if(state==='map'){goTitle(); return true}
  if(state==='play'){pauseGame(); return true}
  return false;
}
function settings(back){
  const row=(k,label)=>'<div class="set"><span>'+label+'</span><button type="button" data-k="'+k+'" class="'+(SV[k]?'on':'')+'">'+(SV[k]?'On':'Off')+'</button></div>';
  card('<h2>Settings</h2>'+row('music','🎵 Music')+row('sound','🔔 Sounds')+'<p>Helene likes the music gentle and the buttons big.</p>',
    [{t:'📖 How to play', cls:'dim', fn:()=>howTo(()=>settings(back))},
     {t:'✔ Done', cls:'gold', fn:()=>back?back():closeCard()}]);
  $('card').querySelectorAll('.set button').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k; SV[k]=SV[k]?0:1; persist();
    b.classList.toggle('on', !!SV[k]); b.textContent=SV[k]?'On':'Off';
    AU.setMusic(!!SV.music); AU.setSound(!!SV.sound); AU.S.tap();
  });
}
function howTo(back){
  card('<h2>How to play</h2><ul>'+
    '<li><b>Walk</b> with the ◀ ▶ buttons, or the arrow keys, or A and D.</li>'+
    '<li><b>Jump</b> with the JUMP button, a swipe up, or Space, W, or the Up arrow.</li>'+
    '<li>Pick up every candy you can. <b>Reach the candy gate</b> to finish the land.</li>'+
    '<li>Taffy slows your shoes. Jellies and jawbreakers are bouncy. Mint tiles are slippery. A syrup pit sends you back to the last candy cane.</li>'+
    '<li>You have 3 hearts. If they run out, try the land again. Your stars stay saved on this phone.</li>'+
    '<li>⌨️ P pauses. M turns the sound off and on.</li>'+
    '<li class="gp-help">🎮 A controller works too: stick or D-pad to walk, A to jump, Start to pause, B to go back.</li>'+
    '</ul>',
    [{t:'Got it!', cls:'gold', fn:()=>back?back():closeCard()}]);
}

function releaseHolds(){
  held.left=held.right=false; keys.left=keys.right=false; swipeDir=0;
  document.querySelectorAll('#pad button.on').forEach(b=>b.classList.remove('on'));
}
function requestJump(){if(run && state==='play') run.jumpBuf=Math.max(run.jumpBuf||0, 0.16)}
function readInput(){
  let left=keys.left||held.left||swipeDir<0||(bot&&bot.left);
  let right=keys.right||held.right||swipeDir>0||(bot&&bot.right);
  if(left&&right){left=false}
  return {left, right};
}
function hud(){
  if(!run) return;
  $('score').textContent=run.score.toLocaleString();
  $('candy').textContent=run.candies+'/'+run.lvl.candies.length;
  const h=run.p.hearts;
  $('hearts').innerHTML='♥'.repeat(Math.max(0,h))+'<span class="off">'+'♥'.repeat(Math.max(0,3-h))+'</span>';
}
function onEv(e){
  if(e.t==='jump'||e.t==='bounce') AU.S[e.t]();
  else if(e.t==='candy'){
    AU.S.candy(); burst(e.x, e.y, '#ffd75e'); floatText(e.x, e.y-10, '+'+e.n);
    if(run.candies%4===0) say(pickCheer(), 1600);
    if(run.candies===run.lvl.candies.length) say('Every candy! Beautiful!', 2200);
  }else if(e.t==='flag'){
    AU.S.flag(); floatText(e.x, e.y, 'Checkpoint!'); say('I will remember this spot.', 2000);
  }else if(e.t==='hurt'){
    AU.S.hurt(); if(!reduce) shake=12;
    if(e.hearts>0) say(e.pit?'Whoa, a syrup pit!':'Sticky! I am okay.', 1800);
  }else if(e.t==='dead'){AU.S.fail(); showDead()}
  else if(e.t==='win'){AU.S.win(); burst(run.p.x, run.p.y, '#fff'); showWin(e)}
}
function burst(x,y,col){
  const n=reduce?4:10;
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28, s=40+Math.random()*90;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:0,max:0.5,col:col||'#fff',sz:3+Math.random()*4});
  }
}
function floatText(x,y,t){texts.push({x,y,t,life:0,max:0.8})}

function holdBtn(el, key){
  const down=e=>{e.preventDefault(); el.classList.add('on'); try{el.setPointerCapture(e.pointerId)}catch(_){}
    if(key==='jump') requestJump(); else held[key]=true; AU.start()};
  const up=()=>{el.classList.remove('on'); if(key!=='jump') held[key]=false};
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

/* ---------- drawing ---------- */
function hash(n){n=(n*1103515245+12345)&0x7fffffff; return n/0x7fffffff}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawSky(cssW, cssH, sky){
  const g=ctx.createLinearGradient(0,0,0,cssH);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle=g; ctx.fillRect(0,0,cssW,cssH);
  ctx.fillStyle='rgba(255,255,255,.55)';
  const off=(camX||0)*0.15;
  for(let i=0;i<5;i++){
    const x=((i*220 - off)%(cssW+180)+cssW+180)%(cssW+180)-40;
    const y=30+i*28+(i%2)*10;
    ctx.beginPath(); ctx.ellipse(x,y,36,16,0,0,6.3); ctx.ellipse(x+26,y+4,28,14,0,0,6.3); ctx.fill();
  }
}
function drawHills(cssW, cssH, color, base, amp, parallax){
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0, cssH);
  const off=(camX||0)*parallax;
  for(let x=0;x<=cssW+8;x+=18){
    const wx=off+x;
    ctx.lineTo(x, base+Math.sin(wx*0.007)*amp+Math.sin(wx*0.02)*amp*0.35);
  }
  ctx.lineTo(cssW, cssH); ctx.fill();
}
function drawSweet(x, y, kind, bob){
  y+=bob;
  ctx.save(); ctx.translate(x,y);
  if(kind==='drop'){
    ctx.fillStyle='#ff4f8b'; ctx.beginPath(); ctx.ellipse(0,2,13,16,0,0,6.3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-4,-4,4,6,-0.4,0,6.3); ctx.fill();
  }else if(kind==='pop'){
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,6); ctx.lineTo(0,20); ctx.stroke();
    ctx.fillStyle='#ff5a4a'; ctx.beginPath(); ctx.arc(0,-2,12,0,6.3); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,-2,7,0.4,2.2); ctx.stroke();
  }else if(kind==='bean'){
    ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.ellipse(0,0,15,9,0.4,0,6.3); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-2,-2,8,4,0.4,0,6.3); ctx.fill();
    ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.ellipse(2,1,6,3,0.4,0,6.3); ctx.fill();
  }else if(kind==='mint'){
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,13,0,6.3); ctx.fill();
    ctx.strokeStyle='#e23b4a'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-9,-9); ctx.lineTo(9,9); ctx.moveTo(9,-9); ctx.lineTo(-9,9); ctx.stroke();
  }else if(kind==='crown'){
    ctx.fillStyle='#ffd24a'; ctx.beginPath();
    ctx.moveTo(-12,8); ctx.lineTo(-12,-2); ctx.lineTo(-6,4); ctx.lineTo(0,-8); ctx.lineTo(6,4); ctx.lineTo(12,-2); ctx.lineTo(12,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillRect(-12,6,24,4);
  }else{
    ctx.fillStyle='#c86bff'; ctx.beginPath(); ctx.ellipse(-6,0,8,6,0.6,0,6.3); ctx.fill();
    ctx.fillStyle='#ff8ad4'; ctx.beginPath(); ctx.ellipse(6,0,8,6,-0.6,0,6.3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(-2,-3,4,6);
  }
  ctx.restore();
}
function drawLollipop(x, y, r){
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-r*2.4); ctx.stroke();
  const cols=['#ff5a7a','#fff','#7ad7ff','#ffe08a'];
  for(let i=0;i<4;i++){
    ctx.fillStyle=cols[i]; ctx.beginPath(); ctx.moveTo(x, y-r*2.4);
    ctx.arc(x, y-r*2.4, r, i*1.57, (i+1)*1.57); ctx.fill();
  }
}
function drawSolid(s){
  const ground=s.h>40;
  const x=s.x, y=s.y, w=s.w, h=ground?150:s.h;
  if(s.kind==='mint'){
    ctx.fillStyle='#ff8b98'; roundRect(x, y, w, h, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); roundRect(x, y, w, 16, 8); ctx.clip();
    for(let i=-2;i<w/10;i++){ctx.fillStyle=i%2?'#fff':'#e23b4a'; ctx.fillRect(x+i*10, y, 10, 18)}
    ctx.restore();
  }else if(ground){
    ctx.fillStyle='#f3c98a'; roundRect(x, y, w, h, 6); ctx.fill();
    ctx.fillStyle='#ffd0ea'; ctx.fillRect(x, y, w, 14);
    ctx.fillStyle='#fff'; ctx.fillRect(x, y, w, 5);
    for(let i=0;i<w;i+=36){
      const hx=hash(s.x+i);
      ctx.fillStyle=hx>0.5?'#c9844a':'#a86432';
      ctx.beginPath(); ctx.arc(x+8+i*0.92%(w-16), y+28+hx*18, 3.5, 0, 6.3); ctx.fill();
    }
  }else{
    ctx.fillStyle='#fff6ea'; roundRect(x, y, w, h, 8); ctx.fill();
    ctx.fillStyle='#ff9ec8'; ctx.fillRect(x, y, w, 8);
    ctx.fillStyle='#ffd0ea';
    for(let i=10;i<w-8;i+=22){ctx.beginPath(); ctx.ellipse(x+i, y+h-1, 5, 7, 0, 0, 6.3); ctx.fill()}
  }
}
function drawJelly(h){
  ctx.save(); ctx.translate(h.x+h.w/2, h.y+h.h);
  const wob=1+Math.sin(anim*6+h.phase)*0.08;
  ctx.scale(wob, 1/wob);
  ctx.fillStyle='rgba(120,230,140,.9)';
  ctx.beginPath(); ctx.ellipse(0, -h.h*0.45, h.w*0.48, h.h*0.48, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.ellipse(-6, -h.h*0.6, 5, 7, -0.4, 0, 6.3); ctx.fill();
  ctx.fillStyle='#16301c'; ctx.fillRect(-8, -h.h*0.55, 4, 4); ctx.fillRect(4, -h.h*0.55, 4, 4);
  ctx.restore();
}
function drawRoller(h){
  ctx.save(); ctx.translate(h.x+h.w/2, h.y+h.h/2); ctx.rotate(h.x*0.08);
  ctx.fillStyle='#6ec8ff'; ctx.beginPath(); ctx.arc(0,0,h.w/2,0,6.3); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,h.w/2-2,0,1.2); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-4,-4,4,0,6.3); ctx.fill();
  ctx.restore();
}
function drawPuddle(h){
  ctx.fillStyle='rgba(186,90,220,.85)';
  ctx.beginPath(); ctx.ellipse(h.x+h.w/2, h.y+h.h/2, h.w/2, h.h/2+2, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(h.x+h.w*0.35, h.y+4, h.w*0.18, 3, 0, 0, 6.3); ctx.fill();
}
function drawGoal(g, near){
  const x=g.x+g.w/2, y=W.FLOOR;
  ctx.strokeStyle='#fff'; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(x-24, y); ctx.lineTo(x-24, y-78); ctx.moveTo(x+24, y); ctx.lineTo(x+24, y-78); ctx.stroke();
  ctx.strokeStyle='#e23b4a'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(x-24, y-10); ctx.lineTo(x-24, y-70); ctx.moveTo(x+24, y-10); ctx.lineTo(x+24, y-70); ctx.stroke();
  ctx.fillStyle=near?'#fff1a8':'#ffd24a';
  ctx.beginPath();
  ctx.moveTo(x-20, y-70); ctx.lineTo(x-16, y-92); ctx.lineTo(x-8, y-76); ctx.lineTo(x, y-98); ctx.lineTo(x+8, y-76); ctx.lineTo(x+16, y-92); ctx.lineTo(x+20, y-70);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='800 16px system-ui,sans-serif'; ctx.textAlign='center';
  ctx.fillText('GATE', x, y-104);
}
function drawFlag(f){
  const x=f.x+8, y=W.FLOOR;
  ctx.strokeStyle='#fff'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-78); ctx.stroke();
  ctx.strokeStyle='#e23b4a'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(x, y-8); ctx.lineTo(x, y-70); ctx.stroke();
  ctx.fillStyle=f.got?'#3ddc84':'#ffe08a';
  ctx.beginPath(); ctx.moveTo(x, y-78); ctx.lineTo(x+26, y-68); ctx.lineTo(x, y-58); ctx.fill();
}
function drawHelene(p){
  const x=p.x+p.w/2, feet=p.y+p.h;
  const walk=anim*Math.min(14, Math.abs(p.vx)*0.05);
  const bob=p.grounded?Math.abs(Math.sin(walk))*3:0;
  const swing=p.grounded?Math.sin(walk)*7:p.vy<0?-4:4;
  ctx.save();
  ctx.translate(x, feet);
  if(p.face<0) ctx.scale(-1,1);
  if(p.inv>0 && Math.sin(anim*30)>0) ctx.globalAlpha=0.45;
  ctx.fillStyle='rgba(80,20,40,.25)';
  ctx.beginPath(); ctx.ellipse(0, -2, 16, 4, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle='#24315c';
  ctx.fillRect(-10+swing, -24-bob, 7, 18);
  ctx.fillRect(3-swing, -24-bob, 7, 18);
  ctx.fillStyle='#f4c34d';
  ctx.fillRect(-12+swing, -10-bob, 11, 6);
  ctx.fillRect(2-swing, -10-bob, 11, 6);
  ctx.fillStyle='#3d6ea8';
  roundRect(-15, -48-bob, 30, 28, 8); ctx.fill();
  ctx.fillStyle='#f1c6a8';
  ctx.fillRect(-20, -44-bob, 6, 14);
  ctx.fillRect(14, -44-bob, 6, 14);
  ctx.restore();
  const hs=30;
  const hy=feet-58-bob;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, hy, hs/2, 0, 6.3); ctx.clip();
  if(faceImg.complete && faceImg.naturalWidth) ctx.drawImage(faceImg, x-hs/2, hy-hs/2, hs, hs);
  else {ctx.fillStyle='#f3d2c2'; ctx.fillRect(x-hs/2, hy-hs/2, hs, hs)}
  ctx.restore();
  ctx.strokeStyle='#f4c34d'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(x, hy, hs/2, 0, 6.3); ctx.stroke();
}

function drawWorld(viewW, viewH){
  const L=run.lvl;
  ctx.fillStyle='#4a1030';
  ctx.fillRect(-40, W.FLOOR+4, L.end+80, 420);
  const para=(camX||0);
  for(let x=0;x<L.end;x+=260){
    drawLollipop(x*0.65+40 - para*0.35, W.FLOOR-8, 18+hash(x)*10);
  }
  for(const s of L.solids) drawSolid(s);
  for(const m of L.movers) drawSolid(m);
  for(const h of L.hazards){
    if(h.kind==='puddle') drawPuddle(h);
    else if(h.kind==='jelly') drawJelly(h);
    else if(h.kind==='roller') drawRoller(h);
  }
  for(const f of L.checks) drawFlag(f);
  for(const c of L.candies){
    if(run.got[c.id]) continue;
    drawSweet(c.x, c.y, c.kind, Math.sin(anim*3+c.x)*4);
  }
  const near=Math.abs((run.p.x+run.p.w/2)-(L.goal.x+30))<90;
  drawGoal(L.goal, near);
  drawHelene(run.p);
  for(const q of parts){
    ctx.globalAlpha=Math.max(0, 1-q.life/q.max);
    ctx.fillStyle=q.col;
    ctx.fillRect(q.x, q.y, q.sz, q.sz);
    ctx.globalAlpha=1;
  }
  ctx.font='800 20px system-ui,sans-serif'; ctx.textAlign='center';
  for(const q of texts){
    ctx.globalAlpha=Math.max(0, 1-q.life/q.max);
    ctx.lineWidth=4; ctx.strokeStyle='#3a1048'; ctx.strokeText(q.t, q.x, q.y);
    ctx.fillStyle='#fff6c2'; ctx.fillText(q.t, q.x, q.y);
    ctx.globalAlpha=1;
  }
}

function draw(dt){
  const cssW=cv.clientWidth||300, cssH=cv.clientHeight||200;
  if(cssW<2||cssH<2) return;
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const pw=Math.max(1,Math.round(cssW*dpr)), ph=Math.max(1,Math.round(cssH*dpr));
  if(cv.width!==pw||cv.height!==ph){cv.width=pw; cv.height=ph}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=(run&&run.lvl&&run.lvl.sky)||LEVELS[0].sky;
  const hill=(run&&run.lvl&&run.lvl.hill)||LEVELS[0].hill;
  const far=(run&&run.lvl&&run.lvl.far)||LEVELS[0].far;
  drawSky(cssW, cssH, sky);
  drawHills(cssW, cssH, far, cssH*0.62, 18, 0.2);
  drawHills(cssW, cssH, hill, cssH*0.74, 26, 0.45);
  if(!run){return}
  const viewH=340;
  const viewW=viewH*(cssW/cssH);
  const bias=document.body.classList.contains('land')||document.body.classList.contains('fine')?0.48:0.38;
  let target=run.p.x+run.p.w/2-viewW*bias;
  target=Math.max(0, Math.min(target, Math.max(0, run.lvl.end-viewW)));
  if(camX==null) camX=target;
  else camX+=(target-camX)*Math.min(1, dt*7);
  const camY=W.FLOOR-viewH*0.78;
  ctx.save();
  if(shake>0){ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake); shake*=0.86; if(shake<0.4) shake=0}
  ctx.scale(cssW/viewW, cssH/viewH);
  ctx.translate(-camX, -camY);
  drawWorld(viewW, viewH);
  ctx.restore();
}

function loop(ts){
  if(document.hidden){rafRun=false; return}
  const dt=Math.min(0.05, lastTs?(ts-lastTs)/1000:0.016);
  lastTs=ts; anim+=dt;
  if(state==='play' && run && !run.won && !run.over){
    if(onFrame){try{onFrame(run)}catch(e){}}
    acc+=dt; let n=0;
    const inp=readInput();
    while(acc>=1/60 && n<5 && state==='play'){
      const ev=W.step(run, inp, 1/60);
      for(const e of ev) onEv(e);
      acc-=1/60; n++;
    }
    if(n===5) acc=0;
    hud();
  }else if(state!=='play'){
    acc=0;
    if(state==='title'||state==='map') camX=(camX||0)+dt*18;
  }
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i]; p.life+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=280*dt;
    if(p.life>p.max) parts.splice(i,1);
  }
  for(let i=texts.length-1;i>=0;i--){
    const t=texts[i]; t.life+=dt; t.y-=28*dt;
    if(t.life>t.max) texts.splice(i,1);
  }
  draw(dt);
  requestAnimationFrame(loop);
}
function kick(){if(rafRun||document.hidden) return; rafRun=true; lastTs=0; requestAnimationFrame(loop)}

/* ---------- input ---------- */
addEventListener('keydown', e=>{
  if(e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
  AU.start();
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A') keys.left=true;
  if(k==='ArrowRight'||k==='d'||k==='D') keys.right=true;
  if(!e.repeat && (k==='ArrowUp'||k==='w'||k==='W'||k===' ')) requestJump();
  if(k==='ArrowLeft'||k==='ArrowRight'||k==='ArrowUp'||k==='ArrowDown') e.preventDefault();
  if(k===' ' && state==='play') e.preventDefault();
  if(e.repeat) return;
  if(k==='p'||k==='P'){ if(state==='play') pauseGame(); else if(state==='pause') resumeGame(); }
  if(k==='Escape') goBack();
  if(k==='m'||k==='M'){SV.music=SV.sound=SV.music&&SV.sound?0:1; persist(); AU.setMusic(!!SV.music); AU.setSound(!!SV.sound); toast(SV.music?'Sound on':'Sound off')}
});
addEventListener('keyup', e=>{
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A') keys.left=false;
  if(k==='ArrowRight'||k==='d'||k==='D') keys.right=false;
});
addEventListener('blur', ()=>{keys.left=keys.right=false; held.left=held.right=false; swipeDir=0});

let ptr=null;
cv.addEventListener('pointerdown', e=>{
  AU.start();
  if(state!=='play') return;
  ptr={id:e.pointerId, x:e.clientX, y:e.clientY};
});
cv.addEventListener('pointermove', e=>{
  if(!ptr||e.pointerId!==ptr.id||state!=='play') return;
  const dx=e.clientX-ptr.x, dy=e.clientY-ptr.y;
  if(dy<-34 && Math.abs(dy)>Math.abs(dx)+6){requestJump(); ptr.y=e.clientY}
  if(Math.abs(dx)>22 && Math.abs(dx)>Math.abs(dy)){swipeDir=dx>0?1:-1; ptr.x=e.clientX}
});
function endPtr(e){if(ptr && (!e||e.pointerId===ptr.id)){ptr=null; swipeDir=0}}
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);

$('bPlay').onclick=()=>{AU.start(); AU.S.tap(); const done=LEVELS.every(L=>SV.stars[L.id]>0); startLevel(done?0:nextIndex())};
$('bMap').onclick=()=>{AU.start(); AU.S.tap(); goMap()};
$('mapHome').onclick=()=>{AU.S.tap(); goTitle()};
$('btnPause').onclick=()=>{AU.S.tap(); pauseGame()};
$('bSet').onclick=()=>{AU.start(); AU.S.tap(); settings()};
holdBtn($('btnL'), 'left');
holdBtn($('btnR'), 'right');
holdBtn($('btnJ'), 'jump');

const PUBLIC_URL='https://ploug76.github.io/kellys-arcade/games/helenes-candy-quest/';
$('shareBtn').onclick=async()=>{
  const d={title:"Helene's Candy Quest", text:"Play Helene's Candy Quest, a free candy adventure from Kelly's Arcade!", url:PUBLIC_URL};
  try{if(navigator.share){await navigator.share(d); return}}catch(e){return}
  try{await navigator.clipboard.writeText(d.url); toast('Link copied!')}catch(e){toast(d.url)}
};
let deferredInstall=null;
addEventListener('beforeinstallprompt', e=>{e.preventDefault(); deferredInstall=e});
$('instBtn').onclick=async()=>{
  if(deferredInstall){deferredInstall.prompt(); deferredInstall=null; return}
  toast(/iphone|ipad/i.test(navigator.userAgent)?'Tap Share, then Add to Home Screen':'Use the browser menu: Add to Home screen');
};

document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){AU.suspend(); if(state==='play') pauseGame(); rafRun=false}
  else {AU.resume(); kick()}
});
addEventListener('resize', applyChrome);
addEventListener('orientationchange', ()=>setTimeout(applyChrome, 200));

window.__HCQ={
  get state(){return state},
  get run(){return run},
  startLevel, goTitle, goMap, journeyTotal,
  setInput(i){bot=i; if(i&&i.jump) requestJump()},
  onFrame(fn){onFrame=fn}
};

AU.setMusic(!!SV.music); AU.setSound(!!SV.sound);
applyChrome(); refreshTitle(); AU.play('title'); kick();
['pointerdown','keydown'].forEach(ev=>addEventListener(ev, ()=>AU.start(), {capture:true}));

if('serviceWorker' in navigator && location.protocol==='https:'){
  addEventListener('load', ()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{}));
}
(function(){
  if(window.__swup) return; window.__swup=1;
  var S=navigator.serviceWorker;
  if(!S||location.protocol!=='https:') return;
  var had=!!S.controller, inp=0, K='swup:'+location.pathname;
  ['pointerdown','keydown','touchstart'].forEach(function(t){addEventListener(t, function(){inp=1}, {capture:true, passive:true})});
  function chk(){try{S.getRegistration().then(function(r){if(r) r.update().catch(function(){})})}catch(e){}}
  addEventListener('load', function(){setTimeout(chk, 800)});
  document.addEventListener('visibilitychange', function(){if(document.visibilityState==='visible') chk()});
  S.addEventListener('controllerchange', function(){
    if(!had){had=true; return}
    var n=Date.now(), l=0;
    try{l=+sessionStorage.getItem(K)||0}catch(e){}
    if(inp||n-l<15000||document.visibilityState!=='visible'||state==='play'){
      if(!document.getElementById('swupPill')){
        var b=document.createElement('button'); b.id='swupPill'; b.type='button'; b.textContent='Update ready – tap to refresh';
        b.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 8px);transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border:0;border-radius:999px;background:#ffd23f;color:#111;font:600 14px system-ui,sans-serif';
        b.addEventListener('click', function(){location.reload()});
        document.body.appendChild(b);
      }
      return;
    }
    try{sessionStorage.setItem(K, String(n))}catch(e){}
    location.reload();
  });
})();
