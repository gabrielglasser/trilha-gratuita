import pg from 'pg';import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL antes de executar.');
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{await c.query('BEGIN');await c.query(await readFile(new URL('../db/001-init.sql',import.meta.url),'utf8'));await c.query('COMMIT');console.log('Migração concluída.');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
