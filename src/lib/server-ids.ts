import { db } from '../db/index.ts';
import { gymCounters, gyms } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

/**
 * Concurrency-safe sequential member code generator (e.g. GM-001, GM-002).
 * Uses PostgreSQL row-level locks (FOR UPDATE) or atomic increment inside transactions.
 */
export async function generateNextMemberCode(tx: any, gymId: string): Promise<string> {
  // 1. Fetch gym prefix
  const gym = await tx.query.gyms.findFirst({
    where: eq(gyms.id, gymId),
  });
  const prefix = gym?.receiptPrefix || 'GM-';

  // 2. Ensure counter row exists
  await tx.insert(gymCounters)
    .values({ gymId, memberSequence: 0, receiptSequence: 0 })
    .onConflictDoNothing();

  // 3. Atomically increment member_sequence with returning clause
  const result = await tx.execute(
    sql`UPDATE gym_counters 
        SET member_sequence = member_sequence + 1, updated_at = NOW() 
        WHERE gym_id = ${gymId} 
        RETURNING member_sequence;`
  );

  const seq = result.rows[0]?.member_sequence || 1;
  const padded = String(seq).padStart(3, '0');
  return `${prefix}${padded}`;
}

/**
 * Concurrency-safe sequential receipt number generator (e.g. GM-000124).
 * Uses PostgreSQL row-level locks or atomic increment inside transactions.
 */
export async function generateNextReceiptNumber(tx: any, gymId: string): Promise<string> {
  const gym = await tx.query.gyms.findFirst({
    where: eq(gyms.id, gymId),
  });
  const prefix = gym?.receiptPrefix || 'GM-';

  // Ensure counter row exists
  await tx.insert(gymCounters)
    .values({ gymId, memberSequence: 0, receiptSequence: 0 })
    .onConflictDoNothing();

  // Atomically increment receipt_sequence
  const result = await tx.execute(
    sql`UPDATE gym_counters 
        SET receipt_sequence = receipt_sequence + 1, updated_at = NOW() 
        WHERE gym_id = ${gymId} 
        RETURNING receipt_sequence;`
  );

  const seq = result.rows[0]?.receipt_sequence || 1;
  const padded = String(seq).padStart(6, '0');
  return `${prefix}${padded}`;
}
