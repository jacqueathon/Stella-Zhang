// Social Capital: turns a LinkedIn Connections.csv into industry reach and hiring access.
// Pure functions only, no DOM and no network. Data never leaves the browser.
export const INDUSTRIES = Object.freeze(['Tech', 'Defense & Gov', 'Finance', 'Healthcare', 'Education', 'Consulting', 'Retail & Consumer', 'Energy & Industrial', 'Media', 'Other']);

export function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export function readConnections(text) {
  const rows = parseCSV(text);
  const hi = rows.findIndex(r => (r[0] || '').trim().toLowerCase() === 'first name');
  if (hi < 0) throw new Error('That does not look like LinkedIn’s Connections.csv. The header row with First Name is missing.');
  const head = rows[hi].map(x => x.trim().toLowerCase()), col = n => head.indexOf(n);
  const [cf, cl, cu, cc, cp, cd] = ['first name', 'last name', 'url', 'company', 'position', 'connected on'].map(col);
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    if (!r || r.length < 2) continue;
    const first = (r[cf] || '').trim(), last = (r[cl] || '').trim();
    if (!first && !last) continue;
    let date = cd >= 0 ? new Date(r[cd]) : null;
    if (date && isNaN(date.getTime())) date = null;
    out.push({first, last, url: cu >= 0 ? (r[cu] || '').trim() : '', company: cc >= 0 ? (r[cc] || '').trim() : '', title: cp >= 0 ? (r[cp] || '').trim() : '', date});
  }
  if (!out.length) throw new Error('No connections found in that file.');
  return out;
}

export function normCompany(n) {
  let s = (n || '').toLowerCase().replace(/&/g, ' and ').replace(/[.,'’"()/-]/g, ' ');
  s = s.replace(/\b(inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh|lp|llp|the)\b/g, ' ');
  s = s.replace(/\b(u s a|u s|united states|usa)\b/g, 'us').replace(/\s+/g, ' ').trim();
  return s.replace(/ and$/, '').trim();
}

const INDEP = /^(self employed|selfemployed|freelance|freelancer|independent|independent consultant|stealth|stealth startup|confidential|n a|na|none|unemployed|retired|student|seeking.*|looking.*|open to work|consultant)$/;
const RX = {
  techNames: /\b(palantir|google|alphabet|amazon|aws|microsoft|apple|meta|facebook|netflix|tesla|nvidia|intel|amd|oracle|salesforce|adobe|ibm|cisco|stripe|uber|lyft|airbnb|spotify|snowflake|databricks|openai|anthropic|linkedin|shopify|atlassian|slack|zoom|dropbox|github|gitlab|servicenow|workday|vmware|dell|hp|qualcomm|broadcom|paypal|coinbase|robinhood|doordash|instacart|crowdstrike|okta|twilio|snap|pinterest|reddit|tiktok|bytedance)\b/,
  health: /\b(health|hospital|medical|medicine|clinic|pharma|pharmaceutical|biotech|therapeutics|kaiser|pfizer|moderna|unitedhealth|cvs|cigna|anthem|humana|mayo|cedars|nursing|dental|lifesciences)\b/,
  defense: /\b(army|navy|air force|marine|marines|space force|coast guard|national guard|department of defense|dod|pentagon|special operations|socom|darpa|nsa|cia|fbi|dhs|state department|government|federal|lockheed|raytheon|rtx|northrop|general dynamics|l3harris|bae systems|boeing|anduril|leidos|saic|booz allen|caci|mitre|military|defense|defence)\b/,
  edu: /\b(university|college|school|academy|institute|education|uc irvine|uci|ucla|usc|stanford|berkeley|mit|harvard|cal poly|csu|campus)\b/,
  fin: /\b(bank|banking|capital|financial|finance|investment|investments|ventures|venture|asset|assets|wealth|insurance|credit|fund|equity|trading|goldman|jpmorgan|morgan stanley|blackrock|citi|citigroup|wells fargo|bank of america|visa|mastercard|american express|fidelity|vanguard|schwab|kkr|blackstone|carlyle|chase|pimco|citadel|experian|pacific life|robert half)\b/,
  cons: /\b(deloitte|pwc|pricewaterhousecoopers|kpmg|ernst|ey|accenture|mckinsey|bain|boston consulting|bcg|consulting|consultants|advisory|advisors|capgemini|cognizant)\b/,
  retail: /\b(walmart|target|costco|home depot|nike|starbucks|mcdonald|mcdonalds|chipotle|taco bell|retail|apparel|foods|food|restaurant|restaurants|consumer|coca cola|pepsi|procter|unilever|brands|fender)\b/,
  energy: /\b(energy|oil|gas|solar|power|electric|utility|utilities|chevron|exxon|shell|bp|general electric|caterpillar|honeywell|3m|manufacturing|construction|logistics|fedex|ups|freight|aerospace|spacex|airlines|airline|automotive|honda|hyundai|rivian|ttm|ingram micro)\b/,
  media: /\b(media|entertainment|studios|news|pictures|records|music|publishing|disney|warner|nbc|cnn|fox|gaming|games|broadcasting|blizzard|riot)\b/,
  techGen: /\b(software|technology|technologies|tech|systems|data|cloud|ai|cyber|cybersecurity|digital|labs|analytics|networks|semiconductor|robotics|saas|platform|app|apps|computing|engineering|solutions|startup)\b/
};
export function classify(key) {
  if (!key || INDEP.test(key)) return 'Other';
  if (RX.techNames.test(key)) return 'Tech';
  if (RX.health.test(key)) return 'Healthcare';
  if (RX.defense.test(key)) return 'Defense & Gov';
  if (RX.edu.test(key)) return 'Education';
  if (RX.fin.test(key)) return 'Finance';
  if (RX.cons.test(key)) return 'Consulting';
  if (RX.retail.test(key)) return 'Retail & Consumer';
  if (RX.energy.test(key)) return 'Energy & Industrial';
  if (RX.media.test(key)) return 'Media';
  if (RX.techGen.test(key)) return 'Tech';
  return 'Other';
}

export function seniority(title) {
  const t = (title || '').toLowerCase();
  if (/\b(chief|ceo|cto|cfo|coo|cio|ciso|cmo|founder|co-founder|cofounder|president|owner|general partner|brigadier|general|colonel)\b/.test(t) && !/\blieutenant colonel\b/.test(t)) return 5;
  if (/\b(vp|svp|evp|vice president|head of|managing director|partner|lieutenant colonel|lt col)\b/.test(t)) return 4;
  if (/\b(director|principal|major|md|dean|chair)\b/.test(t)) return 3;
  if (/\b(manager|lead|senior|sr|staff|captain|cpt|professor|architect)\b/.test(t)) return 2;
  return 1;
}

const RXREC = /\b(recruit\w*|talent acquisition|talent partner|sourcer|headhunter|staffing|human resources|hr business partner|people operations)\b/;
const RXMGR = /\b(manager|director|head of|lead|principal|chair|dean|supervisor|captain|major|colonel|commander|chief of staff)\b/;
export function hireRole(title, sen) {
  const t = (title || '').toLowerCase();
  if (RXREC.test(t)) return 'recruiter';
  if (sen >= 4) return 'executive';
  if (RXMGR.test(t)) return 'manager';
  return '';
}
export const HIRE_LABELS = Object.freeze({recruiter: 'Recruiters', manager: 'Hiring managers', executive: 'Executives'});

// raw: output of readConnections. now: ms timestamp (injectable so tests are stable).
export function buildNetwork(raw, now = Date.now()) {
  const comps = {}, inds = {}, people = [];
  for (const r of raw) {
    let k = normCompany(r.company);
    if (!k || INDEP.test(k)) k = 'independent';
    const c = comps[k] ||= {key: k, names: {}, people: [], name: ''};
    const shown = r.company.trim() || 'Independent / unlisted';
    c.names[shown] = (c.names[shown] || 0) + 1;
    const sen = seniority(r.title);
    const p = {name: `${r.first} ${r.last}`.trim(), url: r.url, title: r.title || 'No title listed', date: r.date, sen, hire: hireRole(r.title, sen), ck: k};
    c.people.push(p); people.push(p);
  }
  for (const c of Object.values(comps)) {
    const best = Object.entries(c.names).sort((a, b) => b[1] - a[1])[0][0];
    c.name = c.key === 'independent' ? 'Independent / unlisted' : best;
    c.ind = classify(c.key);
    for (const p of c.people) { p.company = c.name; p.ind = c.ind; }
    const i = inds[c.ind] ||= {name: c.ind, comps: [], people: []};
    i.comps.push(c); i.people.push(...c.people);
  }
  for (const i of Object.values(inds)) i.comps.sort((a, b) => b.people.length - a.people.length);
  return {people, comps, inds, now};
}

export const monthsAgo = (d, now = Date.now()) => d ? (now - d.getTime()) / 2629800000 : 999;

export function hhiOf(counts) {
  const t = counts.reduce((a, b) => a + b, 0);
  if (!t) return null;
  const hhi = counts.reduce((a, c) => a + (c / t) ** 2, 0);
  const groups = counts.filter(c => c > 0).length;
  const label = groups < 2 ? 'Everyone in one group' : hhi < 0.15 ? 'Well diversified' : hhi < 0.25 ? 'Moderately concentrated' : hhi < 0.4 ? 'Concentrated' : 'Highly concentrated';
  return {hhi, eff: 1 / hhi, label, total: t, groups};
}

const SENW = [1, 1.5, 2.5, 3.5, 4];
const warmW = (p, now) => { if (!p.date) return 0.5; const m = monthsAgo(p.date, now); return m <= 12 ? 1 : m <= 36 ? 0.8 : m <= 72 ? 0.6 : 0.4; };
const contrib = (p, now) => SENW[p.sen - 1] * warmW(p, now) + (p.hire === 'recruiter' ? warmW(p, now) : 0);
export const tierOf = score => score >= 70 ? 'Strong' : score >= 40 ? 'Good' : score >= 15 ? 'Thin' : 'Cold';

// How well you can reach a set of people: seniority and recency, saturating towards 100.
export function accessOf(people, now = Date.now()) {
  let raw = 0, senior = 0, recent = 0, hiring = 0;
  for (const p of people) {
    raw += contrib(p, now);
    if (p.sen >= 3) senior++;
    if (monthsAgo(p.date, now) <= 24) recent++;
    if (p.hire) hiring++;
  }
  const score = Math.round(100 * (1 - Math.exp(-raw / 6)));
  return {score, tier: tierOf(score), n: people.length, senior, recent, hiring};
}

export function industryRows(net) {
  return Object.values(net.inds).sort((a, b) => b.people.length - a.people.length).map(i => ({name: i.name, count: i.people.length, companies: i.comps.length, access: accessOf(i.people, net.now)}));
}
export function hiringGroups(net) {
  return ['recruiter', 'manager', 'executive'].map(role => ({role, label: HIRE_LABELS[role], people: net.people.filter(p => p.hire === role).sort((a, b) => b.sen - a.sen || (b.date || 0) - (a.date || 0))}));
}
// Match a company name from the job list to people you already know there.
export function peopleAt(net, companyName) {
  const k = normCompany(companyName);
  if (!k) return [];
  return Object.values(net.comps).filter(c => c.key !== 'independent' && (c.key === k || c.key.startsWith(k + ' ') || k.startsWith(c.key + ' '))).flatMap(c => c.people);
}

// Fictional demo network so the tab works without a real export. Names are invented.
export function demoConnections(now = Date.now()) {
  const day = 86400000, d = n => new Date(now - n * day);
  const rows = [
    ['Dana', 'Whitfield', 'Blizzard Entertainment', 'Senior Technical Recruiter', 60], ['Theo', 'Marsh', 'Blizzard Entertainment', 'Game Producer', 400],
    ['Priya', 'Nandakumar', 'Riot Games', 'Data Analyst', 200], ['Leo', 'Ferraro', 'Riot Games', 'Director of Analytics', 900],
    ['Mina', 'Okafor', 'American Honda Motor Co.', 'Talent Acquisition Partner', 90], ['Sam', 'Delgado', 'American Honda Motor Co.', 'Finance Manager', 700], ['Grace', 'Lindqvist', 'American Honda Motor Co.', 'VP of Operations', 1500],
    ['Owen', 'Takeda', 'Anduril Industries', 'Program Manager', 120], ['Ruth', 'Calloway', 'Anduril Industries', 'Technical Recruiter', 30], ['Marcus', 'Ibarra', 'Anduril', 'Director of Programs', 500],
    ['Ines', 'Paredes', 'TTM Technologies', 'Process Engineer', 300], ['Bao', 'Tran', 'TTM Technologies', 'Engineering Manager', 800],
    ['Helen', 'Murray', 'Pacific Life', 'Financial Analyst', 240], ['Kofi', 'Mensah', 'Pacific Life', 'Managing Director', 1200],
    ['Nora', 'Sullivan', 'PIMCO', 'Portfolio Analyst', 150], ['Jack', 'Reyes', 'Citadel', 'Quantitative Researcher', 450],
    ['Amara', 'Singh', 'CalOptima Health', 'Data Scientist', 100], ['Eli', 'Brandt', 'CalOptima Health', 'Director of Operations', 650],
    ['Cora', 'Whelan', 'Edwards Lifesciences', 'Talent Acquisition Specialist', 45], ['Vik', 'Rao', 'Edwards Lifesciences', 'Clinical Researcher', 380],
    ['Tess', 'Holloway', 'Chipotle', 'Marketing Manager', 210], ['Noel', 'Archer', 'Chipotle', 'Brand Director', 1000],
    ['Zoe', 'Park', 'Fender', 'Marketing Analyst', 330], ['Ravi', 'Menon', 'Experian', 'Senior Data Analyst', 270],
    ['Lena', 'Voss', 'Robert Half', 'Recruiter', 20], ['Omar', 'Haddad', 'Brighton Jones', 'Wealth Advisor', 520],
    ['Iris', 'Chandler', 'University of California Irvine', 'Program Director', 140], ['Paul', 'Kessler', 'University of California Irvine', 'Professor', 1800],
    ['Jules', 'Bennett', 'Deloitte', 'Senior Consultant', 360], ['Anya', 'Petrova', 'Deloitte', 'Partner', 2100],
    ['Kai', 'Morita', 'Google', 'Product Manager', 280], ['Elise', 'Dumont', 'Microsoft', 'Technical Recruiter', 75],
    ['Hugo', 'Alvarez', 'Self-employed', 'Freelance Designer', 600], ['Tara', 'Quinn', '', 'Open to work', 50]
  ];
  return rows.map(([first, last, company, title, ago]) => ({first, last, url: '', company, title, date: d(ago)}));
}
