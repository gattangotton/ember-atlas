import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(process.argv[2]||'.work/game-master/asset-catalog-builtin.json'));
const entries=Buffer.from(catalog.m_EntryDataString,'base64'),buckets=Buffer.from(catalog.m_BucketDataString,'base64'),extra=Buffer.from(catalog.m_ExtraDataString,'base64');
let p=4;const bucket=[];for(let i=0;i<buckets.readInt32LE(0);i++){const key=buckets.readInt32LE(p),n=buckets.readInt32LE(p+4);p+=8;const rows=[];for(let j=0;j<n;j++,p+=4)rows.push(buckets.readInt32LE(p));bucket.push({key,rows});}
const rows=Array.from({length:entries.readInt32LE(0)},(_,i)=>Array.from({length:7},(_,j)=>entries.readInt32LE(4+i*28+j*4)));
function metadata(offset){if(offset<0)return null;let p=offset;if(extra[p++]!==7)throw Error('Unsupported catalog extra');p+=1+extra[p];p+=1+extra[p];const n=extra.readInt32LE(p);p+=4;return JSON.parse(extra.toString('utf16le',p,p+n));}
function dependencies(index,seen=new Set()){if(seen.has(index))return [];seen.add(index);const r=rows[index],id=catalog.m_InternalIds[r[0]];return [...(id.endsWith('.bundle')?[{id,...metadata(r[4])}]:[]),...(r[2]<0?[]:bucket[r[2]].rows.flatMap(i=>dependencies(i,seen)))];}
const selected=[];
for(let i=0;i<rows.length;i++){const id=catalog.m_InternalIds[rows[i][0]];if(/Remote\/Consumable\/Thumbnail\/(0000[1-5]|0008[3-6]|10002)\.png$/.test(id))selected.push({asset:id,bundles:dependencies(i)});}
fs.writeFileSync('.work/game-master/consumable-image-locations.json',JSON.stringify(selected,null,2));
console.log('assets',selected.length);
