import {useCallback,useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {Redirect,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {useAuth} from '../../lib/auth';
import {GroupData,rpc,SetupRequired} from '../../lib/wallet';
import {balances,equalSplit,formatMoney,parseMoney,requestId,today,validDate} from '../../lib/money';
import {Button,Field,Notice} from '../../components/ui';
import {Card,Choice,Workspace,w} from '../../components/workspace';
export default function GroupScreen(){
  const {id}=useLocalSearchParams<{id:string}>();const {session,loading}=useAuth();const router=useRouter();
  const [data,setData]=useState<GroupData|null>(null),[fetching,setFetching]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[needsUpdate,setNeedsUpdate]=useState(false);
  const [panel,setPanel]=useState<'expense'|'invite'|'settle'|null>(null),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState(today()),[payer,setPayer]=useState(''),[email,setEmail]=useState(''),[recipient,setRecipient]=useState(''),[receiving,setReceiving]=useState(false),[saveId,setSaveId]=useState(requestId());
  const load=useCallback(async()=>{if(!session)return;setFetching(true);try{let updateRequired=false;try{await rpc<number>('wallet_setup_version');}catch(err){if(err instanceof SetupRequired)updateRequired=true;else throw err;}const next=await rpc<GroupData>('wallet_group',{gid:id});setData(next);setNeedsUpdate(updateRequired);}catch(err){setData(null);setError(err instanceof Error?err.message:'Could not load this group.');}finally{setFetching(false);}},[id,session?.user.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  function open(next:typeof panel){if(busy)return;setPanel(next);setError('');setMessage('');setTitle('');setAmount('');setDate(today());setPayer(session!.user.id);setEmail('');setRecipient(data!.members.find(m=>m.user_id!==session!.user.id)?.user_id||'');setReceiving(false);setSaveId(requestId());}
  async function save(){
    if(busy||!session||!data)return;setError('');setMessage('');setBusy(true);
    try{
      if(panel==='invite'){
        if(__DEV__){
          await rpc('wallet_invite',{gid:id,invite_email:email.trim()});
          setMessage('Invitation saved in the local preview. Email invitations work from the Vercel version after email setup.');
        }else{
          const response=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({gid:id,invite_email:email.trim()})});
          const result=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(result.error||'Could not send the invitation email.');
          setMessage(result.message||`Invitation email sent to ${email.trim()}.`);
        }
      }else if(panel==='expense'){
        if(!title.trim()||title.trim().length>160)throw new Error('Enter a description of 1–160 characters.');if(!validDate(date))throw new Error('Enter a valid date as YYYY-MM-DD.');
        const total=parseMoney(amount),splits=equalSplit(total,data.members.map(m=>m.user_id));
        await rpc('wallet_add_shared_expense',{gid:id,expense_id:saveId,title:title.trim(),total,payer,expense_date:date,splits,mode:'everyone'});setMessage('Expense saved and split equally across the group.');
      }else if(panel==='settle'){
        if(!recipient)throw new Error('Choose another group member.');await rpc('wallet_settle',{gid:id,settlement_id:saveId,from_user:receiving?recipient:session.user.id,to_user:receiving?session.user.id:recipient,total:parseMoney(amount)});setMessage('Repayment recorded. No money was transferred by Wallet.');
      }
      setPanel(null);await load();
    }catch(err){setError(err instanceof Error?err.message:'Could not save. Please try again.');}finally{setBusy(false);}
  }
  if(loading)return <Workspace title="Your group" subtitle="Loading…" back><ActivityIndicator/></Workspace>;
  if(!session)return <Redirect href="/"/>;
  if(!data)return <Workspace title="Your group" subtitle="Shared expenses stay private to group members." back>{fetching?<ActivityIndicator/>:<><Notice error text={error||'This group is unavailable.'}/><Button title="Try again" onPress={load}/></>}</Workspace>;
  const names=Object.fromEntries(data.members.map(m=>[m.user_id,m.user_id===session.user.id?`${m.name} (you)`:m.name]));const net=balances(data.members.map(m=>m.user_id),data.expenses,data.shares,data.settlements);const mine=net[session.user.id]||0;const admin=data.members.find(m=>m.user_id===session.user.id)?.role==='admin';
  return <Workspace title={data.group.name} subtitle={`${data.members.length} ${data.members.length===1?'member':'members'} · Indian rupees · Shared expenses`} back>
    {!!error&&<Notice error text={error}/>}{!!message&&<Notice text={message}/>}{!!needsUpdate&&<Card><Text style={w.heading}>Update expense sharing</Text><Text style={w.muted}>Run the latest Wallet database setup before adding expenses or changing an old split. Your existing group and expenses will be kept.</Text><Button title="Open database update" onPress={()=>router.push('/setup')}/></Card>}
    <Card><Text style={w.muted}>{mine>0?'You are owed':mine<0?'You owe':'You’re all settled up'}</Text><Text style={w.amount}>{formatMoney(Math.abs(mine))}</Text><View style={w.chips}><Choice label="Add expense" selected={panel==='expense'} onPress={()=>open('expense')}/>{admin&&<Choice label="Invite member" selected={panel==='invite'} onPress={()=>open('invite')}/>}{data.members.length>1&&<Choice label="Record repayment" selected={panel==='settle'} onPress={()=>open('settle')}/>}</View></Card>
    {panel&&<Card><Text style={w.heading}>{panel==='expense'?'Add a shared expense':panel==='invite'?'Invite someone':'Record a repayment'}</Text>
      {panel==='invite'?<><Field label="Their email address" value={email} onChangeText={setEmail} email/><Text style={w.muted}>We’ll email them an invitation. They must sign up or sign in with this same address and verify it to join. The invitation expires after 14 days.</Text></>:panel==='expense'?<>
        <Field label="Description" value={title} onChangeText={setTitle}/><Field label="Amount in rupees" value={amount} onChangeText={setAmount}/><Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate}/><Text style={w.muted}>Who paid?</Text><View style={w.chips}>{data.members.map(m=><Choice key={m.user_id} label={names[m.user_id]} selected={payer===m.user_id} onPress={()=>setPayer(m.user_id)}/>)}</View>
        <Notice text="The total is split equally across everyone in this group. If someone joins later, Wallet recalculates every expense and balance for the new group size."/>
      </>:<><Notice text="Only record a repayment that has already happened outside Wallet. This does not send money."/><View style={w.chips}><Choice label="I paid someone" selected={!receiving} onPress={()=>setReceiving(false)}/><Choice label="Someone paid me" selected={receiving} onPress={()=>setReceiving(true)}/></View><Text style={w.muted}>{receiving?'Who paid you?':'Who did you pay?'}</Text><View style={w.chips}>{data.members.filter(m=>m.user_id!==session.user.id).map(m=><Choice key={m.user_id} label={names[m.user_id]} selected={recipient===m.user_id} onPress={()=>setRecipient(m.user_id)}/>)}</View><Field label="Repayment amount in rupees" value={amount} onChangeText={setAmount}/></>}
      <Button title={panel==='invite'?'Save invitation':panel==='expense'?'Save expense':'Record repayment'} onPress={save} busy={busy}/><Button secondary title="Cancel" onPress={()=>setPanel(null)} busy={busy}/>
    </Card>}
    <Card><Text style={w.heading}>Everyone’s balance</Text>{data.members.map(m=><View key={m.user_id} style={w.row}><Text style={w.muted}>{names[m.user_id]}{m.role==='admin'?'· admin':''}</Text><Text style={w.muted}>{net[m.user_id]>0?'Owed ':net[m.user_id]<0?'Owes ':'Settled '}{formatMoney(Math.abs(net[m.user_id]))}</Text></View>)}</Card>
    <Card><Text style={w.heading}>Expenses</Text>{!data.expenses.length?<Text style={w.muted}>Nothing here yet. Add your first shared expense.</Text>:data.expenses.map(e=><View key={e.id} style={{gap:8}}><View style={w.row}><Text style={w.heading}>{e.description}</Text><Text style={w.muted}>{formatMoney(e.amount)}</Text></View><Text style={w.muted}>{names[e.paid_by]} paid · {e.spent_on}</Text><Text style={w.muted}>{data.shares.filter(s=>s.expense_id===e.id).map(s=>`${names[s.user_id]}: ${formatMoney(s.amount)}`).join(' · ')}</Text><Text style={w.muted}>Shared equally with everyone in the group</Text><View style={w.divider}/></View>)}</Card>
    {!!data.settlements.length&&<Card><Text style={w.heading}>Repayments</Text>{data.settlements.map(s=><Text key={s.id} style={w.muted}>{names[s.sender]} paid {names[s.recipient]}{formatMoney(s.amount)} · {new Date(s.created_at).toLocaleDateString()}</Text>)}</Card>}
    {admin&&!!data.invitations.length&&<Card><Text style={w.heading}>Pending invitations</Text>{data.invitations.map(i=><Text key={i.email} style={w.muted}>{i.email} · expires {new Date(i.expires_at).toLocaleDateString()}</Text>)}</Card>}
    <Button secondary title="Refresh group" onPress={load} busy={fetching||busy}/>
  </Workspace>;
}
