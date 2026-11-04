(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMob=()=>innerWidth<820;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const sm=x=>{x=clamp(x);return x*x*(3-2*x)};
gsap.registerPlugin(ScrollTrigger);

/* ---------- shared frame store (scene sequences + dish modal) ---------- */
const STORE={};
function frameStore(key,mobile,N){
  const id=key+(mobile?'m':'d');if(STORE[id])return STORE[id];
  const st=STORE[id]={key,mobile,N,imgs:new Array(N),loaded:0,failed:0,started:false,onprog:[]};
  st.path=i=>`assets/seq/${key}/${mobile?'m':'d'}/f${String(i+1).padStart(3,'0')}.jpg`;
  st.load=()=>{if(st.started)return;st.started=true;
    const order=[...Array(N).keys()];order.sort((a,b)=>(a%6===0?-1:0)-(b%6===0?-1:0)||a-b);
    order.forEach(i=>{const im=new Image();im.decoding='async';
      im.onload=()=>{st.imgs[i]=im;st.loaded++;st.onprog.forEach(f=>f(st))};
      im.onerror=()=>{st.failed++};im.src=st.path(i)})};
  st.get=i=>{i=clamp(Math.round(i),0,N-1);for(let d=0;d<N;d++){if(st.imgs[i-d])return st.imgs[i-d];if(st.imgs[i+d])return st.imgs[i+d]}return null};
  return st;
}

/* ---------- Scroll-scrubbed image sequences (canvas) ---------- */
function Seq(section){
  const key=section.dataset.seq,cv=section.querySelector('.cv'),ctx=cv.getContext('2d');
  const loadBar=section.querySelector('.loader i'),loader=section.querySelector('.loader');
  const mobile=isMob();
  const N=+(mobile?section.dataset.nm:section.dataset.n);
  const st=frameStore(key,mobile,N);
  st.onprog.push(s=>{if(loadBar)loadBar.style.width=(s.loaded/N*100)+'%';if(s.loaded>=N&&loader)loader.classList.add('done')});
  let W=0,H=0,dpr=1,progress=0,shown=0,vis=false;
  const rcol=section.querySelector('.rcol'),rAt=parseFloat(section.dataset.rcol||'2'),shift=section.classList.contains('shift');
  function resize(){dpr=Math.min(devicePixelRatio||1,mobile?2:2);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  addEventListener('resize',resize);resize();
  new IntersectionObserver(es=>{es.forEach(e=>{vis=e.isIntersecting;if(vis)st.load()})},{rootMargin:'150% 0px'}).observe(section);
  const wide=key==='bloody';
  function layout(im){
    const fw=im.width,fh=im.height;let sw,sh,x,y;
    if(wide){ // 16:9 bar scene: cover the stage, glass stays centred
      const m=mobile?Math.max(W/fw,(H*.62)/fh):Math.max(W/fw,H/fh);sw=fw*m;sh=fh*m;x=(W-sw)/2;y=mobile?Math.max(46,H*.04):(H-sh)/2;return {x,y,sw,sh}}
    if(mobile){sw=Math.min(W,H*.5);sh=sw;x=(W-sw)/2;y=Math.max(46,H*.05)}
    else{sw=sh=Math.min(H*1.0,W*.62);const k=shift?sm((progress-(rAt-.08))/.12):0;const cx=W*(.64-.27*k);x=cx-sw/2;y=(H-sh)/2+8}
    return {x,y,sw,sh};
  }
  function draw(p){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    const f=clamp(p)*(st.N-1),i0=Math.floor(f),a=f-i0;
    const A=st.get(i0);if(!A)return;const t=layout(A);
    ctx.drawImage(A,t.x,t.y,t.sw,t.sh);
    const B=a>.02?st.get(i0+1):null;if(B&&B!==A){ctx.globalAlpha=a;ctx.drawImage(B,t.x,t.y,t.sw,t.sh);ctx.globalAlpha=1}
    if(!wide){ // feather the square frame into the page (dark green)
      const cx=t.x+t.sw/2,cy=t.y+t.sh/2,g=ctx.createRadialGradient(cx,cy,t.sw*.40,cx,cy,t.sw*.5);
      g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalCompositeOperation='destination-in';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
  }
  const chaps=[...section.querySelectorAll('.chap')],dots=[...section.querySelectorAll('.dots i')];
  const WIDTH=chaps.length>3?.095:(wide?.16:.12);
  function layoutChaps(p){
    let best=0,bo=-1;
    chaps.forEach((c,i)=>{
      const ctr=parseFloat(c.dataset.c);let d=(p-ctr)/WIDTH;
      if(c.dataset.first&&d<0)d=0;if(c.dataset.last&&d>0)d=0;
      const o=clamp(2.2*(1-Math.abs(d)));
      c.style.opacity=o.toFixed(3);c.style.transform=`translate3d(0,${(-d*(mobile?50:110)).toFixed(1)}px,0)`;c.style.visibility=o<.01?'hidden':'visible';
      if(o>bo){bo=o;best=i}
    });
    if(rcol){const o=clamp((p-rAt)/.07);rcol.style.opacity=o.toFixed(3);rcol.style.visibility=o<.01?'hidden':'visible';rcol.style.setProperty('--ty',((1-o)*40).toFixed(1)+'px');rcol.style.pointerEvents=o>.5?'auto':'none';if(o>.5)best=chaps.length}
    dots.forEach((d,i)=>d.classList.toggle('on',i===best));
  }
  ScrollTrigger.create({trigger:section,start:'top top',end:'bottom bottom',onUpdate:s=>{progress=s.progress}});
  function tick(){
    if(vis){shown+=(progress-shown)*(reduce?1:.14);if(Math.abs(progress-shown)<.0004)shown=progress;draw(shown);layoutChaps(shown)}
    requestAnimationFrame(tick)
  }
  setTimeout(()=>{if(st.started&&st.loaded===0&&st.failed>0){cv.style.display='none';section.querySelector('.stage').style.background=`#0a2b20 url(assets/seq/${key}/d/f${String(st.N).padStart(3,'0')}.jpg) center/contain no-repeat`}},6000);
  requestAnimationFrame(tick);
  return {setProgress:v=>{progress=v;shown=v}};
}
window.__seqs=[...document.querySelectorAll('[data-seq]')].map(Seq);
window.__setProgress=(i,v)=>window.__seqs[i].setProgress(v);

/* ---------- Menu data (real items & prices from thevineyardlemoore.com) ---------- */
const RAW=[
 ['Traditional Eggs Benedict','Two poached eggs on grilled English muffin with ham & hollandaise','16.50'],
 ["Farmer's Platter",'Two eggs with bacon, sausage, 1/2 ham steak or linguica, home fries, two buttermilk pancakes and biscuit & gravy','17.99'],
 ['Farmers Skillet','Home fries, diced sausage, peppers, onions, tomatoes, two eggs, jack & cheddar, homemade salsa','14.99'],
 ['Chicken Fried Steak & Eggs','Chicken fried steak with country gravy and two eggs','15.99'],
 ['Country Skillet','Huge homemade buttermilk biscuit, two scrambled eggs, sausage gravy','14.50'],
 ['Honey Butter Pancakes','Pancakes grilled with honey butter','11.99'],
 ['French Toast Deluxe','4 halves of French toast with three sausage links or three strips of bacon or 1 linguica, and two eggs','15.99'],
 ['Denver Omelet','Diced ham, onions & bell peppers with jack and cheddar cheese','14.99'],
 ['Good Morning Burger','Two fried eggs, thick bacon, hashbrowns, cheddar','18.59'],
 ['Classic Hamburger','Our classic burger — with regular straight fries','15.99'],
 ['Patty Melt','Angus beef patty, American & jack, grilled onions on rye','15.49'],
 ['Cobb Salad','Turkey, bacon, tomatoes, cucumber, blue cheese, red onions','15.69'],
 ['Fiesta Salad','Chicken or steak, fire-roasted corn, avocado, chipotle ranch','17.99'],
 ['Potato Skins','Bacon, jack & cheddar, green onions','14.29'],
 ['Wings','8 regular or 10 boneless — Cajun, lemon pepper, buffalo, garlic parmesan, BBQ or teriyaki','16.99'],
 ['Bloody Mary','','10.99'],['Mimosa','','8.50'],
 ['Long Island Iced Tea','Bar classic, served tall over ice','11.00',1],
 ['Steak & Shrimp','8 oz top sirloin & 4 deep fried shrimp','26.99'],
 ['Rib Eye','14 oz Choice rib eye, great marbling','35.59'],
 ['8 oz Vineyard Steak','Special-cut sirloin','23.29'],['12 oz Vineyard Steak','Special-cut sirloin','24.99'],
 ['Lemon Herb Chicken','Two seasoned chicken breasts, potato, soup or salad, bread','19.49'],
 ['Grilled Salmon','Seasoned grilled salmon','24.99'],
 ['Spaghetti & Meat Balls','With our award winning sauce & garlic bread','19.99'],
 ['Chicken Fried Steak','Tender steak, breaded and fried, country gravy','21.99'],
 ['Meatloaf','Homestyle, with soup or salad','15.99'],
 ['Cheese Cake','Strawberry, caramel or chocolate topping','10.99'],
 ['Ice Cream Sundae','Chocolate, hot fudge, caramel or strawberry','7.99'],
 ['Cinnamon Sugar Chips','Fried tortilla chips, vanilla ice cream, chocolate & caramel','10.99']
];
const ITEMS={};RAW.forEach(m=>ITEMS[m[0]]={id:m[0],en:m[0],d:m[1],p:+m[2],sample:!!m[3]});
const TABS={
 breakfast:['Traditional Eggs Benedict',"Farmer's Platter",'Farmers Skillet','Chicken Fried Steak & Eggs','Country Skillet','Honey Butter Pancakes','French Toast Deluxe','Denver Omelet'],
 brunch:['Good Morning Burger','Classic Hamburger','Patty Melt','Cobb Salad','Fiesta Salad','Potato Skins','Wings','Bloody Mary','Mimosa','Long Island Iced Tea'],
 dinner:['Steak & Shrimp','Rib Eye','8 oz Vineyard Steak','12 oz Vineyard Steak','Lemon Herb Chicken','Grilled Salmon','Spaghetti & Meat Balls','Chicken Fried Steak','Meatloaf','Cheese Cake','Ice Cream Sundae','Cinnamon Sugar Chips']
};
TABS.drinks=['Bloody Mary','Mimosa','Long Island Iced Tea'];
const TABOF={};Object.entries(TABS).forEach(([t,a])=>a.forEach(i=>TABOF[i]=t));
const IMG={'Traditional Eggs Benedict':'benedict',"Farmer's Platter":'platter','Farmers Skillet':'skillet','Chicken Fried Steak & Eggs':'cfs','Country Skillet':'country','Honey Butter Pancakes':'pancakes','French Toast Deluxe':'frenchtoast','Denver Omelet':'omelet','Good Morning Burger':'burger','Classic Hamburger':'burger','Patty Melt':'burger','Cobb Salad':'salad','Fiesta Salad':'salad','Potato Skins':'wings','Wings':'wings','Bloody Mary':'bloody','Mimosa':'mimosa','Long Island Iced Tea':'lit','Steak & Shrimp':'steak','Rib Eye':'steak','8 oz Vineyard Steak':'steak','12 oz Vineyard Steak':'steak','Lemon Herb Chicken':'chicken','Grilled Salmon':'salmon','Spaghetti & Meat Balls':'spaghetti','Chicken Fried Steak':'cfs','Meatloaf':'meatloaf','Cheese Cake':'cheesecake','Ice Cream Sundae':'sundae','Cinnamon Sugar Chips':'sundae'};
const SEQ={'Traditional Eggs Benedict':'breakfast','Steak & Shrimp':'steak','Rib Eye':'steak','8 oz Vineyard Steak':'steak','12 oz Vineyard Steak':'steak','Bloody Mary':'bloody'};
const SEQN={breakfast:[96,48],steak:[96,48],bloody:[80,40]};
// v4: every other dish gets its own build clip sequence (lazy-loaded on popup open)
Object.keys(IMG).forEach(id=>{if(!SEQ[id]){const k='b_'+IMG[id];SEQ[id]=k;SEQN[k]=[36,24]}});
const srcset=k=>`assets/img/${k}-m.jpg 560w, assets/img/${k}.jpg 1024w`;

/* ---------- i18n ---------- */
const D=window.I18N,SUP=D.langs.map(l=>l[0]);
let lang='en';
try{const s=localStorage.getItem('vy-lang');if(SUP.includes(s))lang=s;else{const n=(navigator.language||'en').toLowerCase();lang=n.startsWith('es')?'es':n.startsWith('pt')?'pt':n.startsWith('zh')?'zh-HK':(n.startsWith('fil')||n.startsWith('tl'))?'fil':'en'}}catch(e){}
const U=k=>(D.ui[lang]&&D.ui[lang][k])||D.ui.en[k]||'';
const mi=id=>{const it=ITEMS[id];const t=D.menu[lang]&&D.menu[lang][id];if(t){const [n,d]=t.split('|');return {n,d}}return {n:it.en,d:it.d}};
const money=v=>'$'+v.toFixed(2);
const price=it=>money(it.p)+(it.sample?' <sup>[Sample]</sup>':'');
const sel=document.getElementById('lang');
D.langs.forEach(([c,n])=>{const o=document.createElement('option');o.value=c;o.textContent=n;sel.appendChild(o)});
let curTab='breakfast',openId=null;
function applyLang(){
  document.documentElement.lang=lang;sel.value=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{const v=U(el.dataset.i18n);if(v)el.innerHTML=v});
  document.querySelectorAll('li[data-mi]').forEach(li=>{const id=li.dataset.mi.replace('&amp;','&');li.dataset.mi=id;const it=ITEMS[id];if(!it)return;const t=mi(id);li.setAttribute('role','button');li.tabIndex=0;li.innerHTML=`<b>${t.n}</b><span>${t.d}</span><i>${price(it)}</i>`});
  document.getElementById('cartBtn').setAttribute('aria-label',U('o_h'));
  buildTabs();show(curTab,true);renderTray();
  document.title=lang==='en'?'The Vineyard — Lemoore, CA · Motion concept':'The Vineyard — Lemoore, CA';
  ScrollTrigger.refresh();
}
sel.addEventListener('change',()=>{lang=sel.value;try{localStorage.setItem('vy-lang',lang)}catch(e){}applyLang()});

/* ---------- Menu tabs + list + sticky plate ---------- */
const tabs=document.getElementById('tabs'),grid=document.getElementById('mgrid'),mpA=document.getElementById('mpA'),mpB=document.getElementById('mpB'),mpCap=document.getElementById('mpCap');
let mpFront=mpA,platedId=null;
mpB.style.opacity=0;
function setPlate(id){
  if(id===platedId)return;platedId=id;const k=IMG[id];const nxt=mpFront===mpA?mpB:mpA,prv=mpFront;
  nxt.srcset=srcset(k);nxt.sizes='(max-width:820px) 60vw, 38vw';nxt.src=`assets/img/${k}.jpg`;nxt.alt=mi(id).n;
  gsap.to(nxt,{opacity:1,duration:reduce?0:.45,ease:'power2.out'});gsap.to(prv,{opacity:0,duration:reduce?0:.45});mpFront=nxt;
  mpCap.innerHTML=`<b>${mi(id).n}</b> <i>${price(ITEMS[id])}</i>`;
}
function buildTabs(){tabs.innerHTML='';Object.keys(TABS).forEach(c=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.innerHTML=U('tab_'+c);b.dataset.c=c;b.onclick=()=>show(c);tabs.appendChild(b)})}
function show(cat,quiet){
  curTab=cat;[...tabs.children].forEach(b=>{const on=b.dataset.c===cat;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  document.getElementById('tabnote').innerHTML=U('tn_'+cat);
  grid.innerHTML='';grid.scrollTop=0;
  TABS[cat].forEach(id=>{const it=ITEMS[id],t=mi(id),k=IMG[id];
    const a=document.createElement('article');a.className='mi';a.dataset.id=id;a.tabIndex=0;a.setAttribute('role','button');
    a.innerHTML=`<img loading="lazy" decoding="async" src="assets/img/${k}-m.jpg" srcset="${srcset(k)}" sizes="96px" alt=""><div class="mt"><h3>${t.n}</h3>${t.d?`<p>${t.d}</p>`:''}</div><div class="mr"><b>${price(it)}</b><button type="button" class="add" aria-label="${U('add')}: ${t.n}">+ ${U('add')}</button></div>`;
    grid.appendChild(a)});
  platedId=null;setPlate(TABS[cat][0]);
  if(!reduce&&!quiet)gsap.from('.mi',{y:24,opacity:0,duration:.45,stagger:.04,ease:'power3.out'});
}
grid.addEventListener('click',e=>{const a=e.target.closest('.mi');if(!a)return;const b=e.target.closest('.add');
  if(b){e.stopPropagation();add(a.dataset.id);b.classList.add('pop');setTimeout(()=>b.classList.remove('pop'),500);return}
  setPlate(a.dataset.id);openModal(a.dataset.id)});
grid.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('mi')){openModal(e.target.dataset.id)}});
grid.addEventListener('mouseover',e=>{const a=e.target.closest('.mi');if(a&&!isMob())setPlate(a.dataset.id)});
let sct=0;grid.addEventListener('scroll',()=>{clearTimeout(sct);sct=setTimeout(()=>{if(!isMob())return;const top=grid.getBoundingClientRect().top;const c=[...grid.children].find(el=>el.getBoundingClientRect().bottom>top+40);if(c)setPlate(c.dataset.id)},120)},{passive:true});
document.addEventListener('click',e=>{ // scene lists
  const li=e.target.closest('li[data-mi]');if(li){openModal(li.dataset.mi);return}
  const a=e.target.closest('a[data-tab]');if(a){curTab=a.dataset.tab;show(curTab,true)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('li[data-mi]'))openModal(e.target.dataset.mi)});

/* ---------- v4 nav: dropdowns + mobile hamburger ---------- */
(function(){const hd=document.querySelector('.nav'),bg=document.getElementById('burger');
  const closeAll=ex=>document.querySelectorAll('.dd.open').forEach(d=>{if(d!==ex){d.classList.remove('open');d.querySelector('.ddb').setAttribute('aria-expanded','false')}});
  document.querySelectorAll('.ddb').forEach(b=>b.addEventListener('click',e=>{const d=b.parentNode;const on=!d.classList.contains('open');closeAll(d);d.classList.toggle('open',on);b.setAttribute('aria-expanded',on)}));
  bg.addEventListener('click',()=>{const on=!hd.classList.contains('navopen');hd.classList.toggle('navopen',on);bg.setAttribute('aria-expanded',on)});
  document.querySelectorAll('.ddm a').forEach(a=>a.addEventListener('click',()=>{hd.classList.remove('navopen');bg.setAttribute('aria-expanded','false');closeAll()}));
  document.addEventListener('click',e=>{if(!e.target.closest('.nav'))closeAll()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAll();hd.classList.remove('navopen')}});
})();

/* ---------- Dish modal: "how it's built" ---------- */
const modal=document.getElementById('modal'),mBase=document.getElementById('mBase'),mImg=document.getElementById('mImg'),mCv=document.getElementById('mCv'),mSteps=document.getElementById('mSteps'),mPic=document.getElementById('mPic');
let mtl=null,mdraw=null;
function stepsFor(id,t){
  if(id==='Bloody Mary')return U('md_bm').split('|');
  if(id==='Mimosa')return U('md_mm').split('|');
  if(id==='Long Island Iced Tea')return U('md_li').split('|');
  let parts=(t.d||'').split(/\s*[,，、;；]\s*/).map(s=>s.trim()).filter(Boolean);
  if(parts.length>6)parts=[...parts.slice(0,5),parts.slice(5).join(', ')];
  return parts.length<3?[U('md_plate'),...parts]:parts;
}
function openModal(id){
  const it=ITEMS[id];if(!it)return;openId=id;const t=mi(id),k=IMG[id];
  document.getElementById('mTitle').textContent=t.n;document.getElementById('mPrice').innerHTML=price(it);
  document.getElementById('mDesc').textContent=t.d||'';document.getElementById('mCat').innerHTML=U('tab_'+TABOF[id]);
  document.getElementById('mAdd').innerHTML=`+ ${U('add')} · ${money(it.p)}`;
  mImg.srcset=srcset(k);mImg.sizes='(max-width:820px) 92vw, 480px';mImg.src=`assets/img/${k}.jpg`;mImg.alt=t.n;
  mBase.src='assets/img/empty.jpg';mBase.alt='';
  const steps=stepsFor(id,t);mSteps.innerHTML=steps.map((s,i)=>`<li><i>${i+1}</i><span>${s}</span></li>`).join('');
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.documentElement.classList.add('lock');
  document.getElementById('mClose').focus({preventScroll:true});
  const sk=SEQ[id];if(sk){const mob=isMob(),n=SEQN[sk][mob?1:0];const st=frameStore(sk,mob,n);st.load();
    if(st.loaded<n*.9&&!st.waiting){st.waiting=true;const t0=Date.now();st.onprog.push(s=>{if(s.loaded>=n*.9&&st.waiting){st.waiting=false;if(openId&&SEQ[openId]===sk&&Date.now()-t0<6000)playModal()}})}}
  playModal();
}
function playModal(){
  if(mtl)mtl.kill();mdraw=null;const id=openId;if(!id)return;
  const lis=[...mSteps.children],n=lis.length,sk=SEQ[id];
  lis.forEach(l=>l.classList.remove('on'));mPic.classList.remove('done');
  let st=null;if(sk){const mob=isMob();st=frameStore(sk,mob,SEQN[sk][mob?1:0]);if(st.loaded<st.N*.9)st=null}
  const total=reduce?0:Math.max(2.6,.9*n+.9);
  const obj={p:0};mtl=gsap.timeline();
  if(st){ // frame-sequence mode
    mPic.classList.add('seq');const ctx=mCv.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2),sz=mPic.clientWidth;mCv.width=mCv.height=Math.round(sz*dpr);
    const drawF=p=>{const f=clamp(p)*(st.N-1);const A=st.get(Math.floor(f)),B=st.get(Math.floor(f)+1),a=f-Math.floor(f);ctx.clearRect(0,0,mCv.width,mCv.height);
      [[A,1],[B,a]].forEach(([im,al])=>{if(!im||!al)return;const s=Math.min(im.width,im.height),sx=(im.width-s)/2,sy=(im.height-s)/2;ctx.globalAlpha=al;ctx.drawImage(im,sx,sy,s,s,0,0,mCv.width,mCv.height)});ctx.globalAlpha=1};
    drawF(0);mtl.to(obj,{p:1,duration:total,ease:'none',onUpdate:()=>drawF(obj.p)},0);
    lis.forEach((li,i)=>mtl.call(()=>li.classList.add('on'),null,.3+i*(total-.6)/n));
    mtl.call(()=>{mPic.classList.add('done')},null,total);
    if(reduce){drawF(1);lis.forEach(l=>l.classList.add('on'));mPic.classList.add('done')}
  }else{ // layered reveal over the empty plate
    mPic.classList.remove('seq');const o={r:0};mPic.style.setProperty('--r','0%');
    lis.forEach((li,i)=>{const at=.25+i*((total-.5)/n);
      mtl.call(()=>li.classList.add('on'),null,at);
      mtl.to(o,{r:(i+1)/n*125,duration:(total-.5)/n*.95,ease:'power2.out',onUpdate:()=>mPic.style.setProperty('--r',o.r+'%')},at);
      mtl.fromTo(mImg,{scale:1.035},{scale:1,duration:.6,ease:'power2.out'},at)});
    mtl.call(()=>mPic.classList.add('done'),null,total);
    if(reduce){lis.forEach(l=>l.classList.add('on'));mPic.classList.add('done')}
  }
}
function closeModal(){if(mtl)mtl.kill();modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.documentElement.classList.remove('lock');openId=null}
document.getElementById('mClose').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.getElementById('mReplay').onclick=playModal;
document.getElementById('mAdd').onclick=e=>{if(openId){add(openId);const b=e.currentTarget;b.classList.add('pop');setTimeout(()=>b.classList.remove('pop'),500)}};
// swipe down to close on mobile
(function(){let y0=null;const box=modal.querySelector('.mbox');box.addEventListener('touchstart',e=>{y0=box.scrollTop<=0?e.touches[0].clientY:null},{passive:true});box.addEventListener('touchend',e=>{if(y0!=null&&e.changedTouches[0].clientY-y0>110)closeModal();y0=null})})();

/* ---------- Demo order tray ([Sample]: no payment, nothing sent) ---------- */
let cart={};try{cart=JSON.parse(localStorage.getItem('vy-cart')||'{}')}catch(e){}
Object.keys(cart).forEach(k=>{if(!ITEMS[k])delete cart[k]});
const tray=document.getElementById('tray'),scrim=document.getElementById('scrim'),tl=document.getElementById('trayList');
function save(){try{localStorage.setItem('vy-cart',JSON.stringify(cart))}catch(e){}}
function add(id){cart[id]=(cart[id]||0)+1;save();renderTray();const n=document.getElementById('cartN');n.classList.remove('bump');void n.offsetWidth;n.classList.add('bump')}
function renderTray(){
  const ids=Object.keys(cart);let sub=0,n=0;
  tl.innerHTML=ids.map(id=>{const q=cart[id],it=ITEMS[id],t=mi(id);sub+=q*it.p;n+=q;return `<li><span class="nm">${t.n}</span><span class="qty"><button type="button" data-a="-" data-id="${id.replace(/"/g,'&quot;')}" aria-label="−">−</button><b>${q}</b><button type="button" data-a="+" data-id="${id.replace(/"/g,'&quot;')}" aria-label="+">+</button></span><i>${money(q*it.p)}</i></li>`}).join('');
  document.getElementById('trayEmpty').style.display=n?'none':'block';
  document.getElementById('traySub').textContent=money(sub);document.getElementById('cartN').textContent=n;
  document.getElementById('trayPlace').disabled=!n;
}
tl.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;const id=b.dataset.id;cart[id]+=b.dataset.a==='+'?1:-1;if(cart[id]<=0)delete cart[id];save();renderTray()});
function openTray(o){tray.classList.toggle('open',o);scrim.classList.toggle('open',o);tray.setAttribute('aria-hidden',!o);if(o){document.getElementById('trayDone').classList.remove('on');if(openId)closeModal()}}
document.getElementById('cartBtn').onclick=()=>openTray(true);document.getElementById('trayX').onclick=scrim.onclick=()=>openTray(false);
document.getElementById('trayClear').onclick=()=>{cart={};save();renderTray()};
document.getElementById('trayPlace').onclick=()=>{cart={};save();renderTray();document.getElementById('trayDone').classList.add('on')};
addEventListener('keydown',e=>{if(e.key==='Escape'){if(openId)closeModal();else openTray(false)}});

/* ---------- Demo forms (never submit) ---------- */
document.getElementById('rform').addEventListener('submit',e=>{e.preventDefault();document.getElementById('rdone').classList.add('on')});
document.getElementById('catForm').addEventListener('submit',e=>{e.preventDefault();document.getElementById('catDone').classList.add('on')});

applyLang();

/* ---------- Misc motion ---------- */
const bar=document.getElementById('bar');
addEventListener('scroll',()=>{bar.style.width=(scrollY/(document.documentElement.scrollHeight-innerHeight)*100)+'%'},{passive:true});
if(!reduce){
  gsap.utils.toArray('.rv').forEach(el=>gsap.from(el,{y:46,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%'}}));
  gsap.from('.hero-copy > *',{y:40,opacity:0,duration:.9,stagger:.12,ease:'power3.out',delay:.15});
  gsap.from('.hero-plate',{scale:.8,opacity:0,duration:1.2,ease:'power3.out',delay:.2});
  gsap.to('.hero-plate',{y:-80,scale:.9,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  gsap.to('.marquee .track',{x:'-=160',ease:'none',scrollTrigger:{trigger:'.marquee',start:'top bottom',end:'bottom top',scrub:true}});
}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(!t)return;e.preventDefault();t.scrollIntoView({behavior:reduce?'auto':'smooth'})}));
})();
