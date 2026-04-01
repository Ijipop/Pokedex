/**
 * Génère pokemon-primary-types.json (id national → type principal anglais PokéAPI).
 * Usage : node scripts/generate-pokemon-primary-types.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outFile = path.join(root, 'pokemon-primary-types.json');

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'PokedexCoursework/1.0' } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

async function main() {
    const listData = await fetchJson('https://pokeapi.co/api/v2/pokemon?limit=2500');
    const ids = [
        ...new Set(
            listData.results
                .map(r => {
                    const m = String(r.url).match(/\/(\d+)\/?$/);
                    return m ? Number(m[1]) : null;
                })
                .filter(n => Number.isFinite(n))
        )
    ].sort((a, b) => a - b);

    console.log('IDs uniques à traiter :', ids.length);

    const map = {};
    const CONCURRENCY = 6;
    let cursor = 0;

    async function worker() {
        while (true) {
            const idx = cursor++;
            if (idx >= ids.length) break;
            const id = ids[idx];
            try {
                const p = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
                const primary = p.types.sort((a, b) => a.slot - b.slot)[0].type.name;
                map[String(id)] = primary;
            } catch (e) {
                console.error('Échec id', id, e.message);
            }
            await new Promise(r => setTimeout(r, 55));
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    fs.writeFileSync(outFile, JSON.stringify(map));
    console.log('Écrit', Object.keys(map).length, 'entrées dans', outFile);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
