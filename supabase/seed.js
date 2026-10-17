// Génère seed.sql depuis les fichiers du site : node supabase/seed.js > supabase/seed.sql
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..'), ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + ';this.R=RARITIES;this.B=BOOSTERS;this.P=POKEMON;', ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'fanart.js'), 'utf8'), ctx);
const furn = fs.readFileSync(path.join(dir, 'museum.js'), 'utf8').match(/const FURN = (\{[\s\S]*?\n\});/)[1];
const FURN = vm.runInNewContext('(' + furn + ')');
const PTS = { C: 1, R: 3, E: 8, L: 20, M: 50 }; // même barème que play.js
const arr = a => a ? `'{${a.join(',')}}'` : 'null';
const out = ['-- Données du jeu, généré par seed.js. Relançable.', 'truncate anim, pokemon, boosters, furniture, rarities cascade;'];
out.push('insert into rarities values ' + ctx.R.map((r, i) => `('${r.key}',${i},${r.weight},${r.guar},${r.dup},${PTS[r.key]})`).join(',') + ';');
out.push('insert into pokemon values ' + ctx.P.map(p => `(${p.id},'${p.r}',${arr(p.types)})`).join(',') + ';');
out.push('insert into boosters values ' + ctx.B.map(b => `('${b.id}',${b.price},${arr(b.types)})`).join(',') + ';');
out.push('insert into anim values ' + Object.keys(ctx.window.ANIM).map(id => `(${id})`).join(',') + ';');
out.push('insert into furniture values ' + Object.entries(FURN).map(([id, [, price]]) => `('${id}',${price})`).join(',') + ';');
console.assert(ctx.P.length === 151 && Object.keys(FURN).length === 21);
console.log(out.join('\n'));
