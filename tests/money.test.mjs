import test from 'node:test';import assert from 'node:assert/strict';
import {parseMoney,equalSplit,balances} from '../lib/money.ts';
import {readFile} from 'node:fs/promises';
import {setupSql} from '../lib/setup-sql.ts';
test('the copy-button setup is exactly the tested database migration',async()=>{assert.equal(setupSql,(await readFile(new URL('../supabase/migrations/001_wallet.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../supabase/migrations/002_everyone_splits.sql',import.meta.url),'utf8')));});
test('money parsing preserves paise and rejects invalid precision',()=>{assert.equal(parseMoney('0.29'),29);assert.equal(parseMoney('900.5'),90050);for(const v of ['0','-1','1.001','NaN','1e3','1,000','10000000001'])assert.throws(()=>parseMoney(v));});
test('equal splits conserve money including tiny amounts',()=>{assert.deepEqual(equalSplit(100,['a','b','c']).map(s=>s.amount),[34,33,33]);assert.deepEqual(equalSplit(1,['a','b','c']).map(s=>s.amount),[1,0,0]);for(let amount=1;amount<150;amount++)for(let count=1;count<12;count++)assert.equal(equalSplit(amount,Array.from({length:count},(_,i)=>String(i))).reduce((sum,s)=>sum+s.amount,0),amount);assert.throws(()=>equalSplit(100,['a','a']));});
test('repayments reduce debt and balances sum to zero',()=>{const e={id:'e',description:'Dinner',amount:90000,paid_by:'a',spent_on:'2026-10-03',created_by:'a',created_at:''};const result=balances(['a','b','c'],[e],equalSplit(90000,['a','b','c']),[{id:'s',sender:'b',recipient:'a',amount:10000,created_at:''}]);assert.deepEqual(result,{a:50000,b:-20000,c:-30000});assert.equal(Object.values(result).reduce((a,b)=>a+b,0),0);});
test('sharing the 470 dinner and 600 lunch equally leaves a 65 repayment',()=>{
  const people=['nages','trainer'];
  const expenses=[{id:'dinner',description:'Dinner',amount:47000,paid_by:'nages',spent_on:'2026-10-02',created_by:'nages',created_at:''},{id:'lunch',description:'Lunch',amount:60000,paid_by:'trainer',spent_on:'2026-10-03',created_by:'trainer',created_at:''}];
  const shares=expenses.flatMap(e=>equalSplit(e.amount,people).map(s=>({...s,expense_id:e.id})));
  assert.deepEqual(balances(people,expenses,shares,[]),{nages:-6500,trainer:6500});
  assert.deepEqual(balances(people,expenses,shares,[{id:'repayment',sender:'nages',recipient:'trainer',amount:6500,created_at:''}]),{nages:0,trainer:0});
});
