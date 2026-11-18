/* Greedy player: can these match-3 levels be finished?
   Run: node qa/sim.js */
'use strict';
const L = require('../js/logic.js');
const LEVELS = require('../js/levels.js');
L.setNC(6); L.setSPC(0);

function clone(B){return L.unserial(L.serial(B))}
function needMap(goal){
  if(!goal || goal.type!=='collect') return null;
  const m={};
  for(const [c] of goal.need) m[c]=1;
  return m;
}
function bestMove(B, need){
  const moves=L.allMoves(B);
  if(!moves.length) return null;
  let best=null, score=-1;
  for(const [a,b] of moves){
    const C=clone(B);
    L.swapCells(C,a,b);
    const pre=L.swapPre(C,a,b);
    const st=L.computeStep(C,[L.K(a.r,a.c),L.K(b.r,b.c)],pre);
    if(!st) continue;
    let s=st.clear.size*10+st.cre.length*40;
    if(need){
      for(const k of st.clear){
        const g=C[L.KR(k)][L.KC(k)];
        if(g && need[g.c]) s+=30;
      }
    }
    if(st.cre.some(c=>c.s==='x')) s+=80;
    if(s>score){score=s; best=[a,b];}
  }
  return best||moves[0];
}
function playOnce(def){
  let B=L.newBoard();
  let score=0, moves=def.moves;
  const got={};
  const need=needMap(def.goal);
  let guard=0;
  while(moves>0 && guard<400){
    guard++;
    let mv=bestMove(B, need);
    if(!mv){ if(!L.shuffleBoard(B)) return false; continue; }
    const [a,b]=mv;
    L.swapCells(B,a,b);
    let pre=L.swapPre(B,a,b);
    let chain=0;
    let st=L.computeStep(B,[L.K(a.r,a.c),L.K(b.r,b.c)],pre);
    while(st){
      chain++;
      for(const k of st.clear){
        const g=B[L.KR(k)][L.KC(k)];
        if(g && g.c>=0) got[g.c]=(got[g.c]||0)+1;
      }
      score += st.clear.size*10*chain + st.cre.length*40;
      L.applyClear(B, st);
      L.applyGravity(B);
      for(let r=0;r<L.N;r++) for(let c=0;c<L.N;c++){ const g=B[r][c]; if(g){g.x=c; g.y=r;} }
      st=L.computeStep(B,null,null);
    }
    moves--;
    if(won(def, score, got)) return {ok:true, score, moves, got};
  }
  return {ok:false, score, moves, got};
}
function won(def, score, got){
  const g=def.goal;
  if(g.type==='score') return score>=g.target;
  return g.need.every(([c,n]) => (got[c]||0)>=n);
}
let failed=0;
for(const def of LEVELS){
  let wins=0, last=null;
  for(let t=0;t<4;t++){ last=playOnce(def); if(last.ok) wins++; }
  const mark=wins>=3?'OK ':'WEAK';
  if(wins<3) failed++;
  console.log(mark, 'L'+def.id, def.name, 'moves='+def.moves, def.goal.type, 'wins='+wins+'/4', 'sampleScore='+(last&&last.score));
}
if(failed){ console.error(failed+' level(s) were hard for the greedy player'); process.exit(1); }
console.log('All '+LEVELS.length+' levels cleared on at least 3 of 4 tries.');
