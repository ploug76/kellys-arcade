/* Controller wiring. Uses the shared Peter's Arcade gamepad.js (v1.1),
   same file Helene's Treasure Chest uses. D-pad or stick walks, A jumps,
   Start pauses, B / Back goes back. Menus: D-pad highlights, A selects. */
(function(){
'use strict';
if(!window.GamepadSupport) return;
function onStart(){if(state==='play') pauseGame(); else if(state==='pause') resumeGame();}
GamepadSupport.init({
  keys:{
    left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown',
    a:'Space',
    start:function(p){if(p) onStart();},
    back:function(p){if(p) goBack();}
  },
  menu:function(){
    var palb=document.getElementById('palbOv');
    return state!=='play' || document.getElementById('ov').classList.contains('on') || (palb&&palb.classList.contains('on'));
  },
  isPaused:function(){return state==='pause';},
  pause:function(){if(state==='play') pauseGame();},
  back:function(){return goBack();},
  hint:{
    text:'🎮 Controller: stick or D-pad walks, A jumps, Start pauses. Menus: D-pad, A, B.',
    style:'bottom:calc(8px + env(safe-area-inset-bottom));font:700 16px/1.3 system-ui,sans-serif;padding:6px 12px',
    when:function(){
      var g=navigator.getGamepads?navigator.getGamepads():[];
      var any=false; for(var i=0;i<g.length;i++) if(g[i]) any=true;
      return any && state==='title';
    }
  }
});
})();
