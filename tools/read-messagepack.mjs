// Strict, dependency-free reader for the game's local MessagePack master caches.
export function decodeMessagePack(buffer) {
 let offset=0;
 const take=n=>{if(offset+n>buffer.length)throw Error('Truncated MessagePack');const start=offset;offset+=n;return start;};
 const uint=n=>buffer.readUIntBE(take(n),n),int=n=>buffer.readIntBE(take(n),n);
 const str=n=>buffer.toString('utf8',take(n),offset);
 const array=n=>Array.from({length:n},read);
 const map=n=>{const out={};for(let i=0;i<n;i++){const key=read();if(Object.hasOwn(out,key))throw Error('Duplicate map key');out[key]=read();}return out;};
 function read(){const tag=uint(1);if(tag<128)return tag;if(tag>=224)return tag-256;if(tag>=160&&tag<192)return str(tag&31);if(tag>=144&&tag<160)return array(tag&15);if(tag>=128&&tag<144)return map(tag&15);
 switch(tag){case 212:case 213:case 214:case 215:case 216:{const n=2**(tag-212),type=int(1);return {extension:type,hex:buffer.subarray(take(n),offset).toString("hex")};}case 192:return null;case 194:return false;case 195:return true;case 196:case 197:case 198:{const n=uint(2**(tag-196));return {binary:buffer.subarray(take(n),offset).toString('base64')};}case 202:return buffer.readFloatBE(take(4));case 203:return buffer.readDoubleBE(take(8));case 204:return uint(1);case 205:return uint(2);case 206:return uint(4);case 207:{const n=buffer.readBigUInt64BE(take(8));if(n>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Unsafe integer');return Number(n);}case 208:return int(1);case 209:return int(2);case 210:return int(4);case 211:{const n=buffer.readBigInt64BE(take(8));if(n>BigInt(Number.MAX_SAFE_INTEGER)||n<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Unsafe integer');return Number(n);}case 217:return str(uint(1));case 218:return str(uint(2));case 219:return str(uint(4));case 220:return array(uint(2));case 221:return array(uint(4));case 222:return map(uint(2));case 223:return map(uint(4));default:throw Error(`Unsupported MessagePack tag ${tag} at ${offset-1}`);}}
 const result=read();if(offset!==buffer.length)throw Error('Trailing MessagePack bytes');return result;
}

