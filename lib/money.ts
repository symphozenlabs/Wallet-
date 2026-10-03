export type Share = { user_id: string; amount: number; expense_id?: string };
export type Expense = { id: string; description: string; amount: number; paid_by: string; spent_on: string; created_by: string; created_at: string; share_mode?: 'everyone' | 'selected' };
export type Settlement = { id: string; sender: string; recipient: string; amount: number; created_at: string };
export function parseMoney(value: string): number {
  const cleaned=value.trim();
  if(!/^\d+(\.\d{1,2})?$/.test(cleaned))throw new Error('Enter an amount with no more than two decimal places.');
  const [whole,fraction='']=cleaned.split('.'); const paise=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(paise)||paise<=0||paise>1_000_000_000_000)throw new Error('Enter a positive amount up to ₹10,000,000,000.');
  return paise;
}
export function equalSplit(total: number, people: string[]): Share[] {
  if(!Number.isSafeInteger(total)||total<=0||!people.length||new Set(people).size!==people.length)throw new Error('Choose unique participants and a positive expense total.');
  const base=Math.floor(total/people.length),remainder=total%people.length;
  return people.map((user_id,i)=>({user_id,amount:base+(i<remainder?1:0)}));
}
export function balances(people: string[], expenses: Expense[], shares: Share[], settlements: Settlement[]) {
  const result: Record<string,number>=Object.fromEntries(people.map(id=>[id,0]));
  const add=(id:string,amount:number)=>{result[id]=(result[id]??0)+amount;if(!Number.isSafeInteger(result[id]))throw new Error('This balance exceeds the supported amount.');};
  expenses.forEach(e=>add(e.paid_by,e.amount));shares.forEach(s=>add(s.user_id,-s.amount));
  settlements.forEach(s=>{add(s.sender,s.amount);add(s.recipient,-s.amount);});return result;
}
export const formatMoney=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
export function requestId(){
  // These identifiers prevent duplicate saves; they are not access tokens.
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16);});
}
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
