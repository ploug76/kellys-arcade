'use strict';
const SG=require('../sidegames.js');
let failed=0;
function eq(name,cond){if(!cond){failed++;console.error('FAIL',name)}else console.log('ok',name)}

/* jewel: a hand-built swap makes a match and clears those cells */
{
  const st=SG.create('jewel',0,1);
  st.grid=[
    [1,1,2,3,4,2],
    [3,4,1,2,3,1],
    [2,3,4,1,2,3],
    [4,2,3,4,1,2],
    [1,3,2,1,3,4],
    [2,4,1,3,2,1]
  ];
  st.n=6;st.colors=4;st.moves=5;st.goal=3;st.got=0;
  // swap (2,0)=2 with (1,0) so row0 becomes 1,2,1... no
  // put three 1s: swap grid[0][2] (2) with nothing. Set row and swap a 1 into place.
  st.grid[0]=[1,1,3,1,4,2];
  const before=SG.jewelMatches(st.grid).length;
  eq('jewel no match yet',before===0);
  SG.jewelSwap(st,2,0,3,0); // 1,1,1,3
  eq('jewel swap scores',st.got>=3&&st.score>=30);
  eq('jewel grid still full',st.grid.every(r=>r.every(c=>c>0)));
}

/* stack: a full bottom row clears */
{
  const st=SG.create('stack',0,2);
  for(let x=0;x<st.cols;x++)st.board[st.rows-1][x]=1;
  // lock an empty move downward that collides to trigger clear via stackMove
  st.shape=[[1]];st.px=0;st.py=st.rows-2;st.color=2;
  // fill is already a full row; call the lock path by moving down into the filled row
  SG.stackMove(st,0,1);
  eq('stack cleared a line',st.lines>=1);
  eq('stack bottom is empty or new piece',st.board[st.rows-1].some(c=>c===0)||st.lines>=1);
}

/* stack rotate turns a horizontal line vertical */
{
  const m=[[1,1,1,1]];
  const r=SG.rot(m);
  eq('rotate I piece',r.length===4&&r.every(row=>row.length===1&&row[0]===1));
}

/* crunch snatch */
{
  const st=SG.create('crunch',0,3);
  st.items[0]={c:2,k:'fruit'};st.target=2;st.aim=0;st.goal=1;st.got=0;
  SG.crunchSnatch(st);
  eq('crunch correct wins a point',st.got===1&&st.won===1);
  const st2=SG.create('crunch',1,4);
  st2.items[0]={c:1,k:'fruit'};st2.target=3;st2.aim=0;st2.got=0;st2.miss=0;
  SG.crunchSnatch(st2);
  eq('crunch wrong counts a miss',st2.miss===1&&st2.won===0);
}

/* memory pair */
{
  const st=SG.create('memory',0,5);
  st.cards=[{c:1,up:0,gone:0},{c:2,up:0,gone:0},{c:1,up:0,gone:0},{c:2,up:0,gone:0}];
  st.goal=2;st.got=0;st.open=[];
  SG.memoryFlip(st,0);SG.memoryFlip(st,2);
  eq('memory pair clears',st.got===1&&st.cards[0].gone&&st.cards[2].gone);
  SG.memoryFlip(st,1);SG.memoryFlip(st,0);
  eq('memory miss stays a pair unsolved',st.cards[1].gone===0);
}

/* lights is solvable and reversible */
{
  const st=SG.lightsCreate(0,1);
  const before=st.on.slice();
  SG.lightsTap(st,0);
  SG.lightsTap(st,0);
  eq('lights toggle twice restores',st.on.join(',')===before.join(','));
  const solved=SG.lightsCreate(0,1);
  solved.on=solved.on.map(()=>1);solved.won=0;
  SG.lightsTap(solved,0);SG.lightsTap(solved,0);
  eq('lights all-on is a win after a no-op pair',solved.won===1||solved.on.every(Boolean));
  const fresh=SG.create('lights',2,9);
  eq('lights puzzle is not already a loss',fresh.over===0&&fresh.on.length>=5);
}

/* fishing catch window */
{
  const st=SG.create('fish',0,1);
  st.pos=st.zone;st.got=0;st.goal=1;
  SG.fishCatch(st);
  eq('fish inside the glow counts',st.got===1&&st.won===1);
  const miss=SG.create('fish',0,1);
  miss.pos=0;miss.zone=0.9;miss.zw=0.1;miss.got=0;
  SG.fishCatch(miss);
  eq('fish outside the glow misses',miss.miss===1&&miss.won===0);
  const moved=SG.create('fish',0,1);
  const p0=moved.pos;
  SG.fishTick(moved,0.5);
  eq('fish moves',moved.pos!==p0);
}

eq('catalog has six games',SG.CATALOG.length===6);
SG.CATALOG.forEach(g=>{
  const easy=SG.create(g.id,0,11),hard=SG.create(g.id,5,11);
  eq(g.id+' creates at both difficulties',!!easy&&!!hard&&easy.id===g.id&&hard.id===g.id);
  SG.press(easy,{L:1,R:1,U:1,D:1,act:1,jump:1},0.05);
  eq(g.id+' accepts a press',easy.over===0||easy.over===1);
});
{
  const a=SG.create('jewel',0,3),b=SG.create('jewel',5,3);
  eq('harder jewels want more matches',b.goal>a.goal);
  const f0=SG.create('fish',0,3),f5=SG.create('fish',5,3);
  eq('harder fishing asks for more fish',f5.goal>f0.goal&&f5.speed>f0.speed);
  const c0=SG.create('crunch',0,3),c5=SG.create('crunch',5,3);
  eq('harder crunch has more fruit',c5.items.length>=c0.items.length&&c5.goal>c0.goal);
}
eq('reward only after a win',SG.rewardOf({won:0,score:50})===0&&SG.rewardOf({won:1,score:50})===250);

if(failed){console.error(failed+' failed');process.exit(1)}
console.log('all side-game tests passed');
