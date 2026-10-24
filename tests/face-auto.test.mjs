import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/face-auto.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('automatic scan starts on face appearance, waits for departure and does not scan again after stop',async()=>{
 const window={};new Function('window',source)(window);
 let count=1,scans=0,permitted=true;const queue=[],messages=[];
 const controller=window.createAutoFaceScanner({detect:async()=>count,scan:async()=>{scans++},canRun:()=>permitted,status:m=>messages.push(m),schedule:fn=>{queue.push(fn);return queue.length},cancel:()=>{}});
 async function next(){queue.shift()?.();await flush()}
 controller.start();await flush();assert.equal(scans,1);
 await next();await next();assert.equal(scans,1);
 count=0;await next();await next();count=1;await next();assert.equal(scans,2);
 permitted=false;count=0;await next();await next();count=1;await next();assert.equal(scans,2);
 controller.stop();await next();assert.equal(controller.running,false);assert.equal(scans,2);
});
test('multiple faces and a pending detection cannot mark attendance after cancellation',async()=>{
 const window={};new Function('window',source)(window);
 let finish,scans=0;const controller=window.createAutoFaceScanner({detect:()=>new Promise(resolve=>finish=resolve),scan:async()=>{scans++},canRun:()=>true,status:()=>{},schedule:()=>0,cancel:()=>{}});
 controller.start();controller.stop();finish(1);await flush();assert.equal(scans,0);
 const many=window.createAutoFaceScanner({detect:async()=>2,scan:async()=>{scans++},canRun:()=>true,status:()=>{},schedule:()=>0,cancel:()=>{}});many.start();await flush();assert.equal(scans,0);many.stop();
});
