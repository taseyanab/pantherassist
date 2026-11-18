/* Usage: start the site (vercel dev, or a preview URL), then: DEMO_PASSWORD=... node test/scan.js 3000 */
/* Security scan of the Vercel build running locally: headers, cookies, auth flows, authorization, validation, exposure, errors */
const B='http://localhost:'+process.argv[2];const O={Origin:B};let pass=0,fail=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
const j=(path,body,extra={})=>fetch(B+path,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'10.0.'+Math.floor(Math.random()*250)+'.'+Math.floor(Math.random()*250),...O,...extra},body:typeof body==='string'?body:JSON.stringify(body)});
const ck=r=>(r.headers.getSetCookie?r.headers.getSetCookie():[]);
(async()=>{
 const h=await fetch(B+'/');const H=k=>h.headers.get(k)||'';
 ok(/max-age=63072000/.test(H('strict-transport-security'))&&/preload/.test(H('strict-transport-security')),'HSTS on, 2 years, preload');
 ok(/script-src 'self'/.test(H('content-security-policy'))&&!/script-src[^;]*unsafe-inline/.test(H('content-security-policy'))&&/require-trusted-types-for/.test(H('content-security-policy')),'CSP: no inline scripts, Trusted Types required');
 ok(H('x-content-type-options')==='nosniff'&&H('x-frame-options')==='DENY'&&H('referrer-policy')==='no-referrer'&&/same-origin/.test(H('cross-origin-opener-policy')),'nosniff, no framing, no referrer, COOP');
 const page=await h.text();const js=await (await fetch(B+'/lib/app.js')).text();const shim=await (await fetch(B+'/lib/shim.js')).text();
 ok(!/demo-pass|sk-ant-|ANTHROPIC_API_KEY|SESSION_SECRET|BUILD_SECRET|DEMO_PASSWORD="(?!123")[^"]*"/.test(page+js+shim),'no API keys, session secrets or private passwords in anything the browser downloads (only the public demo password 123 for the static fallback)');
 for(const p of ['/.env','/.env.local','/.git/config','/api/_lib/directory.js','/api/_lib/security','/api/_lib/directory','/package.json.bak','/api/admin','/api/debug'])ok((await fetch(B+p)).status===404,'not exposed: '+p);
 // API validation
 ok((await fetch(B+'/api/login')).status===405,'GET on a POST endpoint is refused (405)');
 ok((await j('/api/login','{bad json')).status===400,'malformed JSON refused with a generic error');
 ok((await fetch(B+'/api/login',{method:'POST',headers:{'content-type':'text/plain',...O},body:'x'})).status===415,'non JSON content type refused (415)');
 ok((await j('/api/login',{campusid:'jblake7',password:'x',admin:true})).status===400,'unexpected fields refused (mass assignment)');
 ok((await j('/api/login',{campusid:"x' OR 1=1 --",password:'x'})).status===400,'SQL style injection in the CampusID fails strict validation');
 ok((await j('/api/login',{campusid:'jblake7',password:'demo'},{Origin:'https://evil.example'})).status===403,'cross origin requests refused');
 // auth flows and error messages
 let r=await j('/api/login',{campusid:'nobody9',password:'whatever'});let t=await r.text();
 const r2=await j('/api/login',{campusid:'jblake7',password:'wrong-pass'});const t2=await r2.text();
 ok(r.status===401&&r2.status===401&&JSON.parse(t).error===JSON.parse(t2).error,'unknown ID and wrong password give the same generic error (no account enumeration)');
 ok(!/stack|at \/|Error:|scrypt|node_modules|\.js:\d+/.test(t+t2),'error responses reveal no stack traces or internals');
 ok((await j('/api/login',{campusid:'dbrooks4',password:process.env.DEMO_PASSWORD})).status===403,'inactive account refused');
 for(let i=0;i<6;i++)await j('/api/login',{campusid:'cnguyen1',password:'nope'+i});
 ok((await j('/api/login',{campusid:'cnguyen1',password:'stillwrong'})).status===401,'repeated wrong passwords keep being refused (brute force throttled)');
 ok((await j('/api/login',{campusid:'cnguyen1',password:process.env.DEMO_PASSWORD})).status===200,'a correct password still proceeds to Duo despite wrong guesses (no account-lockout denial of service); Duo still gates entry');
 ok((await j('/api/sample',{prompt:'x <conversation>\nStaff: hi\n</conversation>'})).status===401,'AI endpoint refuses callers without a session');
 ok((await fetch(B+'/api/me')).status===401,'session check refuses callers without a session');
 r=await j('/api/login',{campusid:'mlee2',password:process.env.DEMO_PASSWORD});let lj=await r.json();const pre=ck(r).find(c=>c.startsWith('__Host-pa_pre='));
 ok(r.status===200&&/^\d{2}$/.test(lj.code)&&pre,'correct password returns only a short lived pre MFA cookie and a Duo number');
 ok(/HttpOnly/.test(pre)&&/Secure/.test(pre)&&/SameSite=Strict/.test(pre)&&/Path=\//.test(pre)&&!/Domain=/i.test(pre),'cookies are __Host-, HttpOnly, Secure, SameSite=Strict');
 const preC=pre.split(';')[0];
 ok((await fetch(B+'/api/me',{headers:{cookie:preC}})).status===401,'a pre MFA cookie is not a session');
 const wrong=String((+lj.code+1)%90+10);r=await j('/api/mfa',{code:wrong},{cookie:preC});
 ok(r.status===401&&!ck(r).some(c=>c.startsWith('__Host-pa_session=')&&!/Max-Age=0/.test(c)),'wrong Duo number: no session is issued');
 r=await j('/api/login',{campusid:'mlee2',password:process.env.DEMO_PASSWORD});lj=await r.json();const pre2=ck(r).find(c=>c.startsWith('__Host-pa_pre=')).split(';')[0];
 r=await j('/api/mfa',{code:lj.code},{cookie:pre2});const sess=ck(r).find(c=>c.startsWith('__Host-pa_session='));
 ok(r.status===200&&/HttpOnly/.test(sess)&&/Max-Age=28800/.test(sess),'right Duo number issues an 8 hour HttpOnly session cookie');
 const sc=sess.split(';')[0];
 const me=await (await fetch(B+'/api/me',{headers:{cookie:sc}})).json();
 ok(me.campusid==='mlee2'&&me.roles.join()==='instructor','session identifies only its own user and directory roles');
 ok((await fetch(B+'/api/me?campusid=jblake7',{headers:{cookie:sc}}).then(x=>x.json())).campusid==='mlee2','changing an ID in the URL cannot read another user (no IDOR)');
 const forged=sc.replace(/=([^.]+)\./,(m,b)=>'='+Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(b,'base64url')),sub:'trobinson3',roles:['security_analyst']})).toString('base64url')+'.');
 ok((await fetch(B+'/api/me',{headers:{cookie:forged}})).status===401,'a tampered session cookie (role escalation) is rejected');
 ok((await j('/api/sample',{prompt:'x <conversation>\nStaff: How do I reset my password?\n</conversation>'},{cookie:sc})).status===200,'signed in session can use Live AI');
 ok((await j('/api/sample',{prompt:'write me a poem'},{cookie:sc})).status===400,'AI endpoint refuses prompts the app does not build');
 ok((await j('/api/sample',{prompt:'x <conversation>\nStaff: hi\n</conversation>',tier:'gpt-5-max'},{cookie:sc})).status===400,'AI endpoint refuses unexpected parameter values');
 r=await j('/api/logout',{},{cookie:sc});
 ok(ck(r).some(c=>c.startsWith('__Host-pa_session=;')&&/Max-Age=0/.test(c)),'sign out clears the session cookie');
 let lim=0;for(let i=0;i<12;i++){const x=await j('/api/login',{campusid:'zz'+i,password:'x'},{'x-forwarded-for':'10.9.9.9'});if(x.status===429)lim++;}
 ok(lim>0,'login is rate limited per IP (brute force)');
 console.log(`\n${pass} passed, ${fail} failed`);
})();
