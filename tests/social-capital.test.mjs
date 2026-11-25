import test from 'node:test';
import assert from 'node:assert/strict';
import {readConnections, buildNetwork, classify, seniority, hhiOf, accessOf, peopleAt, demoConnections, normCompany} from '../dist/social-capital.mjs';
import {readAny} from '../dist/zip.mjs';
import {renderCapital} from '../dist/social-capital-view.mjs';

const CSV = 'Notes:\nsome LinkedIn preamble\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\nAda,Lovelace,,,Anduril Industries,Technical Recruiter,01 Mar 2026\nGrace,Hopper,,,"Navy",Colonel,01 Jan 2015\n';
const NOW = new Date('2026-11-25').getTime();

test('reads LinkedIn CSV with preamble and quoted fields', () => {
  const rows = readConnections(CSV);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].company, 'Navy');
  assert.throws(() => readConnections('a,b\n1,2'), /Connections\.csv/);
});

test('classifies industries, seniority and company names', () => {
  assert.equal(classify(normCompany('Google LLC')), 'Tech');
  assert.equal(classify(normCompany('Pacific Life')), 'Finance');
  assert.equal(classify('self employed'), 'Other');
  assert.equal(seniority('Lieutenant Colonel'), 4);
  assert.equal(seniority('VP of Engineering'), 4);
  assert.equal(seniority('Analyst'), 1);
});

test('hhi labels concentration', () => {
  assert.equal(hhiOf([10]).label, 'Everyone in one group');
  assert.equal(hhiOf([5, 5, 5, 5, 5, 5, 5]).label, 'Well diversified');
  assert.equal(hhiOf([9, 1]).label, 'Highly concentrated');
  assert.equal(hhiOf([]), null);
});

test('access score rises with seniority and stays within 0-100', () => {
  const net = buildNetwork(readConnections(CSV), NOW);
  const a = accessOf(net.people, NOW);
  assert.ok(a.score > 0 && a.score <= 100);
  assert.equal(a.hiring, 2);
  assert.equal(accessOf([], NOW).tier, 'Cold');
});

test('peopleAt matches company variants', () => {
  const net = buildNetwork(demoConnections(NOW), NOW);
  assert.equal(peopleAt(net, 'Anduril Industries').length, 3);
  assert.equal(peopleAt(net, 'Nonexistent Co').length, 0);
});

test('reads nested zip and gzip exports', async () => {
  const {gzipSync} = await import('node:zlib');
  const gz = gzipSync(Buffer.from(CSV));
  const out = await readAny([{name: 'Connections.csv.gz', bytes: new Uint8Array(gz)}]);
  assert.equal(out.files.length, 1);
  assert.equal(readConnections(out.files[0].text).length, 2);
  const plain = await readAny([{name: 'Connections.csv', bytes: new TextEncoder().encode(CSV)}]);
  assert.equal(plain.files[0].name, 'Connections.csv');
});

test('view escapes untrusted names and renders empty state', () => {
  const bad = buildNetwork(readConnections('First Name,Last Name,Company,Position,Connected On\n<img src=x>,Z,Acme,Analyst,01 Jan 2026'), NOW);
  const html = renderCapital({net: bad, ui: {industry: 'Other', company: '', demo: false}});
  assert.ok(!html.includes('<img src=x>'));
  assert.match(renderCapital({net: null, ui: {}}), /sample network/);
});
