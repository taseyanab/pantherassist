/* Local stand in for Netlify: serves the folder, applies _redirects (forced rewrites and 404s) and _headers,
   and runs netlify/functions/api.js the way Netlify does. Set NO_FUNCTIONS=1 to mimic a drag and drop deploy. */
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
if(process.env.FAKE){const real=global.fetch;global.fetch=async(u,o)=>{if(String(u).includes('api.anthropic.com')){const b=JSON.parse(o.body);
  if(!b.stream){const c=b.messages[0].content;const g=c.startsWith('You are a security guardrail');const flag=g&&/payroll/i.test(c.split('<msg').pop());
    return new Response(JSON.stringify({content:[{type:'text',text:g?JSON.stringify({flag,category:flag?'P06 exfiltration':'none',reason:'x'}):'{"category":"none","severity":1,"confidence":0.9,"reason":"ok"}'}],stop_reason:'end_turn'}),{status:200});}
  const parts=['Reset your password ','at help.gsu.edu ','with CampusID and Duo.'];
  const s=new ReadableStream({async start(c){for(const p of parts){c.enqueue(new TextEncoder().encode('event: content_block_delta\ndata: '+JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:p}})+'\n\n'));await new Promise(r=>setTimeout(r,50));}c.close();}});
  return new Response(s,{status:200});}return real(u,o);};}
const fn=process.env.NO_FUNCTIONS?null:require(ROOT+'/netlify/functions/api.js');
const rules=fs.readFileSync(ROOT+'/_redirects','utf8').split('\n').filter(l=>l.trim()&&!l.startsWith('#')).map(l=>l.trim().split(/\s+/));
const hdr=[];let cur=null;fs.readFileSync(ROOT+'/_headers','utf8').split('\n').forEach(l=>{if(!l.trim())return;if(!l.startsWith(' ')){cur={p:l.trim(),h:[]};hdr.push(cur);}else{const i=l.indexOf(':');cur.h.push([l.slice(0,i).trim(),l.slice(i+1).trim()]);}});
const match=(pat,u)=>pat.endsWith('/*')?u.startsWith(pat.slice(0,-1))||u===pat.slice(0,-2):u===pat;
http.createServer(async(req,res)=>{const [u,q]=req.url.split('?');
 for(const r of rules){if(match(r[0],u)){
   if(r[2].startsWith('404')){res.statusCode=404;return res.end('Not found');}
   if(r[1].startsWith('/.netlify/functions/api')){if(!fn){res.statusCode=404;return res.end('Not found');}
     let body='';for await(const c of req)body+=c;
     const out=await fn.handler({path:u,httpMethod:req.method,headers:req.headers,body,isBase64Encoded:false,rawQuery:q||''});
     res.statusCode=out.statusCode;for(const[k,v]of Object.entries(out.headers||{}))res.setHeader(k,v);for(const[k,v]of Object.entries(out.multiValueHeaders||{}))res.setHeader(k,v);return res.end(out.body);}}}
 hdr.forEach(x=>{if(match(x.p,u))x.h.forEach(([k,v])=>res.setHeader(k,v));});
 const f=path.join(ROOT,u==='/'?'index.html':u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('Not found');}
 res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'text/plain');fs.createReadStream(f).pipe(res);
}).listen(+process.env.PORT);
