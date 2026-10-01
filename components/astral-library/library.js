import * as T from './vendor/three.module.js';
import {buildArchitecture} from './architecture.js';

/** UI-independent embeddable voxel library. Call dispose() when unmounting. */
export function mountLibrary(host,options={}){
  if(!host)throw Error('A container is required.');
  const pixelRatio=Math.max(.5,Math.min(2,Number(options.maxPixelRatio)||1.6)),keyboard=options.keyboard??'focus',frameOffset=Number(options.frameOffset)||0;
  if(!['focus','global','off'].includes(keyboard))throw Error('Invalid keyboard mode');
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,pixelRatio));renderer.shadowMap.enabled=options.shadows!==false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;host.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#b6cbd7');scene.fog=new T.Fog('#b6cbd7',115,210);
  const camera=new T.PerspectiveCamera(43,1,.1,250),hemi=new T.HemisphereLight('#e6f2ff','#a08c6f',1.45);scene.add(hemi);
  const sun=new T.DirectionalLight('#ffe4b5',3.2);sun.position.set(-35,60,40);sun.castShadow=options.shadows!==false;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-37,right:37,top:43,bottom:-32,near:1,far:150});sun.shadow.normalBias=.065;scene.add(sun);
  const fill=new T.DirectionalLight('#b6d1f0',.55);fill.position.set(26,24,-28);scene.add(fill);
  const building=buildArchitecture(scene),floorHeights=building.floorHeights;const target=new T.Vector3(0,13,0);
  let width=1,height=1,disposed=false,paused=false,mode='outside',floor=0,yaw=0,pitch=.12,theta=.6,phi=1.14,distance=94,transition=null,cutaway=false,night=false;
  const position=new T.Vector3(0,2.57,10.8),moves=new Set(),keys=new Set(),pointers=new Map();let previousX=0,previousY=0,pinch=0,raf=0,last=performance.now();const eye=1.67,handlers=[];
  function emit(){options.onStateChange?.(getState())}
  function getState(){return {mode,floor,position:position.toArray(),yaw,pitch,cutaway,night,transitioning:!!transition,paused,...building.stats}}
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();distance=width<760?110:94;
  function exterior(){mode='outside';transition=null;floor=0;theta=.6;phi=1.14;distance=width<760?110:94;moves.clear();keys.clear();lighting();emit()}
  const destinations={entrance:[0,.9+eye,10.8,0,.12,0],reading:[0,.9+eye,8.7,0,.14,0],gallery:[-9.3,7.9+eye,8.3,-.78,-.1,1],upper:[-5.5,14.9+eye,-12.8,-2.56,-.2,2]};
  function enter(location='entrance'){
    const p=destinations[location];if(!p)throw Error('Unknown viewpoint');canvas.focus?.({preventScroll:true});const wasOutside=mode==='outside';mode='inside';floor=p[5];position.set(p[0],p[1],p[2]);yaw=p[3];pitch=p[4];moves.clear();keys.clear();camera.clearViewOffset();
    // Enter via the open front portal, rather than through the front wall.
    if(wasOutside&&(location==='entrance'||location==='reading'))transition={start:camera.position.clone(),via:new T.Vector3(0,3.8,19),end:position.clone(),t:0,duration:2.5};
    else{camera.position.copy(position);transition=null}lighting();emit();
  }
  function setCutaway(v){cutaway=!!v;building.setCutaway(cutaway);emit()}
  function lighting(){const indoors=mode==='inside';hemi.intensity=night?(indoors?.58:.72):(indoors?1.12:1.45);hemi.color.set(indoors?'#d4e0ed':'#e6f2ff');hemi.groundColor.set(indoors?'#936449':'#a08c6f');sun.intensity=night?.72:3.2;sun.color.set(night?'#97b5f2':'#ffe4b5');fill.intensity=night?.26:.55;renderer.toneMappingExposure=indoors?1.26:night?1.22:1.17;building.lights.forEach((l,i)=>l.intensity=i<2?(night?26:12):i<4?(night?175:125):(night?26:14))}
  function setNight(v){night=!!v;scene.background.set(night?'#101d33':'#b6cbd7');scene.fog.color.copy(scene.background);lighting();emit()}
  function setMove(direction,active){if(!['forward','backward','left','right'].includes(direction))throw Error('Unknown direction');active?moves.add(direction):moves.delete(direction)}
  function turn(deltaYaw,deltaPitch=0){yaw+=deltaYaw;pitch=T.MathUtils.clamp(pitch+deltaPitch,-1.15,1.2)}
  function tryStep(x,z){const sampled=building.sampleFloor(x,z,position.y-eye);if(!sampled)return false;position.x=x;position.z=z;position.y=sampled.y+eye;if(sampled.level!==floor){floor=sampled.level;emit()}return true}
  function on(obj,event,fn,opts){obj.addEventListener(event,fn,opts);handlers.push(()=>obj.removeEventListener(event,fn,opts))}
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute?.('aria-label','体素图书馆：拖动查看，进入后用 WASD 或方向键移动');canvas.style.touchAction='none';
  const keyboardTarget=keyboard==='global'?window:canvas;
  on(canvas,'pointerdown',e=>{canvas.focus?.({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);previousX=e.clientX;previousY=e.clientY;if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
  on(canvas,'pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const dx=e.clientX-previousX,dy=e.clientY-previousY;if(mode==='outside'){if(pointers.size===2){let p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=T.MathUtils.clamp(distance+(pinch-d)*.14,48,140);pinch=d}else{theta-=dx*.005;phi=T.MathUtils.clamp(phi+dy*.004,.27,1.38)}}else turn(-dx*.0045,-dy*.004);previousX=e.clientX;previousY=e.clientY});
  for(let name of ['pointerup','pointercancel'])on(canvas,name,e=>{pointers.delete(e.pointerId);if(pointers.size){const p=[...pointers.values()][0];previousX=p.x;previousY=p.y}});
  on(canvas,'wheel',e=>{if(mode==='outside'){e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.045,48,140)}},{passive:false});
  if(keyboard!=='off')on(keyboardTarget,'keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable)return;if(e.code==='Escape'&&mode==='inside'){exterior();return}if(mode==='inside'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code)}});
  if(keyboard!=='off')on(keyboardTarget,'keyup',e=>keys.delete(e.code));
  const resetInput=()=>{keys.clear();moves.clear();pointers.clear()};on(window,'blur',resetInput);on(canvas,'blur',resetInput);
  function frame(now){if(disposed||paused)return;raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.045);last=now;
    if(mode==='outside'){camera.position.set(target.x+distance*Math.sin(phi)*Math.sin(theta),target.y+distance*Math.cos(phi),target.z+distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);if(frameOffset&&width>1000)camera.setViewOffset(width,height,-width*frameOffset,0,width,height);else camera.clearViewOffset()}
    else {if(transition){transition.t=Math.min(1,transition.t+dt/transition.duration);let t=transition.t;
        if(t<.62){let a=t/.62,s=a*a*(3-2*a);camera.position.lerpVectors(transition.start,transition.via,s);camera.lookAt(0,5,8)}else{let a=(t-.62)/.38,s=a*a*(3-2*a);camera.position.lerpVectors(transition.via,transition.end,s);camera.lookAt(0,4,0)}
        if(t>=1){transition=null;emit()}}
      else {const forward=Number(keys.has('KeyW')||keys.has('ArrowUp')||moves.has('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||moves.has('backward')),side=Number(keys.has('KeyD')||keys.has('ArrowRight')||moves.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||moves.has('left'));
        const norm=Math.max(1,Math.hypot(forward,side)),speed=dt*3.4,dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed/norm,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed/norm;
        if(dx||dz){if(!tryStep(position.x+dx,position.z+dz)){tryStep(position.x+dx,position.z);tryStep(position.x,position.z+dz)}}
        camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
    }building.update(dt);renderer.render(scene,camera);
  }
  lighting();frame(last);emit();
  function pause(){if(disposed||paused)return;paused=true;cancelAnimationFrame(raf);resetInput();emit()}
  function resume(){if(disposed||!paused)return;paused=false;last=performance.now();frame(last);emit()}
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();handlers.forEach(f=>f());building.dispose();sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove()}
  return {enter,exterior,setCutaway,setNight,setMove,turn,getState,pause,resume,dispose,scene,camera,building};
}
