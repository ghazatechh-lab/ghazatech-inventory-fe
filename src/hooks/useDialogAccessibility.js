import {useEffect} from 'react';
const focusable='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';
export function useDialogAccessibility(){
 useEffect(()=>{
  let active=null;let previous=null;const overflow=document.body.style.overflow;
  const update=()=>{
   document.querySelectorAll('.erp-page div.fixed.inset-0').forEach(el=>{if(el.querySelector('h2,h3,form')&&!el.hasAttribute('role')&&!el.querySelector('[role=dialog]')){el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',el.querySelector('h2,h3')?.textContent||'Record details')}});
   const dialogs=[...document.querySelectorAll('[role=dialog]')].filter(el=>el.offsetParent!==null || getComputedStyle(el).position==='fixed');
   const next=dialogs.at(-1)||null;
   if(next===active)return;
   if(!next){document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();active=null;previous=null;return}
   if(!active)previous=document.activeElement;
   active=next;active.tabIndex=-1;document.body.style.overflow='hidden';
   active.querySelectorAll('button').forEach(button=>{if(!button.textContent.trim()&&!button.getAttribute('aria-label')&&button.querySelector('svg.lucide-x'))button.setAttribute('aria-label','Close dialog')});
   const first=active.querySelector('[autofocus],input:not(:disabled):not([type=hidden]),select:not(:disabled)')||active.querySelector(focusable)||active;first.focus();
  };
  const key=e=>{
   if(!active)return;
   const nodes=[...active.querySelectorAll(focusable)].filter(n=>n.getClientRects().length);
   if(e.key==='Escape'){
    const close=nodes.find(n=>/^(close|cancel|back)$/i.test(n.textContent.trim())||/^close/i.test(n.getAttribute('aria-label')||''));
    if(close){e.preventDefault();close.click()}
   }
   if(e.key==='Tab'){
    if(!nodes.length){e.preventDefault();active.focus();return}
    const first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===active)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){e.preventDefault();first.focus()}
   }
  };
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',key);update();
  return()=>{observer.disconnect();document.removeEventListener('keydown',key);document.body.style.overflow=overflow};
 },[]);
}
