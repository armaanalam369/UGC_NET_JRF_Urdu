(()=>{
const R=window.RULES,$=s=>document.querySelector(s),A=$('#app'),KEY='urdu_net_arena_v1';
let DB={};try{DB=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
DB.h=DB.h||[];DB.t=DB.t||'light';DB.f=DB.f||[];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ur=s=>/[\u0600-\u06FF]/.test(s);
const tx=s=>ur(s)?`<span class="ur" dir="rtl">${esc(s)}</span>`:esc(s);
const L='ABCD',PL=window.PAPER_LIST||[];
const years=[...new Set(PL.map(p=>p.year))].sort((a,b)=>b-a);
const S={v:'home',year:years[0],shift:1,mode:'exam',units:[],n:20};
let T=null,tick=null,POOL=null;
document.documentElement.dataset.theme=DB.t;
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200)};
window.PAPERS=window.PAPERS||{};
const load=e=>new Promise(r=>{const k=e.year+'-'+e.shift;if(PAPERS[k])return r(PAPERS[k]);const s=document.createElement('script');s.src=e.file;s.onload=()=>r(PAPERS[k]||null);s.onerror=()=>r(null);document.head.appendChild(s)});
const pool=async()=>{if(POOL)return POOL;await Promise.all(PL.map(load));POOL=[];Object.values(PAPERS).forEach(p=>p.questions.forEach(q=>POOL.push({...q,src:p.year+' S'+p.shift})));return POOL};
const un=u=>R.units[u-1]||{n:'Other',ur:'',i:'•'};

/* ---------- views ---------- */
const V={};
V.home=()=>{const h=DB.h,avg=h.length?Math.round(h.reduce((a,x)=>a+x.acc,0)/h.length):0;
return `<div class="hero"><p class="eyebrow">UGC NET · JRF · Paper II</p><div class="big">اردو</div><h1>Urdu NET Arena</h1><p class="mu">Practise by paper or master one chapter at a time.</p></div>
<div class="modes"><button class="mode a" data-a="nav" data-v="paper"><em>📜</em><b>Full Paper</b><span>Pick a year &amp; shift. Real exam feel.</span></button>
<button class="mode b" data-a="nav" data-v="chap"><em>📚</em><b>Chapter Quiz</b><span>Choose units. Quick focused practice.</span></button></div>
<div class="strip"><div><b>${h.length}</b><small>Tests taken</small></div><div><b>${avg}%</b><small>Avg accuracy</small></div><div><b>${DB.f.length}</b><small>Bookmarks</small></div></div>
${DB.f.length?`<button class="go" style="background:var(--em)" data-a="bm">🔖 Practise my bookmarks</button>`:''}`};

const modeSeg=()=>`<p class="lbl">Mode</p><div class="seg"><button class="${S.mode=='exam'?'on':''}" data-a="mode" data-v="exam">⏱ Exam</button><button class="${S.mode=='practice'?'on':''}" data-a="mode" data-v="practice">💡 Practice</button></div>`;
V.paper=()=>{const e=PL.find(p=>p.year==S.year&&p.shift==S.shift);
return `<p class="eyebrow">Full paper</p><h2>Choose your paper</h2><div class="card"><p class="lbl">Year</p><div class="row">${years.map(y=>`<button class="chip ${y==S.year?'on':''}" data-a="year" data-v="${y}">${y}</button>`).join('')}</div>
<p class="lbl">Attempt</p><div class="seg">${[1,2].map(s=>`<button class="${S.shift==s?'on':''}" data-a="shift" data-v="${s}">${R.shifts[s]}</button>`).join('')}</div>${modeSeg()}
<p class="mu">${R.examName}<br>${S.mode=='exam'?`${R.fullMinutes} min · ${R.marks} marks each${R.negative?` · −${R.negative} wrong`:' · no negative marking'}`:'No timer · instant answer &amp; explanation'}</p></div>
<button class="go" data-a="startp" ${e?'':'disabled'}>${e?'Start '+S.year+' · '+R.shifts[S.shift]+' →':'Paper not available'}</button>`};

V.chap=()=>{const cnt={};(POOL||[]).forEach(q=>cnt[q.u]=(cnt[q.u]||0)+1);
return `<p class="eyebrow">Chapter quiz</p><h2>Pick your chapters</h2><div class="row"><button class="chip" data-a="all">Select all</button><button class="chip" data-a="none">Clear</button></div>
<div class="units">${R.units.map((u,i)=>`<button class="u ${S.units.includes(i+1)?'on':''}" data-a="unit" data-v="${i+1}"><i>${u.i}</i><span><b>${i+1}. ${u.n}</b><small class="ur" dir="rtl" style="display:block;line-height:1.8">${u.ur}</small><small>${POOL?(cnt[i+1]||0)+' questions':'…'}</small></span></button>`).join('')}</div>
<div class="card" style="margin-top:16px"><p class="lbl">Questions</p><div class="row">${[10,20,30,0].map(n=>`<button class="chip ${S.n==n?'on':''}" data-a="num" data-v="${n}">${n||'All'}</button>`).join('')}</div>${modeSeg()}</div>
<button class="go" data-a="startc" ${S.units.length?'':'disabled'}>Start quiz (${S.units.length} unit${S.units.length==1?'':'s'}) →</button>`};

V.test=()=>{const q=T.qs[T.i],a=T.a[T.i],pr=T.mode=='practice',done=pr&&a>=0,last=T.i==T.qs.length-1;
document.body.classList.toggle('lit',0);$('.fab[data-a=flag]').classList.toggle('lit',DB.f.includes(fid(q)));
return `<div class="pill"><span>Q ${T.i+1}/${T.qs.length}</span><span class="tm" id="tm">${pr?'Practice':'--:--'}</span><span class="tag">${un(q.u).i} Unit ${q.u}</span></div>
<div class="bar"><i style="width:${(T.i+1)/T.qs.length*100}%"></i></div>
<div class="card"><p class="q">${tx(q.q)}</p>${q.o.map((o,i)=>`<button class="opt ${a==i?'sel':''} ${done?(i==q.a?'ok':a==i?'no':''):''}" data-a="opt" data-v="${i}"><s>${L[i]}</s><span>${tx(o)}</span></button>`).join('')}
${done&&q.e?`<div class="exp">💡 ${tx(q.e)}</div>`:''}</div>
<div class="tbar"><button data-a="prev" ${T.i?'':'disabled'}>← Prev</button>${last?'<button class="sb" data-a="submit">Submit</button>':'<button class="nx" data-a="next">Next →</button>'}</div>`};

V.result=()=>{const r=T.r,pc=Math.max(0,Math.round(r.sc/r.max*100));
return `<p class="eyebrow">${esc(T.title)}</p><h2>Result</h2><div class="card" style="text-align:center"><div class="ring" style="--p:${pc}"><div><span><b>${r.sc}</b><br><small>of ${r.max}</small></span></div></div>
<div class="strip"><div><b style="color:var(--em2)">${r.ok}</b><small>Correct</small></div><div><b style="color:var(--ro)">${r.no}</b><small>Wrong</small></div><div><b>${r.sk}</b><small>Skipped</small></div></div>
<p class="mu">Accuracy ${r.acc}% · Time ${r.time}</p></div>
<div class="card"><h3 style="margin-bottom:10px">Chapter-wise</h3>${unitBars(r.u)}</div>
<button class="go" data-a="review">Review answers</button>${r.no?`<button class="go" style="background:var(--em)" data-a="retry">Retry wrong ones</button>`:''}<button class="go" style="background:var(--tx);color:var(--bg)" data-a="nav" data-v="home">Home</button>`};
const unitBars=u=>Object.keys(u).sort((a,b)=>a-b).map(k=>{const [r,t]=u[k],p=Math.round(r/t*100);return `<div class="ub"><div><span>${un(k).i} ${un(k).n}</span><span>${r}/${t}</span></div><div class="bar" style="margin:0"><i style="width:${p}%;${p<50?'background:var(--ro)':''}"></i></div></div>`}).join('')||'<p class="mu">No data yet</p>';

V.review=()=>`<p class="eyebrow">Review</p><h2>Your answers</h2>${T.qs.map((q,i)=>{const a=T.a[i];return `<div class="card"><span class="tag">Q${i+1} · ${un(q.u).n}${q.src?' · '+q.src:''}</span><p class="q" style="margin-top:10px">${tx(q.q)}</p>${q.o.map((o,j)=>`<div class="opt ${j==q.a?'ok':a==j?'no':''}"><s>${L[j]}</s><span>${tx(o)}</span></div>`).join('')}${q.e?`<div class="exp">💡 ${tx(q.e)}</div>`:''}</div>`}).join('')}<button class="go" data-a="back">← Back to result</button>`;

V.stats=()=>{const u={};DB.h.forEach(h=>Object.entries(h.u).forEach(([k,[r,t]])=>{u[k]=u[k]||[0,0];u[k][0]+=r;u[k][1]+=t}));
return `<p class="eyebrow">Progress</p><h2>Your analytics</h2><div class="card"><h3 style="margin-bottom:10px">Chapter strength</h3>${unitBars(u)}</div>
<div class="card"><h3>Recent tests</h3>${DB.h.slice(0,12).map(h=>`<div class="h"><span><b>${esc(h.t)}</b><br><small class="mu">${h.d}</small></span><span class="tag">${h.sc}/${h.max} · ${h.acc}%</span></div>`).join('')||'<p class="mu" style="margin-top:8px">Take a test to see your history.</p>'}</div>
${DB.h.length?'<button class="chip" data-a="clear">🗑 Clear history</button>':''}`};

/* ---------- engine ---------- */
const fid=q=>(q.src||'')+'|'+q.q.slice(0,60);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=s=>String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function begin(qs,title,mins){if(!qs.length)return toast('No questions available yet');
T={qs,a:qs.map(()=>-1),i:0,mode:S.mode,title,t0:Date.now(),end:S.mode=='exam'&&mins?Date.now()+mins*6e4:0};
clearInterval(tick);tick=setInterval(()=>{const el=$('#tm');if(!T||!T.end||!el)return;const l=Math.round((T.end-Date.now())/1e3);el.textContent=mmss(Math.max(0,l));if(l<=0)finish()},1000);go('test')}
function finish(){clearInterval(tick);let ok=0,no=0,u={};
T.qs.forEach((q,i)=>{const a=T.a[i];u[q.u]=u[q.u]||[0,0];u[q.u][1]++;if(a<0)return;if(a==q.a){ok++;u[q.u][0]++}else no++});
const sc=+(ok*R.marks-no*R.negative).toFixed(2),max=T.qs.length*R.marks,sk=T.qs.length-ok-no;
T.r={ok,no,sk,sc,max,u,acc:Math.round(ok/T.qs.length*100),time:mmss(Math.round((Date.now()-T.t0)/1e3))};
DB.h.unshift({t:T.title,d:new Date().toLocaleDateString(),sc,max,acc:T.r.acc,u});DB.h=DB.h.slice(0,60);save();go('result')}
function go(v){S.v=v;document.body.classList.toggle('intest',v=='test');document.querySelectorAll('.dock button').forEach(b=>b.classList.toggle('on',b.dataset.v==v));
closeSheet();A.style.animation='none';A.offsetHeight;A.style.animation='';A.innerHTML=V[v]();scrollTo({top:0})}
const closeSheet=()=>document.body.classList.remove('sh');
function palette(){$('#sheet').innerHTML=`<h3 style="margin-bottom:12px">Question palette</h3><div class="dots">${T.qs.map((q,i)=>`<button data-a="jump" data-v="${i}" class="${T.a[i]>=0?'a':''} ${DB.f.includes(fid(q))?'f':''} ${i==T.i?'c':''}">${i+1}</button>`).join('')}</div><p class="mu" style="margin-top:14px">Green = answered · Gold ring = bookmarked</p>`;document.body.classList.toggle('sh')}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v,re=()=>go(S.v);
switch(a){
case'nav':if(T&&S.v=='test'&&!confirm('Leave this test?'))return;clearInterval(tick);T=T&&S.v=='test'?null:T;if(v=='chap'){await pool()}go(v);break;
case'theme':DB.t=DB.t=='dark'?'light':'dark';document.documentElement.dataset.theme=DB.t;save();break;
case'year':S.year=+v;re();break;case'shift':S.shift=+v;re();break;case'mode':S.mode=v;re();break;
case'num':S.n=+v;re();break;case'all':S.units=R.units.map((_,i)=>i+1);re();break;case'none':S.units=[];re();break;
case'unit':v=+v;S.units=S.units.includes(v)?S.units.filter(x=>x!=v):[...S.units,v];re();break;
case'startp':{const e=PL.find(p=>p.year==S.year&&p.shift==S.shift),p=await load(e);if(!p)return toast('Paper file not found');begin(p.questions.map(q=>({...q,src:p.year+' S'+p.shift})),p.title,R.fullMinutes);break}
case'startc':{const q=(await pool()).filter(x=>S.units.includes(x.u));const s=shuffle(q).slice(0,S.n||q.length);begin(s,'Chapter Quiz ('+S.units.length+' units)',Math.ceil(s.length*R.fullMinutes/100));break}
case'bm':{const q=(await pool()).filter(x=>DB.f.includes(fid(x)));S.mode='practice';begin(q,'Bookmarked questions',0);break}
case'opt':if(T.mode=='practice'&&T.a[T.i]>=0)return;T.a[T.i]=T.a[T.i]==+v&&T.mode=='exam'?-1:+v;re();break;
case'next':T.i++;re();break;case'prev':T.i--;re();break;
case'flag':{const k=fid(T.qs[T.i]);DB.f=DB.f.includes(k)?DB.f.filter(x=>x!=k):[...DB.f,k];save();$('.fab[data-a=flag]').classList.toggle('lit',DB.f.includes(k));toast(DB.f.includes(k)?'Bookmarked 🔖':'Bookmark removed');break}
case'pal':if(T&&S.v=='test')palette();else closeSheet();break;
case'jump':T.i=+v;re();break;
case'submit':{const sk=T.a.filter(x=>x<0).length;if(sk&&!confirm(sk+' unanswered. Submit anyway?'))return;finish();break}
case'exit':if(confirm('Exit and submit this test now?'))finish();break;
case'review':go('review');break;case'back':go('result');break;
case'retry':{const w=T.qs.filter((q,i)=>T.a[i]>=0&&T.a[i]!=q.a);S.mode='practice';begin(w,'Retry: wrong answers',0);break}
case'clear':if(confirm('Delete all history?')){DB.h=[];save();re()}break}});
go('home');
})();
