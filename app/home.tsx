import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Dashboard, rpc, SetupRequired } from '../lib/wallet';
import { Button, Field, Notice } from '../components/ui';
import { Card, Workspace, w } from '../components/workspace';
export default function Home() {
  const {session,loading}=useAuth();const router=useRouter();
  const [data,setData]=useState<Dashboard|null>(null),[fetching,setFetching]=useState(true);
  const [setup,setSetup]=useState(false),[needsUpdate,setNeedsUpdate]=useState(false),[error,setError]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{if(!session){setFetching(false);return;}setFetching(true);setError('');setSetup(false);setNeedsUpdate(false);try{let updateRequired=false;try{await rpc<number>('wallet_setup_version');}catch(err){if(err instanceof SetupRequired)updateRequired=true;else throw err;}setData(await rpc<Dashboard>('wallet_dashboard'));setNeedsUpdate(updateRequired);}catch(err){if(err instanceof SetupRequired)setSetup(true);else setError(err instanceof Error?err.message:'Could not load groups.');}finally{setFetching(false);}},[session?.user.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  async function createGroup(){if(busy)return;if(!name.trim()||name.trim().length>80)return setError('Enter a group name of 1–80 characters.');setBusy(true);setError('');try{const id=await rpc<string>('wallet_create_group',{group_name:name.trim()});setName('');router.push({pathname:'/group/[id]',params:{id}});}catch(err){setError(err instanceof Error?err.message:'Could not create group.');}finally{setBusy(false);}}
  async function accept(id:string){if(busy)return;setBusy(true);setError('');try{const gid=await rpc<string>('wallet_accept_invite',{invitation_id:id});router.push({pathname:'/group/[id]',params:{id:gid}});}catch(err){setError(err instanceof Error?err.message:'Could not accept invitation.');}finally{setBusy(false);}}
  async function logout(){if(busy)return;setBusy(true);try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch(err){setError(err instanceof Error?err.message:'Could not sign out.');}finally{setBusy(false);}}
  if(loading)return <Workspace title="Your groups" subtitle="Loading your account…"><ActivityIndicator /></Workspace>;
  if(!session)return <Redirect href="/" />;
  return <Workspace title={`Welcome, ${session.user.user_metadata.display_name||'friend'}.`} subtitle="A place for your people, expenses, and everything you share.">
    {!!error&&<Notice error text={error}/>}
    {fetching?<ActivityIndicator accessibilityLabel="Loading groups"/>:setup?<Card><Text style={w.heading}>One setup step to unlock your groups.</Text><Text style={w.muted}>Your account is ready. Apply the Wallet database setup in Supabase to enable groups, invitations, expenses, and repayments.</Text><Button title="Open database setup" onPress={()=>router.push('/setup')}/><Button secondary title="Check again" onPress={load}/></Card>:!!data&&<>
      {!!data.invitations.length&&<Card><Text style={w.heading}>You’re invited</Text>{data.invitations.map(i=><View key={i.id} style={{gap:12}}><Text style={w.muted}>{i.group_name}</Text><Button title={`Join ${i.group_name}`} onPress={()=>accept(i.id)} busy={busy}/></View>)}</Card>}
      {!!needsUpdate&&<Card><Text style={w.heading}>Update expense sharing</Text><Text style={w.muted}>Run the latest Wallet database setup to share new expenses with everyone and recalculate them when someone joins.</Text><Button title="Open database update" onPress={()=>router.push('/setup')}/></Card>}
      <Card><Text style={w.heading}>Your groups</Text>{!data.groups.length?<Text style={w.muted}>No groups yet. Start with your home, a trip, or your dinner crew.</Text>:data.groups.map(g=><View key={g.id} style={{gap:10}}><View style={w.row}><Text style={w.heading}>{g.name}</Text><Text style={w.muted}>{g.member_count} {g.member_count===1?'member':'members'} · {g.currency}</Text></View><Button secondary title={`Open ${g.name}`} onPress={()=>router.push({pathname:'/group/[id]',params:{id:g.id}})}/></View>)}</Card>
      <Card><Text style={w.heading}>Start a new group</Text><Field label="Group name" value={name} onChangeText={setName} onSubmit={createGroup}/><Text style={w.muted}>Every accepted member can add expenses. This first release uses Indian rupees (INR).</Text><Button title="Create group" onPress={createGroup} busy={busy}/></Card>
    </>}
    <Button title="Refresh groups" secondary onPress={load} busy={fetching}/><Button title="Sign out" secondary onPress={logout} busy={busy}/>
  </Workspace>;
}
