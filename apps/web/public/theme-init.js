(function(){var oe=console.error;console.error=function(a){if(typeof a==='string'&&a.indexOf('Encountered a script tag while rendering React component')!==-1)return;oe.apply(console,arguments)}})();
(function(){var t=localStorage.getItem('theme');
// No saved choice: follow the phone's light/dark setting (ThemeContext does the same after hydration).
var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
// Only the admin panel (/admin) is bilingual; every other page is always Persian/RTL (same rule as isBilingualPath in src/context/LanguageContext.tsx).
var p=location.pathname;if(!(p==='/admin'||p.indexOf('/admin/')===0)){document.documentElement.setAttribute('lang','fa');document.documentElement.setAttribute('dir','rtl');return}
var l=localStorage.getItem('lang');if(l==='fa'){document.documentElement.setAttribute('lang','fa');document.documentElement.setAttribute('dir','rtl')}else{document.documentElement.setAttribute('lang','en');document.documentElement.setAttribute('dir','ltr');if(!l)localStorage.setItem('lang','en')}})();
// Splash screen (components/common/SplashScreen.tsx) plays once per browser session: mark <html> when it
// already has, so CSS hides it before the first paint (no flash). No storage (private mode) → skip it.
(function(){var d=document.documentElement;try{if(sessionStorage.getItem('nobatet-splash')){d.classList.add('splash-seen')}else{sessionStorage.setItem('nobatet-splash','1')}}catch(e){d.classList.add('splash-seen')}})();
