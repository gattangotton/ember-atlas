// Screen-order columns transcribed from the five supplied research recordings.
// These are visual links only; planner prerequisites remain independently confirmed data.
export const GAME_TREE_COLUMNS = [
 [[3],[4,5],[6,7,8],[9,10],[11,12,13],[14,15,16],[17],[18],[19,20],[21,22,23],[24,25],[26],[27,28,29],[30,31,32],[33],[34],[35,36,37],[38,39,40],[41,42],[43],[44,45,46],[47,48,49],[50,51],[52,53,54],[55,56,57],[58,59],[60,61,62],[63,64,65],[66,67,68],[69,70],[71,73,72],[74],[75,76,77],[78,79],[80,81,82],[83,84,85],[86,87],[88,89,90],[91,92,93],[94,95],[96,97,98],[99,100,101],[102,103],[104,105,106],[107,108]],
 [[3],[4,5,6],[7],[8,9],[10,11,12],[13],[14,15,16],[17,18],[19,20],[21,22],[23,24,25],[26,27,28],[29,30,31],[32],[33,34,35],[36,37],[38],[39,40,41],[42],[43,44,45],[46,47,48],[49,50,51],[52,53,54],[55,56],[57,58],[59,60,61],[62,63],[64,65],[66,67,68],[69,70],[71,72,73],[74,75],[76,77,78],[79,80],[81,83,82],[84,85],[86,87,88],[89,90],[91,92,93],[94,95,96]],
 [[3],[4,5],[6],[7,8],[9],[10],[11,12,13],[14,15,16],[17,18],[19],[20],[21,22],[23],[24,25,26],[27,28],[29,30],[31,32],[33],[34,35],[36,37,38],[39,40,41],[42,43],[44,45,46],[47,48,49],[50],[51,52,53],[54,55],[56,57,58],[91,59,66],[60,61,62],[63,64,65],[67,68],[69,70,71],[72,73,74],[75,76],[77,78,79],[80,81,82],[83,84],[85,86,87],[88,89,90],[92,93],[94]],
 [[3],[4,5,6],[7,8,9],[10],[11,12,13],[14,15,16],[17],[18,19,20],[21,null,22],[23,25,24],[26],[27,28,29],[30,31,32],[33],[34,35,36],[37,38,39],[40],[41,42,43],[44,45,46],[47],[48,49,50],[51,55,52],[53,56,54],[57],[58,59,60],[61,62,63],[64],[65,66,67],[68,69,70]],
 [[3],[4],[5,6,7],[8,13,9],[10,12,11],[14],[15,16],[17,18,19],[20,25,21],[22,24,23],[26],[27,28],[29,30,31],[32,37,33],[34,36,35],[38],[39,40],[41,42,43],[44,49,45],[46,48,47],[50],[51,52],[53,54,55],[56,61,57],[58,60,59],[62],[63,64]]
];

export function gameTreeLayout(nodes, groupIndex) {
 const columns=GAME_TREE_COLUMNS[groupIndex]||[],byId=new Map(nodes.map(n=>[n.id,n])),positions=new Map(),edges=[];
 const key=n=>`research-${groupIndex}-${n}`;
 const lanes=column=>column.map((n,i)=>({id:n?key(n):null,lane:(3-column.length)/2+i}));
 columns.forEach((column,c)=>lanes(column).forEach(({id,lane})=>{if(id&&byId.has(id))positions.set(id,{x:28+c*266,y:46+lane*112,column:c,lane});}));
 for(let c=1;c<columns.length;c++){
  const before=lanes(columns[c-1]),after=lanes(columns[c]);
  for(const a of before)for(const b of after){
   const connected=before.length===1||after.length===1||(before.length===after.length? a.lane===b.lane:Math.abs(a.lane-b.lane)<=.5);
   if(a.id&&b.id&&connected)edges.push({from:a.id,to:b.id});
  }
 }
 // Military II has a long middle lane under the thunder/earth branch.
 if(groupIndex===3)edges.push({from:key(19),to:key(25)});
 // Hunting's early three-lane section merges through the outer lanes.
 // A top branch bypasses the next three nodes (Lv7 unlock is a leaf).
 if(groupIndex===2){
  for(const n of [56,58])edges.push({from:key(n),to:key(59)});
  for(let i=edges.length-1;i>=0;i--)if(edges[i].from===key(91)||edges[i].from===key(66)&&[60,61,62].map(key).includes(edges[i].to))edges.splice(i,1);
  for(const n of [60,61,62])if(!edges.some(e=>e.from===key(59)&&e.to===key(n)))edges.push({from:key(59),to:key(n)});
 }
 return {positions,edges:edges.filter(e=>positions.has(e.from)&&positions.has(e.to)),width:columns.length*266+20,height:380};
}
