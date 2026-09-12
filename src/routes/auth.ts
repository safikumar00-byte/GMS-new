import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { gyms, userProfiles } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/auth/me - returns authenticated user and gym context
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq(gyms.id, gymId),
    });

    res.json({
      user: req.user,
      gym,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user context' } });
  }
});

// POST /api/auth/sync - sync user profile updates
router.post('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, role } = req.body;
    const userId = req.user!.userId;
    const currentRole = req.user!.role.toUpperCase();

    const allowedRoles = ['OWNER', 'MANAGER', 'TRAINER'];
    let roleToUpdate: string | undefined = undefined;

    if (role !== undefined) {
      const normalizedRole = String(role).toUpperCase();
      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: `Invalid role specified. Valid roles are: ${allowedRoles.join(', ')}`,
          },
        });
      }

      // Security check: Only an OWNER can change roles. Non-owners cannot self-promote.
      if (currentRole !== 'OWNER') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only a gym owner can modify user roles or permissions.',
          },
        });
      }

      roleToUpdate = normalizedRole;
    }

    const [updated] = await db.update(userProfiles)
      .set({
        ...(name ? { name: String(name).trim() } : {}),
        ...(roleToUpdate ? { role: roleToUpdate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();

    if (roleToUpdate && roleToUpdate !== currentRole) {
      await logAuditEvent({
        gymId: req.user!.gymId,
        userId: req.user!.userId,
        action: 'ROLE_CHANGED',
        entityType: 'USER',
        entityId: userId,
        details: `Role updated from ${currentRole} to ${roleToUpdate}`,
      });
    }

    res.json({ user: updated });
  } catch (error: any) {
    console.error('Error in /api/auth/sync:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile' } });
  }
});

export default router;
