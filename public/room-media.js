export function fittedMediaSize(width,height,availableWidth,availableHeight){
 const scale=Math.min(1,availableWidth/width,availableHeight/height);
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function openRoomMedia({url,video,label,origin}){
 document.querySelector('.room-lightbox')?.close();
 const dialog=document.createElement('dialog');dialog.className='room-lightbox';
 dialog.setAttribute('aria-label',label);
 dialog.innerHTML='<div class="room-lightbox-bar"><span></span><div><button type="button" data-zoom hidden>原寸で見る</button><button type="button" data-close aria-label="拡大表示を閉じる">閉じる ×</button></div></div><div class="room-lightbox-stage"><p role="status">読み込んでいます…</p></div><p class="room-lightbox-caption"></p>';
 dialog.querySelector('.room-lightbox-bar span').textContent=video?'VIDEO / 同盟の共有':'PHOTO / 同盟の共有';
 dialog.querySelector('.room-lightbox-caption').textContent=label;
 const stage=dialog.querySelector('.room-lightbox-stage'),zoom=dialog.querySelector('[data-zoom]');
 const media=document.createElement(video?'video':'img');media.className='room-lightbox-media';
 let width=0,height=0,actual=false;
 const fit=()=>{if(!width||!height)return;const size=fittedMediaSize(width,height,stage.clientWidth,stage.clientHeight);media.style.width=(actual?width:size.width)+'px';media.style.height=(actual?height:size.height)+'px';zoom.hidden=video||width<=size.width;};
 if(video){media.controls=true;media.playsInline=true;media.preload='metadata';}else media.alt=label;
 media.addEventListener(video?'loadedmetadata':'load',()=>{width=video?media.videoWidth:media.naturalWidth;height=video?media.videoHeight:media.naturalHeight;stage.querySelector('[role=status]')?.remove();fit();});
 media.addEventListener('error',()=>{stage.querySelector('[role=status]')?.remove();const p=document.createElement('p');p.textContent='読み込めませんでした。閉じて、もう一度サムネイルを押してください。';stage.append(p);});
 stage.append(media);document.body.append(dialog);dialog.showModal();
 const observer=new ResizeObserver(fit);observer.observe(stage);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 zoom.onclick=()=>{actual=!actual;stage.classList.toggle('is-actual',actual);zoom.textContent=actual?'画面に合わせる':'原寸で見る';fit();};
 dialog.addEventListener('click',e=>{if(e.target===dialog||e.target===stage)dialog.close();});
 const oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 dialog.addEventListener('close',()=>{observer.disconnect();if(video)media.pause();media.removeAttribute('src');if(video)media.load();dialog.remove();document.documentElement.style.overflow=oldOverflow;if(origin?.isConnected)origin.focus({preventScroll:true});},{once:true});
 media.src=url;return dialog;
}
