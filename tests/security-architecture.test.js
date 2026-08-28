const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const jsdir=path.join(root,"js");
const files=fs.readdirSync(jsdir).filter(f=>f.endsWith(".js"));
let failures=0;
for(const f of files){
  const text=fs.readFileSync(path.join(jsdir,f),"utf8");
  if(f!=="request-manager.js" && /\bfetch\s*\(/.test(text)){console.error("FAIL direct fetch outside request-manager:",f);failures++;}
}
const appFiles=[];
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f),s=fs.statSync(p);if(s.isDirectory()&&!p.includes("tests"))walk(p);else if(/\.(js|html|css)$/.test(f))appFiles.push(p);}}
walk(root);
const combined=appFiles.map(p=>fs.readFileSync(p,"utf8")).join("\n").toLowerCase();
if(combined.includes("nanduchandu")){console.error("FAIL legacy branding remains");failures++;}
if(failures)process.exit(1);
console.log("PASS security architecture checks");
