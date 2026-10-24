import postgres from 'postgres';
let client;
function connection(){return client??=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1,idle_timeout:20,connect_timeout:15,types:{bigint:{to:20,from:[20],serialize:String,parse:Number}}});}
export function compile(query,values){
 let index=0,quote=false,out='';for(let i=0;i<query.length;i++){const c=query[i];if(c==="'"){if(quote&&query[i+1]==="'"){out+="''";i++;continue;}quote=!quote;}
 if(c==='?'&&!quote){const v=values[index++];out+=v===null?'NULL':`$${index}${typeof v==='number'?'::bigint':'::text'}`;}else out+=c;}
 // Remove null parameters while renumbering the remaining positional values.
 const args=[];out=out.replace(/\$(\d+)(::\w+)?/g,(_,n,cast)=>{args.push(values[Number(n)-1]);return '$'+args.length+(cast||'')});
 out=out.replace(/INSERT OR IGNORE INTO/gi,'INSERT INTO').replace(/\bMIN\(created_at,/gi,'LEAST(created_at,');if(/INSERT OR IGNORE INTO/i.test(query))out+=' ON CONFLICT DO NOTHING';
 return {query:out,values:args};
}
function normalize(rows){return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='bigint'?Number(value):value])));}
async function execute(tx,statement){const compiled=compile(statement.query,statement.values);const rows=await tx.unsafe(compiled.query,compiled.values);const result=normalize(rows);return {results:result,meta:{changes:rows.count||0}};}
async function transaction(callback){return connection().begin(async tx=>{await tx.unsafe('SET LOCAL search_path TO classsync');return callback(tx)});}
export const database={prepare(query){return {query,values:[],bind(...values){this.values=values;return this},async run(){return transaction(tx=>execute(tx,this))},async all(){return this.run()},async first(){return (await this.run()).results[0]||null}}},async batch(statements){return transaction(async tx=>{const results=[];for(const statement of statements)results.push(await execute(tx,statement));return results})}};
export async function closeDatabase(){if(client)await client.end();client=undefined;}
