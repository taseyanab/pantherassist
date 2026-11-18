/* PantherAssist on Vercel: connects the app to this site's server functions.
   - Sign in, Duo number match, session check and sign out go to /api/login, /api/mfa, /api/me, /api/logout.
     The session lives in an HttpOnly, Secure, SameSite=Strict cookie that page scripts cannot read.
   - "sample" calls /api/sample, which holds the Anthropic API key on the server and requires a signed in session.
   - "db" and "user" are not provided, so issues, cases and audit events stay on the device. */
(function(){
  var health=fetch("/api/health",{cache:"no-store",credentials:"same-origin"}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};});
  async function post(url,body){
    var r=await fetch(url,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});
    var j={};try{j=await r.json();}catch(e){}
    j.status=r.status;if(!r.ok)j.ok=false;return j;}
  window.PAServer=Object.freeze({
    enabled:async function(){return !!(await health).auth;},
    login:function(id,pw){return post("/api/login",{campusid:id,password:pw});},
    mfa:function(code){return post("/api/mfa",{code:String(code)});},
    logout:function(){return post("/api/logout",{}).catch(function(){});},
    me:async function(){var r=await fetch("/api/me",{cache:"no-store",credentials:"same-origin"});return r.ok?r.json():null;},
    sso:async function(){return !!(await health).sso;},
    demoPassword:async function(){var h=await health;return typeof h.demoPassword==="string"?h.demoPassword:"";},
    /* only these server functions can be called from the app */
    call:async function(path,body){if(["/api/review","/api/alert","/api/ticket"].indexOf(path)<0)throw new Error("not allowed");var j=await post(path,body);return j.status===200?j:null;}
  });
  async function call(body,signal){
    var r=await fetch("/api/sample",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:signal});
    if(!r.ok)throw {code:"model_error",status:r.status};return r;}
  async function sample(input,opts){opts=opts||{};
    var r=await call({prompt:String(input),tier:opts.modelTier==="quick"?"quick":"standard",stream:!!opts.onText},opts.signal);
    if(!opts.onText){var j=await r.json();return {text:j.text||"",truncated:!!j.truncated};}
    var reader=r.body.getReader(),dec=new TextDecoder(),text="";
    while(true){var c=await reader.read();if(c.done)break;var d=dec.decode(c.value,{stream:true});text+=d;opts.onText({text:text,delta:d});}
    return {text:text,truncated:false};}
  sample.json=async function(prompt){
    var r=await call({prompt:String(prompt),tier:"quick",json:true});
    var j=await r.json();var t=(j.text||"").trim();var m=t.match(/\{[\s\S]*\}/);if(!m)throw {code:"bad_json"};return JSON.parse(m[0]);};
  window.claude={use:async function(name){if(name==="sample")return (await health).ai?sample:null;return null;}};
})();
