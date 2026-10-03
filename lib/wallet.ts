import { supabase } from './supabase';
import type { Expense,Share,Settlement } from './money';
export type Group={id:string;name:string;currency:string;role?:string;member_count?:number};
export type Member={user_id:string;name:string;role:'admin'|'member'};
export type Dashboard={groups:Group[];invitations:{id:string;group_name:string;expires_at:string}[]};
export type GroupData={group:Group;members:Member[];expenses:Expense[];shares:Share[];settlements:Settlement[];invitations:{email:string;expires_at:string}[]};
export class SetupRequired extends Error{}
export async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T>{
  const {data,error}=await supabase.rpc(name,args);
  if(error){if(error.code==='PGRST202'||error.code==='42883')throw new SetupRequired('A database update is needed. Open the Wallet setup page and apply the latest setup.');throw new Error(error.message);}
  return data as T;
}
