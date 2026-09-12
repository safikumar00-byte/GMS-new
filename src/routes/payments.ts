import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { payments, members, memberships, notifications, gyms } from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateNextReceiptNumber } from '../lib/server-ids.ts';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/payments - List all payments scoped to gym (OWNER or MANAGER)
router.get('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { memberId, paymentMethod } = req.query;

    const allPayments = await db.query.payments.findMany({
      where: eq(payments.gymId, gymId),
      orderBy: (p, { desc }) => [desc(p.paymentDate)],
      with: {
        member: true,
        membership: true,
      },
    });

    let mapped = allPayments.map(p => {
      const dateStr = p.paymentDate instanceof Date ? p.paymentDate.toISOString().split('T')[0] : String(p.paymentDate || '').split('T')[0];
      return {
        id: p.id,
        gymId: p.gymId,
        memberId: p.memberId,
        memberName: p.memberName,
        membershipId: p.membershipId,
        receiptNumber: p.receiptNumber,
        amount: parseFloat(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: dateStr,
        date: dateStr,
        status: p.status,
        notes: p.notes,
        idempotencyKey: p.idempotencyKey,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt || ''),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt || ''),
      };
    });

    if (memberId) {
      mapped = mapped.filter(p => p.memberId === memberId);
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      mapped = mapped.filter(p => p.paymentMethod.toUpperCase() === String(paymentMethod).toUpperCase());
    }

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payments' } });
  }
});

// POST /api/payments - Server-validated transactional payment creation with Idempotency
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { memberId, membershipId, amount, paymentMethod, notes, idempotencyKey: bodyKey } = req.body;
    const headerKey = req.headers['idempotency-key'] as string | undefined;
    const idempotencyKey = bodyKey || headerKey;

    if (!memberId || amount === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Member ID and payment amount are required' } });
    }

    const payAmount = parseFloat(String(amount));
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than zero' } });
    }

    // Idempotency check: Return existing payment if key already processed for this gym
    if (idempotencyKey) {
      const existing = await db.query.payments.findFirst({
        where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, idempotencyKey)),
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    // Execute within a strict database transaction with pessimistic locking
    const createdPayment = await db.transaction(async (tx) => {
      // 1. Verify member belongs to gym and lock member row
      const memberRows = await tx.execute(
        sql`SELECT id, name, gym_id FROM members WHERE id = ${memberId} AND gym_id = ${gymId} FOR UPDATE`
      );
      const member = memberRows.rows?.[0] as any;

      if (!member) {
        throw new Error('MEMBER_NOT_FOUND: Member does not exist or does not belong to this gym');
      }

      // 2. Resolve target membership with row-level lock
      let targetMembership: any = null;
      if (membershipId) {
        const msRows = await tx.execute(
          sql`SELECT id, price, plan_name, status FROM memberships WHERE id = ${membershipId} AND gym_id = ${gymId} AND member_id = ${memberId} FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      } else {
        const msRows = await tx.execute(
          sql`SELECT id, price, plan_name, status FROM memberships WHERE gym_id = ${gymId} AND member_id = ${memberId} ORDER BY end_date DESC LIMIT 1 FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      }

      // 3. Load existing payments to independently calculate amount due
      let finalFee = targetMembership ? parseFloat(targetMembership.price) : payAmount;
      let totalPaidAlready = 0;

      if (targetMembership) {
        const existingPayments = await tx.query.payments.findMany({
          where: and(eq(payments.membershipId, targetMembership.id), eq(payments.gymId, gymId)),
        });
        totalPaidAlready = existingPayments
          .filter(p => p.status !== 'Refunded')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      }

      const pendingDue = Math.max(0, finalFee - totalPaidAlready);

      // Server-side validation: payment amount shouldn't exceed pending balance with reasonable tolerance
      if (targetMembership && payAmount > (pendingDue + 0.01)) {
        throw new Error(`EXCESS_PAYMENT: Payment amount (₹${payAmount}) exceeds the outstanding balance (₹${pendingDue.toFixed(2)})`);
      }

      // 4. Generate concurrency-safe receipt number
      const receiptNumber = await generateNextReceiptNumber(tx, gymId);

      // 5. Insert payment record
      const [newPayment] = await tx.insert(payments).values({
        gymId,
        memberId: member.id,
        memberName: member.name,
        membershipId: targetMembership ? targetMembership.id : null,
        receiptNumber,
        amount: payAmount.toFixed(2),
        paymentMethod: paymentMethod || 'Cash',
        status: 'Paid',
        paymentDate: new Date(),
        idempotencyKey: idempotencyKey || null,
        notes: notes || null,
      }).returning();

      // 6. Update membership and member status
      if (targetMembership) {
        const newTotalPaid = totalPaidAlready + payAmount;
        const isNowFullyPaid = newTotalPaid >= (finalFee - 0.01);
        const newStatus = isNowFullyPaid ? 'Active' : 'Pending';

        await tx.update(memberships)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(memberships.id, targetMembership.id));

        // Update member status
        const memberStatus = isNowFullyPaid ? 'ACTIVE' : 'PAYMENT PENDING';
        await tx.update(members)
          .set({ status: memberStatus, updatedAt: new Date() })
          .where(eq(members.id, member.id));
      }

      // 7. Log notification
      await tx.insert(notifications).values({
        gymId,
        type: 'payment_received',
        title: 'Payment Collected',
        message: `₹${payAmount.toLocaleString('en-IN')} received from ${member.name} (${receiptNumber}).`,
        memberId: member.id,
        memberName: member.name,
        amount: payAmount.toFixed(2),
        read: false,
      });

      // 8. Log audit trail
      await logAuditEvent({
        gymId,
        userId: req.user!.userId,
        action: 'PAYMENT_CREATED',
        entityType: 'PAYMENT',
        entityId: newPayment.id,
        details: `Collected ₹${payAmount} from ${member.name} (${receiptNumber}) via ${paymentMethod || 'Cash'}`,
        tx,
      });

      return newPayment;
    });

    res.status(201).json(createdPayment);
  } catch (error: any) {
    console.error('Payment creation failed:', error);
    const message = error.message || 'Payment processing failed';
    const isValidation = message.startsWith('EXCESS_PAYMENT') || message.startsWith('MEMBER_NOT_FOUND');
    res.status(isValidation ? 400 : 500).json({ error: { code: 'PAYMENT_FAILED', message } });
  }
});

// POST /api/payments/:id/refund - Mark payment as refunded (OWNER ONLY)
router.post('/:id/refund', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const paymentId = req.params.id;

    const updatedPayment = await db.transaction(async (tx) => {
      const payment = await tx.query.payments.findFirst({
        where: and(eq(payments.id, paymentId), eq(payments.gymId, gymId)),
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'Refunded') {
        return payment;
      }

      const [refunded] = await tx.update(payments)
        .set({ status: 'Refunded', updatedAt: new Date() })
        .where(eq(payments.id, paymentId))
        .returning();

      // Recalculate member/membership status
      if (payment.membershipId) {
        await tx.update(memberships)
          .set({ status: 'Pending', updatedAt: new Date() })
          .where(eq(memberships.id, payment.membershipId));

        await tx.update(members)
          .set({ status: 'PAYMENT PENDING', updatedAt: new Date() })
          .where(eq(members.id, payment.memberId));
      }

      await logAuditEvent({
        gymId,
        userId: req.user!.userId,
        action: 'PAYMENT_REFUNDED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        details: `Refunded payment ${payment.receiptNumber} of ₹${payment.amount} for ${payment.memberName}`,
        tx,
      });

      return refunded;
    });

    res.json(updatedPayment);
  } catch (error: any) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to refund payment' } });
  }
});

export default router;
