import { runSeeds } from './seeds';
import { pool } from '../db';

runSeeds()
  .then(() => {
    console.log('Seed script finished.');
    pool.end();
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    pool.end();
    process.exit(1);
  });
