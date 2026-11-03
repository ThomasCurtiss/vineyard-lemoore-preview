(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMob=()=>innerWidth<820;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
gsap.registerPlugin(ScrollTrigger);

/* ---------- Scroll-scrubbed image sequences (canvas) ---------- */
const FRAME_AR=16/9;
function Seq(section){
  const key=section.dataset.seq, cv=section.querySelector('.cv'), ctx=cv.getContext('2d');
  const loadBar=section.querySelector('.loader i'), loader=section.querySelector('.loader');
  const mobile=isMob();
  const N=+(mobile?section.dataset.nm:section.dataset.n);
  const path=i=>`assets/seq/${key}/${mobile?'m':'d'}/f${String(i+1).padStart(3,'0')}.jpg`;
  const imgs=new Array(N);let loaded=0,started=false,failed=0,W=0,H=0,dpr=1,progress=0,shown=0,vis=false;
  function resize(){dpr=Math.min(devicePixelRatio||1,mobile?1.5:2);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  addEventListener('resize',()=>{resize()});resize();
  function load(){
    if(started)return;started=true;
    const order=[...Array(N).keys()];
    order.sort((a,b)=>(a%6===0?-1:0)-(b%6===0?-1:0)||a-b);
    order.forEach(i=>{const im=new Image();im.decoding='async';
      im.onload=()=>{imgs[i]=im;loaded++;if(loadBar)loadBar.style.width=(loaded/N*100)+'%';if(loaded>=N)loader&&loader.classList.add('done')};
      im.onerror=()=>{failed++};im.src=path(i)});
  }
  new IntersectionObserver(es=>{es.forEach(e=>{vis=e.isIntersecting;if(vis)load()})},{rootMargin:'150% 0px'}).observe(section);
  const get=i=>{i=clamp(i,0,N-1);for(let d=0;d<N;d++){if(imgs[i-d])return imgs[i-d];if(imgs[i+d])return imgs[i+d]}return null};
  const focus=+section.dataset.focus||.5;
  function layout(im){
    const fw=im.width,fh=im.height;let s,x,y,sw,sh;
    if(mobile){sw=W;sh=W*fh/fw;s=1;x=0;y=Math.max(46,H*.04)}
    else{const mult=key==='flame'?Math.max(W/fw,H/fh):Math.min(H/fh*1.04,W/fw*1.2);
      sh=fh*mult;sw=fw*mult;y=(H-sh)/2;
      let cx=W*.64;if(key==='flame')cx=W*.5;else if(key==='burger'){const k=clamp((progress-.72)/.12);cx=W*(.64-.26*k*k*(3-2*k))}x=cx-sw*focus}
    return {x,y,sw,sh}
  }
  function draw(p){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050403';ctx.fillRect(0,0,W,H);
    const f=clamp(p)*(N-1),i0=Math.floor(f),a=f-i0;
    const A=get(i0);if(!A)return;const t=layout(A);
    ctx.drawImage(A,t.x,t.y,t.sw,t.sh);
    const B=a>.02?get(i0+1):null;if(B&&B!==A){ctx.globalAlpha=a;ctx.drawImage(B,t.x,t.y,t.sw,t.sh);ctx.globalAlpha=1}
    // soften hard frame edges when the frame doesn't cover the stage
    const g=ctx.createLinearGradient(t.x,0,t.x+Math.min(80,t.sw*.1),0);
    if(t.x>0){ctx.fillStyle='#050403';ctx.fillRect(0,0,t.x,H)}
    if(t.x+t.sw<W){ctx.fillStyle='#050403';ctx.fillRect(t.x+t.sw,0,W-t.x-t.sw,H)}
  }
  // chapters
  const chaps=[...section.querySelectorAll('.chap')],dots=[...section.querySelectorAll('.dots i')];
  const WIDTH=chaps.length>5?.115:.2;
  function layoutChaps(p){
    let best=0,bo=-1;
    chaps.forEach((c,i)=>{
      const ctr=parseFloat(c.dataset.c);let d=(p-ctr)/WIDTH;
      if(c.dataset.first&&d<0)d=0;if(c.dataset.last&&d>0)d=0;
      const o=Math.max(0,1-Math.pow(Math.abs(d),2.2));
      c.style.opacity=o.toFixed(3);c.style.transform=`translate3d(0,${(-d*(mobile?50:110)).toFixed(1)}px,0)`;c.style.visibility=o<.01?'hidden':'visible';
      if(o>bo){bo=o;best=i}
    });
    dots.forEach((d,i)=>d.classList.toggle('on',i===best));
  }
  const blist=section.querySelector('.burgerlist'),bitems=blist?[...blist.children]:[];
  const ftype=section.querySelector('.flame-type'),fcard=section.querySelector('.flame-card');
  function extras(p){
    if(blist){const o=clamp((p-.80)/.08);blist.style.opacity=o;blist.style.visibility=o<.01?'hidden':'visible';
      const k=clamp((p-.84)/.16);const idx=Math.min(bitems.length-1,Math.floor(k*bitems.length));bitems.forEach((li,i)=>li.classList.toggle('on',i===idx))}
    if(ftype){const z=1+p*.35;ftype.style.transform=`scale(${z.toFixed(3)}) translateY(${(-p*40).toFixed(1)}px)`;ftype.style.opacity=(1-clamp((p-.72)/.2)*.85).toFixed(2)}
    if(fcard){const o=clamp((p-.45)/.2);fcard.style.opacity=o;fcard.style.transform=`translateY(${(1-o)*40}px)`}
  }
  ScrollTrigger.create({trigger:section,start:'top top',end:'bottom bottom',onUpdate:s=>{progress=s.progress}});
  function tick(){
    if(vis){shown+=(progress-shown)*(reduce?1:.14);if(Math.abs(progress-shown)<.0004)shown=progress;draw(shown);layoutChaps(shown);extras(shown)}
    requestAnimationFrame(tick)
  }
  // fallback: if every frame failed, show first/last poster via CSS background
  setTimeout(()=>{if(started&&loaded===0&&failed>0){cv.style.display='none';section.querySelector('.stage').style.background=`#050403 url(assets/seq/${key}/d/f${String(N).padStart(3,'0')}.jpg) center/cover`}},6000);
  requestAnimationFrame(tick);
  return {setProgress:v=>{progress=v;shown=v}};
}
window.__seqs=[...document.querySelectorAll('[data-seq]')].map(Seq);
window.__setProgress=(i,v)=>window.__seqs[i].setProgress(v);

/* ---------- Menu data (real items & prices from thevineyardlemoore.com) ---------- */
const CATS={
 'Burgers':[['Classic Hamburger','Our classic burger','15.99'],['Bubba’s Cheese Burger','American & jack cheese','16.49'],['Bacon Cheeseburger','Two strips of bacon and American cheese','16.99'],['Western Burger','BBQ sauce, onion rings, bacon, American cheese','17.29'],['Good Morning Burger','Two fried eggs, thick bacon, hashbrowns, cheddar','18.59'],['Patty Melt','Angus beef patty, American & jack, grilled onions on rye','15.49']],
 'Breakfast':[['Farmers Skillet','Home fries, diced sausage, peppers, onions, tomatoes, two eggs, jack & cheddar, homemade salsa','14.99'],['Chicken Fried Steak & Eggs','Chicken fried steak with country gravy and two eggs','15.99'],['Traditional Eggs Benedict','Two poached eggs on grilled English muffin with ham & hollandaise','16.50'],['Country Skillet','Huge homemade buttermilk biscuit, two scrambled eggs, sausage gravy','14.50'],['Honey Butter Pancakes','Pancakes grilled with honey butter','11.99'],['Denver Omelet','Diced ham, onions & bell peppers with jack and cheddar','14.99']],
 'Starters & Salads':[['Cobb Salad','Turkey, bacon, tomatoes, cucumber, blue cheese, red onions','15.69'],['Fiesta Salad','Chicken or steak, fire-roasted corn, avocado, chipotle ranch','17.99'],['Potato Skins','Bacon, jack & cheddar, green onions','14.29'],['Wings','8 regular or 10 boneless — Cajun, lemon pepper, buffalo, garlic parmesan, BBQ or teriyaki','16.99'],['Fried Pickles','Served with chipotle ranch','12.99'],['Soup of the Day','Daily vegetable beef; Friday clam chowder (bowl)','10.49']],
 'Entrées':[['Lemon Herb Chicken','Two seasoned chicken breasts, potato, soup or salad, bread','19.49'],['Chicken Fried Steak','Tender steak, breaded and fried, country gravy','21.99'],['Spaghetti & Meat Balls','With our award winning sauce & garlic bread','19.99'],['Grilled Salmon','Seasoned grilled salmon','24.99'],['Steak & Shrimp','8 oz top sirloin & 4 deep fried shrimp','26.99'],['Rib Eye','14 oz Choice rib eye, great marbling','35.59']],
 'Seasoned Citizens':[['8 oz Vineyard Steak#sc','Special-cut sirloin; soup or salad, potato, bread','15.99'],['Char Broiled Chicken Breast','Soup or salad, potato, bread','15.99'],['Meatloaf','Homestyle, with soup or salad','15.99'],['Crispy Fried Cod','Soup or salad, potato, bread','15.99']],
 'Bar & Sweet':[['Bloody Mary','','10.99'],['Mimosa','','8.50'],['Cheese Cake','Strawberry, caramel or chocolate topping','10.99'],['Ice Cream Sundae','Chocolate, hot fudge, caramel or strawberry','7.99'],['Cinnamon Sugar Chips','Fried tortilla chips, vanilla ice cream, chocolate & caramel','10.99']]
};
const ITEMS={};
Object.values(CATS).flat().forEach(m=>ITEMS[m[0]]={id:m[0],en:m[0].replace('#sc',''),d:m[1],p:+m[2]});
ITEMS['8 oz Vineyard Steak']={id:'8 oz Vineyard Steak',en:'8 oz Vineyard Steak',d:'Special-cut sirloin',p:23.29};
ITEMS['12 oz Vineyard Steak']={id:'12 oz Vineyard Steak',en:'12 oz Vineyard Steak',d:'Special-cut sirloin',p:24.99};

/* ---------- i18n ---------- */
const D=window.I18N,SUP=D.langs.map(l=>l[0]);
let lang='en';
try{const s=localStorage.getItem('vy-lang');if(SUP.includes(s))lang=s;else{const n=(navigator.language||'en').toLowerCase();lang=n.startsWith('es')?'es':n.startsWith('pt')?'pt':n.startsWith('zh')?'zh-HK':(n.startsWith('fil')||n.startsWith('tl'))?'fil':'en'}}catch(e){}
const U=k=>(D.ui[lang]&&D.ui[lang][k])||D.ui.en[k]||'';
const mi=id=>{const it=ITEMS[id];const t=D.menu[lang]&&D.menu[lang][id];if(t){const [n,d]=t.split('|');return {n,d}}return {n:it.en,d:it.d}};
const money=v=>'$'+v.toFixed(2);
const sel=document.getElementById('lang');
D.langs.forEach(([c,n])=>{const o=document.createElement('option');o.value=c;o.textContent=n;sel.appendChild(o)});
let curCat='Burgers';
function applyLang(){
  document.documentElement.lang=lang;sel.value=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{const v=U(el.dataset.i18n);if(v)el.innerHTML=v});
  document.querySelectorAll('[data-mi]').forEach(li=>{const it=ITEMS[li.dataset.mi.replace('&amp;','&')];if(!it)return;const t=mi(it.id);li.innerHTML=`<b>${t.n}</b><span>${t.d}</span><i>${money(it.p)}</i>`});
  document.getElementById('cartBtn').setAttribute('aria-label',U('o_h'));
  buildTabs();show(curCat,true);renderTray();
  document.title=lang==='en'?'The Vineyard — Lemoore, CA · Motion concept':'The Vineyard — Lemoore, CA';
  ScrollTrigger.refresh();
}
sel.addEventListener('change',()=>{lang=sel.value;try{localStorage.setItem('vy-lang',lang)}catch(e){}applyLang()});

/* ---------- Menu tabs + cards ---------- */
const tabs=document.getElementById('tabs'),grid=document.getElementById('mgrid');
function buildTabs(){tabs.innerHTML='';Object.keys(CATS).forEach(c=>{const b=document.createElement('button');b.type='button';b.innerHTML=U('cat_'+c);b.dataset.c=c;b.onclick=()=>show(c);tabs.appendChild(b)})}
function show(cat,quiet){curCat=cat;[...tabs.children].forEach(b=>b.classList.toggle('on',b.dataset.c===cat));
  grid.innerHTML=CATS[cat].map(m=>{const t=mi(m[0]);return `<article class="mi"><h3>${t.n}</h3><b>${money(+m[2])}</b>${t.d?`<p>${t.d}</p>`:''}<button type="button" class="add" data-id="${m[0].replace(/"/g,'&quot;')}" aria-label="${U('add')}: ${t.n}">+ ${U('add')}</button></article>`}).join('');
  if(!reduce&&!quiet)gsap.from('.mi',{y:30,opacity:0,duration:.5,stagger:.05,ease:'power3.out'})}
grid.addEventListener('click',e=>{const b=e.target.closest('.add');if(!b)return;add(b.dataset.id);b.classList.add('pop');setTimeout(()=>b.classList.remove('pop'),500)});

/* ---------- Demo order tray ([Sample]: no payment, nothing sent) ---------- */
let cart={};try{cart=JSON.parse(localStorage.getItem('vy-cart')||'{}')}catch(e){}
Object.keys(cart).forEach(k=>{if(!ITEMS[k])delete cart[k]});
const tray=document.getElementById('tray'),scrim=document.getElementById('scrim'),tl=document.getElementById('trayList');
function save(){try{localStorage.setItem('vy-cart',JSON.stringify(cart))}catch(e){}}
function add(id){cart[id]=(cart[id]||0)+1;save();renderTray();const n=document.getElementById('cartN');n.classList.remove('bump');void n.offsetWidth;n.classList.add('bump')}
function renderTray(){
  const ids=Object.keys(cart);let sub=0,n=0;
  tl.innerHTML=ids.map(id=>{const q=cart[id],it=ITEMS[id],t=mi(id);sub+=q*it.p;n+=q;return `<li><span class="nm">${t.n}</span><span class="qty"><button type="button" data-a="-" data-id="${id}" aria-label="−">−</button><b>${q}</b><button type="button" data-a="+" data-id="${id}" aria-label="+">+</button></span><i>${money(q*it.p)}</i></li>`}).join('');
  document.getElementById('trayEmpty').style.display=n?'none':'block';
  document.getElementById('traySub').textContent=money(sub);document.getElementById('cartN').textContent=n;
  document.getElementById('trayPlace').disabled=!n;
}
tl.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;const id=b.dataset.id;cart[id]+=b.dataset.a==='+'?1:-1;if(cart[id]<=0)delete cart[id];save();renderTray()});
function openTray(o){tray.classList.toggle('open',o);scrim.classList.toggle('open',o);tray.setAttribute('aria-hidden',!o);if(o)document.getElementById('trayDone').classList.remove('on')}
document.getElementById('cartBtn').onclick=()=>openTray(true);document.getElementById('trayX').onclick=scrim.onclick=()=>openTray(false);
document.getElementById('trayClear').onclick=()=>{cart={};save();renderTray()};
document.getElementById('trayPlace').onclick=()=>{document.getElementById('trayDone').classList.add('on');cart={};save();renderTray();document.getElementById('trayDone').classList.add('on')};
addEventListener('keydown',e=>{if(e.key==='Escape')openTray(false)});

/* ---------- Reservation form (demo — never submits) ---------- */
document.getElementById('rform').addEventListener('submit',e=>{e.preventDefault();document.getElementById('rdone').classList.add('on')});

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
