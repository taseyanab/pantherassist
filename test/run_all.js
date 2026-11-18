/* Starts a local copy of the site, then runs the website scan and the 60 server attacks.
   A non zero exit code fails the build, so security regressions are caught before deploy. */
const {spawn,execFileSync}=require('child_process');const crypto=require('crypto');
const port=String(4000+Math.floor(Math.random()*900));
const env={...process.env,PORT:port,ALLOWED_ORIGIN:'http://localhost:'+port,SESSION_SECRET:process.env.SESSION_SECRET||crypto.randomBytes(48).toString('base64'),DEMO_PASSWORD:process.env.DEMO_PASSWORD||'test-only-password',ANTHROPIC_API_KEY:'sk-test-fake-key-000000',FAKE:'1'};
const srv=spawn(process.execPath,[__dirname+'/server.js'],{env,stdio:'ignore'});
setTimeout(()=>{let ok=true;
  for(const t of ['scan.js','attack100_server.js']){try{const out=execFileSync(process.execPath,[__dirname+'/'+t,port],{env,encoding:'utf8'});
    const last=out.trim().split('\n').pop();console.log(t+': '+last);if(/\b[1-9]\d* (failed|broke)/.test(last))ok=false;}catch(e){console.log(t+' failed to run');ok=false;}}
  srv.kill();process.exit(ok?0:1);},1500);
