/* Form POST kompatibel dengan sumber; riwayat tidak pernah dimigrasikan ke antrean. */
window.HasilOnline=(()=>{
 'use strict';
 const ENDPOINT='https://script.google.com/macros/s/AKfycbwYBKT9Bjzhz-roEIIoa1sSgB0utq6ToAkoU1VAgSUrrGUQbdLk4KJqMEc3wsqUKkSnkw/exec';
 const KEY='liga-pahlawan-cerita-antrean-v1';
 let memory=[],durable=true,active=null;
 function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data)){memory=data.filter(x=>x&&x.id&&x.payload);}}catch(_){durable=false;}return memory;}
 function writeItem(item){const q=read();const i=q.findIndex(x=>x.id===item.id);if(i<0)q.push(item);else q[i]=item;memory=q;try{localStorage.setItem(KEY,JSON.stringify(q));durable=true;}catch(_){durable=false;}render();}
 function render(){
  const q=read(),pending=q.filter(x=>x.state==='pending').length,uncertain=q.filter(x=>x.state==='uncertain').length,sent=q.filter(x=>x.state==='sent').length;
  let text=navigator.onLine?'Online · nama dan hasil dikirim saat misi berakhir.':'Offline · hasil menunggu koneksi internet.';
  if(sent)text=`Permintaan telah dikirim (${sent} sesi). Periksa spreadsheet untuk memastikan hasil tercatat.`;
  if(pending)text+=` ${pending} hasil dalam antrean; akan dikirim saat online dan gim terbuka.`;
  if(active)text+=' Mengirim…';
  if(uncertain)text+=` ${uncertain} pengiriman belum pasti. Periksa spreadsheet sebelum mengirim ulang.`;
  if(!durable)text+=' Penyimpanan lokal tidak tersedia; jangan tutup halaman sebelum menyimpan cadangan.';
  document.querySelectorAll('[data-sheet-status]').forEach(el=>el.textContent=text);
  document.querySelectorAll('[data-sheet-retry]').forEach(el=>{el.hidden=!pending;el.disabled=!!active||!navigator.onLine;});
  document.querySelectorAll('[data-sheet-uncertain]').forEach(el=>{el.hidden=!uncertain;el.disabled=!!active;});
 }
 function enqueue(result){
  if(read().some(x=>x.id===result.id))return;
  writeItem({id:result.id,state:'pending',payload:{nama:result.nama,jawabanBenar:String(result.jawabanBenar),status:result.status,idSesi:result.id,waktu:result.waktu,level:String(result.level),interaksiSelesai:String(result.interaksiSelesai),pemahamanBenar:String(result.pemahamanAwal.benar)}});
  void flush();
 }
 async function sendPending(){
  // Dengan Web Locks, tab lain menunggu hingga pengiriman aktif selesai.
  // Rekaman 'sending' yang tertinggal menandakan tab ditutup saat hasil belum pasti.
  for(const item of [...read()])if(item.state==='sending'){item.state='uncertain';writeItem(item);}
  for(const candidate of [...read()].filter(x=>x.state==='pending')){
   if(!navigator.onLine)break;
   const item=read().find(x=>x.id===candidate.id);if(!item||item.state!=='pending')continue;
   item.state='sending';item.claim=Date.now()+'-'+Math.random();writeItem(item);
   // Verifikasi klaim juga melindungi pemanggilan ulang pada browser tanpa Web Locks.
   if(read().find(x=>x.id===item.id)?.claim!==item.claim)continue;
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch(ENDPOINT,{method:'POST',mode:'no-cors',credentials:'omit',body:new URLSearchParams(item.payload),keepalive:true,signal:controller.signal});
    if(response.type!=='opaque'&&!response.ok)throw Error('HTTP');
    item.state='sent';item.sentAt=new Date().toISOString();
   }catch(_){item.state='uncertain';}
   finally{clearTimeout(timeout);writeItem(item);}
  }
 }
 function flush(){
  if(active)return active;
  if(!navigator.onLine){render();return Promise.resolve();}
  active=Promise.resolve().then(()=>navigator.locks?navigator.locks.request(KEY,sendPending):sendPending()).finally(()=>{active=null;render();});render();return active;
 }
 function retryUncertain(){
  if(active)return;
  const items=read().filter(x=>x.state==='uncertain');if(!items.length)return;
  let overlay=document.getElementById('sheet-review');if(overlay)overlay.remove();
  overlay=document.createElement('div');overlay.id='sheet-review';overlay.className='modal-overlay';overlay.style.display='flex';overlay.style.zIndex='15000';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Periksa pengiriman hasil');
  const panel=document.createElement('div');panel.className='modal-content';
  const title=document.createElement('h2');title.textContent='Periksa hasil di spreadsheet guru';
  const desc=document.createElement('p');desc.textContent='Cocokkan nama dan status berikut di spreadsheet yang biasa digunakan guru. Cocokkan waktu dan ID sesi jika kolom tersebut didukung. Jika baris sudah ada, tandai sudah tercatat. Kirim ulang hanya bila belum ada.';panel.append(title,desc);
  items.forEach(item=>{
   const row=document.createElement('div');row.className='sheet-panel';const detail=document.createElement('p');detail.textContent=`${item.payload.nama} · ${item.payload.status} · ${item.payload.waktu} · ID: ${item.id}`;row.append(detail);
   const done=document.createElement('button');done.textContent='Sudah tercatat';done.onclick=()=>{item.state='sent';item.manuallyChecked=true;writeItem(item);overlay.remove();retryUncertain();};
   const retry=document.createElement('button');retry.textContent='Belum tercatat — kirim ulang';retry.disabled=!navigator.onLine;retry.onclick=()=>{if(!confirm('Saya sudah memeriksa spreadsheet dan hasil sesi ini belum ada. Kirim ulang? Permintaan sebelumnya mungkin tetap diproses; periksa lagi untuk menghindari baris ganda.'))return;item.state='pending';writeItem(item);overlay.remove();void flush();};row.append(done,retry);panel.append(row);
  });
  const close=document.createElement('button');close.className='btn btn-blue';close.textContent='Tutup';close.onclick=()=>overlay.remove();panel.append(close);overlay.append(panel);document.getElementById('game-stage').append(overlay);close.focus();
  overlay.onkeydown=e=>{if(e.key==='Escape')overlay.remove();if(e.key==='Tab'){const list=[...overlay.querySelectorAll('button:not(:disabled)')],first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 }
 window.addEventListener('online',()=>void flush());window.addEventListener('offline',render);window.addEventListener('storage',render);
 document.addEventListener('DOMContentLoaded',()=>{render();void flush();});
 return {enqueue,flush,retryUncertain};
})();
