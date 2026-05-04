import { runMigrations } from './migrations';
import { pool } from '../db';

runMigrations()
  .then(() => {
    console.log('Migration script finished.');
    pool.end();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    pool.end();
    process.exit(1);
  });
