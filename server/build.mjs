import{build}from'esbuild';import{resolve}from'node:path';
await build({entryPoints:['server/vercel.ts'],outfile:'api/proxy.js',bundle:true,platform:'node',target:'node24',format:'esm',packages:'bundle',plugins:[{name:'vercel-environment',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:resolve('server/env.ts')}));}}]});
