import {escapeHtml as esc} from './core.mjs';
import {industryRows, hiringGroups, accessOf, peopleAt, hhiOf, monthsAgo} from './social-capital.mjs';

const initials = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const TIER = {Strong: 'strong', Good: 'good', Thin: 'thin', Cold: 'cold'};
const tierPill = a => `<span class="pill cap-tier ${TIER[a.tier]}">${a.tier} · ${a.score}</span>`;
const since = (p, now) => !p.date ? '' : monthsAgo(p.date, now) < 12 ? 'Connected this year' : `Connected ${p.date.getFullYear()}`;

function personRow(p, net) {
  return `<div class="person-row"><span class="avatar cap-avatar">${esc(initials(p.name))}</span><div class="info"><strong>${esc(p.name)}</strong><p class="cap-sub">${esc(p.title)} · ${esc(p.company)}</p></div><span class="cap-sub cap-when">${esc(since(p, net.now))}</span></div>`;
}

function stats(net) {
  const all = accessOf(net.people, net.now), rows = industryRows(net);
  const mix = hhiOf(rows.map(r => r.count));
  const items = [[net.people.length, 'Connections', 'people'], [rows.length, 'Industries reached', 'layers'], [all.hiring, 'Hiring-capable people', 'check'], [mix ? mix.label : '—', 'Spread across industries', 'progress']];
  return `<div class="stats">${items.map(([n, l]) => `<div class="stat"><div><strong class="${typeof n === 'string' ? 'cap-stat-text' : ''}">${esc(n)}</strong><span>${esc(l)}</span></div></div>`).join('')}</div>`;
}

function bubbles(net, ui) {
  const rows = industryRows(net), max = Math.max(...rows.map(r => r.count));
  return `<div class="cap-bubbles" role="list">${rows.map(r => {
    const size = Math.round(78 + 92 * Math.sqrt(r.count / max));
    return `<button role="listitem" class="cap-bubble ${TIER[r.access.tier]} ${ui.industry === r.name ? 'active' : ''}" style="width:${size}px;height:${size}px" data-action="capital-industry" data-name="${esc(r.name)}" aria-pressed="${ui.industry === r.name}" aria-label="${esc(r.name)}: ${r.count} people, access ${r.access.tier}"><b>${r.count}</b><span>${esc(r.name)}</span></button>`;
  }).join('')}</div><p class="cap-legend"><span class="pill cap-tier strong">Strong</span><span class="pill cap-tier good">Good</span><span class="pill cap-tier thin">Thin</span><span class="pill cap-tier cold">Cold</span> Size shows how many people you know. Colour shows how reachable the industry is, from seniority and how recently you connected.</p>`;
}

function drill(net, ui) {
  const ind = net.inds[ui.industry];
  if (!ind) return `<div class="empty"><p>Select a bubble to see the companies and people behind it.</p></div>`;
  const comp = ind.comps.find(c => c.key === ui.company);
  const head = `<div class="section-heading"><div><p class="eyebrow">${esc(ind.name.toUpperCase())}</p><h2>${comp ? esc(comp.name) : `${ind.comps.length} ${ind.comps.length === 1 ? 'company' : 'companies'}`}</h2></div>${comp ? `<button class="text-button" data-action="capital-company" data-key="">All companies</button>` : ''}</div>`;
  if (comp) return head + comp.people.sort((a, b) => b.sen - a.sen).map(p => personRow(p, net)).join('');
  return head + ind.comps.map(c => {
    const a = accessOf(c.people, net.now);
    return `<button class="cap-company" data-action="capital-company" data-key="${esc(c.key)}"><span class="company-logo">${esc(c.name.slice(0, 2).toUpperCase())}</span><span class="info"><strong>${esc(c.name)}</strong><span class="cap-sub">${c.people.length} ${c.people.length === 1 ? 'person' : 'people'}${a.hiring ? ` · ${a.hiring} hiring-capable` : ''}</span></span>${tierPill(a)}</button>`;
  }).join('');
}

function hiring(net) {
  return `<div class="grid-3">${hiringGroups(net).map(g => `<article class="card"><p class="eyebrow">${esc(g.label.toUpperCase())}</p><h3>${g.people.length} ${g.people.length === 1 ? 'person' : 'people'}</h3>${g.people.slice(0, 4).map(p => personRow(p, net)).join('') || `<p class="cap-sub">No one in this group yet.</p>`}${g.people.length > 4 ? `<p class="cap-sub cap-more">+ ${g.people.length - 4} more</p>` : ''}</article>`).join('')}</div>`;
}

// Roles Hydra Stack ranks for the student, with how many people they already know there.
function forYou(net, rankedJobs) {
  const seen = new Set(), rows = [];
  for (const j of rankedJobs) {
    if (seen.has(j.company)) continue;
    seen.add(j.company);
    const ps = peopleAt(net, j.company);
    rows.push({job: j, ps, a: accessOf(ps, net.now)});
    if (rows.length === 6) break;
  }
  return `<div class="grid-3">${rows.map(({job, ps, a}) => `<article class="card"><p class="eyebrow">${esc(job.company.toUpperCase())}</p><h3>${esc(job.title)}</h3><div class="tags">${ps.length ? tierPill(a) : '<span class="pill muted">No connections yet</span>'}</div><p class="cap-sub">${ps.length ? `${ps.length} ${ps.length === 1 ? 'person' : 'people'} you know here${a.hiring ? `, ${a.hiring} in hiring roles` : ''}.` : 'Worth a first conversation. Try a priority contact.'}</p></article>`).join('')}</div>`;
}

export function renderCapital({net, ui, rankedJobs = [], error = ''}) {
  const upload = `<div class="import-file"><input id="capitalFile" type="file" multiple accept=".csv,.zip,.gz,.txt" aria-label="Add LinkedIn Connections.csv or your data export zip"><span>Connections.csv or the full LinkedIn export (.zip)</span></div>`;
  const notice = `<div class="notice"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg><span>Your file is read on this device and kept in memory only. Nothing is uploaded or saved, and a refresh clears it. LinkedIn’s export has no industry or photo columns, so industries are estimated from company names.</span></div>`;
  if (!net) {
    return `${notice}<section class="panel cap-start"><p class="eyebrow">START WITH YOUR OWN NETWORK</p><h2>See who you can reach, and where.</h2><p class="cap-sub">Request your data from LinkedIn (Settings → Data privacy → Get a copy of your data → Connections), then add the file here.</p>${error ? `<p class="cap-error" role="alert">${esc(error)}</p>` : ''}${upload}<button class="btn outline" data-action="capital-demo">Explore with a sample network</button></section>`;
  }
  return `${notice}${stats(net)}<div class="cap-toolbar">${upload}<button class="btn outline small" data-action="capital-clear">${ui.demo ? 'Clear sample' : 'Clear data'}</button></div>${error ? `<p class="cap-error" role="alert">${esc(error)}</p>` : ''}${ui.demo ? '<p class="cap-sub cap-demo">Sample network with invented people. Add your own export to replace it.</p>' : ''}
<section class="below cap-map"><div class="panel"><p class="eyebrow">REACH MAP</p>${bubbles(net, ui)}</div><div class="panel">${drill(net, ui)}</div></section>
<section class="cap-section"><div class="section-heading"><div><p class="eyebrow">FOR YOUR TARGET ROLES</p><h2>Who you already know at companies hiring for you</h2></div></div>${forYou(net, rankedJobs)}</section>
<section class="cap-section"><div class="section-heading"><div><p class="eyebrow">HIRING POWER</p><h2>People who can open a door</h2></div></div>${hiring(net)}</section>`;
}
