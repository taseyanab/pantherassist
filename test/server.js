const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').join(__dirname,'..');const cfg=JSON.parse(fs.readFileSync(ROOT+'/vercel.json'));
if(process.env.FAKE){const real=global.fetch;global.fetch=async(u,o)=>{if(String(u).includes('api.anthropic.com')){const b=JSON.parse(o.body);
  if(!b.stream){const c=b.messages[0].content;const g=c.startsWith('You are a security guardrail');const flag=g&&/payroll/i.test(c.split('<msg').pop());
    return new Response(JSON.stringify({content:[{type:'text',text:g?JSON.stringify({flag,category:flag?'P06 exfiltration':'none',reason:'x'}):'{"category":"none","severity":1,"confidence":0.9,"reason":"ok"}'}],stop_reason:'end_turn'}),{status:200});}
  const parts=['Reset your password ','at help.gsu.edu ','with CampusID and Duo.'];
  const s=new ReadableStream({async start(c){for(const p of parts){c.enqueue(new TextEncoder().encode('event: content_block_delta\ndata: '+JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:p}})+'\n\n'));await new Promise(r=>setTimeout(r,50));}c.close();}});
  return new Response(s,{status:200});}return real(u,o);};}
http.createServer(async(req,res)=>{cfg.headers.forEach(r=>{if(r.source==='/(.*)'||req.url.startsWith('/api/'))r.headers.forEach(h=>res.setHeader(h.key,h.value));});
 res.status=c=>{res.statusCode=c;return res;};res.json=o=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(o));};
 const u=req.url.split('?')[0];
 if(/\/[._]/.test(u)){res.statusCode=404;return res.end('Not found');}
 if(u.startsWith('/api/')){let data='';for await(const ch of req)data+=ch;try{req.body=JSON.parse(data||'{}');}catch(e){req.body=data;}
   const f=ROOT+u+'.js';if(!fs.existsSync(f)){res.statusCode=404;return res.end('Not found');}return require(f)(req,res);}
 const f=path.join(ROOT,u==='/'?'index.html':u);if(!f.startsWith(ROOT)||!fs.existsSync(f)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':'text/html');fs.createReadStream(f).pipe(res);
}).listen(+process.env.PORT);
