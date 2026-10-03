import test from 'node:test';
import assert from 'node:assert/strict';
import handlerModule from '../api/invitations.js';

const handler=handlerModule.default||handlerModule;
const gid='1eb2b14e-56b5-4419-8680-cd480399b8f7';

function response(){
  return {statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
}

test('invitation API only accepts POST',async()=>{
  const res=response();await handler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,405);assert.equal(res.headers.Allow,'POST');
});

test('invitation email requires valid group and address',async(t)=>{
  const saved={};for(const name of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','RESEND_API_KEY','APP_BASE_URL'])saved[name]=process.env[name];
  t.after(()=>{for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  const res=response();await handler({method:'POST',headers:{},body:{gid:'nope',invite_email:'bad'}},res);
  assert.equal(res.statusCode,503); // Configuration is checked before user input.
  process.env.EXPO_PUBLIC_SUPABASE_URL='https://wallet.example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  process.env.RESEND_API_KEY='re_test';
  process.env.APP_BASE_URL='https://wallet.vercel.app';
  const invalid=response();await handler({method:'POST',headers:{authorization:'Bearer token'},body:{gid:'nope',invite_email:'bad'}},invalid);
  assert.equal(invalid.statusCode,400);
});

test('verified group admin invitation is emailed with escaped group name and a public app link',async(t)=>{
  const saved={};for(const name of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','RESEND_API_KEY','APP_BASE_URL'])saved[name]=process.env[name];
  process.env.EXPO_PUBLIC_SUPABASE_URL='https://wallet.example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  process.env.RESEND_API_KEY='re_test';
  process.env.APP_BASE_URL='https://wallet.vercel.app';
  const oldFetch=globalThis.fetch;const calls=[];
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);calls.push({url,init});
    if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'user-id',email:'admin@example.com',email_confirmed_at:'2026-10-03T00:00:00Z',user_metadata:{display_name:'Nages'}}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/rest/v1/rpc/wallet_group'))return new Response(JSON.stringify({group:{name:'Trip <friends>'}}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/rest/v1/rpc/wallet_invite'))return new Response('null',{status:200,headers:{'Content-Type':'application/json'}});
    if(url==='https://api.resend.com/emails')return new Response(JSON.stringify({id:'email-id'}),{status:200,headers:{'Content-Type':'application/json'}});
    throw new Error(`Unexpected request to ${url}`);
  };
  t.after(()=>{globalThis.fetch=oldFetch;for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer user-token'},body:{gid,invite_email:'friend@example.com'}},res);
  assert.equal(res.statusCode,200);assert.match(res.body.message,/friend@example\.com/);
  const emailCall=calls.find(call=>call.url==='https://api.resend.com/emails');assert.ok(emailCall);
  assert.equal(emailCall.init.headers.Authorization,'Bearer re_test');
  const email=JSON.parse(emailCall.init.body);assert.deepEqual(email.to,['friend@example.com']);
  assert.match(email.html,/Trip &lt;friends&gt;/);assert.match(email.text,/https:\/\/wallet\.vercel\.app/);
  assert.ok(calls.some(call=>call.url.endsWith('/rest/v1/rpc/wallet_invite')));
});
