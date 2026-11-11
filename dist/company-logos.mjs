import {escapeHtml} from './core.mjs';
export const companyDomains=Object.freeze({'American Honda Motor Co.':'honda.com','Hyundai Capital America':'hyundaicapitalamerica.com','Riot Games':'riotgames.com','TTM Technologies':'ttm.com','Blizzard Entertainment':'blizzard.com','Brighton Jones':'brightonjones.com','CalOptima Health':'caloptima.org','Advanced Sterilization Products':'asp.com','Fender':'fender.com','Robert Half':'roberthalf.com','Anduril Industries':'anduril.com','Anduril':'anduril.com','Chipotle':'chipotle.com','Experian':'experian.com','PIMCO':'pimco.com','Citadel':'citadel.com','Rivian':'rivian.com','Harbinger':'harbingermotors.com','ITT Cannon':'ittcannon.com','Edwards Lifesciences':'edwards.com','AbbVie / Allergan Aesthetics':'allerganaesthetics.com','Ingram Micro':'ingrammicro.com','Taco Bell':'tacobell.com','Pacific Life':'pacificlife.com','Capital Group':'capitalgroup.com','Hyundai Motor America':'hyundaiusa.com','Disney / Disneyland Resort':'disneyland.disney.go.com'});
export function companyLogo(name){
 const initials=String(name).split(/\s+/).filter(w=>w!=='/').map(w=>w[0]).slice(0,2).join('').toUpperCase();
 const domain=companyDomains[name];
 return `<span class="company-logo company-mark" aria-hidden="true"><span class="company-initials">${escapeHtml(initials)}</span>${domain?`<img class="company-mark-image" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&amp;sz=128" alt="" width="36" height="36" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
}
export function installLogoFallback(root){root.addEventListener('error',event=>{if(event.target?.classList?.contains('company-mark-image'))event.target.remove();},true);}

