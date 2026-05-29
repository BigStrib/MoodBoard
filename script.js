(function(){
'use strict';

let boardState=[], nextId=1, maxZ=1, snapToGrid=false, zoomLevel=1, panX=0, panY=0;
const GRID=20, MIN_Z=0.15, MAX_Z=4, CW=8000, CH=8000;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

const viewport=$('#canvasViewport'), workspace=$('#canvasWorkspace'), grid=$('#gridOverlay');
const dropOverlay=$('#dropZoneOverlay'), modalOv=$('#modalOverlay'), modalC=$('#modalContent');
const diagOv=$('#dialogOverlay'), toasts=$('#toastContainer');
const cpOv=$('#colorPickerOverlay'), cpSatC=$('#cpSatCanvas'), cpHueC=$('#cpHueCanvas');
const cpSatCur=$('#cpSatCursor'), cpHueCur=$('#cpHueCursor'), cpPrev=$('#cpPreview');
const cpHex=$('#cpHexInput'), cpR=$('#cpR'), cpG=$('#cpG'), cpB=$('#cpB');
const cpH=$('#cpH'), cpS=$('#cpS'), cpL=$('#cpL');
const satCtx=cpSatC.getContext('2d'), hueCtx=cpHueC.getContext('2d');

// ═══════ HELPERS ═══════
const gid=()=>nextId++;
function toast(m,t='info'){const e=document.createElement('div');e.className=`toast ${t}`;e.textContent=m;toasts.appendChild(e);setTimeout(()=>{e.classList.add('removing');setTimeout(()=>e.remove(),200)},2400)}
const snp=v=>snapToGrid?Math.round(v/GRID)*GRID:v;
function mCat(m){if(!m)return'other';m=m.toLowerCase();if(m.startsWith('image/')||/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(m))return'image';if(m.startsWith('video/')||/\.(mp4|webm|ogg|mov)$/i.test(m))return'video';if(m.startsWith('audio/')||/\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(m))return'audio';if(m==='application/pdf'||/\.pdf$/i.test(m))return'pdf';if(m.startsWith('text/')||/\.(txt|md|csv|json)$/i.test(m))return'text';return'other'}
function hSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
const f2d=f=>new Promise((r,j)=>{const a=new FileReader;a.onload=()=>r(a.result);a.onerror=j;a.readAsDataURL(f)});
const f2t=f=>new Promise((r,j)=>{const a=new FileReader;a.onload=()=>r(a.result);a.onerror=j;a.readAsText(f)});
const rOff=()=>Math.floor(Math.random()*80)-40;
const s2c=(sx,sy)=>({x:(sx-panX)/zoomLevel,y:(sy-panY)/zoomLevel});
function vCenter(){const w=viewport.clientWidth,h=viewport.clientHeight;return s2c(w/2,h/2)}
function applyTf(){workspace.style.transform=`translate(${panX}px,${panY}px) scale(${zoomLevel})`;$('#zoomLevel').textContent=Math.round(zoomLevel*100)+'%'}

// ═══════ CONFIRM DIALOG ═══════
function confirmAction(message, onConfirm){
    // Build overlay
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);animation:fadeIn .15s ease;';
    
    const box=document.createElement('div');
    box.style.cssText=`
        background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:0;width:340px;max-width:92vw;
        box-shadow:0 20px 60px rgba(0,0,0,.7);animation:dialogSlide .2s ease;overflow:hidden;
        font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;

    // Icon
    const iconWrap=document.createElement('div');
    iconWrap.style.cssText='display:flex;justify-content:center;padding:24px 24px 0;';
    const iconCircle=document.createElement('div');
    iconCircle.style.cssText='width:48px;height:48px;border-radius:50%;background:rgba(255,107,107,.1);display:flex;align-items:center;justify-content:center;';
    iconCircle.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    iconWrap.appendChild(iconCircle);
    box.appendChild(iconWrap);

    // Title
    const title=document.createElement('div');
    title.style.cssText='text-align:center;padding:14px 24px 0;font-size:15px;font-weight:700;color:#e8e8e8;';
    title.textContent='Confirm Delete';
    box.appendChild(title);

    // Message
    const msg=document.createElement('div');
    msg.style.cssText='text-align:center;padding:8px 24px 20px;font-size:13px;color:#888;line-height:1.5;';
    msg.textContent=message;
    box.appendChild(msg);

    // Buttons
    const btns=document.createElement('div');
    btns.style.cssText='display:flex;border-top:1px solid #222;';

    const cancelBtn=document.createElement('button');
    cancelBtn.style.cssText=`
        flex:1;padding:14px;border:none;background:transparent;color:#888;font-size:13px;
        font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit;
        border-right:1px solid #222;
    `;
    cancelBtn.textContent='Cancel';
    cancelBtn.addEventListener('mouseenter',()=>cancelBtn.style.background='#1a1a1a');
    cancelBtn.addEventListener('mouseleave',()=>cancelBtn.style.background='transparent');

    const confirmBtn=document.createElement('button');
    confirmBtn.style.cssText=`
        flex:1;padding:14px;border:none;background:transparent;color:#FF6B6B;font-size:13px;
        font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit;
    `;
    confirmBtn.textContent='Delete';
    confirmBtn.addEventListener('mouseenter',()=>confirmBtn.style.background='rgba(255,107,107,.08)');
    confirmBtn.addEventListener('mouseleave',()=>confirmBtn.style.background='transparent');

    function close(){overlay.style.opacity='0';overlay.style.transition='opacity .15s';setTimeout(()=>overlay.remove(),150)}

    cancelBtn.addEventListener('click',e=>{e.stopPropagation();close()});
    confirmBtn.addEventListener('click',e=>{e.stopPropagation();close();onConfirm()});
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});

    // Escape to cancel
    function escHandler(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',escHandler)}}
    document.addEventListener('keydown',escHandler);

    btns.appendChild(cancelBtn);btns.appendChild(confirmBtn);
    box.appendChild(btns);overlay.appendChild(box);document.body.appendChild(overlay);

    // Focus confirm for accessibility
    confirmBtn.focus();
}

function getElementLabel(data){
    switch(data.type){
        case'image':return'this image'+(data.label?' "'+data.label.substring(0,30)+'"':'');
        case'video':return'this video'+(data.label?' "'+data.label.substring(0,30)+'"':'');
        case'youtube':return'this YouTube video';
        case'audio':return'this audio track'+(data.label?' "'+data.label.substring(0,30)+'"':'');
        case'text':return'this text note'+(data.title?' "'+data.title.substring(0,30)+'"':'');
        case'palette':return'this color palette'+(data.label?' "'+data.label.substring(0,30)+'"':'');
        case'link':return'this link'+(data.title?' "'+data.title.substring(0,30)+'"':'');
        case'file':return'this file'+(data.fileName?' "'+data.fileName.substring(0,30)+'"':'');
        default:return'this element';
    }
}

// ═══════ YOUTUBE HELPERS ═══════
function extractYouTubeId(url){
    if(!url)return null;let m;
    m=url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    m=url.match(/youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];
    return null;
}
function getYouTubeEmbedUrl(id){return`https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`}
function getYouTubeThumbnail(id){return`https://img.youtube.com/vi/${id}/hqdefault.jpg`}

// ═══════ COLOR MATH ═══════
function hsv2rgb(h,s,v){let r,g,b;const i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)]}
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx===0?0:d/mx,mx]}
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;h*=360}return[Math.round(h),Math.round(s*100),Math.round(l*100)]}
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
const rgb2hex=(r,g,b)=>'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();

// ═══════ COLOR PICKER ═══════
let cpSt={h:0,s:1,v:1,cb:null,orig:'#FF0000'};
function drawHue(){const w=cpHueC.width,h=cpHueC.height;const g=hueCtx.createLinearGradient(0,0,w,0);for(let i=0;i<=6;i++){const[r,gg,b]=hsv2rgb(i*60,1,1);g.addColorStop(i/6,`rgb(${r},${gg},${b})`)}hueCtx.fillStyle=g;hueCtx.fillRect(0,0,w,h)}
function drawSat(){const w=cpSatC.width,h=cpSatC.height;const[r,g,b]=hsv2rgb(cpSt.h,1,1);satCtx.fillStyle=`rgb(${r},${g},${b})`;satCtx.fillRect(0,0,w,h);const wG=satCtx.createLinearGradient(0,0,w,0);wG.addColorStop(0,'#FFF');wG.addColorStop(1,'rgba(255,255,255,0)');satCtx.fillStyle=wG;satCtx.fillRect(0,0,w,h);const bG=satCtx.createLinearGradient(0,0,0,h);bG.addColorStop(0,'rgba(0,0,0,0)');bG.addColorStop(1,'#000');satCtx.fillStyle=bG;satCtx.fillRect(0,0,w,h)}
function cpUpdate(){const[r,g,b]=hsv2rgb(cpSt.h,cpSt.s,cpSt.v);const hx=rgb2hex(r,g,b);const[hh,ss,ll]=rgb2hsl(r,g,b);cpPrev.style.background=hx;cpHex.value=hx;cpR.value=r;cpG.value=g;cpB.value=b;cpH.value=Math.round(cpSt.h);cpS.value=ss;cpL.value=ll;cpSatCur.style.left=(cpSt.s*cpSatC.width)+'px';cpSatCur.style.top=((1-cpSt.v)*cpSatC.height)+'px';cpHueCur.style.left=(cpSt.h/360*cpHueC.width)+'px';drawSat()}
function openCP(init,cb){cpSt.cb=cb;cpSt.orig=init;const[r,g,b]=hex2rgb(init);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;drawHue();drawSat();cpUpdate();cpOv.classList.add('active')}
function closeCP(){cpOv.classList.remove('active');cpSt.cb=null}
$('#cpClose').addEventListener('click',closeCP);$('#cpCancel').addEventListener('click',closeCP);
$('#cpConfirm').addEventListener('click',()=>{const[r,g,b]=hsv2rgb(cpSt.h,cpSt.s,cpSt.v);if(cpSt.cb)cpSt.cb(rgb2hex(r,g,b));closeCP()});
cpOv.addEventListener('click',e=>{if(e.target===cpOv)closeCP()});

let satDrag=false;
function hSat(e){const r=cpSatC.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;cpSt.s=Math.max(0,Math.min(1,(cx-r.left)/r.width));cpSt.v=1-Math.max(0,Math.min(1,(cy-r.top)/r.height));cpUpdate()}
$('#cpSatWrap').addEventListener('mousedown',e=>{e.preventDefault();satDrag=true;hSat(e)});
$('#cpSatWrap').addEventListener('touchstart',e=>{e.preventDefault();satDrag=true;hSat(e)},{passive:false});
document.addEventListener('mousemove',e=>{if(satDrag)hSat(e)});document.addEventListener('mouseup',()=>satDrag=false);
document.addEventListener('touchmove',e=>{if(satDrag){e.preventDefault();hSat(e)}},{passive:false});document.addEventListener('touchend',()=>satDrag=false);

let hueDrag=false;
function hHue(e){const r=cpHueC.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;cpSt.h=Math.max(0,Math.min(1,(cx-r.left)/r.width))*360;cpUpdate()}
$('#cpHueWrap').addEventListener('mousedown',e=>{e.preventDefault();hueDrag=true;hHue(e)});
$('#cpHueWrap').addEventListener('touchstart',e=>{e.preventDefault();hueDrag=true;hHue(e)},{passive:false});
document.addEventListener('mousemove',e=>{if(hueDrag)hHue(e)});document.addEventListener('mouseup',()=>hueDrag=false);
document.addEventListener('touchmove',e=>{if(hueDrag){e.preventDefault();hHue(e)}},{passive:false});document.addEventListener('touchend',()=>hueDrag=false);

cpHex.addEventListener('input',()=>{const v=cpHex.value.trim();if(/^#[0-9a-fA-F]{6}$/.test(v)){const[r,g,b]=hex2rgb(v);const[h,s,vv]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=vv;cpUpdate()}});
function rgbInp(){const r=Math.min(255,parseInt(cpR.value)||0),g=Math.min(255,parseInt(cpG.value)||0),b=Math.min(255,parseInt(cpB.value)||0);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;cpUpdate()}
cpR.addEventListener('input',rgbInp);cpG.addEventListener('input',rgbInp);cpB.addEventListener('input',rgbInp);
function hslInp(){const h=parseInt(cpH.value)||0,s=(parseInt(cpS.value)||0)/100,l=(parseInt(cpL.value)||0)/100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};const r=Math.round(f(0)*255),g=Math.round(f(8)*255),b=Math.round(f(4)*255);const[hh,ss,vv]=rgb2hsv(r,g,b);cpSt.h=hh;cpSt.s=ss;cpSt.v=vv;cpUpdate()}
cpH.addEventListener('input',hslInp);cpS.addEventListener('input',hslInp);cpL.addEventListener('input',hslInp);
$$('.cp-preset').forEach(p=>p.addEventListener('click',()=>{const[r,g,b]=hex2rgb(p.dataset.color);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;cpUpdate()}));

// ═══════ STATE ═══════
function addEl(d){maxZ++;d.id=gid();d.z=maxZ;if(d.x==null||d.y==null){const c=vCenter();d.x=snp(c.x-(d.width||150)/2+rOff());d.y=snp(c.y-(d.height||100)/2+rOff())}if(!d.width){if(d.type==='image')d.width=280;if(d.type==='video'){d.width=320;d.height=200}if(d.type==='youtube'){d.width=360;d.height=215}if(d.type==='text')d.width=260;if(d.type==='link')d.width=240;if(d.type==='palette'){d.width=Math.max(180,(d.colors||[]).length*50+30);d.height=110}}boardState.push(d);renderEl(d);return d}

function rmEl(id){
    boardState=boardState.filter(e=>e.id!==id);
    const d=document.getElementById('el-'+id);
    // Stop any media
    if(d){
        d.querySelectorAll('video,audio').forEach(m=>{m.pause();m.currentTime=0});
        d.querySelectorAll('iframe').forEach(f=>f.src='');
        d.remove();
    }
    toast('Removed','info');
}

function confirmRemoveEl(id){
    const data=boardState.find(e=>e.id===id);
    if(!data){rmEl(id);return}
    const label=getElementLabel(data);
    confirmAction(`Are you sure you want to delete ${label}? This action cannot be undone.`,()=>rmEl(id));
}

function upEl(id,p){const e=boardState.find(x=>x.id===id);if(e)Object.assign(e,p)}
function toFront(id){maxZ++;upEl(id,{z:maxZ});const d=document.getElementById('el-'+id);if(d)d.style.zIndex=maxZ}

function clearAll(){
    // Stop all media first
    workspace.querySelectorAll('video,audio').forEach(m=>{m.pause();m.currentTime=0});
    workspace.querySelectorAll('iframe').forEach(f=>f.src='');
    boardState=[];nextId=1;maxZ=1;
    workspace.querySelectorAll('.board-element').forEach(e=>e.remove());
    toast('Cleared','info');
}

// ═══════ SVG ICONS ═══════
const IC={
    move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    expand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    dupe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    bg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" opacity=".3"/></svg>',
    fg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M9.5 4L6 16h2l1-3.5h6L16 16h2L14.5 4z"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>',
};

// ═══════ ACTION BUTTON BUILDER ═══════
function etBtn(icon,tip,fn,cls=''){
    const b=document.createElement('button');b.className='et-btn '+(cls||'');b.innerHTML=icon;
    const t=document.createElement('span');t.className='et-tip';t.textContent=tip;b.appendChild(t);
    b.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});
    b.addEventListener('click',e=>{e.stopPropagation();fn()});
    return b;
}

// ═══════ RENDER ═══════
function renderEl(data){
    const el=document.createElement('div');el.id='el-'+data.id;el.className='board-element';
    el.style.left=data.x+'px';el.style.top=data.y+'px';el.style.zIndex=data.z;
    if(data.width)el.style.width=data.width+'px';
    if(data.height)el.style.height=data.height+'px';

    const moveH=document.createElement('div');moveH.className='move-handle';moveH.innerHTML=IC.move;
    moveH.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault();startDrag(e,data.id)});
    moveH.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();startDrag(e,data.id)},{passive:false});
    el.appendChild(moveH);

    const tb=document.createElement('div');tb.className='element-toolbar';

    switch(data.type){
        case'image':{
            el.classList.add('element-image');
            const img=document.createElement('img');img.src=data.src;img.alt=data.label||'';img.draggable=false;
            img.onload=function(){if(!data._ratio){data._ratio=img.naturalWidth/img.naturalHeight;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}}};
            el.appendChild(img);
            tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.img,'Replace',()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{if(i.files[0]){const d=await f2d(i.files[0]);data.src=d;data._ratio=null;img.src=d;upEl(data.id,{src:d,_ratio:null});toast('Replaced','success')}};i.click()}));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
        case'video':{
            el.classList.add('element-video');
            const vid=document.createElement('video');vid.src=data.src;vid.preload='metadata';vid.muted=false;vid.loop=true;vid.playsInline=true;vid.draggable=false;
            vid.style.pointerEvents='none';
            el.appendChild(vid);
            const po=document.createElement('div');po.className='video-play-overlay';
            po.innerHTML='<svg viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
            po.style.pointerEvents='auto';po.style.cursor='pointer';
            po.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});
            po.addEventListener('click',e=>{
                e.stopPropagation();e.preventDefault();
                if(vid.paused){vid.style.pointerEvents='auto';vid.controls=true;vid.muted=false;vid.play();po.style.opacity='0';po.style.pointerEvents='none'}
            });
            el.appendChild(po);
            vid.addEventListener('pause',()=>{po.style.opacity='1';po.style.pointerEvents='auto';po.innerHTML='<svg viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>'});
            vid.addEventListener('play',()=>{po.style.opacity='0';po.style.pointerEvents='none'});
            vid.addEventListener('ended',()=>{po.style.opacity='1';po.style.pointerEvents='auto';vid.style.pointerEvents='none';vid.controls=false});
            vid.addEventListener('mousedown',e=>e.stopPropagation());
            vid.addEventListener('loadedmetadata',()=>{if(!data._ratio){data._ratio=vid.videoWidth/vid.videoHeight;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}}});
            tb.appendChild(etBtn(IC.expand,'Fullscreen',()=>{vid.pause();openModal(data.id)}));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>{vid.pause();confirmRemoveEl(data.id)},'et-danger'));
            break;
        }
        case'youtube':{
            el.classList.add('element-video');el.style.overflow='hidden';el.style.borderRadius='10px';el.style.background='#000';
            const thumb=document.createElement('div');
            thumb.style.cssText='position:absolute;inset:0;background-size:cover;background-position:center;cursor:pointer;z-index:2;';
            thumb.style.backgroundImage=`url(${getYouTubeThumbnail(data.youtubeId)})`;
            const playBtn=document.createElement('div');playBtn.className='video-play-overlay';
            playBtn.innerHTML='<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#FF0000"/><path d="M27 34l18-10-18-10z" fill="#FFF"/></svg>';
            playBtn.style.pointerEvents='auto';playBtn.style.cursor='pointer';playBtn.style.background='rgba(0,0,0,0.3)';
            thumb.appendChild(playBtn);el.appendChild(thumb);
            function activateYT(e){if(e){e.stopPropagation();e.preventDefault()}thumb.remove();const iframe=document.createElement('iframe');iframe.src=getYouTubeEmbedUrl(data.youtubeId)+'&autoplay=1';iframe.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;';iframe.setAttribute('allowfullscreen','');iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');iframe.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(iframe);el._ytIframe=iframe}
            playBtn.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});
            playBtn.addEventListener('click',activateYT);
            thumb.addEventListener('mousedown',e=>e.stopPropagation());
            thumb.addEventListener('click',activateYT);
            data._ratio=16/9;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}
            tb.appendChild(etBtn(IC.expand,'Fullscreen',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
        case'audio':{
            el.classList.add('element-audio');
            const ah=document.createElement('div');ah.className='audio-header';
            ah.innerHTML=`<div class="audio-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="audio-info"><div class="audio-title">${data.label||'Audio'}</div><div class="audio-subtitle">Audio</div></div>`;
            el.appendChild(ah);
            const aud=document.createElement('audio');aud.src=data.src;aud.controls=true;aud.preload='metadata';
            aud.addEventListener('mousedown',e=>e.stopPropagation());
            el.appendChild(aud);
            tb.appendChild(etBtn(IC.expand,'Expand',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>{aud.pause();confirmRemoveEl(data.id)},'et-danger'));
            break;
        }
        case'text':{
            el.classList.add('element-text');el.style.backgroundColor=data.bgColor||'#1e1e1e';
            const inner=document.createElement('div');inner.className='text-note-inner';
            const tEl=document.createElement('div');tEl.className='text-note-title';tEl.contentEditable='true';tEl.spellcheck=false;tEl.textContent=data.title||'';tEl.style.color=data.fgColor||'#e0e0e0';
            tEl.addEventListener('input',()=>upEl(data.id,{title:tEl.textContent}));
            tEl.addEventListener('mousedown',e=>e.stopPropagation());
            const bEl=document.createElement('div');bEl.className='text-note-body';bEl.contentEditable='true';bEl.spellcheck=false;bEl.textContent=data.content||'';bEl.style.color=data.fgColor||'#e0e0e0';
            bEl.addEventListener('input',()=>upEl(data.id,{content:bEl.textContent}));
            bEl.addEventListener('mousedown',e=>e.stopPropagation());
            inner.appendChild(tEl);inner.appendChild(bEl);el.appendChild(inner);
            tb.appendChild(etBtn(IC.bg,'Background',()=>openCP(data.bgColor||'#1e1e1e',h=>{data.bgColor=h;el.style.backgroundColor=h;upEl(data.id,{bgColor:h})})));
            tb.appendChild(etBtn(IC.fg,'Text Color',()=>openCP(data.fgColor||'#e0e0e0',h=>{data.fgColor=h;tEl.style.color=h;bEl.style.color=h;upEl(data.id,{fgColor:h})})));
            tb.appendChild(etBtn(IC.expand,'Expand',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
        case'palette':{
            el.classList.add('element-palette');
            buildPalette(el,data);
            tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
        case'link':{
            el.classList.add('element-link');
            const lr=document.createElement('div');lr.className='link-icon-row';
            lr.innerHTML='<div class="link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>';
            el.appendChild(lr);
            const lt=document.createElement('div');lt.className='link-title';lt.contentEditable='true';lt.spellcheck=false;lt.textContent=data.title||'';
            lt.addEventListener('input',()=>upEl(data.id,{title:lt.textContent}));lt.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(lt);
            const ld=document.createElement('div');ld.className='link-desc';ld.contentEditable='true';ld.spellcheck=false;ld.textContent=data.desc||'';
            ld.addEventListener('input',()=>upEl(data.id,{desc:ld.textContent}));ld.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(ld);
            const lu=document.createElement('div');lu.className='link-url-display';
            lu.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>${data.url||''}</span>`;
            lu.addEventListener('mousedown',e=>e.stopPropagation());
            lu.addEventListener('click',e=>{e.stopPropagation();if(data.url)window.open(data.url,'_blank')});el.appendChild(lu);
            tb.appendChild(etBtn(IC.edit,'Edit URL',()=>{const nUrl=prompt('Enter URL:',data.url||'');if(nUrl!==null){data.url=nUrl;upEl(data.id,{url:nUrl});lu.querySelector('span').textContent=nUrl;toast('Updated','success')}}));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
        case'file':{
            el.classList.add('element-file');
            const ext=(data.fileName||'').split('.').pop().toLowerCase();const cat=data.fileCategory||'other';
            const fr=document.createElement('div');fr.className='file-icon-row';
            const fi=document.createElement('div');fi.className='file-type-icon '+(cat==='pdf'?'pdf':cat==='text'?'txt':'other');fi.textContent=ext||'?';
            fr.appendChild(fi);const info=document.createElement('div');
            const fn=document.createElement('div');fn.className='file-name';fn.textContent=data.fileName||'File';info.appendChild(fn);
            if(data.fileSize){const fs=document.createElement('div');fs.className='file-size';fs.textContent=hSize(data.fileSize);info.appendChild(fs)}
            fr.appendChild(info);el.appendChild(fr);
            if(data.textPreview){const p=document.createElement('div');p.className='file-text-preview';p.textContent=data.textPreview.substring(0,300);el.appendChild(p)}
            tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>confirmRemoveEl(data.id),'et-danger'));
            break;
        }
    }

    el.appendChild(tb);
    const keepR=data.type==='image'||data.type==='video'||data.type==='youtube';
    el.appendChild(createResize(data.id,keepR,data._ratio||null));
    workspace.appendChild(el);
}

function buildPalette(el,data){
    el.querySelectorAll('.palette-header,.palette-swatches,.palette-add-swatch').forEach(c=>c.remove());
    const ph=document.createElement('div');ph.className='palette-header';ph.contentEditable='true';ph.spellcheck=false;ph.textContent=data.label||'Color Palette';
    ph.addEventListener('mousedown',e=>e.stopPropagation());
    ph.addEventListener('input',()=>{data.label=ph.textContent;upEl(data.id,{label:ph.textContent})});
    const sw=document.createElement('div');sw.className='palette-swatches';
    (data.colors||[]).forEach((c,i)=>{
        const s=document.createElement('div');s.className='palette-swatch';s.style.backgroundColor=c;
        const lb=document.createElement('span');lb.className='palette-swatch-label';lb.textContent=c.toUpperCase();s.appendChild(lb);
        const acts=document.createElement('div');acts.className='palette-swatch-actions';
        const eBtn=document.createElement('button');eBtn.className='swatch-action-btn';eBtn.textContent='✎';eBtn.title='Edit';
        eBtn.addEventListener('mousedown',e=>e.stopPropagation());
        eBtn.addEventListener('click',e=>{e.stopPropagation();openCP(c,hex=>{data.colors[i]=hex;s.style.backgroundColor=hex;lb.textContent=hex.toUpperCase();upEl(data.id,{colors:[...data.colors]})})});
        acts.appendChild(eBtn);
        if((data.colors||[]).length>1){
            const rBtn=document.createElement('button');rBtn.className='swatch-action-btn';rBtn.textContent='×';rBtn.title='Remove';
            rBtn.addEventListener('mousedown',e=>e.stopPropagation());
            rBtn.addEventListener('click',e=>{
                e.stopPropagation();
                confirmAction(`Remove color ${c.toUpperCase()} from this palette?`,()=>{
                    data.colors.splice(i,1);
                    upEl(data.id,{colors:[...data.colors]});
                    buildPalette(el,data);
                    toast('Color removed','info');
                });
            });
            acts.appendChild(rBtn);
        }
        s.appendChild(acts);
        s.addEventListener('click',e=>{if(e.target.closest('.swatch-action-btn'))return;e.stopPropagation();navigator.clipboard.writeText(c).then(()=>toast('Copied '+c,'success'))});
        sw.appendChild(s);
    });
    const addB=document.createElement('button');addB.className='palette-add-swatch';addB.textContent='+';addB.title='Add color';
    addB.addEventListener('mousedown',e=>e.stopPropagation());
    addB.addEventListener('click',e=>{e.stopPropagation();openCP('#888888',hex=>{data.colors.push(hex);upEl(data.id,{colors:[...data.colors]});buildPalette(el,data);const nw=Math.max(el.offsetWidth,data.colors.length*50+30);el.style.width=nw+'px';upEl(data.id,{width:nw})})});
    const mh=el.querySelector('.move-handle');
    if(mh&&mh.nextSibling){el.insertBefore(ph,mh.nextSibling);el.insertBefore(sw,ph.nextSibling);el.insertBefore(addB,sw.nextSibling)}
    else{el.appendChild(ph);el.appendChild(sw);el.appendChild(addB)}
}

function rebuildAll(){workspace.querySelectorAll('.board-element').forEach(e=>e.remove());if(boardState.length){maxZ=Math.max(...boardState.map(e=>e.z||1));nextId=Math.max(...boardState.map(e=>e.id||0))+1}boardState.forEach(d=>renderEl(d))}
function dupeEl(id){const s=boardState.find(e=>e.id===id);if(!s)return;const c=JSON.parse(JSON.stringify(s));c.x=(c.x||0)+30;c.y=(c.y||0)+30;delete c.id;delete c.z;addEl(c);toast('Duplicated','success')}

// ═══════ DRAG ═══════
let dragSt=null;
function startDrag(e,id){
    e.preventDefault();toFront(id);
    const dom=document.getElementById('el-'+id);const isT=e.type==='touchstart';
    const cx=isT?e.touches[0].clientX:e.clientX,cy=isT?e.touches[0].clientY:e.clientY;
    dragSt={id,dom,sx:cx,sy:cy,ex:parseFloat(dom.style.left)||0,ey:parseFloat(dom.style.top)||0,isT};
    dom.classList.add('dragging');
    if(isT){document.addEventListener('touchmove',onDrag,{passive:false});document.addEventListener('touchend',stopDrag)}
    else{document.addEventListener('mousemove',onDrag);document.addEventListener('mouseup',stopDrag)}
}
function onDrag(e){if(!dragSt)return;e.preventDefault();const cx=dragSt.isT?e.touches[0].clientX:e.clientX,cy=dragSt.isT?e.touches[0].clientY:e.clientY;let nx=dragSt.ex+(cx-dragSt.sx)/zoomLevel,ny=dragSt.ey+(cy-dragSt.sy)/zoomLevel;nx=snp(Math.max(0,nx));ny=snp(Math.max(0,ny));dragSt.dom.style.left=nx+'px';dragSt.dom.style.top=ny+'px';upEl(dragSt.id,{x:nx,y:ny})}
function stopDrag(){if(!dragSt)return;dragSt.dom.classList.remove('dragging');if(dragSt.isT){document.removeEventListener('touchmove',onDrag);document.removeEventListener('touchend',stopDrag)}else{document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',stopDrag)}dragSt=null}

// ═══════ RESIZE ═══════
let resSt=null;
function createResize(id,keep,ratio){const h=document.createElement('div');h.className='resize-handle';h.addEventListener('mousedown',e=>startRes(e,id,keep,ratio));h.addEventListener('touchstart',e=>startRes(e,id,keep,ratio),{passive:false});return h}
function startRes(e,id,keep,ratio){e.preventDefault();e.stopPropagation();const dom=document.getElementById('el-'+id);const isT=e.type==='touchstart';const cx=isT?e.touches[0].clientX:e.clientX,cy=isT?e.touches[0].clientY:e.clientY;const data=boardState.find(x=>x.id===id);const r=ratio||(data&&data._ratio)||(dom.offsetWidth/dom.offsetHeight);resSt={id,dom,sx:cx,sy:cy,sw:dom.offsetWidth,sh:dom.offsetHeight,isT,keep,ratio:r};if(isT){document.addEventListener('touchmove',onRes,{passive:false});document.addEventListener('touchend',stopRes)}else{document.addEventListener('mousemove',onRes);document.addEventListener('mouseup',stopRes)}}
function onRes(e){if(!resSt)return;e.preventDefault();const cx=resSt.isT?e.touches[0].clientX:e.clientX;const dx=(cx-resSt.sx)/zoomLevel;const cy=resSt.isT?e.touches[0].clientY:e.clientY;const dy=(cy-resSt.sy)/zoomLevel;let nw,nh;if(resSt.keep&&resSt.ratio){nw=Math.max(60,snp(resSt.sw+dx));nh=nw/resSt.ratio}else{nw=Math.max(60,snp(resSt.sw+dx));nh=Math.max(40,snp(resSt.sh+dy))}resSt.dom.style.width=nw+'px';resSt.dom.style.height=nh+'px';upEl(resSt.id,{width:nw,height:nh})}
function stopRes(){if(!resSt)return;if(resSt.isT){document.removeEventListener('touchmove',onRes);document.removeEventListener('touchend',stopRes)}else{document.removeEventListener('mousemove',onRes);document.removeEventListener('mouseup',stopRes)}resSt=null}

// ═══════ MODAL ═══════
function openModal(id){
    const d=boardState.find(e=>e.id===id);if(!d)return;toFront(id);modalC.innerHTML='';
    switch(d.type){
        case'image':{const i=document.createElement('img');i.src=d.src;modalC.appendChild(i);break}
        case'video':{const v=document.createElement('video');v.src=d.src;v.controls=true;v.autoplay=true;v.style.maxWidth='100%';v.style.maxHeight='85vh';v.style.borderRadius='10px';modalC.appendChild(v);break}
        case'youtube':{const w=document.createElement('div');w.style.cssText='width:80vw;max-width:960px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;';const iframe=document.createElement('iframe');iframe.src=getYouTubeEmbedUrl(d.youtubeId)+'&autoplay=1';iframe.style.cssText='width:100%;height:100%;border:none;';iframe.setAttribute('allowfullscreen','');iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');w.appendChild(iframe);modalC.appendChild(w);break}
        case'audio':{const a=document.createElement('audio');a.src=d.src;a.controls=true;a.autoplay=true;modalC.appendChild(a);break}
        case'text':{const w=document.createElement('div');w.className='modal-text';if(d.title){const h=document.createElement('h2');h.textContent=d.title;w.appendChild(h)}const p=document.createElement('p');p.textContent=d.content||'';w.appendChild(p);modalC.appendChild(w);break}
        case'palette':{const w=document.createElement('div');w.className='modal-palette';const h=document.createElement('h2');h.textContent=d.label||'Palette';w.appendChild(h);const sr=document.createElement('div');sr.className='modal-palette-swatches';(d.colors||[]).forEach(c=>{const s=document.createElement('div');s.className='modal-palette-swatch';s.style.backgroundColor=c;s.innerHTML=`<span>${c.toUpperCase()}</span>`;s.addEventListener('click',()=>navigator.clipboard.writeText(c).then(()=>toast('Copied '+c,'success')));sr.appendChild(s)});w.appendChild(sr);modalC.appendChild(w);break}
        case'link':{const w=document.createElement('div');w.className='modal-text';const h=document.createElement('h2');h.textContent=d.title||'Link';w.appendChild(h);const p=document.createElement('p');p.textContent=d.desc||'';w.appendChild(p);const a=document.createElement('p');a.innerHTML=`<a href="${d.url}" target="_blank" style="color:var(--accent2)">${d.url}</a>`;w.appendChild(a);modalC.appendChild(w);break}
        case'file':{const w=document.createElement('div');w.className='modal-text';const h=document.createElement('h2');h.textContent=d.fileName||'File';w.appendChild(h);const p=document.createElement('p');p.textContent=d.textPreview||'No preview.';if(!d.textPreview)p.style.color='var(--text-muted)';w.appendChild(p);modalC.appendChild(w);break}
    }
    modalOv.classList.add('active');
}
function closeMod(){modalOv.classList.remove('active');modalC.querySelectorAll('video,audio').forEach(m=>{m.pause();m.currentTime=0});modalC.querySelectorAll('iframe').forEach(f=>f.src='');modalC.innerHTML=''}
$('#modalClose').addEventListener('click',closeMod);
modalOv.addEventListener('click',e=>{if(e.target===modalOv)closeMod()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(cpOv.classList.contains('active'))closeCP();else if(modalOv.classList.contains('active'))closeMod();else if(diagOv.classList.contains('active'))closeDiags()}});

// ═══════ DIALOGS ═══════
function openDiag(id){diagOv.classList.add('active');$$('.dialog').forEach(d=>d.classList.remove('active'));document.getElementById(id)?.classList.add('active')}
function closeDiags(){diagOv.classList.remove('active');$$('.dialog').forEach(d=>d.classList.remove('active'))}
$$('[data-dialog]').forEach(b=>b.addEventListener('click',()=>closeDiags()));
diagOv.addEventListener('click',e=>{if(e.target===diagOv)closeDiags()});

// ═══════ TOOLBAR ═══════
$('#addTextBtn').addEventListener('click',()=>{addEl({type:'text',title:'',content:'',bgColor:'#1e1e1e',fgColor:'#e0e0e0',width:260,height:140});toast('Click to edit','success')});

const imgI=$('#imageFileInput');$('#addImageBtn').addEventListener('click',()=>imgI.click());
imgI.addEventListener('change',async()=>{for(const f of imgI.files){const d=await f2d(f);addEl({type:'image',src:d,label:f.name,width:280})}imgI.value='';toast('Added','success')});

const vidI=$('#videoFileInput');$('#addVideoBtn').addEventListener('click',()=>vidI.click());
vidI.addEventListener('change',async()=>{for(const f of vidI.files){const d=await f2d(f);addEl({type:'video',src:d,label:f.name,width:320,height:200})}vidI.value='';toast('Added','success')});

const audI=$('#audioFileInput');$('#addAudioBtn').addEventListener('click',()=>audI.click());
audI.addEventListener('change',async()=>{for(const f of audI.files){const d=await f2d(f);addEl({type:'audio',src:d,label:f.name})}audI.value='';toast('Added','success')});

$('#addColorBtn').addEventListener('click',()=>{$('#paletteName').value='';const b=$('#paletteBuilder');b.innerHTML='';['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7'].forEach(c=>addDSwatch(c));openDiag('colorDialog')});
function addDSwatch(clr='#888'){const b=$('#paletteBuilder');const w=document.createElement('div');w.className='palette-swatch-wrap';const s=document.createElement('div');s.className='palette-color-swatch';s.style.backgroundColor=clr;s.dataset.color=clr;s.addEventListener('click',()=>openCP(s.dataset.color,h=>{s.dataset.color=h;s.style.backgroundColor=h;lb.textContent=h.toUpperCase()}));const lb=document.createElement('span');lb.className='swatch-hex';lb.textContent=clr.toUpperCase();const rm=document.createElement('button');rm.className='remove-swatch-btn';rm.textContent='×';rm.addEventListener('click',e=>{e.stopPropagation();w.remove()});w.appendChild(s);w.appendChild(lb);w.appendChild(rm);b.appendChild(w)}
$('#addSwatchBtn').addEventListener('click',()=>addDSwatch());
$('#colorSubmit').addEventListener('click',()=>{const c=[];$$('#paletteBuilder .palette-color-swatch').forEach(s=>c.push(s.dataset.color));if(!c.length){toast('Add a color','error');return}addEl({type:'palette',label:$('#paletteName').value.trim()||'Color Palette',colors:c});closeDiags();toast('Palette added','success')});

$('#addUrlBtn').addEventListener('click',()=>{$('#urlInput').value='';$('#urlLabel').value='';$('#urlType').value='image';openDiag('urlDialog')});
$('#urlSubmit').addEventListener('click',()=>{
    const u=$('#urlInput').value.trim();if(!u){toast('Enter URL','error');return}
    const ytId=extractYouTubeId(u);
    if(ytId){addEl({type:'youtube',youtubeId:ytId,label:'YouTube Video',url:u,width:360,height:215});closeDiags();toast('YouTube added','success');return}
    const t=$('#urlType').value,l=$('#urlLabel').value.trim()||u.split('/').pop();
    if(t==='image')addEl({type:'image',src:u,label:l,width:280});
    else if(t==='video')addEl({type:'video',src:u,label:l,width:320,height:200});
    else addEl({type:'audio',src:u,label:l});
    closeDiags();toast('Added','success');
});

$('#addLinkBtn').addEventListener('click',()=>{$('#linkUrl').value='';$('#linkTitle').value='';$('#linkDesc').value='';openDiag('linkDialog')});
$('#linkSubmit').addEventListener('click',()=>{const u=$('#linkUrl').value.trim();if(!u){toast('Enter URL','error');return}addEl({type:'link',url:u,title:$('#linkTitle').value.trim()||'Link',desc:$('#linkDesc').value.trim()||'Click to visit',width:240});closeDiags();toast('Link added','success')});

const genI=$('#genericFileInput');$('#addFileBtn').addEventListener('click',()=>genI.click());
genI.addEventListener('change',async()=>{await procFiles(genI.files);genI.value=''});
async function procFiles(files){for(const f of files){const c=mCat(f.type||f.name);try{if(c==='image'){addEl({type:'image',src:await f2d(f),label:f.name,width:280})}else if(c==='video'){addEl({type:'video',src:await f2d(f),label:f.name,width:320,height:200})}else if(c==='audio'){addEl({type:'audio',src:await f2d(f),label:f.name})}else if(c==='text'){addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'text',textPreview:await f2t(f)})}else if(c==='pdf'){addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'pdf',textPreview:null})}else{addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'other',textPreview:null})}}catch(e){toast('Failed: '+f.name,'error')}}toast('Added','success')}

const snapB=$('#snapToggleBtn');snapB.addEventListener('click',()=>{snapToGrid=!snapToGrid;snapB.classList.toggle('active',snapToGrid);grid.classList.toggle('visible',snapToGrid);toast(snapToGrid?'Grid on':'Grid off','info')});

$('#exportBtn').addEventListener('click',()=>{
    const cleanState=boardState.map(e=>{const c={...e};delete c._ratio;return c});
    const d={version:1,ts:new Date().toISOString(),zoomLevel,panX,panY,elements:cleanState};
    const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);
    const a=document.createElement('a');a.href=u;a.download='moodboard-'+Date.now()+'.json';a.click();URL.revokeObjectURL(u);toast('Exported','success');
});

const impI=$('#importFileInput');$('#importBtn').addEventListener('click',()=>impI.click());
impI.addEventListener('change',async()=>{const f=impI.files[0];if(!f)return;try{const d=JSON.parse(await f2t(f));if(d.elements){boardState=d.elements;rebuildAll();if(d.zoomLevel)zoomLevel=d.zoomLevel;if(d.panX!=null)panX=d.panX;if(d.panY!=null)panY=d.panY;applyTf();toast('Imported','success')}else toast('Invalid','error')}catch(e){toast('Invalid JSON','error')}impI.value=''});

$('#resetViewBtn').addEventListener('click',()=>{zoomLevel=1;panX=-(CW/2-viewport.clientWidth/2);panY=-(CH/2-viewport.clientHeight/2);applyTf();toast('Reset','info')});

$('#clearBtn').addEventListener('click',()=>{
    if(!boardState.length){toast('Empty','info');return}
    confirmAction('Are you sure you want to clear the entire board? All elements will be permanently removed.',()=>clearAll());
});

// ═══════ ZOOM ═══════
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;const wx=(mx-panX)/zoomLevel,wy=(my-panY)/zoomLevel;const f=e.deltaY<0?1.08:1/1.08;const nz=Math.max(MIN_Z,Math.min(MAX_Z,zoomLevel*f));panX=mx-wx*nz;panY=my-wy*nz;zoomLevel=nz;applyTf()},{passive:false});

// ═══════ PAN ═══════
let panSt=null,spDown=false;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.closest('[contenteditable]')){e.preventDefault();spDown=true;viewport.style.cursor='grab'}});
document.addEventListener('keyup',e=>{if(e.code==='Space'){spDown=false;viewport.style.cursor=''}});

viewport.addEventListener('mousedown',e=>{const isC=e.target===viewport||e.target===workspace||e.target===grid;if(e.button===1||spDown||isC){e.preventDefault();panSt={sx:e.clientX,sy:e.clientY,px:panX,py:panY};viewport.style.cursor='grabbing'}});
document.addEventListener('mousemove',e=>{if(!panSt)return;panX=panSt.px+(e.clientX-panSt.sx);panY=panSt.py+(e.clientY-panSt.sy);applyTf()});
document.addEventListener('mouseup',()=>{if(panSt){panSt=null;viewport.style.cursor=spDown?'grab':''}});

let tPan=null,tDist=null;
viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){e.preventDefault();const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;tPan={sx:mx,sy:my,px:panX,py:panY};tDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}},{passive:false});
viewport.addEventListener('touchmove',e=>{if(e.touches.length===2&&tPan){e.preventDefault();const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;panX=tPan.px+(mx-tPan.sx);panY=tPan.py+(my-tPan.sy);const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(tDist){const f=d/tDist;const r=viewport.getBoundingClientRect();const cx=mx-r.left,cy=my-r.top;const wx=(cx-panX)/zoomLevel,wy=(cy-panY)/zoomLevel;const nz=Math.max(MIN_Z,Math.min(MAX_Z,zoomLevel*f));panX=cx-wx*nz;panY=cy-wy*nz;zoomLevel=nz}tDist=d;applyTf()}},{passive:false});
viewport.addEventListener('touchend',e=>{if(e.touches.length<2){tPan=null;tDist=null}});
viewport.addEventListener('contextmenu',e=>e.preventDefault());

// ═══════ DROP FILES ═══════
let dCtr=0;
document.addEventListener('dragenter',e=>{e.preventDefault();dCtr++;if(dCtr===1)dropOverlay.classList.add('active')});
document.addEventListener('dragleave',e=>{e.preventDefault();dCtr--;if(dCtr<=0){dCtr=0;dropOverlay.classList.remove('active')}});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',async e=>{e.preventDefault();dCtr=0;dropOverlay.classList.remove('active');if(e.dataTransfer.files.length)await procFiles(e.dataTransfer.files)});

// ═══════ SHORTCUTS ═══════
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('#exportBtn').click()}if((e.ctrlKey||e.metaKey)&&e.key==='o'){e.preventDefault();$('#importBtn').click()}});

// ═══════ INIT ═══════
panX=-(CW/2-window.innerWidth/2);panY=-(CH/2-window.innerHeight/2);applyTf();drawHue();
})();