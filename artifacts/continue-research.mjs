import fs from 'node:fs';
const script=fs.readFileSync('artifacts/simplify-research.mjs','utf8');const tail=script.slice(script.indexOf("p='public/research-plan-view.js';"));fs.writeFileSync('artifacts/simplify-research-view.mjs',"import fs from 'node:fs';let p,s;\n"+tail);
