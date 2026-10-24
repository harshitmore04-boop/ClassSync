import {database} from './database.mjs';
export const env=new Proxy({DB:database},{get(target,key){return key in target?target[key]:process.env[key as string]}});
