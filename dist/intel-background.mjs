import {cycle04,sentiment} from './intel-history-data.mjs';
import {escapeHtml as escapeHTML} from './core.mjs';
const plainText=v=>String(v??'');
const esc=s=>escapeHTML(plainText(s));
const link=(url,title)=>/^https?:\/\//.test(url||'')?'<a href="'+escapeHTML(url)+'" target="_blank" rel="noopener noreferrer">'+esc(title)+' ↗</a>':'';
export function renderCompanyBackground(data,company){
 const old=cycle04[company],review=data.companies[company];
 const evidence=(review?.evidence||[]).map(id=>data.evidence.find(e=>e.id===id)).filter(Boolean);
 const years=['2022','2023','2024','2025','2026'];
 const cards=years.map(year=>{
  const entries=evidence.filter(e=>e.published?.startsWith(year));
  const description=old?.years?.[year]||(!entries.length?'No dated hiring information is available for this year in the current briefing.':entries.map(e=>e.fact).join('\n\n'));
  const urls=old?old.sources.filter(s=>String(s.date||'').includes(year)):entries.map(e=>({url:e.url,title:'Read the original update'}));
  const lead=description.length>100?description.slice(0,97)+'…':description;
  return '<details class="background-year"><summary><span class="background-year-date">'+year+'</span><span>'+esc(lead)+'</span></summary><div>'+description.split('\n\n').map(t=>'<p>'+esc(t)+'</p>').join('')+urls.map(s=>link(s.url,s.title)).join(' ')+'</div></details>';
 }).join('');
 const intel=sentiment[company];
 const conversations=intel?.sources||[];
 const face='<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#334b61"/><path d="M8 48c0-12 7-19 16-19s16 7 16 19" fill="#88a7bf"/><ellipse cx="24" cy="21" rx="10" ry="12" fill="#e0b99a"/><path d="M14 20c-3-13 20-19 21 1-5-1-8-5-9-8-2 4-7 6-12 7" fill="#1b2837"/><circle cx="20" cy="22" r="1" fill="#263546"/><circle cx="28" cy="22" r="1" fill="#263546"/><path d="M21 27q3 2 6 0" stroke="#886452" stroke-linecap="round"/></svg>';
 const redditLogo='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#ff4500"/><g stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16 2-8 7 2" fill="none"/><circle cx="31" cy="10" r="2.5" fill="#fff"/><circle cx="8" cy="21" r="3" fill="#fff"/><circle cx="32" cy="21" r="3" fill="#fff"/><ellipse cx="20" cy="24" rx="12" ry="8" fill="#fff"/></g><circle cx="15" cy="23" r="2" fill="#ff4500"/><circle cx="25" cy="23" r="2" fill="#ff4500"/><path d="M15 28q5 3 10 0" stroke="#ff4500" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
 const glassdoorLogo='<svg viewBox="0 0 32 40" aria-hidden="true"><path fill="#00a264" d="M7 2h19v7H10v20H3V6a4 4 0 0 1 4-4Zm18 36H6v-7h16V11h7v23a4 4 0 0 1-4 4Z"/></svg>';
 const bubbles=conversations.map((s,i)=>{
  const reddit=s.platform==='Reddit', glassdoor=s.platform==='Glassdoor';
  const author=s.author||s.username||(reddit?'Reddit contributors':glassdoor?'Glassdoor reviewer':s.platform+' contributor');
  const platform=reddit?'reddit':glassdoor?'glassdoor':'public';
  const logo=reddit?redditLogo:glassdoor?glassdoorLogo:'';
  return '<article class="account-message platform-'+platform+'"><div class="account-bubble"><div class="social-window-bar"><span class="social-brand"><span class="social-logo">'+logo+'</span><strong>'+esc(s.platform)+'</strong></span><span class="social-summary-label">'+(glassdoor?'Review summary':'Discussion summary')+'</span></div><div class="social-account-body"><div class="social-author"><span class="account-avatar">'+face+'</span><span><strong>'+esc(author)+'</strong><small>'+esc(s.date||'Date unavailable')+'</small></span></div><div class="social-account-copy"><h5>'+esc(s.title)+'</h5><p>'+esc(s.detail)+'</p></div><footer><span>Account summary · Not an exact quote</span>'+link(s.url,'View original')+'</footer></div></div></article>';
 }).join('');
 return '<div class="company-background-history"><p class="eyebrow">FIVE YEARS AT A GLANCE · 2022–2026</p><h4>Hiring history & patterns</h4><p>'+esc(old?.pattern||'The current sources show some relevant roles, but do not establish a repeating annual hiring pattern.')+'</p><p class="muted">Open a year for details. These are past developments, not current job listings. A gap here does not mean the company did not hire.</p><div class="background-years">'+cards+'</div></div><section class="employee-conversations"><p class="eyebrow">PEOPLE’S EXPERIENCES</p><h4>What employees and applicants are saying</h4>'+
 (bubbles?'<p class="muted">Summaries of public posts and reviews, presented in platform-inspired cards. These are not original screenshots or exact quotes. Profiles are anonymous unless a name was recorded.</p><div class="account-chat">'+bubbles+'</div><aside class="sentiment-summary"><p class="eyebrow">OUR SENTIMENT SUMMARY</p><h4>What to take from these accounts</h4><p>'+esc(intel.takeaway)+'</p><h5>How to use this</h5><p>'+esc(intel.action)+'</p><p class="muted">Experiences vary by role and team. These accounts do not represent every employee or predict your interview outcome.</p></aside>':'<p>No separate employee or applicant accounts are available in this briefing yet.</p><aside class="sentiment-summary"><h5>Sentiment summary</h5><p>There is not enough information here to describe employee sentiment reliably.</p></aside>')+'</section>';
}
