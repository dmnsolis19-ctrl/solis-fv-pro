(()=>{
 const key='solis-fv-theme-v1',media=window.matchMedia('(prefers-color-scheme: dark)');let mode='system';
 try{const saved=localStorage.getItem(key);if(['light','dark','system'].includes(saved))mode=saved;}catch{}
 const apply=()=>{document.documentElement.dataset.theme=mode==='system'?(media.matches?'dark':'light'):mode;document.documentElement.style.colorScheme=document.documentElement.dataset.theme;};
 apply();media.addEventListener('change',apply);
 document.addEventListener('DOMContentLoaded',()=>{const select=document.querySelector('#theme-select');select.value=mode;select.addEventListener('change',()=>{mode=select.value;try{localStorage.setItem(key,mode);}catch{}apply();});});
})();
