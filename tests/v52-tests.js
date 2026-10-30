const assert=require('assert');
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const js=read('teacher-dashboard-v49.js');
const css=read('teacher-design-v51.css');
const html=read('index.html');
assert(js.includes('var NAV_SVG_PATHS='),'missing icon definitions');
assert(js.includes('glyph.innerHTML=navIcon(item.view)'),'sidebar still uses text icons');
assert(js.includes('stroke-width="1.85"'),'inconsistent SVG strokes');
for (const view of ['dashboard','calendar','assessment','t49-classes','t49-exceptions','t49-records','documents','settings']){
 assert(js.includes(view+':')||js.includes("'"+view+"':"),'missing SVG icon '+view);
}
assert(css.includes('background-image:url("./teacher-hero-v50.svg?v=52.0-crisp")!important'),'crisp vector hero override missing');
assert(css.includes('.t49-nav-glyph svg'),'SVG sizing rules missing');
assert(html.includes('teacher-dashboard-v49.js?v=61.0-live-view'),'icon JS cache not busted');
assert(html.includes('teacher-design-v51.css?v=52.0-crisp'),'hero CSS cache not busted');
for (const source of [js,css]) assert(!source.includes('최윤우')&&!source.includes('이우주'),'private student record in public asset');
console.log('v52 icons, crisp hero, cache and privacy checks passed');