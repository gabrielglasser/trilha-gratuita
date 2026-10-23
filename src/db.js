import pg from 'pg';
let pool;
export const database={query:async(text,params)=>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');
 pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
 return pool.query(text,params);
}};
export async function cleanup(db){
 await db.query('DELETE FROM participations WHERE expires_at <= CURRENT_TIMESTAMP');
 await db.query('DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
 await db.query('DELETE FROM rate_limits WHERE expires_at <= CURRENT_TIMESTAMP');
}
