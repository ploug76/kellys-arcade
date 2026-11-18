/* Beat every level with a simple kid-style player: run right, hop at gaps,
   jawbreakers and jellies. Run: node qa/sim.js */
'use strict';
const W = require('../js/world.js');

function surfaceUnder(solids, x, foot){
  let best=null;
  for(const s of solids){
    if(x < s.x-6 || x > s.x+s.w+6) continue;
    if(s.y >= foot-10 && s.y <= foot+22){
      if(!best || s.y < best.y) best=s;
    }
  }
  return best;
}
function decide(run){
  const p=run.p, foot=p.y+p.h;
  const solids=W.allSolids(run);
  const here=surfaceUnder(solids, p.x+p.w*0.5, foot);
  const ahead=surfaceUnder(solids, p.x+p.w+58, foot);
  let jump=false;
  if(p.grounded && here && !ahead) jump=true;
  if(p.grounded){
    for(const s of solids){
      if(s===p.ground) continue;
      if(s.y < foot-16 && s.y > foot-150 && s.x < p.x+p.w+86 && s.x+s.w > p.x+p.w-8 && s.x > p.x-20) jump=true;
    }
    for(const h of run.lvl.hazards){
      if(h.kind==='puddle') continue;
      if(h.x < p.x+p.w+78 && h.x+h.w > p.x+p.w-6 && h.y < foot && h.y+h.h > p.y+10) jump=true;
    }
    for(const c of run.lvl.candies){
      if(run.got[c.id]) continue;
      if(Math.abs(c.x-(p.x+p.w/2))<34 && c.y < p.y-6) jump=true;
    }
  }
  return jump;
}

function play(i){
  const run=W.createRun(i);
  let armed=false, stuckT=0, lastX=run.p.x, worst=run.p.x;
  const dt=1/60;
  for(let f=0; f<60*90; f++){
    const want=decide(run);
    let pulse=false;
    if(!run.p.grounded) armed=false;
    if(want && run.p.grounded && !armed){pulse=true; armed=true;}
    if(stuckT>1.2 && run.p.grounded){pulse=true; stuckT=0;}
    W.step(run, {left:false, right:true, jump:pulse}, dt);
    if(run.p.x > lastX+8){stuckT=0; lastX=run.p.x;} else stuckT+=dt;
    if(run.p.x>worst) worst=run.p.x;
    if(run.won||run.over) break;
    if(stuckT>5) return {ok:false, why:'stuck', run, t:run.t, x:run.p.x};
  }
  if(run.won) return {ok:true, run};
  if(run.over) return {ok:false, why:'dead', run, t:run.t, x:run.p.x};
  return {ok:false, why:'timeout', run, t:run.t, x:run.p.x};
}

let failed=0;
for(let i=0;i<W.LEVELS.length;i++){
  const r=play(i);
  const L=W.LEVELS[i];
  if(!r.ok){
    failed++;
    const p=r.run.p;
    console.log('FAIL', L.name, r.why, 't='+r.t.toFixed(1), 'x='+p.x.toFixed(0), 'y='+p.y.toFixed(0), 'hearts='+p.hearts, 'candy='+r.run.candies+'/'+r.run.lvl.candies.length, 'score='+r.run.score);
  }else{
    console.log('OK  ', L.name, 'stars='+r.run.stars, 'candy='+r.run.candies+'/'+r.run.lvl.candies.length, 'score='+r.run.score, 'hearts='+r.run.p.hearts, 't='+r.run.t.toFixed(1)+'s');
  }
}
if(failed){console.error(failed+' level(s) failed'); process.exit(1);}
console.log('All '+W.LEVELS.length+' levels cleared.');
