import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';

const moduleUrl = new URL('../dist/events.mjs', import.meta.url).href;
const clockCases = [
  ['America/Los_Angeles', '2026-11-26T07:59:59.999Z', '2026-11-26T08:00:00.000Z'],
  ['Pacific/Kiritimati', '2026-11-25T09:59:59.999Z', '2026-11-25T10:00:00.000Z'],
];

for (const [zone, before, midnight] of clockCases) {
  test(`Upcoming includes the whole event day in ${zone}`, () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import {eventStatus, nextLocalMidnight} from ${JSON.stringify(moduleUrl)};
      import {localDay} from ${JSON.stringify(new URL('../dist/tasks.mjs', import.meta.url).href)};
      const before = new Date('${before}');
      const midnight = new Date('${midnight}');
      const dates = ['2026-11-27','2026-11-24','2026-11-25','2026-11-26'];
      console.log(JSON.stringify({
        nextMidnight: nextLocalMidnight(before).toISOString(),
        before: dates.map(date => eventStatus(date, localDay(before))),
        after: dates.map(date => eventStatus(date, localDay(midnight)))
      }));
    `], {encoding:'utf8', env:{...process.env, TZ:zone}});
    assert.deepEqual(JSON.parse(output), {
      nextMidnight:midnight,
      before:['upcoming','past','upcoming','upcoming'],
      after:['upcoming','past','past','upcoming']
    });
  });
}

test('next local midnight accounts for a 23-hour daylight-saving transition', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import {nextLocalMidnight} from ${JSON.stringify(moduleUrl)};
    const start = new Date(2026, 2, 8);
    console.log((nextLocalMidnight(start) - start) / 3_600_000);
  `], {encoding:'utf8', env:{...process.env, TZ:'America/Los_Angeles'}});
  assert.equal(Number(output), 23);
});
