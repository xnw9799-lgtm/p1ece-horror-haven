const $=s=>document.querySelector(s);
const names=['KEEHO','THEO','JIUNG','INTAK','SOUL','JONGSEOB'];
const colors=['#ff3ba7','#00e5ff','#a855f7','#edaaec','#a7e8cf','#edda8c'];
const board=$('#board'),pieces=[],slots=[];let held=null,count=0,complete=false,source=null,stream=null,recognizer=null,raf=null,lastTime=-1,lastHand=false,fistSince=0,sound=false,audioCtx;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let heroIndex=0,heroSelected=false,heroTiltReady=true,heroFistAt=0,activeWrist=null,activeSide='',lockedHandAt=0;
const heroes=[
 {name:'THEO',korean:'테오',image:'assets/theo.png',power:'精准射击 / 完美命中',english:'Precise accuracy',description:'百发百中的精准射手，能准确击中任何目标。',symbol:'⌖'},
 {name:'KEEHO',korean:'기호',image:'assets/keeho.png',power:'时空操控',english:'Space-time manipulation',description:'通过手表实现传送与时空旅行，能在过去、现在、未来之间移动。',symbol:'◷'},
 {name:'JIUNG',korean:'지웅',image:'assets/jiung.png',power:'念力 / 心灵感应',english:'Telekinesis',description:'通过戒指，以意念移动物体。',symbol:'◈'},
 {name:'INTAK',korean:'인탁',image:'assets/intak.png',power:'超强耐久 / 自愈',english:'Hyper durability · Immortality with self-healing',description:'几乎不死，伤口能自然愈合，被称为“不会死的男孩”。',symbol:'∞'},
 {name:'SOUL',korean:'소울',image:'assets/soul.png',power:'神秘',english:'Mystery',description:'对 Alcor 病毒完全免疫；无人在“现实世界”见过他，疑似来自其他星球或宇宙。',theory:'可能是所有成员能力的综合体，或能与万物沟通。',symbol:'✧'},
 {name:'JONGSEOB',korean:'종섭',image:'assets/jongseob.png',power:'全能制造 / 科技天才',english:'Omnifabrication',description:'能修理或创造任何东西的科技天才、发明家。',symbol:'⚙'}
];
for(let i=0;i<heroes.length;i++){const hero=heroes[i],el=document.createElement('button');el.className='hero-card';el.setAttribute('aria-label','选择 '+hero.name);el.innerHTML=`<span class="portrait-ring"><img src="${hero.image}" alt="" loading="eager"></span><span class="hero-order">${hero.name}</span>`;el.onclick=()=>selectHero(i);el.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();selectHero(heroIndex+1)}if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();selectHero(heroIndex-1)}});$('#hero-lineup').append(el)}
function selectHero(i){heroSelected=false;$('#hero-lock').hidden=false;heroIndex=(i+6)%6;heroFistAt=0;const hero=heroes[heroIndex];$('#hero-label').textContent=hero.name;$('#hero-korean').textContent=hero.korean;$('#hero-power').textContent=hero.power;$('#hero-power-en').textContent=hero.english;$('#hero-description').textContent=hero.description;$('#hero-symbol').textContent=hero.symbol;$('#hero-theory').hidden=!hero.theory;$('#hero-theory').textContent=hero.theory||'';$('#hero-portrait').src=hero.image;$('#hero-portrait').alt=hero.name+' 原始全身抠图';$('#character-watermark').textContent=hero.name;$('#hero-confirm-progress').style.width='0%';$('#selection-number').textContent='0'+(heroIndex+1)+' / 06';document.querySelectorAll('.hero-card').forEach((e,j)=>{e.classList.toggle('selected',j===heroIndex);e.setAttribute('aria-pressed',String(j===heroIndex))});$('#hero-hint').textContent='左右翻掌切换 · 握拳选定 '+hero.name;$('#heroes').classList.remove('confirmed')}
function confirmHero(){heroSelected=true;heroFistAt=0;heroTiltReady=false;$('#heroes').classList.add('confirmed');$('#hero-lock').hidden=true;$('#chosen-hero').textContent=heroes[heroIndex].name;setupCompanion();$('#hero-hint').textContent='已选定 '+heroes[heroIndex].name+' · 可以开始拼图';$('#hero-confirm-progress').style.width='100%';tone(heroIndex);lastHand=false;hoverPiece=null;board.scrollIntoView({behavior:'smooth',block:'center'});status('已选定 '+heroes[heroIndex].name+'。拼合不规则图案，搭档会自动防御无人机。')}
$('#hero-prev').onclick=()=>selectHero(heroIndex-1);$('#hero-next').onclick=()=>selectHero(heroIndex+1);$('#confirm-hero').onclick=confirmHero;$('#selector-start').onclick=()=>$('#start-camera').click();selectHero(0);
function selectControlHand(r,now){const list=r.landmarks||[];if(!list.length)return null;let index=-1;
 if(activeWrist&&now-lockedHandAt<900){let best=.32;for(let i=0;i<list.length;i++){const side=r.handedness?.[i]?.[0]?.categoryName||'';if(activeSide&&side&&side!==activeSide)continue;const d=Math.hypot(list[i][0].x-activeWrist.x,list[i][0].y-activeWrist.y)+(activeSide&&side!==activeSide?.18:0);if(d<best){best=d;index=i}}if(index<0)return null;}
 else{let best=-1;list.forEach((lm,i)=>{const size=Math.hypot(lm[0].x-lm[9].x,lm[0].y-lm[9].y);if(size>best){best=size;index=i}})}
 if(index<0)return null;activeWrist={...list[index][0]};activeSide=r.handedness?.[index]?.[0]?.categoryName||'';lockedHandAt=now;return{lm:list[index],gesture:r.gestures?.[index]?.[0],count:list.length};}
function processHeroHand(lm,gesture,now){const angle=Math.atan2(lm[9].x-lm[0].x,lm[0].y-lm[9].y)*180/Math.PI;const isFist=gesture?.categoryName==='Closed_Fist'&&gesture.score>.55;const open=gesture?.categoryName==='Open_Palm'||(!isFist&&lm[8].y<lm[6].y&&lm[12].y<lm[10].y);
 if(isFist){heroFistAt||=now;const progress=Math.min(100,(now-heroFistAt)/450*100);$('#hero-hint').textContent='握拳确认 '+Math.round(progress)+'%';$('#hero-confirm-progress').style.width=progress+'%';$('.hero-selector-shell').classList.add('is-confirming');if(now-heroFistAt>=450)confirmHero();return}
 heroFistAt=0;$('#hero-confirm-progress').style.width='0%';$('.hero-selector-shell').classList.remove('is-confirming');if(Math.abs(angle)<15)heroTiltReady=true;
 if(open&&heroTiltReady&&Math.abs(angle)>28){selectHero(heroIndex+(angle>0?-1:1));heroTiltReady=false;tone(heroIndex)}
 $('#selection-tracking').textContent='● CONTROL HAND / '+(open?'PALM':'READY');$('#hero-hint').textContent=heroTiltReady?'左右翻掌切换 · 握拳选定':'手掌回正后，可以继续切换';}
function status(t){if($('#status').textContent!==t)$('#status').textContent=t}
function tone(i=0){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=[261.63,293.66,329.63,392,440,523.25][i%6];g.gain.setValueAtTime(.08,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.6);o.start();o.stop(audioCtx.currentTime+.6)}catch{}}
const puzzleArtwork='<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#322631"/><stop offset=".5" stop-color="#16151d"/><stop offset="1" stop-color="#4b152c"/></linearGradient><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#ed3656" stop-opacity="0"/><stop offset="1" stop-color="#ed3656" stop-opacity=".22"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h600v400H0z"/><path fill="#f32950" opacity=".12" d="m0 100 600-60v35L0 138zm0 180 600-60v12L0 300Z"/><text x="25" y="30" font-family="Arial,sans-serif" font-size="8" fill="#d9bac9" letter-spacing="4">SIX HEROES / ONE HARMONY</text><g><image href="assets/theo.png" x="0" y="45" width="112" height="280" preserveAspectRatio="xMidYMax meet"/><image href="assets/keeho.png" x="94" y="45" width="112" height="280" preserveAspectRatio="xMidYMax meet"/><image href="assets/jiung.png" x="188" y="45" width="112" height="280" preserveAspectRatio="xMidYMax meet"/><image href="assets/intak.png" x="282" y="45" width="112" height="280" preserveAspectRatio="xMidYMax meet"/><image href="assets/soul.png" x="376" y="45" width="112" height="280" preserveAspectRatio="xMidYMax meet"/><image href="assets/jongseob.png" x="470" y="45" width="125" height="280" preserveAspectRatio="xMidYMax meet"/></g><path fill="url(#floor)" d="M0 245h600v155H0z"/><path stroke="#d05173" opacity=".4" d="M25 339h550"/><text x="300" y="374" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" letter-spacing="9" fill="#f2dce4">P1HARMONY</text><text x="300" y="392" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" letter-spacing="4" fill="#b497a6">YOU ARE THE FINAL PIECE</text>';
const shardShapes=[
 [[0,0],[200,0],[190,90],[220,130],[180,165],[200,195],[100,185],[65,215],[0,200]],
 [[200,0],[400,0],[410,95],[380,130],[405,200],[300,215],[270,180],[200,195],[180,165],[220,130],[190,90]],
 [[400,0],[600,0],[600,200],[500,180],[460,210],[405,200],[380,130],[410,95]],
 [[0,200],[65,215],[100,185],[200,195],[180,280],[210,310],[200,400],[0,400]],
 [[200,195],[270,180],[300,215],[405,200],[390,280],[420,320],[400,400],[200,400],[210,310],[180,280]],
 [[405,200],[460,210],[500,180],[600,200],[600,400],[400,400],[420,320],[390,280]]
];
const puzzle={x:0,y:0,scale:1,w:0,h:0};
$('#puzzle-ghost').innerHTML='<svg viewBox="0 0 600 400" aria-hidden="true">'+puzzleArtwork+'</svg>';
function shardBounds(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
function geometry(){const w=board.clientWidth,h=board.clientHeight;const scale=Math.min(w<600?w*.62:w*.44,460)/600;puzzle.w=600*scale;puzzle.h=400*scale;puzzle.scale=scale;puzzle.x=(w-puzzle.w)/2;puzzle.y=(h-puzzle.h)/2;
 $('#puzzle-ghost').style.cssText='left:'+puzzle.x+'px;top:'+puzzle.y+'px;width:'+puzzle.w+'px;height:'+puzzle.h+'px';
 slots.forEach((s,i)=>{const b=pieces[i].bounds;s.x=puzzle.x+b.x*scale;s.y=puzzle.y+b.y*scale;s.el.style.left=s.x+'px';s.el.style.top=s.y+'px';s.el.style.width=b.w*scale+'px';s.el.style.height=b.h*scale+'px'});
 pieces.forEach((p,i)=>{p.w=p.bounds.w*scale;p.h=p.bounds.h*scale;p.el.style.width=p.w+'px';p.el.style.height=p.h+'px';const side=i%2;const rows=Math.floor(i/2);p.homeX=side?w-p.w-14:14;p.homeY=40+rows*(h-p.h-85)/2;
 if(p.locked){p.x=slots[i].x;p.y=slots[i].y}else{p.x=p.homeX;p.y=p.homeY}paint(p)});canvas.width=w;canvas.height=h;if(typeof droneCanvas!=='undefined'){droneCanvas.width=w;droneCanvas.height=h}}
function paint(p){p.el.style.left=p.x+'px';p.el.style.top=p.y+'px'}
shardShapes.forEach((shape,i)=>{const b=shardBounds(shape),poly=shape.map(p=>((p[0]-b.x)/b.w*100)+'% '+((p[1]-b.y)/b.h*100)+'%').join(',');const slot=document.createElement('div');slot.className='slot';slot.style.clipPath='polygon('+poly+')';$('#slots').append(slot);slots.push({el:slot,x:0,y:0});const el=document.createElement('button');el.className='piece';el.style.clipPath='polygon('+poly+')';el.innerHTML=`<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" aria-hidden="true">${puzzleArtwork}<polygon points="${shape.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b48097" stroke-width="1.2"/></svg>`;el.setAttribute('aria-label','图案碎片 '+(i+1)+'，回车放置');$('#pieces').append(el);const p={el,x:0,y:0,homeX:0,homeY:0,locked:false,i,bounds:b,w:0,h:0};pieces.push(p);
 el.addEventListener('pointerdown',e=>{if(!heroSelected||p.locked||complete)return;e.preventDefault();el.setPointerCapture(e.pointerId);grabPiece(p,'pointer');p.dx=e.clientX-board.getBoundingClientRect().left-p.x;p.dy=e.clientY-board.getBoundingClientRect().top-p.y});
 el.addEventListener('pointermove',e=>{if(held!==p||source!=='pointer')return;move(e.clientX-board.getBoundingClientRect().left-p.dx,e.clientY-board.getBoundingClientRect().top-p.dy)});
 el.addEventListener('pointerup',()=>{if(held===p&&source==='pointer')release()});el.addEventListener('pointercancel',()=>{if(held===p)returnPiece(p)});
 el.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&heroSelected&&!p.locked&&!complete){e.preventDefault();grabPiece(p,'keyboard');p.x=slots[i].x;p.y=slots[i].y;release()}})});
function grabPiece(p,mode){held=p;source=mode;p.el.classList.add('dragging');slots[p.i].el.classList.add('candidate');if(typeof defense!=='undefined'){if(!defense.firstMove){defense.firstMove=true;defense.lastScan=defense.time}} }
function returnPiece(p){p.x=p.homeX;p.y=p.homeY;p.el.classList.remove('dragging');p.el.classList.add('returning');setTimeout(()=>p.el.classList.remove('returning'),350);slots[p.i].el.classList.remove('candidate','target-near');paint(p);if(held===p){held=null;source=null;hoverPiece=null;releaseFrames=0}}
function move(x,y){if(!held)return;held.x=Math.max(0,Math.min(board.clientWidth-held.el.offsetWidth,x));held.y=Math.max(0,Math.min(board.clientHeight-held.el.offsetHeight,y));paint(held)}
function release(){if(!held)return;const p=held,s=slots[p.i],tolerance=Math.max(18,Math.min(p.w,p.h)*(source==='hand'?.32:.22));p.el.classList.remove('dragging');s.el.classList.remove('candidate','target-near');
 if(Math.hypot(p.x-s.x,p.y-s.y)<tolerance){p.x=s.x;p.y=s.y;p.locked=true;p.el.classList.add('locked');p.el.disabled=true;count++;tone(p.i);burst(p.x+p.w/2,p.y+p.h/2,colors[p.i]);status(count===6?'六块碎片已归位。握拳，或点击 AWAKEN HARMONY。':'图案已连接 · '+count+' / 6');$('#counter').textContent=String(count).padStart(2,'0')+' / 06';$('#progress').style.setProperty('--progress',count/6*100+'%');$('#activate').disabled=count!==6;
 if(heroIndex===5){s.el.classList.add('fabricated');setTimeout(()=>s.el.classList.remove('fabricated'),900);abilityMessage('JONGSEOB · 连接件已制造，结构修复完成。','LINK RESTORED')}
 }else{returnPiece(p);status('连接处尚未吻合，碎片已返回。观察纹理后再试。')}
 paint(p);held=null;source=null;hoverPiece=null;releaseFrames=0;clearWarning();}
function awaken(){if(count!==6||complete)return;complete=true;clearWarning();$('#victory').hidden=false;$('#phase').textContent='HARMONY';board.classList.add('harmonized');for(let i=0;i<6;i++){burst(board.clientWidth*(.15+Math.random()*.7),board.clientHeight*Math.random(),colors[i]);setTimeout(()=>tone(i),i*110)}status('Harmony 已完成！点击 PLAY AGAIN 可重新开始。');$('#activate').disabled=true}
function reset(){resetDefense();held=null;source=null;count=0;complete=false;fistSince=0;pieces.forEach(p=>{p.locked=false;p.el.disabled=false;p.el.className='piece'});$('#victory').hidden=true;board.classList.remove('harmonized');$('#phase').textContent='DISHARMONY';$('#counter').textContent='00 / 06';$('#progress').style.setProperty('--progress','0%');$('#activate').disabled=true;geometry();status('根据图案纹理拼合碎片，无需旋转。观察无人机扫描，搭档会自动防御。')}
$('#activate').onclick=awaken;$('#again').onclick=reset;$('#reset').onclick=reset;
const canvas=$('#particles'),ctx=canvas.getContext('2d');let sparks=[],particleFrame=null;
function burst(x,y,c){if(reduced)return;for(let i=0;i<35;i++)sparks.push({x,y,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9,life:1,c});if(!particleFrame)particleFrame=requestAnimationFrame(animate)}
function animate(){ctx.clearRect(0,0,canvas.width,canvas.height);sparks=sparks.filter(p=>p.life>0);for(const p of sparks){p.x+=p.vx;p.y+=p.vy;p.vy+=.04;p.life-=.018;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;particleFrame=sparks.length?requestAnimationFrame(animate):null}
new ResizeObserver(geometry).observe(board);
let inferAt=0,handSeenAt=0,hoverPiece=null,releaseFrames=0,delegateUsed='CPU';
const inferCanvas=document.createElement('canvas');inferCanvas.width=320;inferCanvas.height=240;
const inferContext=inferCanvas.getContext('2d',{alpha:false});
function stopCamera(){if(raf)cancelAnimationFrame(raf);raf=null;stream?.getTracks().forEach(t=>t.stop());stream=null;$('#video').srcObject=null;$('#selector-video').srcObject=null;$('#selection-tracking').textContent='CAMERA STANDBY';$('#selector-start').disabled=false;$('#selector-start').textContent='ENABLE HAND TRACKING ↗';activeWrist=null;heroFistAt=0;$('#hand-cursor').style.display='none';$('#tracking').textContent='◌ MOUSE MODE';$('#camera-label').textContent='CAMERA STANDBY';$('#stop-camera').hidden=true;$('#start-camera').disabled=false;$('#start-camera').textContent='ENABLE HAND TRACKING ↗';$('.game-shell').classList.remove('hand-active');if(held&&source==='hand')release();lastHand=false;hoverPiece=null;status('摄像头已关闭，可以继续用鼠标或触屏。')}
$('#stop-camera').onclick=stopCamera;
$('#start-camera').onclick=async()=>{const btn=$('#start-camera');btn.disabled=true;btn.textContent='LOADING…';try{
 if(!navigator.mediaDevices?.getUserMedia)throw Error('需要 HTTPS 或 localhost，并使用支持摄像头的浏览器');
 stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:320},height:{ideal:240},frameRate:{ideal:30,max:30},facingMode:'user'},audio:false});
 $('#video').srcObject=stream;$('#selector-video').srcObject=stream;await Promise.all([$('#video').play(),$('#selector-video').play()]);$('#stop-camera').hidden=false;status('摄像头已开启，正在加载手势模型…');
 if(!recognizer){const vision=await import('./vendor/vision_bundle.mjs');const files=await vision.FilesetResolver.forVisionTasks('./vendor/wasm');let lastError;
 for(const delegate of ['GPU','CPU']){try{recognizer=await vision.GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./gesture_recognizer.task',location.href).href,delegate},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.45,minHandPresenceConfidence:.45,minTrackingConfidence:.45});delegateUsed=delegate;break}catch(e){lastError=e}}
 if(!recognizer)throw lastError||Error('手势模型初始化失败');}
 lastTime=-1;lastHand=false;inferAt=0;handSeenAt=0;releaseFrames=0;activeWrist=null;activeSide='';heroFistAt=0;heroTiltReady=true;btn.textContent='HAND TRACKING ACTIVE';$('#selector-start').disabled=true;$('#selector-start').textContent='HAND TRACKING ACTIVE';$('.game-shell').classList.add('hand-active');(heroSelected?board:$('#heroes')).scrollIntoView({behavior:'smooth',block:'center'});$('#camera-label').textContent='LIVE / LOCAL ONLY';status('食指光标靠近碎片，捏合抓取，拼合中央图案后松开。');track();
 }catch(e){stopCamera();status(e.name==='NotAllowedError'?'摄像头权限未获允许，请在地址栏设置中允许。':e.message||'摄像头启动失败，可用鼠标继续。')}};
function processHand(r,now,ms){const control=selectControlHand(r,now),lm=control?.lm;if(!lm){if(now-handSeenAt>450){if(held&&source==='hand')release();lastHand=false;hoverPiece=null;heroFistAt=0;$('#selection-tracking').textContent='SHOW ONE CONTROL HAND';$('#hand-cursor').style.display='none';$('#tracking').textContent='◌ SHOW YOUR HAND';status('尚未识别到手：请将整只手放入右下角画面，保持光线充足。');pieces.forEach(p=>p.el.classList.remove('hovered'))}return}
 handSeenAt=now;if(!heroSelected){processHeroHand(lm,control.gesture,now);return}const w=board.clientWidth,h=board.clientHeight;
 
 const x=Math.max(0,Math.min(w,((1-lm[8].x)-.1)/.8*w)),y=Math.max(0,Math.min(h,(lm[8].y-.1)/.8*h));
 const aspect=inferCanvas.width/inferCanvas.height;
 const distance=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
 const palm=Math.max(.04,distance(lm[0],lm[9]));const ratio=distance(lm[4],lm[8])/palm;
 const pinch=lastHand?ratio<.68:ratio<.48;
 const cursor=$('#hand-cursor');cursor.style.display='block';cursor.style.left=x+'px';cursor.style.top=y+'px';cursor.classList.toggle('pinch',pinch);
 let nearest=null,best=Infinity;for(const p of pieces){if(p.locked)continue;const d=Math.hypot(x-p.x-p.el.offsetWidth/2,y-p.y-p.el.offsetHeight/2);if(d<best&&d<Math.max(90,p.el.offsetWidth)){best=d;nearest=p}}
 if(!pinch&&nearest)hoverPiece=nearest;
 if(!pinch&&!nearest)hoverPiece=null;
 for(const p of pieces)p.el.classList.toggle('hovered',p===nearest||p===held);
 if(pinch&&!held&&!complete&&(nearest||hoverPiece)&&source!=='pointer'){grabPiece(nearest||hoverPiece,'hand');held.handOffsetX=held.x-x;held.handOffsetY=held.y-y;releaseFrames=0;tone(held.i)}
 if(held&&source==='hand'){

  if(pinch){move(x+held.handOffsetX,y+held.handOffsetY);releaseFrames=0;const s=slots[held.i];s.el.classList.toggle('target-near',Math.hypot(held.x-s.x,held.y-s.y)<Math.max(22,held.w*.32))}
  else if(++releaseFrames>=2){slots[held.i].el.classList.remove('target-near');release();hoverPiece=null;releaseFrames=0}
 }
 lastHand=pinch;const label='● '+(control.count>1?'2 HANDS / LOCKED / ':'')+delegateUsed+' / '+Math.round(ms)+'ms / '+(held&&source==='hand'?'GRABBED':pinch?'PINCH':'READY');if($('#tracking').textContent!==label)$('#tracking').textContent=label;
 if(!complete)status(held&&source==='hand'?'已抓取碎片：观察图案衔接，移到中央后松开。':count===6?'六块已归位：握拳或点击 AWAKEN HARMONY。':nearest?'已选中碎片，拇指与食指捏合即可抓住。':'食指移动光标，靠近碎片后捏合。');
 const gesture=control.gesture;if(gesture?.categoryName==='Closed_Fist'&&gesture.score>.55&&count===6){fistSince||=now;if(now-fistSince>400)awaken()}else fistSince=0;
}
function track(now=performance.now()){if(!stream)return;try{const video=$('#video');if(video.readyState>=2&&video.currentTime!==lastTime&&now-inferAt>=(delegateUsed==='GPU'?45:65)){inferAt=now;lastTime=video.currentTime;inferContext.drawImage(video,0,0,320,240);const start=performance.now();const r=recognizer.recognizeForVideo(inferCanvas,start);processHand(r,start,performance.now()-start)}raf=requestAnimationFrame(track)}catch(e){console.error(e);stopCamera();status('手势识别中断：'+e.message+'。请重新开启摄像头。')}}
window.addEventListener('pagehide',stopCamera);


const defense={enabled:true,visible:false,time:0,lastFrame:0,frame:0,lastScan:0,firstMove:0,readyAt:0,warning:null,effect:null,noticeUntil:0};
const droneCanvas=$('#drone-effects'),droneCtx=droneCanvas.getContext('2d');
const droneIcons=[0,1].map(i=>{const e=document.createElement('div');e.className='drone';e.innerHTML='<svg viewBox="0 0 80 36"><g fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="15" cy="9" rx="12" ry="4"/><ellipse cx="65" cy="9" rx="12" ry="4"/><path d="m15 11 18 9h14l18-9M30 15h20l5 10-15 6-15-6Z"/></g><circle cx="40" cy="23" r="3" fill="#ff4266"/></svg>';$('#drone-layer').append(e);return e});
const abilityNames=['精准击落','局部时空停滞','念力推离','耐久守护 / 自愈','病毒免疫通行','干扰装置'];
function setupCompanion(){$('#companion-photo').src=heroes[heroIndex].image;$('#companion-photo').alt=heroes[heroIndex].name;$('#companion-name').textContent=heroes[heroIndex].name;$('#companion-skill').textContent=abilityNames[heroIndex]+' · 自动触发';defense.readyAt=defense.time;defense.effect=null;clearWarning();abilityMessage(heroes[heroIndex].name+' 已就位 · 防御自动触发，无需额外手势。','HERO READY')}
function showAlert(kind,title,detail,tag=''){const e=$('#danger-message');e.hidden=false;e.className=kind==='warning'?'warning-notice':'ability-notice';$('#alert-title').textContent=title;$('#alert-detail').textContent=detail;$('#alert-tag').textContent=tag;$('#alert-count').textContent='';board.classList.toggle('defense-active',kind!=='warning');board.classList.toggle('alert-active',kind==='warning');}
function hideAlert(){$('#danger-message').hidden=true;board.classList.remove('defense-active','alert-active');}
function abilityMessage(text,title='DEFENSE ACTIVE'){showAlert('defense',title,text,heroes[heroIndex].name+' / AUTO ABILITY');defense.noticeUntil=defense.time+3500}
function clearWarning(){if(defense.warning)hideAlert();defense.warning=null;board.classList.remove('under-threat');}
function resetDefense(){clearWarning();defense.readyAt=0;defense.time=0;defense.lastFrame=0;defense.firstMove=0;defense.lastScan=0;defense.effect=null;defense.noticeUntil=0;hideAlert();$('#puzzle-ghost').classList.remove('hint-visible');}
function dronePosition(i,t){const w=board.clientWidth,h=board.clientHeight;return{x:w*(.5+Math.sin(t*.00018+i*3.14)*.36),y:48+Math.sin(t*.0003+i*2)*18+(i?35:0)}}
function triggerDefense(now){const target=held;if(!target)return;const from=dronePosition(defense.warning?.drone||0,now);const tx=target.x+target.w/2,ty=target.y+target.h/2;const modes=['shot','freeze','push','shield','immune','jam'];
 defense.readyAt=now+9000;defense.effect={mode:modes[heroIndex],start:now,end:now+2200,from,tx,ty};clearWarning();
 const feedback=['THEO · 精准命中，追踪无人机已被击落。','KEEHO · 局部时空冻结，扫描暂时停止。','JIUNG · 念力展开，无人机被推离。','INTAK · 已替碎片承受攻击，正在自愈。','SOUL · 免疫通行，病毒干扰未能生效。','JONGSEOB · 干扰装置启动，扫描信号中断。'];abilityMessage(feedback[heroIndex]);tone(heroIndex);burst(tx,ty,colors[heroIndex]);}
function updateThreat(now){if(!heroSelected||complete||!defense.enabled||!held){clearWarning();return}
 if(defense.effect&&now<defense.effect.end)return;
 if(!defense.warning&&now-defense.lastScan>5500){defense.lastScan=now;defense.warning={start:now,drone:Math.floor(Math.random()*2),piece:held};board.classList.add('under-threat');showAlert('warning','WARNING','无人机已锁定碎片 · 松开放下可避开攻击','ALCOR DRONE / TARGET LOCKED');}
 if(!defense.warning)return;
 if(held!==defense.warning.piece){clearWarning();return}
 const age=now-defense.warning.start;$('#alert-count').textContent=Math.max(0,(2800-age)/1000).toFixed(1)+'s';
 if(age>=1600&&now>=defense.readyAt){triggerDefense(now);return}
 if(age>=2800){const p=held;defense.effect={mode:'hit',start:now,end:now+700,tx:p.x+p.w/2,ty:p.y+p.h/2};returnPiece(p);clearWarning();showAlert('warning','IMPACT','碎片已退回 · 已完成的拼图仍然保留','DRONE ATTACK / RECOVER');defense.noticeUntil=now+3000;}
}
function paintDefense(now){const w=droneCanvas.width,h=droneCanvas.height;droneCtx.clearRect(0,0,w,h);droneIcons.forEach((e,i)=>{const p=dronePosition(i,defense.effect?.mode==='freeze'?defense.effect.start:now);let dx=0;if(defense.effect?.mode==='push')dx=(now-defense.effect.start)*.2*(i?-1:1);e.style.transform='translate('+(p.x+dx-33)+'px,'+(p.y-18)+'px)';e.hidden=!defense.enabled||complete||!heroSelected||(defense.effect?.mode==='shot'&&i===0);e.classList.toggle('drone-disabled',!!defense.effect&&now<defense.effect.end);});
 const c=droneCtx;const warning=defense.warning;if(warning&&held){const p=dronePosition(warning.drone,now),x=held.x+held.w/2,y=held.y+held.h/2;c.strokeStyle='#ff4266';c.lineWidth=1.3;c.setLineDash([5,6]);c.beginPath();c.moveTo(p.x,p.y+15);c.lineTo(x,y);c.stroke();c.setLineDash([]);c.beginPath();c.arc(x,y,27,0,Math.PI*2);c.stroke();c.fillStyle='#ff426622';c.fill();}
 const fx=defense.effect;if(!fx)return;if(now>=fx.end){defense.effect=null;return}const t=(now-fx.start)/(fx.end-fx.start);c.lineWidth=2;c.strokeStyle=['immune','freeze'].includes(fx.mode)?'#a0d9ff':'#ff6485';c.globalAlpha=1-t;
 if(fx.mode==='shot'){c.beginPath();c.moveTo(fx.tx,fx.ty);c.lineTo(fx.from.x,fx.from.y);c.stroke();}
 else if(fx.mode==='shield'||fx.mode==='immune'||fx.mode==='hit'){c.beginPath();c.arc(fx.tx,fx.ty,38+t*25,0,Math.PI*2);c.stroke();}
 else{c.beginPath();c.arc(w/2,h/2,40+t*Math.max(w,h)*.65,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
}
function defenseFrame(t){if(!defense.visible){defense.frame=0;return}const dt=defense.lastFrame?Math.min(80,t-defense.lastFrame):0;defense.lastFrame=t;if(heroSelected&&!complete&&!document.hidden)defense.time+=dt;updateThreat(defense.time);paintDefense(defense.time);const remaining=Math.max(0,defense.readyAt-defense.time);$('#ability-state').textContent=remaining?'冷却 '+Math.ceil(remaining/1000)+'s':'READY';$('#ability-bar').style.width=(1-remaining/9000)*100+'%';if(defense.noticeUntil&&defense.time>defense.noticeUntil&&!defense.warning){hideAlert();defense.noticeUntil=0}defense.frame=requestAnimationFrame(defenseFrame)}
new IntersectionObserver(entries=>{defense.visible=entries[0].isIntersecting;defense.lastFrame=0;if(defense.visible&&!defense.frame)defense.frame=requestAnimationFrame(defenseFrame);else if(!defense.visible){cancelAnimationFrame(defense.frame);defense.frame=0}}).observe(board);
let hintTimer;$('#puzzle-hint').onclick=()=>{$('#puzzle-ghost').classList.add('hint-visible');$('#puzzle-hint').disabled=true;clearTimeout(hintTimer);hintTimer=setTimeout(()=>{$('#puzzle-ghost').classList.remove('hint-visible');$('#puzzle-hint').disabled=false},2400)};

// Ambient particles inspired by the supplied digital-art references.
const field=document.querySelector('#hero-field'),fc=field.getContext('2d');let fieldW=0,fieldH=0,fieldRAF=0;
function resizeField(){fieldW=field.clientWidth;fieldH=field.clientHeight;const d=Math.min(devicePixelRatio||1,2);field.width=fieldW*d;field.height=fieldH*d;fc.setTransform(d,0,0,d,0,0)}
new ResizeObserver(resizeField).observe(field);resizeField();
const stars=Array.from({length:1700},()=>({a:Math.random()*Math.PI*2,r:.45+Math.random()*.55,z:Math.random(),phase:Math.random()*6.28}));
function drawField(t=0){fc.clearRect(0,0,fieldW,fieldH);const time=reduced?0:t*.00012;for(const p of stars){const a=p.a+time*(.1+p.z*.15),radius=p.r*Math.min(fieldW*.43,fieldH*.55),x=fieldW*.5+Math.cos(a)*radius,y=fieldH*.46+Math.sin(a)*radius*.67+Math.sin(time+p.phase)*8;fc.globalAlpha=.32+p.z*.65;fc.fillStyle=p.z>.9?'#ff8792':p.z>.6?'#e82a48':'#a95265';const size=p.z>.94?2.2:1.2;fc.fillRect(x,y,size,size)}fc.globalAlpha=1;if(!reduced)fieldRAF=requestAnimationFrame(drawField)}
const fieldObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){if(!fieldRAF)fieldRAF=requestAnimationFrame(drawField)}else{cancelAnimationFrame(fieldRAF);fieldRAF=0}});fieldObserver.observe(field);

// Layered section particles; only animate visible sections to spare tracking time.
for(const surface of document.querySelectorAll('.ambient-field')){const c=surface.getContext('2d');let w=0,h=0,visible=false,id=0;const points=Array.from({length:260},()=>({x:Math.random(),y:Math.random(),z:Math.random(),p:Math.random()*6.28}));function size(){w=surface.clientWidth;h=surface.clientHeight;surface.width=w;surface.height=h}new ResizeObserver(size).observe(surface);size();function render(t){c.clearRect(0,0,w,h);for(const p of points){const x=(p.x*w+Math.sin(t*.0002+p.p)*18),y=(p.y*h+t*.005*(.3+p.z))%h;c.globalAlpha=.2+p.z*.65;c.fillStyle=p.z>.8?'#ff718d':p.z>.5?'#dd3158':'#8271ca';c.fillRect(x,y,p.z> .92?2.5:1.3,p.z>.92?2.5:1.3)}c.globalAlpha=1;if(visible&&!reduced)id=requestAnimationFrame(render);else id=0}new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(visible&&!id)id=requestAnimationFrame(render);if(!visible){cancelAnimationFrame(id);id=0}}).observe(surface)}
