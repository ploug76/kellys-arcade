/* Helene's Candy Quest: levels and physics.
   Original candy-land platforming. No brand-name candies.
   y grows downward. The floor top is FLOOR. */
(function(root){
'use strict';
const FLOOR = 300;
const PW = 30, PH = 64;
const GRAV = 2100, JUMPV = -900, MAXFALL = 1100;
const ACC = 1800, FRIC = 2200, MAXRUN = 250;
const KINDS = ['drop','pop','bean','mint','taffy'];

const DEFS = [
  {id:'meadow', name:'Gumdrop Meadow',
   intro:'Hold the arrows to walk. Tap JUMP to hop the gaps. The candy gate is waiting!',
   sky:['#ffd0ec','#fff6c9'], hill:'#ff8fbe', far:'#e7c6ff',
   ground:[[0,960],[1020,1160],[2240,800]],
   plats:[[1200,186,150,'frost']],
   puddles:[[1500,130]],
   jellies:[[1780,18,0.4],[2680,18,1.1]],
   sweets:[[180,252],[400,252],[620,252],[820,252],[1140,252],[1270,146],[1560,252],[1900,252],[2100,252],[2400,252],[2620,252],[2860,252]],
   goal:2880, spawn:48},
  {id:'lane', name:'Lollipop Lane',
   intro:'Hop the cookie steps. Jump over the rolling jawbreaker!',
   sky:['#ffd8b0','#ffe7f4'], hill:'#ff9a4a', far:'#ffd0e0',
   ground:[[0,520],[1400,1680]],
   plats:[[560,228,230,'frost'],[830,172,230,'frost'],[1100,228,250,'frost']],
   rollers:[[1680,2140,78]],
   jellies:[[2460,20,1.2]],
   checks:[1460],
   sweets:[[220,252],[420,252],[670,186],[940,130],[1220,186],[1520,252],[1760,186],[1980,186],[2280,252],[2520,252],[2780,252],[2940,252]],
   goal:2960, spawn:48},
  {id:'taffy', name:'Taffy Bridge',
   intro:'Sticky taffy slows your shoes. Hop the gaps and keep going!',
   sky:['#f3d4ff','#fff0c8'], hill:'#d07bff', far:'#ffc2ea',
   ground:[[0,760],[820,1040],[1920,980],[2960,520]],
   puddles:[[1120,150],[2140,140]],
   jellies:[[1420,18,0.3],[2480,18,0.9]],
   checks:[1960],
   sweets:[[200,252],[460,252],[980,252],[1280,252],[1600,252],[2000,252],[2300,252],[2620,252],[3000,252],[3240,252]],
   goal:3280, spawn:48},
  {id:'hills', name:'Jellybean Hills',
   intro:'Climb the frosting steps. The jiggly jellies are just silly, not scary.',
   sky:['#d9f6ff','#ffe3f6'], hill:'#7ad7ff', far:'#ffb3d9',
   ground:[[0,500],[1960,1200]],
   plats:[[520,230,240,'frost'],[800,175,240,'frost'],[1080,230,240,'frost'],[1360,175,240,'frost'],[1640,230,260,'frost']],
   jellies:[[2360,22,0.6]],
   rollers:[[2140,2520,72]],
   checks:[2080],
   sweets:[[200,252],[400,252],[640,188],[920,132],[1200,188],[1480,132],[1760,188],[2220,186],[2420,186],[2700,252],[2920,252]],
   goal:3000, spawn:48},
  {id:'peaks', name:'Peppermint Peaks',
   intro:'The mint tiles are slippery! Keep hopping, you can do it.',
   sky:['#e8fbff','#ffe4ea'], hill:'#ff6d7d', far:'#ffffff',
   ground:[[0,740,'mint'],[810,780,'cake'],[1660,600,'mint'],[2320,880,'cake']],
   rollers:[[980,1360,80]],
   jellies:[[1860,20,0.8]],
   checks:[1700],
   sweets:[[200,252],[460,252],[1060,186],[1280,186],[1740,252],[1980,252],[2140,252],[2460,252],[2700,252],[2960,252]],
   goal:3040, spawn:48},
  {id:'castle', name:'Candy Castle',
   intro:'The last path! Reach the candy crown and bring it home to Helene.',
   sky:['#ffe7a8','#e7d0ff'], hill:'#c45cff', far:'#ffd76a',
   ground:[[0,760],[820,620],[1500,500,'mint'],[2060,1120]],
   plats:[[2500,176,170,'frost']],
   puddles:[[980,140]],
   jellies:[[1180,22,0.3]],
   rollers:[[2140,2460,76]],
   checks:[1500],
   sweets:[[200,252],[440,252],[960,252],[1120,186],[1340,252],[1640,252],[1860,252],[2220,186],[2420,186],[2580,132],[2860,252],[3000,252]],
   goal:3040, spawn:48}
];

function overlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function buildLevel(def){
  const solids=[];
  for(const g of def.ground){
    const kind=g[2]||'cake';
    solids.push({x:g[0], y:FLOOR, w:g[1], h:160, kind, slip:kind==='mint'});
  }
  for(const p of def.plats||[]){
    const kind=p[3]||'frost';
    solids.push({x:p[0], y:p[1], w:p[2], h:22, kind, slip:kind==='mint', bounce:kind==='bounce'});
  }
  const hazards=[];
  for(const d of def.puddles||[]) hazards.push({kind:'puddle', x:d[0], y:FLOOR-16, w:d[1], h:16});
  for(const j of def.jellies||[]) hazards.push({kind:'jelly', x:j[0], y:FLOOR-38, w:42, h:38, base:FLOOR-38, amp:j[1]||22, phase:j[2]||0});
  for(const r of def.rollers||[]) hazards.push({kind:'roller', x:r[0], y:FLOOR-36, w:36, h:36, minX:r[0], maxX:r[1], dir:1, speed:r[2]||80});
  const movers=[];
  for(const m of def.movers||[]){
    movers.push({x:m[0], y:m[1], w:m[2], h:22, x0:m[0], x1:m[3], dir:1, speed:m[4]||70, kind:'taffy', slip:false, mover:true, _dx:0});
  }
  const candies=(def.sweets||[]).map((c,i)=>({id:def.id+'-'+i, x:c[0], y:c[1], kind:c[2]||KINDS[i%KINDS.length], r:16}));
  const checks=(def.checks||[]).map((x,i)=>({id:def.id+'-flag-'+i, x, y:FLOOR-120, w:40, h:120, got:false}));
  const goal={x:def.goal, y:FLOOR-140, w:70, h:140};
  return {
    id:def.id, name:def.name, intro:def.intro, sky:def.sky, hill:def.hill, far:def.far,
    solids, hazards, movers, candies, checks, goal, spawn:def.spawn||48,
    end:Math.max(def.goal+220, ...solids.map(s=>s.x+s.w))
  };
}
function metaOf(d,i){
  return {id:d.id, name:d.name, intro:d.intro, sky:d.sky, hill:d.hill, far:d.far, treats:(d.sweets||[]).length, index:i};
}
const LEVELS = DEFS.map(metaOf);

function createRun(i){
  const lvl=buildLevel(DEFS[i]);
  const y=FLOOR-PH-2;
  return {
    i, lvl,
    p:{x:lvl.spawn, y, w:PW, h:PH, vx:0, vy:0, face:1, grounded:false, ground:null, coyote:0.12, inv:0, hearts:3, slow:false},
    jumpBuf:0, got:{}, score:0, candies:0,
    check:{x:lvl.spawn, y},
    won:false, over:null, hit:false, t:0, stars:0
  };
}
function allSolids(run){return run.lvl.solids.concat(run.lvl.movers);}

function resolveX(p,s){
  if(!overlap(p,s))return;
  const penL=(p.x+p.w)-s.x, penR=(s.x+s.w)-p.x;
  if(p.vx>0 || (p.vx===0 && penL<penR)) p.x=s.x-p.w;
  else p.x=s.x+s.w;
  p.vx=0;
}

function step(run, input, dt){
  const ev=[];
  if(run.won||run.over)return ev;
  dt=Math.max(0, Math.min(dt, 0.05));
  if(!dt)return ev;
  const p=run.p, L=run.lvl;
  run.t+=dt;
  input=input||{};
  if(input.jump) run.jumpBuf=Math.max(run.jumpBuf, 0.16);

  for(const m of L.movers){
    const before=m.x;
    m.x+=m.dir*m.speed*dt;
    if(m.x<m.x0){m.x=m.x0; m.dir=1;}
    if(m.x>m.x1){m.x=m.x1; m.dir=-1;}
    m._dx=m.x-before;
  }
  if(p.ground&&p.ground.mover) p.x+=p.ground._dx||0;

  for(const h of L.hazards){
    if(h.kind==='jelly'){
      h.phase+=dt;
      h.y=h.base-Math.abs(Math.sin(h.phase*2.4))*h.amp;
    }else if(h.kind==='roller'){
      h.x+=h.dir*h.speed*dt;
      if(h.x<h.minX){h.x=h.minX; h.dir=1;}
      if(h.x>h.maxX){h.x=h.maxX; h.dir=-1;}
    }
  }

  p.slow=false;
  for(const h of L.hazards) if(h.kind==='puddle' && overlap(p,h)) p.slow=true;

  const slip=!!(p.grounded && p.ground && p.ground.slip);
  const acc=slip?1000:ACC, fric=slip?860:FRIC;
  let max=slip?275:MAXRUN;
  if(p.slow) max*=0.4;
  let dir=0;
  if(input.left) dir-=1;
  if(input.right) dir+=1;
  if(dir){p.vx+=dir*acc*dt; p.face=dir;}
  else {const s=Math.sign(p.vx); if(s){const nv=p.vx-s*fric*dt; p.vx=(nv*s>0)?nv:0;}}
  if(p.vx>max) p.vx=max;
  if(p.vx<-max) p.vx=-max;

  if(p.coyote>0) p.coyote-=dt;
  if(run.jumpBuf>0) run.jumpBuf-=dt;
  if(run.jumpBuf>0 && (p.grounded||p.coyote>0) && p.vy>=-20){
    const bounce=p.ground&&p.ground.bounce;
    p.vy=bounce?-1180:JUMPV;
    p.grounded=false; p.ground=null; p.coyote=0; run.jumpBuf=0;
    ev.push({t:bounce?'bounce':'jump'});
  }

  p.vy=Math.min(MAXFALL, p.vy+GRAV*dt);
  const solids=allSolids(run);

  p.x+=p.vx*dt;
  if(p.x<0){p.x=0; if(p.vx<0) p.vx=0;}
  /* Thin frosting steps are one-way: you can hop up through them and land on top. */
  for(const s of solids) if(s.h>30) resolveX(p,s);

  const prevY=p.y;
  p.y+=p.vy*dt;
  const prevBottom=prevY+p.h;
  p.grounded=false; p.ground=null;
  for(const s of solids){
    if(!overlap(p,s)) continue;
    const thin=s.h<=30;
    if(p.vy>=0 && prevBottom<=s.y+14){
      p.y=s.y-p.h;
      if(s.bounce){
        p.vy=-1180; p.grounded=false; p.ground=null; p.coyote=0;
        ev.push({t:'bounce'});
      }else{
        p.vy=0; p.grounded=true; p.ground=s; p.coyote=0.18;
      }
    }else if(!thin && p.vy<0 && prevY>=s.y+s.h-10){
      p.y=s.y+s.h; p.vy=40;
    }else if(!thin){
      resolveX(p,s);
    }
  }

  if(p.inv>0) p.inv-=dt;
  else {
    for(const h of L.hazards){
      if(h.kind==='puddle') continue;
      const hb={x:h.x+7, y:h.y+6, w:Math.max(8,h.w-14), h:Math.max(8,h.h-10)};
      if(overlap(p,hb)){hurt(false); break;}
    }
  }
  if(!run.over && !run.won && p.y>FLOOR+210) hurt(true);

  if(!run.over && !run.won){
    const pcx=p.x+p.w/2, pcy=p.y+p.h/2;
    for(const c of L.candies){
      if(run.got[c.id]) continue;
      const dx=c.x-pcx, dy=c.y-pcy;
      if(dx*dx+dy*dy < 46*46){
        run.got[c.id]=1; run.candies++; run.score+=100;
        ev.push({t:'candy', x:c.x, y:c.y, n:100, kind:c.kind});
      }
    }
    for(const f of L.checks){
      if(f.got) continue;
      if(overlap(p,f)){
        f.got=1; run.check={x:f.x, y:FLOOR-PH-2}; run.score+=50;
        ev.push({t:'flag', x:f.x, y:f.y, n:50});
      }
    }
    if(overlap(p, L.goal)){
      run.won=true;
      const total=L.candies.length, got=run.candies;
      let stars=1;
      if(got>=Math.ceil(total*0.7)) stars=2;
      if(got>=total && !run.hit) stars=3;
      run.score+=500;
      if(!run.hit) run.score+=250;
      run.stars=stars;
      ev.push({t:'win', stars, score:run.score, got, total});
    }
  }
  return ev;

  function hurt(pit){
    if(p.inv>0||run.won||run.over) return;
    p.hearts--; run.hit=true; p.inv=1.35;
    ev.push({t:'hurt', hearts:p.hearts, pit:!!pit});
    if(p.hearts<=0){
      run.over='dead';
      ev.push({t:'dead'});
      p.vx=0; p.vy=0;
      return;
    }
    if(pit){
      p.x=run.check.x; p.y=run.check.y; p.vx=0; p.vy=0; p.grounded=false; p.ground=null;
    }else{
      p.vy=-520; p.vx=-p.face*180;
    }
  }
}

const api={
  FLOOR, PW, PH, LEVELS, DEFS, KINDS,
  createRun, step, allSolids, overlap, buildLevel
};
root.CandyWorld=api;
if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
