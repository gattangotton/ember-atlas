export function validateResearchActivity(value,nodes){
 if(value==null)return null;
 const n=nodes.find(n=>n.id===value.id);
 if(!n||!Number.isInteger(value.targetLevel)||value.targetLevel<1||value.targetLevel>n.documentedMax)throw Error('研究中の項目・目標Lvを確認してください。');
 return {id:n.id,targetLevel:value.targetLevel};
}
export function researchActivity(state,nodes){
 const a=state.activeResearch,n=nodes.find(n=>n.id===a?.id);
 return n&&Number.isInteger(a.targetLevel)&&a.targetLevel>(state.research?.[n.id]||0)&&a.targetLevel<=n.documentedMax?a:null;
}
