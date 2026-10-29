import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBetaAccess} from '../public/planner-beta-access.js';
import {createGoalPlannerUI} from '../public/goal-planner-ui.js';
test('Invitation rejects incorrect codes, remembers the session, and invalidates old codes',async()=>{
 const values=new Map(),storage=()=>({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}),digest=createHash('sha256').update('TEST-INVITE').digest('hex'),access=createBetaAccess({digest,storage});
 assert.equal(access.allowed(),false);assert.equal(await access.unlock('wrong'),false);assert.equal(await access.unlock(' test-invite '),true);assert.equal(access.allowed(),true);assert.equal(createBetaAccess({digest,storage}).allowed(),true);assert.equal(createBetaAccess({digest:'rotated',storage}).allowed(),false);access.lock();assert.equal(access.allowed(),false);
});
test('Locked planner does not render or run the calculator, even via a direct action',()=>{
 const fail=()=>{throw Error('calculator called while locked');};const ui=createGoalPlannerUI({esc:String,input:fail,total:fail,buildings:fail,settings:fail,access:{allowed:()=>false}});
 assert.match(ui.panel(),/招待制β版/);assert.doesNotMatch(ui.panel(),/data-sim="goalTarget"/);ui.handle({dataset:{goalAction:'calculate'}});
});
