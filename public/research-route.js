// A user-selected visual route is a planning scenario, not proof of unlock rules.
export function defaultRouteLevel(node,isTarget,current=0){
 return Math.min(node.documentedMax,isTarget?current+1:5);
}

export function researchFrontier(nodes,positions,progress={}){
 const started=nodes.filter(n=>positions.has(n.id)&&(progress[n.id]||0)>0);
 if(!started.length)return [];
 const farthest=Math.max(...started.map(n=>positions.get(n.id).column));
 return started.filter(n=>positions.get(n.id).column===farthest).map(n=>n.id);
}

export function traceResearchRoute(nodes,edges,progress,targetId,choices={}) {
 const by=new Map(nodes.map(n=>[n.id,n])),path=[],branches=[],seen=new Set();
 let id=targetId,pending=null;
 while(id&&by.has(id)){
  if(seen.has(id))throw Error('研究経路が循環しています。');
  seen.add(id);path.push(id);
  if(id!==targetId&&(progress[id]||0)>0)break;
  const parents=[...new Set(edges.filter(e=>e.to===id&&by.has(e.from)).map(e=>e.from))];
  if(!parents.length)break;
  if(parents.length===1){id=parents[0];continue;}
  const selected=parents.includes(choices[id])?choices[id]:null;
  branches.push({id,parents,selected});
  if(!selected){pending=id;break;}
  id=selected;
 }
 return {path:path.reverse(),branches,pending};
}
