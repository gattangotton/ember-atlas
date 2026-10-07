// Copies remain independently managed in inventory; a party equips one per name.
export const memoryTypeKey=record=>(record.name||record.id).normalize('NFKC').trim();
export function normalizeMemorySelection(keys,choices){
 const byKey=new Map(choices.map(m=>[m.key,m])),seen=new Set();
 return keys.map(key=>{const m=byKey.get(key);if(!m)return '';const type=memoryTypeKey(m.record);if(seen.has(type))return '';seen.add(type);return key;});
}
