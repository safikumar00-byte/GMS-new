import { Router } from 'express';
import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/health/db', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1;`);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    res.status(503).json({ status: 'error', database: 'disconnected', message: 'Database connection failed' });
  }
});

export default router;
