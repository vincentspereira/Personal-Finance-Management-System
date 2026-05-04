import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.log('Executed query', { text: text.slice(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
