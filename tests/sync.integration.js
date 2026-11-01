const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// ---- in-memory fake Supabase backend
const DB={brain_entries:[],brain_files:[],brain_meta:[]},STORE={};let clock=Date.now();const USER={id:'11111111-1111-1111-1111-111111111111',email:'t@x.com'};
const pk=t=>t==='brain_meta'?'key':'id';
function be(op,a){
 if(op==='query'){let rows=DB[a.t].filter(r=>a.filters.every(([k,v])=>r[k]===v));
  if(a.gt)rows=rows.filter(r=>r[a.gt[0]]>a.gt[1]);
  if(a.order)rows=[...rows].sort((x,y)=>String(x[a.order[0]]).localeCompare(String(y[a.order[0]]))*(a.order[1]?1:-1));
  if(a.range)rows=rows.slice(a.range[0],a.range[1]+1);if(a.limit)rows=rows.slice(0,a.limit);
  if(a.single)return {data:rows[0]||null,error:null};return {data:JSON.parse(JSON.stringify(rows)),error:null};}
 if(op==='upsert'){for(const r of a.rows){const i=DB[a.t].findIndex(x=>x.user_id===r.user_id&&x[pk(a.t)]===r[pk(a.t)]);clock+=1000;const n={...r,server_ts:new Date(clock).toISOString()};if(i>=0)DB[a.t][i]=n;else DB[a.t].push(n);}return {error:null};}
 if(op==='upload'){if(STORE[a.path]&&!a.upsert)return {error:{message:'already exists'}};STORE[a.path]=a.b64;return {error:null};}
 if(op==='download'){return STORE[a.path]?{b64:STORE[a.path]}:{error:{message:'not found'}};}
 if(op==='remove'){for(const p of a.paths)delete STORE[p];return {error:null};}
}
const MOCK=`(()=>{const B=(t)=>{const s={t,filters:[],gt:null,order:null,range:null,limit:null,single:false};
 const b={select(){return b},eq(k,v){s.filters.push([k,v]);return b},gt(k,v){s.gt=[k,v];return b},order(k,o){s.order=[k,o?.ascending!==false];return b},range(a,c){s.range=[a,c];return b},limit(n){s.limit=n;return b},maybeSingle(){s.single=true;return b},
  upsert(rows){return window.__be('upsert',{t,rows:Array.isArray(rows)?rows:[rows]})},then(res,rej){return window.__be('query',s).then(res,rej)}};return b};
 const blobToB64=async bl=>{const ab=await bl.arrayBuffer();let s='';new Uint8Array(ab).forEach(c=>s+=String.fromCharCode(c));return btoa(s)};
 window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:${JSON.stringify(USER)}},error:null}),onAuthStateChange(){},signOut:async()=>({error:null})},from:B,
  storage:{from:()=>({upload:async(path,blob,o)=>window.__be('upload',{path,b64:await blobToB64(blob),upsert:o?.upsert}),
   download:async(path)=>{const r=await window.__be('download',{path});if(r.error)return r;const bin=atob(r.b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return {data:new Blob([u]),error:null}},
   remove:async(paths)=>window.__be('remove',{paths})})}})}})()`;
const srv=http.createServer((q,r)=>{let p=path.join(__dirname,'..','www',q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){r.statusCode=404;r.end();return;}r.setHeader('content-type',p.endsWith('.html')?'text/html;charset=utf-8':p.endsWith('.js')?'text/javascript':'text/css');r.end(d);});}).listen(8097,async()=>{
 const b=await chromium.launch();const errs=[];let ok=0,bad=0;const chk=(n,c)=>{console.log(c?'PASS':'FAIL',n);c?ok++:bad++;};
 async function device(name){const ctx=await b.newContext();const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message));pg.on('dialog',d=>d.accept('TestPass#2026xyz'));
  await pg.exposeFunction('__be',(op,a)=>be(op,a));
  await pg.addInitScript(`localStorage.setItem('second_brain_supabase_config_v1',JSON.stringify({url:'https://abc.supabase.co',key:'sb_publishable_testkey123'}));`);
  await pg.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'text/javascript',body:MOCK+';window.dispatchEvent(new Event("secondbrain-cloud-library-ready"))'}));
  await pg.goto('http://localhost:8097/');await pg.waitForTimeout(1200);return pg;}
 const A=await device('A'),Bd=await device('B');
 const nowIso=()=>new Date().toISOString();
 // ---- Device A creates data
 await A.evaluate(async()=>{const n=new Date().toISOString();
  await putRow('entries',{id:'e1',section:'expenses',createdAt:n,updatedAt:n,title:'غداء',amount:15000,category:'طعام',date:'2026-11-01'});
  await putRow('entries',{id:'t1',section:'todo',createdAt:n,updatedAt:n,title:'مراجعة',due:'2026-12-01T10:00',priority:'عادية',repeat:'بدون',lead:'عند الموعد',done:false});
  await putRow('files',{id:'f1',name:'a.pdf',mime:'application/pdf',encrypted:false,blob:new Blob([new Uint8Array([1,2,3,4,5])],{type:'application/pdf'})});
  await putRow('entries',{id:'l1',section:'library',createdAt:n,updatedAt:n,title:'كتاب',owner:'مكتبتي',status:'لم أبدأ',attachmentId:'f1'});
  await setupSecurity('TestPass#2026xyz');
  await refresh();});
 await A.evaluate(()=>cloudSync(true));
 chk('A uploaded 3 entries',DB.brain_entries.filter(r=>!r.deleted).length===3);
 chk('A uploaded file + storage object',DB.brain_files.length===1&&Object.keys(STORE).length===1);
 chk('A uploaded vault security meta',DB.brain_meta.some(m=>m.key==='security'));
 // ---- Device B first sync
 await Bd.evaluate(()=>cloudSync(true));
 const bState=await Bd.evaluate(async()=>({e:(await getAll('entries')).map(x=>x.id).sort(),f:(await getAll('files')).map(x=>x.id),sec:!!(await getMeta('security'))}));
 chk('B got entries',JSON.stringify(bState.e)===JSON.stringify(['e1','l1','t1']));
 chk('B got file',bState.f.length===1&&bState.f[0]==='f1');
 chk('B got vault key material',bState.sec);
 const sz=await Bd.evaluate(async()=>(await getAll('files'))[0].blob.size);chk('B file bytes intact',sz===5);
 // ---- B deletes the library entry (with attachment) -> A must lose both
 await Bd.evaluate(async()=>{await deleteEntry('l1');});
 await Bd.evaluate(()=>cloudSync(true));
 chk('cloud marks file deleted + storage object removed',DB.brain_files[0].deleted===true&&Object.keys(STORE).length===0);
 await A.evaluate(()=>cloudSync(false));
 const aState=await A.evaluate(async()=>({e:(await getAll('entries')).map(x=>x.id).sort(),f:(await getAll('files')).length}));
 chk('A (delta sync) removed entry',!aState.e.includes('l1'));
 chk('A removed the orphan attachment',aState.f===0);
 // ---- no resurrection of the file on later syncs
 await A.evaluate(()=>cloudSync(true));await Bd.evaluate(()=>cloudSync(true));
 chk('deleted file does not come back',(await Bd.evaluate(async()=>(await getAll('files')).length))===0&&Object.keys(STORE).length===0);
 // ---- delta edit A -> B
 await new Promise(r=>setTimeout(r,1100));
 await A.evaluate(async()=>{const r=(await getAll('entries')).find(x=>x.id==='t1');r.title='مراجعة معدلة';r.updatedAt=new Date().toISOString();await putRow('entries',r);});
 await A.evaluate(()=>cloudSync(false));
 await Bd.evaluate(()=>cloudSync(false));
 chk('edit reaches B via delta sync',(await Bd.evaluate(async()=>(await getAll('entries')).find(x=>x.id==='t1').title))==='مراجعة معدلة');
 // ---- vault entry stays encrypted in cloud
 await A.evaluate(async()=>{const n=new Date().toISOString();await refresh();await putRow('entries',{id:'p1',section:'passwords',createdAt:n,updatedAt:n,encrypted:await encryptJSON({site:'bank',secret:'SUPERSECRET'})});});
 await A.evaluate(async()=>{await refresh();});await A.evaluate(()=>cloudSync(true));
 const before=await A.evaluate(()=>JSON.stringify(window.viewEntries).includes('SUPERSECRET'));chk('vault entry visible while unlocked',before);
 // ---- lock clears decrypted views
 const lock=await A.evaluate(async()=>{await lockSecurity();return {key:masterKey===null,plain:JSON.stringify(window.viewEntries).includes('SUPERSECRET')};});
 chk('lock wipes key and plaintext from memory',lock.key&&!lock.plain);
 console.log('cloud payload contains plaintext secret:',JSON.stringify(DB).includes('SUPERSECRET'));
 console.log(`\n${ok} passed, ${bad} failed | page errors:`,errs.length?errs:'none');
 await b.close();srv.close();});
