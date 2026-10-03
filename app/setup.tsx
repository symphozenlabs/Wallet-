import {useState} from 'react';
import {ActivityIndicator,Platform,Text} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {useAuth} from '../lib/auth';
import {setupSql} from '../lib/setup-sql';
import {Button,Notice} from '../components/ui';
import {Card,Workspace,w} from '../components/workspace';
export default function Setup(){
  const {session,loading}=useAuth();const router=useRouter();const [message,setMessage]=useState('');
  async function copy(){try{if(Platform.OS!=='web'||!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(setupSql);setMessage('Copied. Paste it into a new SQL query in your Wallet Supabase project, then click Run.');}catch{setMessage('Copy is unavailable here. Select and copy the setup text below, or open this page in Chrome.');}}
  if(loading)return <Workspace title="Set up your groups" subtitle="Loading…" back><ActivityIndicator/></Workspace>;
  if(!session)return <Redirect href="/"/>;
  return <Workspace title="Update Wallet’s group calculations." subtitle="This one-time update enables shared expenses to recalculate when group membership changes." back>
    <Card><Text style={w.heading}>Follow these steps</Text><Text style={w.muted}>1. Click Copy latest setup below.</Text><Text style={w.muted}>2. Open Supabase and choose your Wallet project.</Text><Text style={w.muted}>3. Open SQL Editor, then choose New query.</Text><Text style={w.muted}>4. Paste the copied setup and click Run.</Text><Text style={w.muted}>5. Return here and refresh your group.</Text><Notice text="This keeps your accounts, groups, expenses, and repayments. Saved expenses will be re-split equally across today's group members; all expenses will recalculate again whenever someone joins later."/><Button title="Copy latest setup" onPress={copy}/>{!!message&&<Notice text={message}/>}<Button secondary title="Back to my groups" onPress={()=>router.replace('/home')}/></Card>
    <Card><Text style={w.heading}>Latest setup text</Text><Text selectable style={{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:12,lineHeight:18}}>{setupSql}</Text></Card>
  </Workspace>;
}
