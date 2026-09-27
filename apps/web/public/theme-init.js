(function(){var oe=console.error;console.error=function(a){if(typeof a==='string'&&a.indexOf('Encountered a script tag while rendering React component')!==-1)return;oe.apply(console,arguments)}})();
(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark');if(!t)localStorage.setItem('theme','dark')}
// Public salon pages (/s/*) are always Persian/RTL, regardless of the dashboard's stored language preference.
if(location.pathname.indexOf('/s/')===0){document.documentElement.setAttribute('lang','fa');document.documentElement.setAttribute('dir','rtl');return}
var l=localStorage.getItem('lang');if(l==='fa'){document.documentElement.setAttribute('lang','fa');document.documentElement.setAttribute('dir','rtl')}else{document.documentElement.setAttribute('lang','en');document.documentElement.setAttribute('dir','ltr');if(!l)localStorage.setItem('lang','en')}})();
