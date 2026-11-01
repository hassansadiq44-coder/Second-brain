/*PARSER-START*/
// Offline Iraqi/Arabic command parser. Pure functions: no DOM, no storage. Produces reviewable drafts only.
const ARL='\\u0621-\\u064a';
const NB='(?<![A-Za-z0-9'+ARL+'])', NA='(?![A-Za-z0-9'+ARL+'])';
const W=(src,fl='')=>new RegExp(NB+'(?:'+src+')'+NA,fl);
const WP=(src,fl='')=>new RegExp(NB+'[وفبلك]?(?:'+src+')'+NA,fl);
function cleanText(v){return String(v||'').normalize('NFC').replace(/[ً-ٰٟـ]/g,'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/(\d)[,٬](?=\d{3}(?!\d))/g,'$1').replace(/٫/g,'.').replace(/\s+/g,' ').trim();}
function norm1(t){return t.replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/چ/g,'ج').replace(/پ/g,'ب').replace(/گ/g,'ك').replace(/ڤ/g,'ف').replace(/ؤ/g,'و').replace(/ئ/g,'ي');}
function prep(raw){const clean=cleanText(raw).slice(0,6000);return {clean,s:norm1(clean)};}
function normalizeArabic(v){return prep(v).s;}
function dateValue(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function localStamp(d){return dateValue(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function mkDate(y,m,d){const dt=new Date(y,m-1,d,12,0,0);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?dt:null;}
function addDays(base,n){return new Date(base.getFullYear(),base.getMonth(),base.getDate()+n,12,0,0);}
function tokenize(s){const out=[];const re=/\d+(?:\.\d+)?|[ء-ي]+|[^\s]/g;let m;while((m=re.exec(s)))out.push({t:m[0],i:m.index,e:m.index+m[0].length});return out;}

const UNITS={واحد:1,واحده:1,وحده:1,وحد:1,اثنين:2,اثنان:2,اتنين:2,ثنين:2,اثنتين:2,ثنتين:2,ثلاثه:3,ثلاث:3,اربعه:4,اربع:4,خمسه:5,خمس:5,سته:6,ست:6,سبعه:7,سبع:7,ثمانيه:8,ثماني:8,ثمان:8,ثمنيه:8,ثمن:8,تسعه:9,تسع:9,عشره:10,عشر:10,
 الاولي:1,الاوله:1,الواحده:1,الثانيه:2,الثالثه:3,الرابعه:4,الخامسه:5,السادسه:6,السابعه:7,الثامنه:8,التاسعه:9,العاشره:10,الحاديه:11,
 احدعش:11,احداعش:11,حداعش:11,حدعش:11,اثنعش:12,اثناعش:12,اطنعش:12,طنعش:12,ثنعش:12,ثلطعش:13,ثلثطعش:13,اربعطعش:14,خمسطعش:15,خمستعش:15,سطعش:16,ستعش:16,سبعطعش:17,سبعتعش:17,ثمنطعش:18,ثمانطعش:18,تسعطعش:19,تسعتعش:19};
const TENS={عشرين:20,ثلاثين:30,اربعين:40,خمسين:50,ستين:60,سبعين:70,ثمانين:80,تسعين:90};
function hundredsOf(w){if(/^(?:ميه|مايه)$/.test(w))return 100;if(/^(?:ميتين|ميتان|مايتين)$/.test(w))return 200;const m=w.match(/^(ثلث|ثلاث|اربع|خمس|ست|سبع|ثمن|ثمان|تسع)(?:ميه|مايه)$/);return m?({ثلث:3,ثلاث:3,اربع:4,خمس:5,ست:6,سبع:7,ثمن:8,ثمان:8,تسع:9}[m[1]]*100):null;}
function numToken(t){
 if(/^\d+(?:\.\d+)?$/.test(t))return {k:'n',v:Number(t)};
 if(t==='الف'||t==='الاف')return {k:'mult',v:1000};
 if(t==='الفين'||t==='الفان')return {k:'fix',v:2000};
 if(t==='مليون')return {k:'mult',v:1e6};
 if(t==='مليونين')return {k:'fix',v:2e6};
 if(t==='نص'||t==='نصف')return {k:'frac',v:.5};
 if(t==='ربع')return {k:'frac',v:.25};
 if(Object.prototype.hasOwnProperty.call(UNITS,t))return {k:'n',v:UNITS[t]};
 if(Object.prototype.hasOwnProperty.call(TENS,t))return {k:'n',v:TENS[t]};
 const h=hundredsOf(t);if(h!==null)return {k:'hund',v:h};
 return null;
}
function parseNumberTokens(tokens,k){
 let total=0,cur=0,pending=0,used=0,hasMult=false,i=k,digits=false;
 for(;i<tokens.length;i++){
  const tk=tokens[i].t;let info=numToken(tk);
  if(!info&&tk.length>1&&tk[0]==='و'&&!/\d/.test(tk))info=numToken(tk.slice(1));
  if(!info&&tk==='و'&&used&&i+1<tokens.length&&(numToken(tokens[i+1].t)||(tokens[i+1].t.length>1&&tokens[i+1].t[0]==='و'&&numToken(tokens[i+1].t.slice(1)))))continue;
  if(!info)break;
  used++;
  if(info.k==='n'){cur+=info.v;if(/^\d/.test(tk))digits=true;}
  else if(info.k==='hund'){if(info.v===100&&cur>=1&&cur<=9)cur*=100;else cur+=info.v;}
  else if(info.k==='frac')pending=info.v;
  else if(info.k==='mult'){total+=(cur||pending||1)*info.v;cur=0;pending=0;hasMult=true;}
  else if(info.k==='fix'){total+=info.v;hasMult=true;}
 }
 if(!used)return null;
 const value=total+cur;if(!(value>0))return null;
 return {value,next:i,start:k,hasMult,digits};
}
function tokenIndexAtOrAfter(tokens,pos){for(let i=0;i<tokens.length;i++)if(tokens[i].i>=pos)return i;return tokens.length;}
function inSpans(i,e,spans){return spans.some(([a,b])=>i<b&&e>a);}
// first amount phrase at/after token k, ignoring tokens inside spans
function findAmount(tokens,k,spans,loose){
 for(let i=k;i<tokens.length;i++){
  if(inSpans(tokens[i].i,tokens[i].e,spans))continue;
  const p=parseNumberTokens(tokens,i);if(!p)continue;
  const nextTok=tokens[p.next]?.t||'';
  if(p.digits||p.hasMult||loose||/^(?:دينار|دنانير)$/.test(nextTok))return {...p,spanStart:tokens[i].i,spanEnd:tokens[Math.max(i,p.next-1)].e,currency:/^(?:دينار|دنانير)$/.test(nextTok)?tokens[p.next].e:null};
  i=p.next-1;
 }
 return null;
}

// ---------- dates & times
const DAYS=['احد','اثنين','ثلاثاء','اربعاء','خميس','جمعه','سبت'];
const DAY_ALIASES={اتنين:1,اثنين:1,احد:0,ثلاثاء:2,اربعاء:3,خميس:4,جمعه:5,سبت:6};
const MONTHS={'كانون الثاني':1,يناير:1,شباط:2,فبراير:2,اذار:3,مارس:3,نيسان:4,ابريل:4,ايار:5,مايو:5,حزيران:6,يونيو:6,تموز:7,يوليو:7,اب:8,اغسطس:8,ايلول:9,سبتمبر:9,'تشرين الاول':10,اكتوبر:10,'تشرين الثاني':11,نوفمبر:11,'كانون الاول':12,ديسمبر:12};
const PERIODS=[
 ['am',/(?:بال)?(?:صباحا|صباح|صبح|فجرا|فجر)/],
 ['noon',/(?:بعد ال)?(?:ظهرا|ظهر)/],
 ['aft',/(?:عصرا|عصر)/],
 ['eve',/(?:مساء|مسا|مغرب|عشاء)/],
 ['night',/(?:ليلا|ليل|الليله)/]
];
function findPeriod(s,a,b){ // earliest period word inside [a,b)
 const seg=s.slice(a,b);let best=null;
 for(const [name,re] of PERIODS){const m=new RegExp(NB+'[وب]?(?:ال)?(?:'+re.source+')'+NA).exec(seg);if(m&&(!best||m.index<best.idx))best={name,idx:m.index,end:m.index+m[0].length,abs:[a+m.index,a+m.index+m[0].length]};}
 return best;
}
function resolveHour(h,period){
 if(h>12)return {hour:h,ambiguous:false};
 switch(period){
  case 'am':return {hour:h===12?0:h,ambiguous:false};
  case 'noon':return {hour:h===12?12:(h<=5?h+12:h),ambiguous:false};
  case 'aft':return {hour:h===12?12:h+12,ambiguous:false};
  case 'eve':return {hour:h===12?12:h+12,ambiguous:false};
  case 'night':return {hour:h===12?0:(h<=5?h:h+12),ambiguous:false};
  default:return {hour:h,ambiguous:true};
 }
}
function parseClock(s,tokens){
 // returns {hour,minute,period,spans,ambiguous,approx,msg}
 const spans=[];let hour=null,minute=0,endPos=0,startPos=0,found=false;
 let m=/(?:^|\s)((?:ال)?ساعه)\s*(\d{1,2})(?::(\d{2}))?(?!\d)/.exec(s)||null;
 if(m){hour=Number(m[2]);minute=m[3]?Number(m[3]):0;startPos=m.index+(m[0].startsWith(' ')?1:0);endPos=m.index+m[0].length;found=true;}
 if(!found){const m2=/(?:^|\s)((?:ال)?ساعه)\s+((?:ال)?[ء-ي]+)(?:\s+(عشره|عشر))?/.exec(s);
  if(m2){let v=numToken(m2[2])?.k==='n'?numToken(m2[2]).v:null;if(v!==null){if(m2[3]&&v>=1&&v<=2&&/^(?:الثانيه|الحاديه|الثاني|اثنين|ثنتين|الاولي|احد|واحد)$/.test(m2[2]))v=v+10;else if(m2[3]&&v===1)v=11;
   hour=v;startPos=m2.index+(m2[0].startsWith(' ')?1:0);endPos=m2.index+m2[0].length;if(!m2[3]){/* word might swallow a normal word */}found=true;}}}
 if(!found){const m3=/(?<![\d:.])(\d{1,2}):(\d{2})(?!\d)/.exec(s);if(m3){hour=Number(m3[1]);minute=Number(m3[2]);startPos=m3.index;endPos=m3.index+m3[0].length;found=true;}}
 if(!found){const m4=new RegExp('(?<![\\d:./-])(\\d{1,2})\\s*(?=(?:بال|ال)?(?:صباحا|صباح|صبح|ظهرا|ظهر|عصرا|عصر|مساء|مسا|ليلا|ليل|فجرا|فجر)'+NA+')').exec(s);if(m4){hour=Number(m4[1]);startPos=m4.index;endPos=m4.index+m4[0].length;found=true;}}
 if(found){
  // minute modifiers right after the hour phrase
  const tail=s.slice(endPos,endPos+30);let mm;
  if((mm=/^\s*(?:الا|الّا)\s+(ربع|ثلث)/.exec(tail))){hour=hour-1;minute=mm[1]==='ربع'?45:40;endPos+=mm[0].length;}
  else if((mm=/^\s*(?:الا)\s+(\d{1,2})\s*(?:دقايق|دقيقه|دقائق)?/.exec(tail))){hour=hour-1;minute=60-Number(mm[1]);endPos+=mm[0].length;}
  else if((mm=/^\s*و\s*(نص|نصف)(?![ء-ي])/.exec(tail))){minute=30;endPos+=mm[0].length;}
  else if((mm=/^\s*و\s*ربع(?![ء-ي])/.exec(tail))){minute=15;endPos+=mm[0].length;}
  else if((mm=/^\s*و\s*ثلث(?![ء-ي])/.exec(tail))){minute=20;endPos+=mm[0].length;}
  else if((mm=/^\s*و\s*(\d{1,2})\s*(?:دقايق|دقيقه|دقائق)/.exec(tail))){minute=Number(mm[1]);endPos+=mm[0].length;}
  if(hour<0)hour=0;
  if(hour>23||minute>59)return {error:'الساعة المذكورة غير صحيحة.'};
  let per=findPeriod(s,endPos,Math.min(s.length,endPos+24));
  if(!per){const pre=findPeriod(s,Math.max(0,startPos-18),startPos);if(pre)per=pre;}
  spans.push([startPos,endPos]);if(per)spans.push(per.abs);
  const r=resolveHour(hour,per?.name||null);
  return {hour:r.hour,minute,period:per?.name||null,spans,ambiguous:r.ambiguous&&hour<=12,rawHour:hour};
 }
 // period-only (approximate)
 const per=findPeriod(s,0,s.length);
 if(per&&!/صلاه\s*$/.test(s.slice(0,per.abs[0]).trim())){
  const defaults={am:[8,0],noon:[12,0],aft:[15,30],eve:[19,0],night:[21,0]};
  let [h,mi]=defaults[per.name];
  if(/(?:فجر)/.test(s.slice(per.abs[0],per.abs[1])))[h,mi]=[5,0];
  if(/(?:مغرب)/.test(s.slice(per.abs[0],per.abs[1])))[h,mi]=[18,0];
  if(/(?:عشاء)/.test(s.slice(per.abs[0],per.abs[1])))[h,mi]=[19,30];
  return {hour:h,minute:mi,period:per.name,spans:[per.abs],ambiguous:false,approx:true};
 }
 return null;
}
function parseRelative(s,now){
 const re=/(?:^|\s)بعد\s+/g;let m;
 const tokens=tokenize(s);
 while((m=re.exec(s))){
  const start=m.index+(m[0].startsWith(' ')?1:0);const k=tokenIndexAtOrAfter(tokens,m.index+m[0].length);
  let i=k,frac=null,qty=null;
  if(tokens[i]&&/^(نص|نصف|ربع|ثلث)$/.test(tokens[i].t)){frac={نص:.5,نصف:.5,ربع:.25,ثلث:1/3}[tokens[i].t];i++;}
  else{const p=parseNumberTokens(tokens,i);if(p){qty=p.value;i=p.next;}}
  const ut=tokens[i]?.t;if(!ut)continue;
  let unitMin=null,count=qty,endTok=i;
  if(ut==='ساعه'||ut==='ساعات'){unitMin=60;}
  else if(ut==='ساعتين'){unitMin=60;count=2;}
  else if(/^(?:دقيقه|دقايق|دقائق|دقيقتين)$/.test(ut)){unitMin=1;if(ut==='دقيقتين')count=2;}
  else continue;
  let minutes;
  if(frac!==null){if(unitMin!==60&&ut!=='ساعه')continue;minutes=frac*60;}
  else minutes=(count??1)*unitMin;
  let end=tokens[endTok].e;
  const tail=s.slice(end,end+14);let mm;
  if(unitMin===60&&(mm=/^\s*و\s*(نص|نصف)(?![ء-ي])/.exec(tail))){minutes+=30;end+=mm[0].length;}
  else if(unitMin===60&&(mm=/^\s*و\s*ربع(?![ء-ي])/.exec(tail))){minutes+=15;end+=mm[0].length;}
  else if(unitMin===60&&(mm=/^\s*و\s*ثلث(?![ء-ي])/.exec(tail))){minutes+=20;end+=mm[0].length;}
  if(!(minutes>0)||minutes>60*24*30)continue;
  const at=new Date(now.getTime()+Math.round(minutes*60000));
  return {at,span:[start,end]};
 }
 return null;
}
function parseDateWords(s,now,spans){
 let date=null,night=false,notes=[];
 const take=(m,len)=>{spans.push([m.index+(m[0].length-len),m.index+m[0].length]);};
 let m;
 if((m=/(?<![\d/-])(20\d\d)[/-](\d{1,2})[/-](\d{1,2})(?![\d/-])/.exec(s))){date=mkDate(Number(m[1]),Number(m[2]),Number(m[3]));spans.push([m.index,m.index+m[0].length]);if(!date)notes.push('التاريخ المذكور غير صالح.');return {date,night,notes};}
 if((m=/(?<![\d/-])(\d{1,2})[/-](\d{1,2})[/-](20\d\d)(?![\d/-])/.exec(s))){date=mkDate(Number(m[3]),Number(m[2]),Number(m[1]));spans.push([m.index,m.index+m[0].length]);if(!date)notes.push('التاريخ المذكور غير صالح.');return {date,night,notes};}
 const monthAlt=Object.keys(MONTHS).sort((a,b)=>b.length-a.length).join('|');
 if((m=new RegExp('(?<![\\d/-])(\\d{1,2})\\s+(?:من\\s+)?(?:شهر\\s+)?('+monthAlt+')(?:\\s+(20\\d\\d))?'+NA).exec(s))){
  let y=m[3]?Number(m[3]):now.getFullYear();let d=mkDate(y,MONTHS[m[2]],Number(m[1]));
  if(d&&!m[3]&&d.getTime()<addDays(now,0).getTime()-864e5)d=mkDate(y+1,MONTHS[m[2]],Number(m[1]));
  date=d;spans.push([m.index,m.index+m[0].length]);if(!date)notes.push('التاريخ المذكور غير صالح.');return {date,night,notes};}
 if((m=/(?<![\d/-])(\d{1,2})[/-](\d{1,2})(?![\d/:-])/.exec(s))&&Number(m[1])<=31&&Number(m[2])<=12){
  let d=mkDate(now.getFullYear(),Number(m[2]),Number(m[1]));if(d&&d.getTime()<addDays(now,0).getTime()-864e5)d=mkDate(now.getFullYear()+1,Number(m[2]),Number(m[1]));
  if(d){date=d;spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}}
 if((m=/(?:^|\s)(?:يوم\s+)?(\d{1,2})\s+(?:من\s+)?(?:هذا\s+|هالـ?\s*)?(?:الشهر|هالشهر)/.exec(s))){
  let d=mkDate(now.getFullYear(),now.getMonth()+1,Number(m[1]));if(d&&d.getTime()<addDays(now,0).getTime()-864e5)d=mkDate(now.getFullYear(),now.getMonth()+2>12?1:now.getMonth()+2,Number(m[1]));
  if(d){date=d;spans.push([m.index+(m[0].startsWith(' ')?1:0),m.index+m[0].length]);return {date,night,notes};}}
 const tokens=tokenize(s);
 // relative day counts
 if((m=W('بعد\\s+(?:باجر|باكر|بكره|بكرا|غدا|غد)').exec(s))){date=addDays(now,2);spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 if((m=W('اول\\s+(?:امس|البارحه)|اول\\s+البارحه').exec(s))){date=addDays(now,-2);spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 if((m=W('(?:امس|البارحه|مبارح)').exec(s))){date=addDays(now,-1);spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 {const re=/(?:^|\s)بعد\s+/g;let mm;while((mm=re.exec(s))){const k=tokenIndexAtOrAfter(tokens,mm.index+mm[0].length);const st=mm.index+(mm[0].startsWith(' ')?1:0);
   const p=parseNumberTokens(tokens,k);let qty=p?p.value:null,i=p?p.next:k;const u=tokens[i]?.t;if(!u)continue;
   let add=null,end=tokens[i].e;
   if(u==='يوم'||u==='ايام')add=qty??1;else if(u==='يومين')add=2;else if(u==='اسبوع'||u==='اسابيع')add=7*(qty??1);else if(u==='اسبوعين')add=14;
   if(add!==null&&add>=0&&add<=730){date=addDays(now,add);spans.push([st,end]);return {date,night,notes};}
   if(u==='شهر'||u==='شهرين'||u==='اشهر'||u==='شهور'){const n=u==='شهرين'?2:(qty??1);const d=new Date(now.getFullYear(),now.getMonth()+n,now.getDate(),12);date=d;spans.push([st,end]);return {date,night,notes};}
 }}
 if((m=W('(?:باجر|باكر|بكره|بكرا|غدا|غد|غدوه)').exec(s))){date=addDays(now,1);spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 if((m=W('(?:هال)?ليله|هاليل|الليله').exec(s))){date=addDays(now,0);night=true;spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 if((m=W('(?:ها)?اليوم').exec(s))){date=addDays(now,0);spans.push([m.index,m.index+m[0].length]);return {date,night,notes};}
 // weekday
 const dayRe=new RegExp(NB+'(?:يوم\\s+)?(?:ال)?(احد|اثنين|اتنين|ثلاثاء|اربعاء|خميس|جمعه|سبت)'+NA);
 m=dayRe.exec(s);
 if(m&&(m[1]!=='احد'||/(?:يوم\s+|ال)احد/.test(m[0]))){
  const target=DAY_ALIASES[m[1]];let end=m.index+m[0].length;
  const nxt=/^\s+(?:الجاي|القادم|المقبل|اللي\s+جاي|الجايه)/.exec(s.slice(end));if(nxt)end+=nxt[0].length;
  const wk=/الاسبوع\s+(?:الجاي|القادم|المقبل|اللي\s+(?:بعد|جاي))/.exec(s);
  date={weekday:target,nextWeek:!!wk};spans.push([m.index,end]);if(wk)spans.push([wk.index,wk.index+wk[0].length]);
 }
 return {date,night,notes};
}
function parseWhen(s,now=new Date(),opt={}){
 const warnings=[],spans=[];
 // relative minutes/hours
 const rel=parseRelative(s,now);
 if(rel){return {due:localStamp(rel.at),date:dateValue(rel.at),spans:[rel.span],warnings,relative:true,dayOffset:0,hasTime:true};}
 const dw=parseDateWords(s,now,spans);warnings.push(...dw.notes);
 let date=dw.date,clock=parseClock(s,tokenize(s));
 if(clock?.error){warnings.push(clock.error);clock=null;}
 if(clock&&!clock.approx&&!opt.timeWanted&&!opt.dateOnly===false){}
 if(clock)spans.push(...clock.spans);
 let hour=clock?.hour??null,minute=clock?.minute??0;
 if(dw.night&&clock&&!clock.period&&clock.ambiguous){const r=resolveHour(clock.rawHour,'night');hour=r.hour;clock.ambiguous=false;}
 // weekday resolution (needs the clock)
 if(date&&date.weekday!==undefined){
  const base=addDays(now,0);let delta=(date.weekday-base.getDay()+7)%7;
  if(delta===0){const passed=hour===null||now.getHours()>hour||(now.getHours()===hour&&now.getMinutes()>=minute);if(passed)delta=7;}
  if(date.nextWeek)delta+=7;
  date=addDays(base,delta);
 }
 if(!opt.timeWanted){return {due:'',date:date?dateValue(date):'',spans,warnings,hasTime:hour!==null,hour,minute};}
 if(date&&date.getTime&&hour!==null){
  if(clock?.ambiguous){
   const sameDay=dateValue(date)===dateValue(now);
   const cands=[hour%12,hour%12+12];
   if(sameDay){let pick=cands.find(h=>{const t=new Date(date);t.setHours(h,minute,0,0);return t>now;});if(pick===undefined)pick=cands[1];hour=pick;}
   else hour=(hour>=7&&hour<=11)?hour:(hour===12?12:hour+12);
   warnings.push('لم تحدد صباحاً أم مساءً؛ اعتمدت الساعة '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+'. راجعها.');
  }
  if(clock?.approx)warnings.push('الوقت تقريبي حسب الفترة (ظهر/عصر/مغرب...)؛ عدّله إلى الدقيقة المطلوبة.');
  const t=new Date(date);t.setHours(hour,minute,0,0);
  if(t<=now)warnings.push('الموعد الناتج بالماضي؛ راجعه قبل الحفظ.');
  return {due:localStamp(t),date:dateValue(t),spans,warnings,hasTime:true,hour,minute};
 }
 if(!date&&hour!==null){ // time only: today if still ahead, otherwise tomorrow
  let h=hour;
  if(clock?.ambiguous){const c=[hour%12,hour%12+12];let pick=c.find(x=>{const t=new Date(now);t.setHours(x,minute,0,0);return t>now;});if(pick!==undefined)h=pick;else h=c[0];warnings.push('لم تحدد صباحاً أم مساءً؛ اعتمدت الساعة '+String(h).padStart(2,'0')+':'+String(minute).padStart(2,'0')+'. راجعها.');}
  if(clock?.approx)warnings.push('الوقت تقريبي حسب الفترة (ظهر/عصر/مغرب...)؛ عدّله إلى الدقيقة المطلوبة.');
  const t=new Date(now);t.setHours(h,minute,0,0);
  if(t<=now){t.setDate(t.getDate()+1);warnings.push('هذه الساعة فاتت اليوم، فجعلت الموعد غداً.');}
  return {due:localStamp(t),date:dateValue(t),spans,warnings,hasTime:true,hour:h,minute};
 }
 if(date&&date.getTime){warnings.push('حدد الساعة قبل الحفظ.');return {due:'',date:dateValue(date),spans,warnings,hasTime:false};}
 warnings.push('ما فهمت وقت التذكير؛ حدده قبل الحفظ.');
 return {due:'',date:'',spans,warnings,hasTime:false};
}
function parseRange(s,now,fallback='month'){
 const d0=addDays(now,0);const iso=dateValue;
 const startOfWeek=()=>{const d=addDays(d0,0);const diff=(d.getDay()+1)%7;return addDays(d,-diff);}; // weeks start Saturday
 let m;
 if(W('اول\\s+امس').test(s))return {from:iso(addDays(d0,-2)),to:iso(addDays(d0,-2)),label:'أول أمس'};
 if(W('(?:امس|البارحه)').test(s))return {from:iso(addDays(d0,-1)),to:iso(addDays(d0,-1)),label:'أمس'};
 if(W('(?:باجر|باكر|بكره|بكرا|غدا)').test(s))return {from:iso(addDays(d0,1)),to:iso(addDays(d0,1)),label:'باجر'};
 if(W('(?:هذا|هالـ?|ها)?اليوم').test(s))return {from:iso(d0),to:iso(d0),label:'اليوم'};
 if(/الشهر\s+(?:الماضي|اللي\s+فات|السابق)/.test(s)){const a=new Date(d0.getFullYear(),d0.getMonth()-1,1,12),b=new Date(d0.getFullYear(),d0.getMonth(),0,12);return {from:iso(a),to:iso(b),label:'الشهر الماضي'};}
 if(/(?:هالاسبوع|هذا\s+الاسبوع|الاسبوع\s+(?:هذا|الحالي))/.test(s)||W('الاسبوع').test(s)){const a=startOfWeek();return {from:iso(a),to:iso(addDays(a,6)),label:'هذا الأسبوع'};}
 if(/(?:هالسنه|هذه\s+السنه|هذي\s+السنه|السنه)/.test(s))return {from:d0.getFullYear()+'-01-01',to:d0.getFullYear()+'-12-31',label:'هذه السنة'};
 if(/(?:هالشهر|هذا\s+الشهر|الشهر)/.test(s)||fallback==='month'){const a=new Date(d0.getFullYear(),d0.getMonth(),1,12),b=new Date(d0.getFullYear(),d0.getMonth()+1,0,12);return {from:iso(a),to:iso(b),label:'هذا الشهر'};}
 return {from:iso(d0),to:iso(d0),label:'اليوم'};
}

// ---------- classification
const CUES={
 reminder:[[WP('ذكرني|ذكريني|نبهني|نبهيني|تذكرني|دكرني|ذكروني|ذكرنا'),6],[WP('منبه|تنبيه|تذكير|ريمايندر'),6],[WP('موعد|ميعاد'),2]],
 expenses:[[WP('صرفت|صرفنا|دفعت|دفعنا|اشتريت|شريت|خرجت|صرفيت'),4],[WP('مصروف|مصاريف|مصروفات'),5]],
 maintenance:[[WP('دهن|فلتر|تايرات|تاير|اطارات|بريكات|فرامل|كلج|راديتر|مساحات|بوجيه|بطاريه|كرايسلر|عداد'),4],[WP('صيانه|ايل|غيرت\\s+زيت|تبديل\\s+زيت|زيت\\s+(?:المكينه|السياره|المحرك)'),3],[WP('غسل\\s+(?:السياره|الكرايسلر)|تغيير\\s+دهن|غيرت\\s+دهن|تبديل\\s+دهن'),4]],
 thoughts:[[WP('بيت\\s+شعر|قصيده|حكمه|اقتباس|خاطره|مقاله|شعر'),4]],
 plans:[[WP('مشروع|خطه|خطط|هدف'),4]],
 b2b:[[WP('وكيل|ركاب|راكب|شارتر|pnr|مسافرين'),3],[WP('حجز\\s+طيران|حجز\\s+رحله|رحلات|طيران'),3],[WP('الخطوط|الناقل'),1]],
 destinations:[[WP('ازور|اسافر|وجهه\\s+سفر|اماكن\\s+ازورها|سياحه|رحله\\s+سياحيه|اخطط\\s+اسافر'),4]],
 library:[[WP('كتاب|المكتبه|للمكتبه|منهج'),4]],
 education:[[WP('درس|دروس|ملخص\\s+ماده|معلومه\\s+تعليميه'),3]],
 dailyTasks:[[WP('مهمه\\s+اليوم|مهمتي\\s+اليوم|اليوم\\s+لازم|عندي\\s+شغله\\s+اليوم|لازم\\s+اليوم'),4]]
};
function scoreSections(s,ctx){
 const sc={};for(const k of Object.keys(CUES)){sc[k]=0;for(const [re,w] of CUES[k])if(re.test(s))sc[k]+=w;}
 if(/(?:حلاقه|صبغه|قص\s+شعر|مشط|شامبو|شعري|شعرت)/.test(s)&&sc.thoughts)sc.thoughts=0;
 if(sc.expenses&&ctx.hasAmount)sc.expenses+=2;
 if(sc.maintenance&&/(?:عداد|كم\b|ماشيه)/.test(s)&&ctx.hasAmount)sc.maintenance+=2;
 if(/(?:سياره|كرايسلر|عداد)/.test(s)&&sc.maintenance)sc.maintenance+=1;
 if(sc.destinations&&/(?:اريد|ناوي|احب)/.test(s))sc.destinations+=1;
 if(sc.b2b&&!/(?:وكيل|ركاب|راكب|شارتر|pnr|مسافرين|حجز)/.test(s))sc.b2b=Math.min(sc.b2b,3);
 if(sc.reminder&&ctx.hasWhen)sc.reminder+=1;
 if(!sc.reminder&&ctx.hasWhen&&ctx.explicitTime&&ctx.dated&&Math.max(0,...Object.entries(sc).filter(([k])=>k!=='reminder').map(([,v])=>v))<3)sc.reminder=3;
 return sc;
}
function maskedTitle(clean,s,spans){const mask=new Array(clean.length).fill(false);for(const [a,b] of spans)for(let i=Math.max(0,a);i<Math.min(clean.length,b);i++)mask[i]=true;let out='';for(let i=0;i<clean.length;i++)out+=mask[i]?' ':clean[i];return out.replace(/\s+/g,' ').trim();}
function stripEdges(t){return t.replace(/^[\s.,:;،؛\-–—]+|[\s.,:;،؛\-–—]+$/g,'').replace(/^(?:عن|بخصوص|حتى|اني|انا|لازم|اريد|ان|انه|لـ|ل)\s+(?=\S)/,'').replace(/^(?:عن|بخصوص|حتى|اني|لازم)\s+(?=\S)/,'').trim();}
function cueSpans(s,reList){const out=[];for(const re of reList){const g=new RegExp(re.source,'g');let m;while((m=g.exec(s)))out.push([m.index,m.index+m[0].length]);}return out;}
const REMINDER_PHRASE=new RegExp(NB+'(?:(?:خلي|حط|سوي|اضف|اعمل|سجل|ضيف|ضع)\\s+(?:لي\\s+)?)?(?:(?:ذكرني|ذكريني|نبهني|نبهيني|تذكرني|دكرني|ذكروني)|(?:منبه|تنبيه|تذكير|موعد|ميعاد)(?:\\s+لي)?)'+NA+'(?:\\s+(?:اني|ان|بان|انه))?','g');
const EXPENSE_CATS=[
 ['مواصلات',/(?:بنزين|بانزين|وقود|كازويل|نفط\s+ابيض\s+سياره|تاكسي|تكسي|اجره|سياره|كراج|موقف)/],
 ['فواتير وخدمات',/(?:كهربا|مولده|مولدة|انترنت|كارت|رصيد|موبايل|اسيا|زين|كورك|ماء|ماي|فاتوره|اشتراك|نت\b)/],
 ['منزل',/(?:ايجار|غاز|نفط|اثاث|تصليح|صبغ|مطبخ|بيت|منزل|جهاز|ثلاجه|غساله)/],
 ['صحة',/(?:دواء|دوا|صيدليه|طبيب|دكتور|علاج|مستشفى|تحاليل|تحليل|عياده)/],
 ['عائلة',/(?:مدرسه|اولاد|ابني|بنتي|هديه|روضه|قرطاسيه|ملابس|جلابيه|عيديه|زوجتي)/],
 ['سفر',/(?:تذكره|فندق|حجز|سفر|طيران|فيزا)/],
 ['طعام',/(?:مطعم|اكل|غداء|عشاء|فطور|خضار|لحم|فروج|سمك|خبز|سوق|قهوه|شاي|كافيه|عصير|فواكه|تمن|دجاج|بقاله|مخبز)/]
];
function classifyCommand(raw,now=new Date(),forced=null){
 const {clean,s}=prep(raw);if(!clean)return null;
 const tokens=tokenize(s);
 const when=parseWhen(s,now,{timeWanted:true});
 const hasAmountProbe=!!findAmount(tokens,0,when.spans||[],false);
 const explicitTime=!!when.hasTime&&!!(when.spans&&when.spans.length);
 const ctx={hasAmount:hasAmountProbe,hasWhen:!!when.due||(when.hasTime),explicitTime,dated:!!when.due};
 const sc=scoreSections(s,ctx);
 // queries ("how much did I spend this month")
 const isQuestion=/(?:^|\s)(?:كم|شكد|شقد|شنو|شنهي|ايش|وين|متى|اي)(?![ء-ي])/.test(s)||/[؟?]/.test(clean);
 let query=null;
 if(!forced&&isQuestion&&!sc.reminder){
  if(/(?:صرفت|صرفنا|مصروف|مصاريف|مصروفات|دفعت)/.test(s))query={kind:'expenses'};
  else if(/(?:مواعيد|مواعيدي|ميعاد|مهام|مهامي|مهمات|عندي\s+شنو|شغل)/.test(s))query={kind:'agenda'};
  else if(/(?:اخر\s+صيانه|صيانه|دهن|عداد)/.test(s))query={kind:'maintenance'};
 }
 if(query){
  query.range=parseRange(s,now,query.kind==='expenses'?'month':'today');
  for(const [name,re] of EXPENSE_CATS)if(query.kind==='expenses'&&re.test(s)&&!/(?:هالشهر|الشهر)\s*$/.test(s)){query.category=name;break;}
  return {section:'query',query,fields:{},warnings:[],original:clean,confidence:.9,version:2};
 }
 let section=forced,confidence=1;
 if(!section){
  const ranked=Object.entries(sc).sort((a,b)=>b[1]-a[1]);const [best,top]=ranked[0],second=ranked[1][1];
  if(top>=3){section=best==='reminder'?'todo':best;confidence=top>=5&&top-second>=2?.95:top-second>=2?.75:.5;}
  else{section='quickNotes';confidence=.3;}
 }
 const warnings=[];let fields={};
 const base=maskedTitle(clean,s,[]);
 if(section==='todo'){
  const t=when;warnings.push(...t.warnings);
  const cues=[];{const g=new RegExp(REMINDER_PHRASE.source,'g');let m;while((m=g.exec(s)))cues.push([m.index,m.index+m[0].length]);}
  const rep=/(?:^|\s)(?:كل\s+(يوم)|يوميا|كل\s+(اسبوع)|اسبوعيا|كل\s+(شهر)|شهريا|كل\s+(?:يوم\s+)?(احد|اثنين|اتنين|ثلاثاء|اربعاء|خميس|جمعه|سبت))/.exec(s);
  let repeat='بدون';const repSpans=[];
  if(rep){repeat=(rep[1]||/يوميا/.test(rep[0]))?'يومي':(rep[2]||/اسبوعيا/.test(rep[0])||rep[4])?'أسبوعي':'شهري';repSpans.push([rep.index+(rep[0].startsWith(' ')?1:0),rep.index+rep[0].length]);
   if(rep[4]&&!t.due){ // "every Thursday at 5" : first occurrence
    const w2=parseWhen(s.replace(rep[0],' '+'يوم '+rep[4]+' '),now,{timeWanted:true});if(w2.due){t.due=w2.due;t.warnings=w2.warnings;warnings.length=0;warnings.push(...w2.warnings);}}}
  let title=stripEdges(maskedTitle(clean,s,[...cues,...(t.spans||[]),...repSpans]));
  if(!title)title=stripEdges(clean)||clean;
  fields={title,due:t.due,priority:'عادية',repeat,lead:'عند الموعد',notes:'الأمر: '+clean};
 }
 else if(section==='expenses'){
  const when2=parseWhen(s,now,{});const spans=when2.spans||[];
  let amt=null;const cueM=W('صرفت|دفعت|اشتريت|شريت|صرفنا|دفعنا|خرجت|مصروف|مبلغ|كلف|كلفني|كلفت').exec(s);
  const startTok=cueM?tokenIndexAtOrAfter(tokens,cueM.index):0;
  amt=findAmount(tokens,startTok,spans,true)||findAmount(tokens,0,spans,true);
  let amount='';
  if(amt){amount=Math.round(amt.value);if(!Number.isSafeInteger(amount)||amount<=0){amount='';}
   else if(amount<250&&!amt.currency)warnings.push('المبلغ '+amount+' صغير؛ إذا تقصد آلاف الدنانير اكتب «'+amount+' ألف».');}
  else warnings.push('مبلغ المصروف مو واضح؛ عدله قبل الحفظ.');
  if(/(?:دولار|\$|usd)/i.test(clean))warnings.push('ذكرت الدولار؛ أدخل المبلغ بما يعادله بالدينار.');
  const dspans=[...spans,...(amt?[[amt.spanStart,amt.currency||amt.spanEnd]]:[])];
  const verbs=cueSpans(s,[W('صرفت|دفعت|اشتريت|شريت|صرفنا|دفعنا|خرجت|سجل\\s+مصروف|اضف\\s+مصروف|مصروف|مبلغ|دينار|دنانير')]);
  let title=maskedTitle(clean,s,[...dspans,...verbs]);title=title.replace(/^(?:على|ل|لـ|مقابل|بسبب|ثمن|حق|ب)\s+/,'').trim();title=stripEdges(title)||clean;
  let cat='أخرى';for(const [name,re] of EXPENSE_CATS)if(re.test(s)){cat=name;break;}
  fields={title,amount,category:cat,date:when2.date||dateValue(now)};
 }
 else if(section==='maintenance'){
  const w2=parseWhen(s,now,{});const spans=w2.spans||[];
  let mileage='',cost='',nextMileage='';
  let m;
  if((m=W('عداد|ماشيه|ماشي|قراءه\\s+العداد').exec(s))){const p=findAmount(tokens,tokenIndexAtOrAfter(tokens,m.index),spans,true);if(p)mileage=Math.round(p.value);}
  if(mileage===''){const mk=/(\d[\d.]*)\s*(?:كم|كيلو|كيلومتر)(?![ء-ي])/.exec(s);if(mk)mileage=Math.round(Number(mk[1]));}
  if((m=WP('كلفه|تكلفه|كلفتني|كلفني|كلفت|سعر|سعرها|بمبلغ|دفعت|صرفت|دفعنا').exec(s))){const p=findAmount(tokens,tokenIndexAtOrAfter(tokens,m.index),spans,true);if(p&&p.value!==mileage){cost=Math.round(p.value);if(cost>0&&cost<1000&&!p.currency)warnings.push('الكلفة '+cost+' صغيرة؛ هل تقصد آلاف الدنانير؟');}}
  if((m=/(?:القادمه|الجايه|الجاي|التاليه|القادم)[^\d]{0,40}(?:عداد|عند)?\s*(\d[\d.]*)/.exec(s)))nextMileage=Math.round(Number(m[1]));
  else if(mileage!==''&&(m=/(?:بعد|كل)\s+(\d[\d.]*)\s*(الف)?\s*(?:كم|كيلو)/.exec(s)))nextMileage=mileage+Math.round(Number(m[1])*(m[2]?1000:1));
  const type=/(?:دهن|زيت|فلتر)/.test(s)?'دهن وفلتر':/(?:تاير|اطار)/.test(s)?'تبديل تايرات':/(?:كهرب|بطاريه)/.test(s)?'كهربائيات':/(?:غسل|تنظيف)/.test(s)?'غسل وتنظيف داخلي':/(?:راديتر|تبريد|محرك|مكينه|بوجيه)/.test(s)?'صيانة محرك/تبريد':/(?:حداد|بدي|صبغ|رفرف|باب)/.test(s)?'صيانة حدادية':'أخرى';
  if(mileage==='')warnings.push('قراءة عداد السيارة مطلوبة.');if(cost==='')warnings.push('كلفة الصيانة مطلوبة (يمكن إدخال صفر إذا بلا كلفة).');
  fields={date:w2.date||dateValue(now),type,mileage,cost,nextMileage:nextMileage===''?'':nextMileage,nextDate:'',notes:clean};
 }
 else if(section==='thoughts'){
  const kind=/بيت\s+شعر/.test(s)?'بيت شعر':/(?:قصيده|شعر)/.test(s)?'شعر':/حكمه/.test(s)?'حكمة':/اقتباس/.test(s)?'اقتباس':/مقاله/.test(s)?'مقالة':'خاطرة';
  const lead=/^(?:(?:سجل|اكتب|دون|احفظ|اضف|ضيف)\s+)?(?:لي\s+)?(?:بيت\s+شعر|قصيده|حكمه|اقتباس|خاطره|مقاله|شعر)\s*[:：\-–]?\s*/.exec(s);
  const text=lead&&clean.slice(lead[0].length).trim()?clean.slice(lead[0].length).trim():clean;
  fields={title:'',kind,author:'',tags:'',text};
 }
 else if(section==='plans'){
  const lead=/^(?:(?:خلي|اضف|سجل|اكتب|ضيف)\s+)?(?:فكره\s+)?(?:مشروع|خطه|خطط|هدف)\s*(?:جديد\s*)?[:：\-–]?\s*/.exec(s);
  const title=lead&&clean.slice(lead[0].length).trim()?clean.slice(lead[0].length).trim():clean;
  fields={title:title.slice(0,120),status:'فكرة',priority:'عادية',deadline:when.date||'',nextAction:'',text:clean};
 }
 else if(section==='destinations'){
  const lead=/^(?:اريد|ناوي|احب|ابي|اخطط)\s*(?:ان\s*)?(?:ازور|اسافر\s*(?:الى|ل)?|اروح\s*(?:الى|ل)?)\s*(?:مدينه\s+)?/.exec(s);
  const title=lead&&clean.slice(lead[0].length).trim()?clean.slice(lead[0].length).trim():clean;
  fields={title:title.slice(0,120),status:'أرغب بزيارتها',country:'',text:clean};
 }
 else if(section==='library'){
  const lead=/^(?:(?:احفظ|سجل|اضف|ضيف)\s+)?(?:كتاب\s*|(?:في|ل|الى)?\s*المكتبه\s*|للمكتبه\s*)+[:：\-–]?\s*/.exec(s);
  const title=lead&&clean.slice(lead[0].length).trim()?clean.slice(lead[0].length).trim():clean;
  const owner=/ابني/.test(s)?'ابني':/(?:ابنتي|بنتي)/.test(s)?'ابنتي':/(?:العائله|عائلتي)/.test(s)?'العائلة':'مكتبتي';
  fields={title:title.slice(0,150),owner,status:'لم أبدأ',author:'',text:''};
 }
 else if(section==='education')fields={title:clean.slice(0,110),subject:/(?:رياضيات)/.test(s)?'الرياضيات':/(?:عربي)/.test(s)?'العربي':/(?:انكليزي|انجليزي)/.test(s)?'الإنكليزي':'عام',text:clean};
 else if(section==='dailyTasks'){
  const cues=cueSpans(s,[W('مهمه\\s+اليوم|مهمتي\\s+اليوم|اليوم\\s+لازم|لازم\\s+اليوم|عندي\\s+شغله\\s+اليوم')]);
  const w2=parseWhen(s,now,{});
  const title=stripEdges(maskedTitle(clean,s,[...cues,...(w2.spans||[])]))||clean;
  fields={title,date:w2.date||dateValue(now),notes:''};
 }
 else if(section==='b2b'){
  const w2=parseWhen(s,now,{});
  let agent='',destination='',pax='',flightNo='';
  let m;if((m=/وكيل\s+([ء-ي]+(?:\s+[ء-ي]+)?)/.exec(clean)))agent=m[1].replace(/\s+(?:الى|الي|الى|ركاب|راكب).*$/,'').trim();
  if((m=/(?:الى|الي|ل)\s+([ء-ي]+(?:\s+[ء-ي]+)?)/.exec(s)))destination=clean.slice(m.index+m[0].length-m[1].length,m.index+m[0].length).replace(/\s+(?:ل|عدد|يوم).*$/,'').trim();
  if((m=/(\d+)\s*(?:راكب|ركاب|مسافر|مسافرين)/.exec(s)))pax=Number(m[1]);
  if((m=/\b([A-Za-z]{2}\s?\d{2,4})\b/.exec(clean)))flightNo=m[1].toUpperCase().replace(/\s/g,'');
  const missing=[];if(!w2.date)missing.push('تاريخ الرحلة');if(!agent)missing.push('الوكيل');if(!destination)missing.push('الوجهة');if(pax==='')missing.push('عدد الركاب');
  if(missing.length)warnings.push('أكمل: '+missing.join('، ')+'.');
  fields={date:w2.date||'',agent,destination,pax,flightNo,carrier:'',status:'قيد الانتظار',notes:clean};
 }
 else fields={text:clean};
 if(!forced&&confidence<.5&&section==='quickNotes')warnings.push('ما تأكدت من القسم، لذلك جهزته كملاحظة سريعة. غيّر القسم إذا تريد.');
 return {section,fields,warnings,original:clean,confidence,version:2};
}
function splitCommands(text){
 const raw=String(text||'').trim();if(!raw)return [];
 const parts=raw.split(/\n+|[؛;]+|\s+(?:وبعدين|وبعد\s+ذلك|وبعدها|وبعد\s+هذا|وكمان)\s+/).map(x=>x.trim()).filter(Boolean);
 const out=[];for(const p of parts){if(out.length&&p.split(/\s+/).length<2)out[out.length-1]+=' '+p;else out.push(p);}
 return out.slice(0,8);
}

module.exports={classifyCommand,parseWhen,splitCommands};
