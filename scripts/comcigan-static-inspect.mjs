import fs from 'node:fs/promises';
import path from 'node:path';

// Static inspection of the public npm package. This script does NOT access
// comcigan servers, project config, classroom data, or teacher identifiers.
const root=path.join(process.cwd(),'node_modules','comcigan');
async function visit(dir,depth=0){
  if(depth>4)return [];
  const result=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    if(entry.isDirectory() && entry.name!=='node_modules') result.push(...await visit(path.join(dir,entry.name),depth+1));
    if(entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name))result.push(path.join(dir,entry.name));
  }
  return result;
}
const files=(await visit(root)).slice(0,20);
for(const file of files){
  const lines=(await fs.readFile(file,'utf8')).split('\n');
  console.log('PACKAGE_FILE='+path.relative(root,file)+';LINES='+lines.length);
  if(lines.length<137)continue;
  console.log('PACKAGE_STATIC_SNIPPET_BEGIN');
  for(let n=(file.endsWith('comcigan-teacher.js')?1:129);n<=(file.endsWith('comcigan-teacher.js')?176:145);n++){
    const line=lines[n-1]||'';
    // Static file is published code; trim long minified lines.
    console.log(String(n).padStart(3,'0')+': '+line.slice(0,220));
  }
  console.log('PACKAGE_STATIC_SNIPPET_END');
}
