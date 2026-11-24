import assert from 'node:assert/strict';
import test from 'node:test';
import { publicSettings } from '../dist/account/settings.mjs';

test('customer build accepts public keys, project origins and loopback development', () => {
  const url = 'https://synthetic.example';
  assert.equal(publicSettings(url, 'sb_publishable_fixture').url, url);
  const payload = btoa(JSON.stringify({ role: 'anon' }));
  assert.equal(publicSettings('http://127.0.0.1:8000', 'x.' + payload + '.x').url, 'http://127.0.0.1:8000');
});
test('customer build rejects secret and service keys, insecure origins and URL credentials', () => {
  const role = btoa(JSON.stringify({ role: 'service_role' }));
  for (const key of [undefined, '', 'sb_secret_fixture', 'x.' + role + '.x']) {
    assert.throws(() => publicSettings('https://synthetic.example', key));
  }
  for (const url of ['http://synthetic.example', 'https://x@y.test', 'https://y.test/path', 'https://y.test/?key=x']) {
    assert.throws(() => publicSettings(url, 'sb_publishable_fixture'));
  }
});
