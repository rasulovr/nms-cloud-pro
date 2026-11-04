import {useLayoutEffect} from 'react';
export function useOfferPaging(host,count) {
 useLayoutEffect(()=>{
  const node=host.current, strip=node?.querySelector('.bc1-offer-strip');
  if(!strip)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let timer, pointer=false, hover=false, index=0, width=strip.clientWidth;
  const paused=()=>pointer||hover||document.hidden||motion.matches||node.contains(document.activeElement)||document.querySelector('.product-modal');
  const restart=()=>{clearTimeout(timer);if(paused())return;timer=setTimeout(()=>{if(paused())return;const count=strip.children.length;index=(index+1)%count;strip.scrollTo({left:index*strip.clientWidth,behavior:'smooth'});restart();},6000)};
  const down=()=>{pointer=true;clearTimeout(timer)};
  const up=()=>{pointer=false;restart()};
  const enter=e=>{if(e.pointerType==='mouse'){hover=true;clearTimeout(timer)}};
  const leave=()=>{hover=false;restart()};
  const focus=()=>clearTimeout(timer),blur=()=>queueMicrotask(restart);
  const fit=()=>{const slide=strip.children[index];if(slide)strip.style.height=`${slide.offsetHeight+8}px`};
  const scroll=()=>{index=Math.round(strip.scrollLeft/strip.clientWidth);fit();restart()};
  const resize=()=>{node.style.setProperty('--preview-card-width',`${Math.min((node.clientWidth-28)*.86,440)}px`);if(width!==strip.clientWidth){width=strip.clientWidth;strip.scrollTo({left:index*width,behavior:'instant'})}fit();restart()};
  const events=[[node,'pointerdown',down],[window,'pointerup',up],[window,'pointercancel',up],[node,'pointerenter',enter],[node,'pointerleave',leave],[node,'focusin',focus],[node,'focusout',blur],[strip,'scroll',scroll],[document,'visibilitychange',restart],[motion,'change',restart]];
  events.forEach(([el,type,fn])=>el.addEventListener(type,fn));const observer=new ResizeObserver(resize);observer.observe(node);for(const slide of strip.children)observer.observe(slide);resize();
  return()=>{clearTimeout(timer);observer.disconnect();events.forEach(([el,type,fn])=>el.removeEventListener(type,fn))};
 },[count]);
}
