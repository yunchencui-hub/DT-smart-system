// firmware/robin/face.h -> src/gen/faces.json, so the video shows exactly the faces the robot draws.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const src = fs.readFileSync(path.join(REPO, 'firmware/robin/face.h'), 'utf8');
const names = [...src.match(/MOOD_NAMES\[MOOD_COUNT\]\s*=\s*\{([^}]*)\}/)![1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
const rows = [...src.matchAll(/\{([01](?:\s*,\s*[01]){11})\}/g)].map((m) => m[1].split(',').map((x) => +x.trim()));
if (rows.length !== names.length * 8) throw new Error(`face.h: expected ${names.length * 8} rows, got ${rows.length}`);
const faces = Object.fromEntries(names.map((n, i) => [n, rows.slice(i * 8, i * 8 + 8)]));
fs.mkdirSync(path.join(HERE, '../src/gen'), { recursive: true });
fs.writeFileSync(path.join(HERE, '../src/gen/faces.json'), JSON.stringify(faces));
console.log(`faces: ${names.join(', ')}`);
