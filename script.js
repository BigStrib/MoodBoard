(function(){
'use strict';

let boardState=[],nextId=1,maxZ=1,snapToGrid=false,zoomLevel=1,panX=0,panY=0;
const GRID=20,MIN_Z=0.15,MAX_Z=4,CW=8000,CH=8000;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const viewport=$('#canvasViewport'),workspace=$('#canvasWorkspace'),grid=$('#gridOverlay');
const dropOverlay=$('#dropZoneOverlay'),modalOv=$('#modalOverlay'),modalC=$('#modalContent');
const diagOv=$('#dialogOverlay'),toasts=$('#toastContainer');
const cpOv=$('#colorPickerOverlay'),cpSatC=$('#cpSatCanvas'),cpHueC=$('#cpHueCanvas');
const cpSatCur=$('#cpSatCursor'),cpHueCur=$('#cpHueCursor'),cpPrev=$('#cpPreview');
const cpHex=$('#cpHexInput'),cpR=$('#cpR'),cpG=$('#cpG'),cpB=$('#cpB'),cpHi=$('#cpH'),cpSi=$('#cpS'),cpLi=$('#cpL');
const satCtx=cpSatC.getContext('2d'),hueCtx=cpHueC.getContext('2d');
const gid=()=>nextId++;
function toast(m,t='info'){const e=document.createElement('div');e.className=`toast ${t}`;e.textContent=m;toasts.appendChild(e);setTimeout(()=>{e.classList.add('removing');setTimeout(()=>e.remove(),200)},2400)}
const snp=v=>snapToGrid?Math.round(v/GRID)*GRID:v;
function mCat(m){if(!m)return'other';m=m.toLowerCase();if(m.startsWith('image/')||/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(m))return'image';if(m.startsWith('video/')||/\.(mp4|webm|ogg|mov)$/i.test(m))return'video';if(m.startsWith('audio/')||/\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(m))return'audio';if(m==='application/pdf'||/\.pdf$/i.test(m))return'pdf';if(m.startsWith('text/')||/\.(txt|md|csv|json|xml|html|css|js|ts|py|rb|java|c|cpp|h|php|sh|yaml|yml)$/i.test(m))return'text';return'other'}
function hSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
const f2d=f=>new Promise((r,j)=>{const a=new FileReader;a.onload=()=>r(a.result);a.onerror=j;a.readAsDataURL(f)});
const f2t=f=>new Promise((r,j)=>{const a=new FileReader;a.onload=()=>r(a.result);a.onerror=j;a.readAsText(f)});
const rOff=()=>Math.floor(Math.random()*80)-40;
const s2c=(sx,sy)=>({x:(sx-panX)/zoomLevel,y:(sy-panY)/zoomLevel});
function vCenter(){return s2c(viewport.clientWidth/2,viewport.clientHeight/2)}
function applyTf(){workspace.style.transform=`translate(${panX}px,${panY}px) scale(${zoomLevel})`;$('#zoomLevel').textContent=Math.round(zoomLevel*100)+'%'}
function isEditable(el){if(!el)return false;const t=el.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||el.isContentEditable||!!el.closest?.('[contenteditable="true"]')}
function escH(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function stopSpace(el){el.addEventListener('keydown',e=>{if(e.code==='Space')e.stopPropagation()})}

// ═══════ GOOGLE FONTS — FULL LIBRARY ═══════
let allFonts=[],fontsLoaded=false,selectedFont=null,fontDisplayCount=20,currentFontResults=[],activeCat='all';
const loadedFontFamilies=new Set(['Inter']);
const GFONT_URL='https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity';

async function fetchAllGoogleFonts(){
    if(fontsLoaded)return;
    // Method 1: Try fetching from Google Fonts Developer API (no key — uses CORS proxy or direct)
    // Method 2: Use the curated list from Google Fonts metadata endpoint
    try{
        // Google Fonts metadata (no API key needed)
        const r=await fetch('https://fonts.google.com/metadata/fonts');
        const text=await r.text();
        // The metadata endpoint returns a JSON with a leading )]}' prefix
        const clean=text.replace(/^\)\]\}'\n/,'');
        const data=JSON.parse(clean);
        if(data.familyMetadataList){
            allFonts=data.familyMetadataList.map(f=>({
                family:f.family,
                category:(f.category||'sans-serif').toLowerCase().replace('_',' ').replace('sans serif','sans-serif'),
            }));
            fontsLoaded=true;
            $('#fontCount').textContent=allFonts.length+' fonts';
            return;
        }
    }catch(e){console.log('Metadata fetch failed, trying backup...')}

    // Backup: hardcoded comprehensive list
    const families=`Roboto,Open Sans,Noto Sans,Lato,Montserrat,Poppins,Roboto Condensed,Inter,Oswald,Raleway,Nunito,Nunito Sans,Ubuntu,Rubik,Work Sans,Karla,Quicksand,Mulish,Barlow,DM Sans,Manrope,Josefin Sans,Archivo,Archivo Black,Cabin,Outfit,Overpass,Sora,Space Grotesk,Figtree,Plus Jakarta Sans,Red Hat Display,Exo 2,Titillium Web,Kanit,Teko,Signika,Urbanist,Lexend,Albert Sans,Noto Sans JP,Noto Sans KR,Source Sans 3,Hind,Mukta,Oxygen,Asap,Dosis,Libre Franklin,PT Sans,Jost,Fira Sans,IBM Plex Sans,Be Vietnam Pro,Maven Pro,Encode Sans,Nanum Gothic,Sarabun,Public Sans,Yanone Kaffeesatz,Assistant,Heebo,Prompt,Cairo,Chakra Petch,Catamaran,Abel,Gudea,Questrial,Rajdhani,Varela Round,Cantarell,Arimo,Didact Gothic,Hind Siliguri,Saira,Pathway Gothic One,Chivo,BioRhyme,Eczar,Advent Pro,Readex Pro,Wix Madefor Display,Onest,Geist,Instrument Sans,Playfair Display,Merriweather,Lora,PT Serif,Noto Serif,Libre Baskerville,Bitter,Crimson Text,EB Garamond,Cormorant Garamond,Zilla Slab,Spectral,Old Standard TT,Arvo,Cardo,Vollkorn,DM Serif Display,DM Serif Text,Fraunces,Brygada 1918,Cormorant,Gelasio,Literata,Source Serif 4,Noto Serif JP,Noticia Text,Slabo 27px,Domine,Frank Ruhl Libre,Yrsa,Bree Serif,Copse,Aleo,Faustina,Tinos,Amiri,Newsreader,Mate,Bodoni Moda,Instrument Serif,Young Serif,Fira Code,Source Code Pro,JetBrains Mono,Roboto Mono,Inconsolata,Space Mono,IBM Plex Mono,Ubuntu Mono,Fira Mono,Red Hat Mono,Anonymous Pro,Cousine,PT Mono,Share Tech Mono,Overpass Mono,Major Mono Display,Azeret Mono,Martian Mono,Geist Mono,Dancing Script,Pacifico,Caveat,Satisfy,Permanent Marker,Kalam,Indie Flower,Sacramento,Great Vibes,Shadows Into Light,Amatic SC,Architects Daughter,Patrick Hand,Handlee,Gloria Hallelujah,Rock Salt,Yellowtail,Cookie,Tangerine,Homemade Apple,Reenie Beanie,Itim,Covered By Your Grace,Pangolin,Sue Ellen Francisco,Sriracha,Mali,Charm,Nothing You Could Do,Marck Script,La Belle Aurore,Euphoria Script,Rouge Script,Mrs Saint Delafield,Allura,Alex Brush,Parisienne,Damion,Courgette,Leckerli One,Niconne,Berkshire Swash,Mr Dafoe,Herr Von Muellerhoff,Aguafina Script,Monsieur La Doulaise,Bebas Neue,Abril Fatface,Righteous,Alfa Slab One,Lobster,Comfortaa,Fredoka,Bungee,Passion One,Lilita One,Chewy,Concert One,Bangers,Bowlby One SC,Russo One,Black Ops One,Bungee Shade,Press Start 2P,Monoton,Rubik Mono One,Paytone One,Secular One,Fugaz One,Carter One,Luckiest Guy,Boogaloo,Coda,Dela Gothic One,Ultra,Titan One,Yeseva One,Chango,Freckle Face,Rampart One,Modak,Faster One,Emblema One,Plaster,Lacquer,Smokum,Flavors,Eater,Butcherman,Metal Mania,Creepster,Nosifer,Sancreek,Caesar Dressing,Jolly Lodger,Rye,Pirata One,Trade Winds,Almendra Display,Diplomata SC,Henny Penny,Macondo Swash Caps,MedievalSharp,UnifrakturMaguntia`;
    const cats={};
    'Roboto,Open Sans,Noto Sans,Lato,Montserrat,Poppins,Roboto Condensed,Inter,Oswald,Raleway,Nunito,Nunito Sans,Ubuntu,Rubik,Work Sans,Karla,Quicksand,Mulish,Barlow,DM Sans,Manrope,Josefin Sans,Archivo,Archivo Black,Cabin,Outfit,Overpass,Sora,Space Grotesk,Figtree,Plus Jakarta Sans,Red Hat Display,Exo 2,Titillium Web,Kanit,Teko,Signika,Urbanist,Lexend,Albert Sans,Noto Sans JP,Noto Sans KR,Source Sans 3,Hind,Mukta,Oxygen,Asap,Dosis,Libre Franklin,PT Sans,Jost,Fira Sans,IBM Plex Sans,Be Vietnam Pro,Maven Pro,Encode Sans,Nanum Gothic,Sarabun,Public Sans,Yanone Kaffeesatz,Assistant,Heebo,Prompt,Cairo,Chakra Petch,Catamaran,Abel,Gudea,Questrial,Rajdhani,Varela Round,Cantarell,Arimo,Didact Gothic,Hind Siliguri,Saira,Pathway Gothic One,Chivo,BioRhyme,Eczar,Advent Pro,Readex Pro,Wix Madefor Display,Onest,Geist,Instrument Sans'.split(',').forEach(f=>cats[f.trim()]='sans-serif');
    'Playfair Display,Merriweather,Lora,PT Serif,Noto Serif,Libre Baskerville,Bitter,Crimson Text,EB Garamond,Cormorant Garamond,Zilla Slab,Spectral,Old Standard TT,Arvo,Cardo,Vollkorn,DM Serif Display,DM Serif Text,Fraunces,Brygada 1918,Cormorant,Gelasio,Literata,Source Serif 4,Noto Serif JP,Noticia Text,Slabo 27px,Domine,Frank Ruhl Libre,Yrsa,Bree Serif,Copse,Aleo,Faustina,Tinos,Amiri,Newsreader,Mate,Bodoni Moda,Instrument Serif,Young Serif'.split(',').forEach(f=>cats[f.trim()]='serif');
    'Fira Code,Source Code Pro,JetBrains Mono,Roboto Mono,Inconsolata,Space Mono,IBM Plex Mono,Ubuntu Mono,Fira Mono,Red Hat Mono,Anonymous Pro,Cousine,PT Mono,Share Tech Mono,Overpass Mono,Major Mono Display,Azeret Mono,Martian Mono,Geist Mono'.split(',').forEach(f=>cats[f.trim()]='monospace');
    'Dancing Script,Pacifico,Caveat,Satisfy,Permanent Marker,Kalam,Indie Flower,Sacramento,Great Vibes,Shadows Into Light,Amatic SC,Architects Daughter,Patrick Hand,Handlee,Gloria Hallelujah,Rock Salt,Yellowtail,Cookie,Tangerine,Homemade Apple,Reenie Beanie,Itim,Covered By Your Grace,Pangolin,Sue Ellen Francisco,Sriracha,Mali,Charm,Nothing You Could Do,Marck Script,La Belle Aurore,Euphoria Script,Rouge Script,Mrs Saint Delafield,Allura,Alex Brush,Parisienne,Damion,Courgette,Leckerli One,Niconne,Berkshire Swash,Mr Dafoe,Herr Von Muellerhoff,Aguafina Script,Monsieur La Doulaise'.split(',').forEach(f=>cats[f.trim()]='handwriting');
    allFonts=families.split(',').map(f=>{const fam=f.trim();return{family:fam,category:cats[fam]||'display'}});
    fontsLoaded=true;
    $('#fontCount').textContent=allFonts.length+' fonts';
}

function loadGoogleFont(family){
    if(loadedFontFamilies.has(family))return;
    loadedFontFamilies.add(family);
    const link=document.createElement('link');link.rel='stylesheet';
    link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
}

function filterFonts(query,cat){
    let results=allFonts;
    if(cat&&cat!=='all')results=results.filter(f=>f.category===cat);
    if(query.trim()){const q=query.toLowerCase();results=results.filter(f=>f.family.toLowerCase().includes(q))}
    return results;
}

function renderFontResults(fonts,previewText,count){
    const container=$('#fontResults');container.innerHTML='';
    if(!fonts.length){container.innerHTML='<div class="font-loading">No fonts found</div>';return}
    const visible=fonts.slice(0,count);
    visible.forEach(f=>{
        loadGoogleFont(f.family);
        const item=document.createElement('div');
        item.className='font-item'+(selectedFont?.family===f.family?' selected':'');
        const nameDiv=document.createElement('div');nameDiv.className='font-item-name';nameDiv.textContent=f.family+' ';
        const badge=document.createElement('span');badge.className='font-cat-badge';badge.textContent=f.category;
        nameDiv.appendChild(badge);item.appendChild(nameDiv);
        const prev=document.createElement('div');prev.className='font-item-preview';
        prev.style.fontFamily=`"${f.family}",${f.category}`;
        prev.textContent=previewText||'The quick brown fox jumps over the lazy dog';
        item.appendChild(prev);
        item.addEventListener('click',()=>{
            selectedFont=f;container.querySelectorAll('.font-item').forEach(i=>i.classList.remove('selected'));
            item.classList.add('selected');$('#fontSubmit').disabled=false;
        });
        container.appendChild(item);
    });
    if(fonts.length>count){
        const more=document.createElement('div');
        more.style.cssText='padding:14px;text-align:center;cursor:pointer;color:#6C63FF;font-size:12px;font-weight:600;transition:background .15s;border-top:1px solid #222;user-select:none;';
        more.textContent=`Show 20 more (${fonts.length-count} remaining)`;
        more.addEventListener('mouseenter',()=>more.style.background='rgba(108,99,255,.06)');
        more.addEventListener('mouseleave',()=>more.style.background='transparent');
        more.addEventListener('click',()=>{
            fontDisplayCount=count+20;
            renderFontResults(currentFontResults,$('#fontPreviewText').value||'The quick brown fox jumps over the lazy dog',fontDisplayCount);
            $('.font-results-wrap').scrollTop=$('.font-results-wrap').scrollHeight;
        });
        container.appendChild(more);
    }
}

function refreshFontList(){
    fontDisplayCount=20;
    const q=$('#fontSearch').value;
    currentFontResults=filterFonts(q,activeCat);
    renderFontResults(currentFontResults,$('#fontPreviewText').value||'The quick brown fox jumps over the lazy dog',fontDisplayCount);
}

$('#addFontBtn').addEventListener('click',async()=>{
    selectedFont=null;$('#fontSubmit').disabled=true;$('#fontSearch').value='';
    $('#fontPreviewText').value='The quick brown fox jumps over the lazy dog';
    $('#fontSizeSlider').value=32;$('#fontSizeVal').textContent='32';
    activeCat='all';$$('.fcf-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat==='all'));
    fontDisplayCount=20;$('#fontResults').innerHTML='<div class="font-loading">Loading all Google Fonts...</div>';
    openDiag('fontDialog');
    await fetchAllGoogleFonts();
    currentFontResults=allFonts;
    renderFontResults(currentFontResults,'The quick brown fox jumps over the lazy dog',fontDisplayCount);
});

let fontSearchTimer=null;
$('#fontSearch').addEventListener('input',()=>{clearTimeout(fontSearchTimer);fontSearchTimer=setTimeout(refreshFontList,200)});
stopSpace($('#fontSearch'));
$('#fontPreviewText').addEventListener('input',()=>{const txt=$('#fontPreviewText').value||'The quick brown fox jumps over the lazy dog';$$('#fontResults .font-item-preview').forEach(p=>p.textContent=txt)});
stopSpace($('#fontPreviewText'));
$('#fontSizeSlider').addEventListener('input',()=>{$('#fontSizeVal').textContent=$('#fontSizeSlider').value});

$$('.fcf-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        activeCat=btn.dataset.cat;
        $$('.fcf-btn').forEach(b=>b.classList.toggle('active',b===btn));
        refreshFontList();
    });
});

$('#fontSubmit').addEventListener('click',()=>{
    if(!selectedFont)return;
    loadGoogleFont(selectedFont.family);
    addEl({type:'font',fontFamily:selectedFont.family,fontCategory:selectedFont.category||'sans-serif',
        fontSize:parseInt($('#fontSizeSlider').value)||32,
        content:$('#fontPreviewText').value||'The quick brown fox jumps over the lazy dog',
        bgColor:'#1e1e1e',fgColor:'#e0e0e0',width:340,height:160});
    closeDiags();toast(`Font "${selectedFont.family}" added`,'success');
});

// ═══════ FONT SIZE POPUP ═══════
const fspOv=$('#fontSizePopupOverlay'),fspSlider=$('#fspSlider'),fspValue=$('#fspValue'),fspInput=$('#fspInput'),fspPreview=$('#fspPreview');
let fspData=null,fspBody=null,fspOrig=32;
function openFSP(data,bodyEl){
    fspData=data;fspBody=bodyEl;fspOrig=data.fontSize||32;
    const sz=data.fontSize||32;fspSlider.value=sz;fspInput.value=sz;fspValue.textContent=sz+'px';
    fspPreview.style.fontFamily=`"${data.fontFamily}",${data.fontCategory||'sans-serif'}`;
    fspPreview.style.fontSize=sz+'px';
    fspPreview.textContent=data.content?data.content.substring(0,30):'Aa';
    $$('#fspPresets .fsp-preset').forEach(p=>p.classList.toggle('active',parseInt(p.dataset.size)===sz));
    fspOv.classList.add('active');
}
function closeFSP(){fspOv.classList.remove('active');fspData=null;fspBody=null}
function setFSPSize(sz){
    sz=Math.max(8,Math.min(200,sz));fspSlider.value=Math.min(sz,120);fspInput.value=sz;
    fspValue.textContent=sz+'px';fspPreview.style.fontSize=sz+'px';
    $$('#fspPresets .fsp-preset').forEach(p=>p.classList.toggle('active',parseInt(p.dataset.size)===sz));
    if(fspBody)fspBody.style.fontSize=sz+'px';
}
fspSlider.addEventListener('input',()=>setFSPSize(parseInt(fspSlider.value)));
fspInput.addEventListener('input',()=>{const v=parseInt(fspInput.value);if(v>=8)setFSPSize(v)});
stopSpace(fspInput);
$$('#fspPresets .fsp-preset').forEach(p=>p.addEventListener('click',()=>setFSPSize(parseInt(p.dataset.size))));
$('#fspClose').onclick=$('#fspCancel').onclick=()=>{if(fspBody)fspBody.style.fontSize=fspOrig+'px';closeFSP()};
$('#fspApply').onclick=()=>{if(fspData&&fspBody){const sz=parseInt(fspInput.value)||32;fspData.fontSize=sz;fspBody.style.fontSize=sz+'px';upEl(fspData.id,{fontSize:sz});toast('Size updated','success')}closeFSP()};
fspOv.addEventListener('click',e=>{if(e.target===fspOv){if(fspBody)fspBody.style.fontSize=fspOrig+'px';closeFSP()}});

// ═══════ CONFIRM ═══════
function confirmAction(msg,fn){
    const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);';
    ov.innerHTML=`<div style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;width:340px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.7);animation:dialogSlide .2s ease;overflow:hidden;font-family:Inter,sans-serif"><div style="display:flex;justify-content:center;padding:24px 24px 0"><div style="width:48px;height:48px;border-radius:50%;background:rgba(255,107,107,.1);display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div></div><div style="text-align:center;padding:14px 24px 0;font-size:15px;font-weight:700;color:#e8e8e8">Confirm Delete</div><div style="text-align:center;padding:8px 24px 20px;font-size:13px;color:#888;line-height:1.5">${msg}</div><div id="_cfbtns" style="display:flex;border-top:1px solid #222"></div></div>`;
    const btns=ov.querySelector('#_cfbtns');
    const cb=document.createElement('button');cb.style.cssText='flex:1;padding:14px;border:none;background:transparent;color:#888;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-right:1px solid #222;';cb.textContent='Cancel';
    const db=document.createElement('button');db.style.cssText='flex:1;padding:14px;border:none;background:transparent;color:#FF6B6B;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';db.textContent='Delete';
    function close(){ov.style.opacity='0';ov.style.transition='opacity .15s';setTimeout(()=>ov.remove(),150)}
    cb.onclick=e=>{e.stopPropagation();close()};db.onclick=e=>{e.stopPropagation();close();fn()};
    ov.onclick=e=>{if(e.target===ov)close()};btns.appendChild(cb);btns.appendChild(db);document.body.appendChild(ov);db.focus();
}
function getElLabel(d){const n=s=>(s||'').substring(0,30);switch(d.type){case'image':return'this image'+(d.label?' "'+n(d.label)+'"':'');case'video':return'this video'+(d.label?' "'+n(d.label)+'"':'');case'youtube':return'this YouTube video';case'audio':return'this audio'+(d.label?' "'+n(d.label)+'"':'');case'text':return'this text note'+(d.title?' "'+n(d.title)+'"':'');case'font':return'font card "'+n(d.fontFamily)+'"';case'palette':return'this palette'+(d.label?' "'+n(d.label)+'"':'');case'link':return'this link'+(d.title?' "'+n(d.title)+'"':'');case'file':return'this file'+(d.fileName?' "'+n(d.fileName)+'"':'');default:return'this element'}}

// ═══════ YOUTUBE ═══════
function ytId(u){if(!u)return null;let m;m=u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];m=u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);if(m)return m[1];m=u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];m=u.match(/youtube\.com\/(v|shorts|live)\/([a-zA-Z0-9_-]{11})/);if(m)return m[2];m=u.match(/youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/);if(m)return m[1];return null}
const ytE=id=>`https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`,ytT=id=>`https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// ═══════ COLOR ═══════
function hsv2rgb(h,s,v){let r,g,b;const i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;default:r=v;g=p;b=q}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)]}
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx===0?0:d/mx,mx]}
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;h*=360}return[Math.round(h),Math.round(s*100),Math.round(l*100)]}
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
const rgb2hex=(r,g,b)=>'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
let cpSt={h:0,s:1,v:1,cb:null};
function drawHue(){const w=cpHueC.width,h=cpHueC.height;const g=hueCtx.createLinearGradient(0,0,w,0);for(let i=0;i<=6;i++){const[r,gg,b]=hsv2rgb(i*60,1,1);g.addColorStop(i/6,`rgb(${r},${gg},${b})`)}hueCtx.fillStyle=g;hueCtx.fillRect(0,0,w,h)}
function drawSat(){const w=cpSatC.width,h=cpSatC.height;const[r,g,b]=hsv2rgb(cpSt.h,1,1);satCtx.fillStyle=`rgb(${r},${g},${b})`;satCtx.fillRect(0,0,w,h);let gr=satCtx.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#FFF');gr.addColorStop(1,'rgba(255,255,255,0)');satCtx.fillStyle=gr;satCtx.fillRect(0,0,w,h);gr=satCtx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');satCtx.fillStyle=gr;satCtx.fillRect(0,0,w,h)}
function cpUp(){const[r,g,b]=hsv2rgb(cpSt.h,cpSt.s,cpSt.v);const hx=rgb2hex(r,g,b);const[,ss,ll]=rgb2hsl(r,g,b);cpPrev.style.background=hx;cpHex.value=hx;cpR.value=r;cpG.value=g;cpB.value=b;cpHi.value=Math.round(cpSt.h);cpSi.value=ss;cpLi.value=ll;cpSatCur.style.left=(cpSt.s*cpSatC.width)+'px';cpSatCur.style.top=((1-cpSt.v)*cpSatC.height)+'px';cpHueCur.style.left=(cpSt.h/360*cpHueC.width)+'px';drawSat()}
function openCP(init,cb){cpSt.cb=cb;const[r,g,b]=hex2rgb(init);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;drawHue();cpUp();cpOv.classList.add('active')}
function closeCP(){cpOv.classList.remove('active');cpSt.cb=null}
$('#cpClose').onclick=$('#cpCancel').onclick=closeCP;
$('#cpConfirm').onclick=()=>{const[r,g,b]=hsv2rgb(cpSt.h,cpSt.s,cpSt.v);if(cpSt.cb)cpSt.cb(rgb2hex(r,g,b));closeCP()};
cpOv.onclick=e=>{if(e.target===cpOv)closeCP()};
let satD=false;function hSat(e){const r=cpSatC.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX,cy=e.touches?e.touches[0].clientY:e.clientY;cpSt.s=Math.max(0,Math.min(1,(cx-r.left)/r.width));cpSt.v=1-Math.max(0,Math.min(1,(cy-r.top)/r.height));cpUp()}
$('#cpSatWrap').addEventListener('mousedown',e=>{e.preventDefault();satD=true;hSat(e)});$('#cpSatWrap').addEventListener('touchstart',e=>{e.preventDefault();satD=true;hSat(e)},{passive:false});
document.addEventListener('mousemove',e=>{if(satD)hSat(e)});document.addEventListener('mouseup',()=>satD=false);
document.addEventListener('touchmove',e=>{if(satD){e.preventDefault();hSat(e)}},{passive:false});document.addEventListener('touchend',()=>satD=false);
let hueD=false;function hHu(e){const r=cpHueC.getBoundingClientRect();cpSt.h=Math.max(0,Math.min(1,(e.touches?e.touches[0].clientX:e.clientX-r.left)/r.width))*360;cpUp()}
$('#cpHueWrap').addEventListener('mousedown',e=>{e.preventDefault();hueD=true;hHu(e)});$('#cpHueWrap').addEventListener('touchstart',e=>{e.preventDefault();hueD=true;hHu(e)},{passive:false});
document.addEventListener('mousemove',e=>{if(hueD)hHu(e)});document.addEventListener('mouseup',()=>hueD=false);
document.addEventListener('touchmove',e=>{if(hueD){e.preventDefault();hHu(e)}},{passive:false});document.addEventListener('touchend',()=>hueD=false);
cpHex.addEventListener('input',()=>{if(/^#[0-9a-fA-F]{6}$/.test(cpHex.value.trim())){const[r,g,b]=hex2rgb(cpHex.value);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;cpUp()}});
function rgbI(){const[h,s,v]=rgb2hsv(Math.min(255,+cpR.value||0),Math.min(255,+cpG.value||0),Math.min(255,+cpB.value||0));cpSt.h=h;cpSt.s=s;cpSt.v=v;cpUp()}
cpR.oninput=cpG.oninput=cpB.oninput=rgbI;
function hslI(){const h=+cpHi.value||0,s=(+cpSi.value||0)/100,l=(+cpLi.value||0)/100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};const[hh,ss,vv]=rgb2hsv(Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255));cpSt.h=hh;cpSt.s=ss;cpSt.v=vv;cpUp()}
cpHi.oninput=cpSi.oninput=cpLi.oninput=hslI;
$$('.cp-preset').forEach(p=>p.onclick=()=>{const[r,g,b]=hex2rgb(p.dataset.color);const[h,s,v]=rgb2hsv(r,g,b);cpSt.h=h;cpSt.s=s;cpSt.v=v;cpUp()});

// ═══════ STATE ═══════
function addEl(d){maxZ++;d.id=gid();d.z=maxZ;if(d.x==null||d.y==null){const c=vCenter();d.x=snp(c.x-(d.width||150)/2+rOff());d.y=snp(c.y-(d.height||100)/2+rOff())}if(!d.width){const defs={image:280,video:320,youtube:360,text:260,link:240,font:340};d.width=defs[d.type]||200;if(d.type==='video')d.height=200;if(d.type==='youtube')d.height=215;if(d.type==='palette'){d.width=Math.max(180,(d.colors||[]).length*50+30);d.height=110}}boardState.push(d);renderEl(d);return d}
function rmEl(id){boardState=boardState.filter(e=>e.id!==id);const d=document.getElementById('el-'+id);if(d){d.querySelectorAll('video,audio').forEach(m=>m.pause());d.querySelectorAll('iframe').forEach(f=>f.src='');d.remove()}toast('Removed','info')}
function cRm(id){const d=boardState.find(e=>e.id===id);confirmAction(`Delete ${getElLabel(d||{})}? This cannot be undone.`,()=>rmEl(id))}
function upEl(id,p){const e=boardState.find(x=>x.id===id);if(e)Object.assign(e,p)}
function toFront(id){maxZ++;upEl(id,{z:maxZ});const d=document.getElementById('el-'+id);if(d)d.style.zIndex=maxZ}
function clearAll(){workspace.querySelectorAll('video,audio').forEach(m=>m.pause());workspace.querySelectorAll('iframe').forEach(f=>f.src='');boardState=[];nextId=1;maxZ=1;workspace.querySelectorAll('.board-element').forEach(e=>e.remove());toast('Cleared','info')}

const IC={
    move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    expand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    dupe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    bg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" opacity=".3"/></svg>',
    fg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M9.5 4L6 16h2l1-3.5h6L16 16h2L14.5 4z"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>',
    fontSz:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
};
function etBtn(icon,tip,fn,cls=''){const b=document.createElement('button');b.className='et-btn '+(cls||'');b.innerHTML=icon;const t=document.createElement('span');t.className='et-tip';t.textContent=tip;b.appendChild(t);b.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});b.addEventListener('click',e=>{e.stopPropagation();fn()});return b}

// ═══════ RENDER ═══════
function renderEl(data){
    const el=document.createElement('div');el.id='el-'+data.id;el.className='board-element';
    el.style.cssText=`left:${data.x}px;top:${data.y}px;z-index:${data.z};${data.width?'width:'+data.width+'px;':''}${data.height?'height:'+data.height+'px;':''}`;
    el.addEventListener('mousedown',()=>toFront(data.id));
    el.addEventListener('touchstart',()=>toFront(data.id),{passive:true});
    const mv=document.createElement('div');mv.className='move-handle';mv.innerHTML=IC.move;
    mv.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault();startDrag(e,data.id)});
    mv.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();startDrag(e,data.id)},{passive:false});
    el.appendChild(mv);
    const tb=document.createElement('div');tb.className='element-toolbar';

    switch(data.type){
        case'image':{el.classList.add('element-image');const img=document.createElement('img');img.src=data.src;img.draggable=false;img.onload=()=>{if(!data._ratio){data._ratio=img.naturalWidth/img.naturalHeight;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}}};el.appendChild(img);el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));tb.appendChild(etBtn(IC.img,'Replace',()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{if(i.files[0]){data.src=await f2d(i.files[0]);data._ratio=null;img.src=data.src;upEl(data.id,{src:data.src,_ratio:null});toast('Replaced','success')}};i.click()}));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'video':{el.classList.add('element-video');const vid=document.createElement('video');vid.src=data.src;vid.preload='metadata';vid.loop=true;vid.playsInline=true;vid.style.pointerEvents='none';el.appendChild(vid);const po=document.createElement('div');po.className='video-play-overlay';po.innerHTML='<svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>';po.style.pointerEvents='auto';po.style.cursor='pointer';po.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});po.onclick=e=>{e.stopPropagation();if(vid.paused){vid.style.pointerEvents='auto';vid.controls=true;vid.play();po.style.opacity='0';po.style.pointerEvents='none'}};el.appendChild(po);vid.addEventListener('pause',()=>{po.style.opacity='1';po.style.pointerEvents='auto'});vid.addEventListener('play',()=>{po.style.opacity='0';po.style.pointerEvents='none'});vid.addEventListener('ended',()=>{po.style.opacity='1';po.style.pointerEvents='auto';vid.style.pointerEvents='none';vid.controls=false});vid.addEventListener('mousedown',e=>e.stopPropagation());vid.addEventListener('loadedmetadata',()=>{if(!data._ratio){data._ratio=vid.videoWidth/vid.videoHeight;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}}});tb.appendChild(etBtn(IC.expand,'Fullscreen',()=>{vid.pause();openModal(data.id)}));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>{vid.pause();cRm(data.id)},'et-danger'));break}
        case'youtube':{el.classList.add('element-video');el.style.overflow='hidden';el.style.background='#000';const th=document.createElement('div');th.style.cssText='position:absolute;inset:0;background-size:cover;background-position:center;cursor:pointer;z-index:2;';th.style.backgroundImage=`url(${ytT(data.youtubeId)})`;const pb=document.createElement('div');pb.className='video-play-overlay';pb.innerHTML='<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#FF0000"/><path d="M27 34l18-10-18-10z" fill="#FFF"/></svg>';pb.style.cssText+='pointer-events:auto;cursor:pointer;background:rgba(0,0,0,.3);';th.appendChild(pb);el.appendChild(th);function go(e){if(e){e.stopPropagation();e.preventDefault()}th.remove();const f=document.createElement('iframe');f.src=ytE(data.youtubeId)+'&autoplay=1';f.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;';f.allowFullscreen=true;f.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture';f.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(f)}pb.addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault()});pb.onclick=go;th.addEventListener('mousedown',e=>e.stopPropagation());th.onclick=go;data._ratio=16/9;if(!data.height){data.height=data.width/data._ratio;el.style.height=data.height+'px'}tb.appendChild(etBtn(IC.expand,'Fullscreen',()=>openModal(data.id)));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'audio':{el.classList.add('element-audio');el.innerHTML+=`<div class="audio-header"><div class="audio-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="audio-info"><div class="audio-title">${escH(data.label||'Audio')}</div><div class="audio-subtitle">Audio</div></div></div>`;const aud=document.createElement('audio');aud.src=data.src;aud.controls=true;aud.preload='metadata';aud.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(aud);el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};tb.appendChild(etBtn(IC.expand,'Expand',()=>openModal(data.id)));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>{aud.pause();cRm(data.id)},'et-danger'));break}
        case'text':{el.classList.add('element-text');el.style.backgroundColor=data.bgColor||'#1e1e1e';const inn=document.createElement('div');inn.className='text-note-inner';const tE=document.createElement('div');tE.className='text-note-title';tE.contentEditable='true';tE.spellcheck=false;tE.textContent=data.title||'';tE.style.color=data.fgColor||'#e0e0e0';tE.oninput=()=>upEl(data.id,{title:tE.textContent});tE.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(tE);const bE=document.createElement('div');bE.className='text-note-body';bE.contentEditable='true';bE.spellcheck=false;bE.textContent=data.content||'';bE.style.color=data.fgColor||'#e0e0e0';bE.oninput=()=>upEl(data.id,{content:bE.textContent});bE.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(bE);inn.appendChild(tE);inn.appendChild(bE);el.appendChild(inn);el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};tb.appendChild(etBtn(IC.bg,'Background',()=>openCP(data.bgColor||'#1e1e1e',h=>{data.bgColor=h;el.style.backgroundColor=h;upEl(data.id,{bgColor:h})})));tb.appendChild(etBtn(IC.fg,'Text Color',()=>openCP(data.fgColor||'#e0e0e0',h=>{data.fgColor=h;tE.style.color=h;bE.style.color=h;upEl(data.id,{fgColor:h})})));tb.appendChild(etBtn(IC.expand,'Expand',()=>openModal(data.id)));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'font':{
            loadGoogleFont(data.fontFamily);el.classList.add('element-font');el.style.backgroundColor=data.bgColor||'#1e1e1e';
            const hdr=document.createElement('div');hdr.className='font-header';hdr.textContent=data.fontFamily+' ';
            const badge=document.createElement('span');badge.className='font-category';badge.textContent=data.fontCategory||'';hdr.appendChild(badge);el.appendChild(hdr);
            const body=document.createElement('div');body.className='font-body';body.contentEditable='true';body.spellcheck=false;
            body.style.fontFamily=`"${data.fontFamily}",${data.fontCategory||'sans-serif'}`;body.style.fontSize=(data.fontSize||32)+'px';body.style.color=data.fgColor||'#e0e0e0';
            body.textContent=data.content||'Type something...';body.oninput=()=>upEl(data.id,{content:body.textContent});
            body.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(body);el.appendChild(body);
            el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};
            tb.appendChild(etBtn(IC.bg,'Background',()=>openCP(data.bgColor||'#1e1e1e',h=>{data.bgColor=h;el.style.backgroundColor=h;upEl(data.id,{bgColor:h})})));
            tb.appendChild(etBtn(IC.fg,'Text Color',()=>openCP(data.fgColor||'#e0e0e0',h=>{data.fgColor=h;body.style.color=h;upEl(data.id,{fgColor:h})})));
            tb.appendChild(etBtn(IC.fontSz,'Font Size',()=>openFSP(data,body)));
            tb.appendChild(etBtn(IC.expand,'Preview',()=>openModal(data.id)));
            tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));
            tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'palette':{el.classList.add('element-palette');buildPal(el,data);el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'link':{el.classList.add('element-link');el.innerHTML=`<div class="link-icon-row"><div class="link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div></div>`;const lt=document.createElement('div');lt.className='link-title';lt.contentEditable='true';lt.spellcheck=false;lt.textContent=data.title||'';lt.oninput=()=>upEl(data.id,{title:lt.textContent});lt.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(lt);el.appendChild(lt);const ld=document.createElement('div');ld.className='link-desc';ld.contentEditable='true';ld.spellcheck=false;ld.textContent=data.desc||'';ld.oninput=()=>upEl(data.id,{desc:ld.textContent});ld.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(ld);el.appendChild(ld);const lu=document.createElement('div');lu.className='link-url-display';lu.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>${escH(data.url||'')}</span>`;lu.addEventListener('mousedown',e=>e.stopPropagation());lu.onclick=e=>{e.stopPropagation();if(data.url)window.open(data.url,'_blank')};el.appendChild(lu);tb.appendChild(etBtn(IC.edit,'Edit URL',()=>{const n=prompt('URL:',data.url||'');if(n!==null){data.url=n;upEl(data.id,{url:n});lu.querySelector('span').textContent=n}}));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
        case'file':{el.classList.add('element-file');const ext=(data.fileName||'').split('.').pop().toLowerCase();const cat=data.fileCategory||'other';el.innerHTML=`<div class="file-icon-row"><div class="file-type-icon ${cat==='pdf'?'pdf':cat==='text'?'txt':'other'}">${escH(ext||'?')}</div><div><div class="file-name">${escH(data.fileName||'File')}</div>${data.fileSize?'<div class="file-size">'+hSize(data.fileSize)+'</div>':''}</div></div>${data.textPreview?'<div class="file-text-preview">'+escH(data.textPreview.substring(0,300))+'</div>':''}`;el.ondblclick=e=>{e.stopPropagation();openModal(data.id)};tb.appendChild(etBtn(IC.expand,'View',()=>openModal(data.id)));tb.appendChild(etBtn(IC.dupe,'Duplicate',()=>dupeEl(data.id)));tb.appendChild(etBtn(IC.trash,'Delete',()=>cRm(data.id),'et-danger'));break}
    }
    el.appendChild(tb);el.appendChild(createResize(data.id,data.type==='image'||data.type==='video'||data.type==='youtube',data._ratio||null));
    workspace.appendChild(el);
}

function buildPal(el,data){
    el.querySelectorAll('.palette-header,.palette-swatches,.palette-add-swatch').forEach(c=>c.remove());
    const ph=document.createElement('div');ph.className='palette-header';ph.contentEditable='true';ph.spellcheck=false;ph.textContent=data.label||'Color Palette';ph.addEventListener('mousedown',e=>e.stopPropagation());stopSpace(ph);ph.oninput=()=>upEl(data.id,{label:ph.textContent});
    const sw=document.createElement('div');sw.className='palette-swatches';
    (data.colors||[]).forEach((c,i)=>{const s=document.createElement('div');s.className='palette-swatch';s.style.backgroundColor=c;s.innerHTML=`<span class="palette-swatch-label">${c.toUpperCase()}</span>`;const a=document.createElement('div');a.className='palette-swatch-actions';const eb=document.createElement('button');eb.className='swatch-action-btn';eb.textContent='✎';eb.addEventListener('mousedown',e=>e.stopPropagation());eb.onclick=e=>{e.stopPropagation();openCP(c,h=>{data.colors[i]=h;s.style.backgroundColor=h;s.querySelector('.palette-swatch-label').textContent=h.toUpperCase();upEl(data.id,{colors:[...data.colors]})})};a.appendChild(eb);if(data.colors.length>1){const rb=document.createElement('button');rb.className='swatch-action-btn';rb.textContent='×';rb.addEventListener('mousedown',e=>e.stopPropagation());rb.onclick=e=>{e.stopPropagation();confirmAction(`Remove ${c.toUpperCase()}?`,()=>{data.colors.splice(i,1);upEl(data.id,{colors:[...data.colors]});buildPal(el,data)})};a.appendChild(rb)}s.appendChild(a);s.onclick=e=>{if(e.target.closest('.swatch-action-btn'))return;e.stopPropagation();navigator.clipboard.writeText(c).then(()=>toast('Copied '+c,'success'))};sw.appendChild(s)});
    const ab=document.createElement('button');ab.className='palette-add-swatch';ab.textContent='+';ab.addEventListener('mousedown',e=>e.stopPropagation());ab.onclick=e=>{e.stopPropagation();openCP('#888',h=>{data.colors.push(h);upEl(data.id,{colors:[...data.colors]});buildPal(el,data)})};
    const mh=el.querySelector('.move-handle');if(mh){el.insertBefore(ph,mh.nextSibling);el.insertBefore(sw,ph.nextSibling);el.insertBefore(ab,sw.nextSibling)}else{el.appendChild(ph);el.appendChild(sw);el.appendChild(ab)}
}

function rebuildAll(){workspace.querySelectorAll('.board-element').forEach(e=>e.remove());if(boardState.length){maxZ=Math.max(...boardState.map(e=>e.z||1));nextId=Math.max(...boardState.map(e=>e.id||0))+1}boardState.forEach(d=>{if(d.type==='font')loadGoogleFont(d.fontFamily);renderEl(d)})}
function dupeEl(id){const s=boardState.find(e=>e.id===id);if(!s)return;const c=JSON.parse(JSON.stringify(s));c.x+=30;c.y+=30;delete c.id;delete c.z;addEl(c);toast('Duplicated','success')}

// ═══════ DRAG/RESIZE ═══════
let dragSt=null;
function startDrag(e,id){e.preventDefault();toFront(id);const dom=document.getElementById('el-'+id);const isT=e.type==='touchstart';const cx=isT?e.touches[0].clientX:e.clientX,cy=isT?e.touches[0].clientY:e.clientY;dragSt={id,dom,sx:cx,sy:cy,ex:parseFloat(dom.style.left)||0,ey:parseFloat(dom.style.top)||0,isT};dom.classList.add('dragging');if(isT){document.addEventListener('touchmove',onDrag,{passive:false});document.addEventListener('touchend',stopDrag)}else{document.addEventListener('mousemove',onDrag);document.addEventListener('mouseup',stopDrag)}}
function onDrag(e){if(!dragSt)return;e.preventDefault();const cx=dragSt.isT?e.touches[0].clientX:e.clientX,cy=dragSt.isT?e.touches[0].clientY:e.clientY;const nx=snp(Math.max(0,dragSt.ex+(cx-dragSt.sx)/zoomLevel)),ny=snp(Math.max(0,dragSt.ey+(cy-dragSt.sy)/zoomLevel));dragSt.dom.style.left=nx+'px';dragSt.dom.style.top=ny+'px';upEl(dragSt.id,{x:nx,y:ny})}
function stopDrag(){if(!dragSt)return;dragSt.dom.classList.remove('dragging');if(dragSt.isT){document.removeEventListener('touchmove',onDrag);document.removeEventListener('touchend',stopDrag)}else{document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',stopDrag)}dragSt=null}
let resSt=null;
function createResize(id,keep,ratio){const h=document.createElement('div');h.className='resize-handle';h.addEventListener('mousedown',e=>startRes(e,id,keep,ratio));h.addEventListener('touchstart',e=>startRes(e,id,keep,ratio),{passive:false});return h}
function startRes(e,id,keep,ratio){e.preventDefault();e.stopPropagation();const dom=document.getElementById('el-'+id);const isT=e.type==='touchstart';const cx=isT?e.touches[0].clientX:e.clientX,cy=isT?e.touches[0].clientY:e.clientY;const d=boardState.find(x=>x.id===id);const r=ratio||(d?._ratio)||(dom.offsetWidth/dom.offsetHeight);resSt={id,dom,sx:cx,sy:cy,sw:dom.offsetWidth,sh:dom.offsetHeight,isT,keep,ratio:r};if(isT){document.addEventListener('touchmove',onRes,{passive:false});document.addEventListener('touchend',stopRes)}else{document.addEventListener('mousemove',onRes);document.addEventListener('mouseup',stopRes)}}
function onRes(e){if(!resSt)return;e.preventDefault();const cx=resSt.isT?e.touches[0].clientX:e.clientX,dx=(cx-resSt.sx)/zoomLevel;const cy=resSt.isT?e.touches[0].clientY:e.clientY,dy=(cy-resSt.sy)/zoomLevel;let nw,nh;if(resSt.keep&&resSt.ratio){nw=Math.max(60,snp(resSt.sw+dx));nh=nw/resSt.ratio}else{nw=Math.max(60,snp(resSt.sw+dx));nh=Math.max(40,snp(resSt.sh+dy))}resSt.dom.style.width=nw+'px';resSt.dom.style.height=nh+'px';upEl(resSt.id,{width:nw,height:nh})}
function stopRes(){if(!resSt)return;if(resSt.isT){document.removeEventListener('touchmove',onRes);document.removeEventListener('touchend',stopRes)}else{document.removeEventListener('mousemove',onRes);document.removeEventListener('mouseup',stopRes)}resSt=null}

// ═══════ MODAL ═══════
function openModal(id){
    const d=boardState.find(e=>e.id===id);if(!d)return;toFront(id);modalC.innerHTML='';
    switch(d.type){
        case'image':modalC.innerHTML=`<img src="${d.src}"/>`;break;
        case'video':{const v=document.createElement('video');v.src=d.src;v.controls=true;v.autoplay=true;v.style.cssText='max-width:100%;max-height:85vh;border-radius:10px';modalC.appendChild(v);break}
        case'youtube':modalC.innerHTML=`<div style="width:80vw;max-width:960px;aspect-ratio:16/9;border-radius:10px;overflow:hidden"><iframe src="${ytE(d.youtubeId)}&autoplay=1" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;break;
        case'audio':{const a=document.createElement('audio');a.src=d.src;a.controls=true;a.autoplay=true;modalC.appendChild(a);break}
        case'text':modalC.innerHTML=`<div class="modal-text">${d.title?'<h2>'+escH(d.title)+'</h2>':''}<p>${escH(d.content||'')}</p></div>`;break;
        case'font':{loadGoogleFont(d.fontFamily);const w=document.createElement('div');w.className='modal-font-preview';w.innerHTML=`<div class="mfp-name">${escH(d.fontFamily)} · ${escH(d.fontCategory||'')}</div>`;const s=document.createElement('div');s.className='mfp-sample';s.style.fontFamily=`"${d.fontFamily}",${d.fontCategory}`;s.style.fontSize='48px';s.textContent=d.content||'Aa';w.appendChild(s);const ch=document.createElement('div');ch.className='mfp-chars';ch.style.fontFamily=`"${d.fontFamily}",${d.fontCategory}`;ch.textContent='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';w.appendChild(ch);const sz=document.createElement('div');sz.className='mfp-sizes';[12,16,24,36,48,72].forEach(n=>{const r=document.createElement('div');r.className='mfp-size-row';r.innerHTML=`<span class="mfp-size-label">${n}px</span>`;const t=document.createElement('span');t.style.fontFamily=`"${d.fontFamily}",${d.fontCategory}`;t.style.fontSize=n+'px';t.style.color='#e8e8e8';t.textContent=d.content||'The quick brown fox';r.appendChild(t);sz.appendChild(r)});w.appendChild(sz);modalC.appendChild(w);break}
        case'palette':{const w=document.createElement('div');w.className='modal-palette';w.innerHTML=`<h2>${escH(d.label||'Palette')}</h2>`;const sr=document.createElement('div');sr.className='modal-palette-swatches';(d.colors||[]).forEach(c=>{const s=document.createElement('div');s.className='modal-palette-swatch';s.style.backgroundColor=c;s.innerHTML=`<span>${c.toUpperCase()}</span>`;s.onclick=()=>navigator.clipboard.writeText(c).then(()=>toast('Copied','success'));sr.appendChild(s)});w.appendChild(sr);modalC.appendChild(w);break}
        case'link':modalC.innerHTML=`<div class="modal-text"><h2>${escH(d.title||'Link')}</h2><p>${escH(d.desc||'')}</p><p><a href="${escH(d.url)}" target="_blank" style="color:#4ECDC4">${escH(d.url||'')}</a></p></div>`;break;
        case'file':{const cat=d.fileCategory||'other';if(cat==='pdf'&&d.dataUrl)modalC.innerHTML=`<div style="width:80vw;max-width:900px;height:85vh;border-radius:10px;overflow:hidden"><iframe src="${d.dataUrl}" style="width:100%;height:100%;border:none"></iframe></div>`;else if(d.textPreview){const w=document.createElement('div');w.className='modal-text';w.style.maxWidth='800px';w.innerHTML=`<h2>${escH(d.fileName)}</h2>`;const p=document.createElement('pre');p.style.cssText='background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:16px;overflow:auto;max-height:70vh;font-family:monospace;font-size:13px;line-height:1.6;color:#c8c8c8;white-space:pre-wrap';p.textContent=d.textPreview;w.appendChild(p);modalC.appendChild(w)}else modalC.innerHTML=`<div class="modal-text"><h2>${escH(d.fileName)}</h2><p style="color:#555">No preview</p></div>`;break}
    }
    modalOv.classList.add('active');
}
function closeMod(){modalOv.classList.remove('active');modalC.querySelectorAll('video,audio').forEach(m=>m.pause());modalC.querySelectorAll('iframe').forEach(f=>f.src='');modalC.innerHTML=''}
$('#modalClose').onclick=closeMod;modalOv.onclick=e=>{if(e.target===modalOv)closeMod()};

document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(fspOv.classList.contains('active')){if(fspBody)fspBody.style.fontSize=fspOrig+'px';closeFSP()}else if(cpOv.classList.contains('active'))closeCP();else if(modalOv.classList.contains('active'))closeMod();else if(diagOv.classList.contains('active'))closeDiags()}});

function openDiag(id){diagOv.classList.add('active');$$('.dialog').forEach(d=>d.classList.remove('active'));document.getElementById(id)?.classList.add('active')}
function closeDiags(){diagOv.classList.remove('active');$$('.dialog').forEach(d=>d.classList.remove('active'))}
$$('[data-dialog]').forEach(b=>b.onclick=closeDiags);diagOv.onclick=e=>{if(e.target===diagOv)closeDiags()};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&isEditable(e.target))e.stopPropagation()});

// ═══════ TOOLBAR ═══════
$('#addTextBtn').onclick=()=>{addEl({type:'text',title:'',content:'',bgColor:'#1e1e1e',fgColor:'#e0e0e0',width:260,height:140});toast('Click to edit','success')};
const imgI=$('#imageFileInput');$('#addImageBtn').onclick=()=>imgI.click();imgI.onchange=async()=>{for(const f of imgI.files)addEl({type:'image',src:await f2d(f),label:f.name});imgI.value='';toast('Added','success')};
const vidI=$('#videoFileInput');$('#addVideoBtn').onclick=()=>vidI.click();vidI.onchange=async()=>{for(const f of vidI.files)addEl({type:'video',src:await f2d(f),label:f.name,width:320,height:200});vidI.value='';toast('Added','success')};
const audI=$('#audioFileInput');$('#addAudioBtn').onclick=()=>audI.click();audI.onchange=async()=>{for(const f of audI.files)addEl({type:'audio',src:await f2d(f),label:f.name});audI.value='';toast('Added','success')};
$('#addColorBtn').onclick=()=>{$('#paletteName').value='';$('#paletteBuilder').innerHTML='';['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7'].forEach(addDSw);openDiag('colorDialog')};
function addDSw(c='#888'){const b=$('#paletteBuilder'),w=document.createElement('div');w.className='palette-swatch-wrap';const s=document.createElement('div');s.className='palette-color-swatch';s.style.backgroundColor=c;s.dataset.color=c;const l=document.createElement('span');l.className='swatch-hex';l.textContent=c.toUpperCase();s.onclick=()=>openCP(s.dataset.color,h=>{s.dataset.color=h;s.style.backgroundColor=h;l.textContent=h.toUpperCase()});const r=document.createElement('button');r.className='remove-swatch-btn';r.textContent='×';r.onclick=e=>{e.stopPropagation();w.remove()};w.appendChild(s);w.appendChild(l);w.appendChild(r);b.appendChild(w)}
$('#addSwatchBtn').onclick=()=>addDSw();
$('#colorSubmit').onclick=()=>{const c=[];$$('#paletteBuilder .palette-color-swatch').forEach(s=>c.push(s.dataset.color));if(!c.length){toast('Add a color','error');return}addEl({type:'palette',label:$('#paletteName').value.trim()||'Color Palette',colors:c});closeDiags();toast('Added','success')};
stopSpace($('#paletteName'));
$('#addUrlBtn').onclick=()=>{$('#urlInput').value='';$('#urlLabel').value='';$('#urlType').value='image';openDiag('urlDialog')};
$('#urlSubmit').onclick=()=>{const u=$('#urlInput').value.trim();if(!u){toast('Enter URL','error');return}const y=ytId(u);if(y){addEl({type:'youtube',youtubeId:y,url:u,width:360,height:215});closeDiags();toast('YouTube added','success');return}const t=$('#urlType').value,l=$('#urlLabel').value.trim()||u.split('/').pop();if(t==='image')addEl({type:'image',src:u,label:l});else if(t==='video')addEl({type:'video',src:u,label:l,width:320,height:200});else addEl({type:'audio',src:u,label:l});closeDiags();toast('Added','success')};
stopSpace($('#urlLabel'));
$('#addLinkBtn').onclick=()=>{$('#linkUrl').value='';$('#linkTitle').value='';$('#linkDesc').value='';openDiag('linkDialog')};
$('#linkSubmit').onclick=()=>{const u=$('#linkUrl').value.trim();if(!u){toast('Enter URL','error');return}addEl({type:'link',url:u,title:$('#linkTitle').value.trim()||'Link',desc:$('#linkDesc').value.trim()||'',width:240});closeDiags();toast('Added','success')};
stopSpace($('#linkTitle'));stopSpace($('#linkDesc'));
const genI=$('#genericFileInput');$('#addFileBtn').onclick=()=>genI.click();genI.onchange=async()=>{await procFiles(genI.files);genI.value=''};
async function procFiles(files){for(const f of files){const c=mCat(f.type||f.name);try{if(c==='image')addEl({type:'image',src:await f2d(f),label:f.name});else if(c==='video')addEl({type:'video',src:await f2d(f),label:f.name,width:320,height:200});else if(c==='audio')addEl({type:'audio',src:await f2d(f),label:f.name});else if(c==='text')addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'text',textPreview:await f2t(f)});else if(c==='pdf')addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'pdf',dataUrl:await f2d(f)});else{let t=null;try{t=await f2t(f)}catch(x){}addEl({type:'file',fileName:f.name,fileSize:f.size,fileCategory:'other',dataUrl:await f2d(f),textPreview:t})}}catch(e){toast('Failed: '+f.name,'error')}}toast('Added','success')}
$('#snapToggleBtn').onclick=()=>{snapToGrid=!snapToGrid;$('#snapToggleBtn').classList.toggle('active',snapToGrid);grid.classList.toggle('visible',snapToGrid);toast(snapToGrid?'Grid on':'Grid off','info')};
$('#exportBtn').onclick=()=>{const d={v:1,ts:new Date().toISOString(),zoomLevel,panX,panY,elements:boardState.map(e=>{const c={...e};delete c._ratio;return c})};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);Object.assign(document.createElement('a'),{href:u,download:'moodboard-'+Date.now()+'.json'}).click();URL.revokeObjectURL(u);toast('Exported','success')};
const impI=$('#importFileInput');$('#importBtn').onclick=()=>impI.click();impI.onchange=async()=>{const f=impI.files[0];if(!f)return;try{const d=JSON.parse(await f2t(f));if(d.elements){boardState=d.elements;rebuildAll();if(d.zoomLevel)zoomLevel=d.zoomLevel;if(d.panX!=null)panX=d.panX;if(d.panY!=null)panY=d.panY;applyTf();toast('Imported','success')}else toast('Invalid','error')}catch(e){toast('Invalid','error')}impI.value=''};
$('#resetViewBtn').onclick=()=>{zoomLevel=1;panX=-(CW/2-viewport.clientWidth/2);panY=-(CH/2-viewport.clientHeight/2);applyTf();toast('Reset','info')};
$('#clearBtn').onclick=()=>{if(!boardState.length){toast('Empty','info');return}confirmAction('Clear entire board?',()=>clearAll())};

// ═══════ ZOOM/PAN ═══════
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;const wx=(mx-panX)/zoomLevel,wy=(my-panY)/zoomLevel;const f=e.deltaY<0?1.08:1/1.08;const nz=Math.max(MIN_Z,Math.min(MAX_Z,zoomLevel*f));panX=mx-wx*nz;panY=my-wy*nz;zoomLevel=nz;applyTf()},{passive:false});
let panSt=null,spD=false;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!isEditable(e.target)){e.preventDefault();spD=true;viewport.style.cursor='grab'}});
document.addEventListener('keyup',e=>{if(e.code==='Space'){spD=false;viewport.style.cursor=''}});
viewport.addEventListener('mousedown',e=>{if(e.button===1||spD||e.target===viewport||e.target===workspace||e.target===grid){e.preventDefault();panSt={sx:e.clientX,sy:e.clientY,px:panX,py:panY};viewport.style.cursor='grabbing'}});
document.addEventListener('mousemove',e=>{if(panSt){panX=panSt.px+(e.clientX-panSt.sx);panY=panSt.py+(e.clientY-panSt.sy);applyTf()}});
document.addEventListener('mouseup',()=>{if(panSt){panSt=null;viewport.style.cursor=spD?'grab':''}});
let tP=null,tD=null;
viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){e.preventDefault();const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;tP={sx:mx,sy:my,px:panX,py:panY};tD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}},{passive:false});
viewport.addEventListener('touchmove',e=>{if(e.touches.length===2&&tP){e.preventDefault();const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;panX=tP.px+(mx-tP.sx);panY=tP.py+(my-tP.sy);const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(tD){const f=d/tD,r=viewport.getBoundingClientRect(),cx=mx-r.left,cy=my-r.top,wx=(cx-panX)/zoomLevel,wy=(cy-panY)/zoomLevel,nz=Math.max(MIN_Z,Math.min(MAX_Z,zoomLevel*f));panX=cx-wx*nz;panY=cy-wy*nz;zoomLevel=nz}tD=d;applyTf()}},{passive:false});
viewport.addEventListener('touchend',e=>{if(e.touches.length<2){tP=null;tD=null}});
viewport.addEventListener('contextmenu',e=>e.preventDefault());

let dC=0;
document.addEventListener('dragenter',e=>{e.preventDefault();dC++;if(dC===1)dropOverlay.classList.add('active')});
document.addEventListener('dragleave',e=>{e.preventDefault();dC--;if(dC<=0){dC=0;dropOverlay.classList.remove('active')}});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',async e=>{e.preventDefault();dC=0;dropOverlay.classList.remove('active');if(e.dataTransfer.files.length)await procFiles(e.dataTransfer.files)});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('#exportBtn').click()}if((e.ctrlKey||e.metaKey)&&e.key==='o'){e.preventDefault();$('#importBtn').click()}});

panX=-(CW/2-window.innerWidth/2);panY=-(CH/2-window.innerHeight/2);applyTf();drawHue();
})();