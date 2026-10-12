import fs from 'node:fs';
import {validateCandidateCatalog} from '../public/sub-candidates.js';
// Import an administrator's common-data export or a reviewed candidate JSON.
const path=process.argv[2];if(!path)throw Error('候補JSONまたは共通データ書き出しファイルを指定してください。');
const input=JSON.parse(fs.readFileSync(path,'utf8'));
const game=JSON.parse(fs.readFileSync('public/data/game-masters.json','utf8'));
const memories=JSON.parse(fs.readFileSync('public/data/game-memories.json','utf8'));
const records=[...Object.keys(game.equipment).map(id=>({id})),...memories.records];
const previous=JSON.parse(fs.readFileSync('public/data/sub-candidates.json','utf8'));
const candidates=validateCandidateCatalog(input.subAbilityCandidates??input.records,records);
fs.writeFileSync('public/data/sub-candidates.json',JSON.stringify({...previous,capturedAt:new Date().toISOString().slice(0,10),records:{...previous.records,...candidates}},null,2)+'\n');
console.log('Imported candidate definitions:',Object.keys(candidates).length);
