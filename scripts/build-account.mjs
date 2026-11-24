import { copyFile, writeFile } from 'node:fs/promises';
import { publicSettings } from '../dist/account/settings.mjs';

const settings = publicSettings(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
const target = new URL('../dist/account/', import.meta.url);
await copyFile(new URL('../node_modules/@supabase/supabase-js/dist/umd/supabase.js', import.meta.url), new URL('supabase.js', target));
await writeFile(new URL('config.mjs', target),
  `export const projectUrl = ${JSON.stringify(settings.url)};\nexport const publicKey = ${JSON.stringify(settings.key)};\n`);
