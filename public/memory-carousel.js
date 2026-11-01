export function sortMemories(records,direction='desc'){
 return [...records].sort((a,b)=>{
  if(!a.releaseDate||!b.releaseDate)return Number(!a.releaseDate)-Number(!b.releaseDate)||(a.masterId-b.masterId);
  return (a.releaseDate.localeCompare(b.releaseDate)*(direction==='asc'?1:-1))||(a.masterId-b.masterId);
 });
}
export function carouselView(records,esc){
 if(!records.length)return '<p class="hint" role="status">一致するメモリがありません。</p>';
 return `<section class="memory-orbit" aria-label="メモリカルーセル"><div class="orbit-heading"><span>MEMORY GALLERY</span><span>${records.length}種類</span></div><div class="orbit-track" tabindex="0" role="region" aria-label="左右にスワイプ、または矢印キーでメモリを選択">${records.map((r,i)=>`<div class="orbit-slot"><button class="orbit-card" data-memory="detail" data-id="${esc(r.id)}" aria-label="${esc(r.name)}の性能を見る" data-index="${i}">${r.image?`<img src="${esc(r.image)}" alt="${esc(r.name)}" draggable="false" loading="lazy">`:'<span class="orbit-placeholder">◇</span>'}<span class="stars">☆${r.rarity}</span><strong>${esc(r.name)}</strong><small>${r.releaseDate?esc(r.releaseDate)+(r.releaseDate>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})?' 追加予定':' 実装'):'実装日未確認'}</small></button></div>`).join('')}</div><div class="orbit-controls"><button type="button" data-orbit-step="-1" aria-label="前のメモリ">←</button><p class="orbit-caption" aria-live="polite"></p><button type="button" data-orbit-step="1" aria-label="次のメモリ">→</button></div><div class="orbit-slider-row"><span>1</span><input class="orbit-slider" type="range" min="1" max="${records.length}" value="1" step="1" aria-label="メモリの表示位置" ${records.length===1?'disabled':''}><span>${records.length}</span></div><p class="orbit-tip">左右にスワイプ · 画像をタップして性能を見る</p></section>`;
}
export function mountMemoryCarousel(root){
 const track=root?.querySelector('.orbit-track');if(!track)return;
 const cards=[...track.querySelectorAll('.orbit-card')],caption=root.querySelector('.orbit-caption'),slider=root.querySelector('.orbit-slider');let frame=0,active=0,drag=null,suppress=false,settleTimer=0,touchScrolling=false;
 const touchLayout=matchMedia('(hover: none) and (pointer: coarse)');
 const update=()=>{frame=0;const width=track.clientWidth,step=cards[0].parentElement.offsetWidth,center=track.scrollLeft+width/2;
  cards.forEach((card,i)=>{const slot=card.parentElement,d=(slot.offsetLeft+step/2-center)/step,clamp=Math.max(-3,Math.min(3,d));if(!touchLayout.matches||!touchScrolling)card.style.transform=touchLayout.matches?`perspective(850px) rotateY(${-clamp*24}deg) scale(${1-Math.abs(clamp)*.12})`:`translateY(${Math.abs(clamp)*18}px) translateZ(${-Math.abs(clamp)*70}px) rotateY(${-clamp*22}deg) scale(${1-Math.abs(clamp)*.08})`;card.style.opacity=Math.abs(d)>3?'0':String(1-Math.abs(clamp)*.20);card.style.pointerEvents=Math.abs(d)>3?'none':'';card.tabIndex=Math.abs(d)<.55?0:-1;card.classList.toggle('is-center',Math.abs(d)<.55);});
  active=Math.max(0,Math.min(cards.length-1,Math.round(track.scrollLeft/step)));caption.textContent=`${active+1} / ${cards.length} — ${cards[active].querySelector('strong').textContent}`;
  slider.value=String(active+1);slider.setAttribute('aria-valuetext',caption.textContent);
  root.querySelector('[data-orbit-step="-1"]').disabled=active===0;root.querySelector('[data-orbit-step="1"]').disabled=active===cards.length-1;
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};track.addEventListener('scroll',()=>{if(touchLayout.matches){touchScrolling=true;clearTimeout(settleTimer);settleTimer=setTimeout(()=>{touchScrolling=false;if(track.isConnected)schedule();},160);}schedule();},{passive:true});
 slider.addEventListener('input',()=>{track.scrollTo({left:(Number(slider.value)-1)*cards[0].parentElement.offsetWidth,behavior:'instant'});update();});
 const move=n=>track.scrollTo({left:Math.max(0,Math.min(cards.length-1,active+n))*cards[0].parentElement.offsetWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 root.querySelectorAll('[data-orbit-step]').forEach(b=>b.onclick=()=>move(Number(b.dataset.orbitStep)));
 track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}});
 track.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:track.scrollLeft};suppress=false;});
 track.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6){suppress=true;track.classList.add('dragging');track.setPointerCapture(e.pointerId);track.scrollLeft=drag.left-dx;}});
 const finish=()=>{if(!drag)return;drag=null;track.classList.remove('dragging');if(suppress)move(0);};track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);
 track.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation();suppress=false;}},true);
 const observer=new ResizeObserver(()=>{if(!track.isConnected){observer.disconnect();return;}schedule();});observer.observe(track);update();
}
