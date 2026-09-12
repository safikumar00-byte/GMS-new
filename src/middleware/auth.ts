import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { userProfiles, gyms, gymCounters, membershipPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

export type UserRole = 'OWNER' | 'MANAGER' | 'TRAINER';

export interface AuthenticatedUser {
  firebaseUid: string;
  userId: string;
  gymId: string;
  role: string;
  name: string;
  email: string | null;
  gymStatus?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  decodedToken?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or malformed authorization token' } });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.decodedToken = decodedToken;

    // Look up user profile and gym in PostgreSQL
    let profile: any = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, decodedToken.uid),
      with: {
        gym: true,
      },
    });

    // If user does not exist in DB yet, auto-provision their OWN isolated new gym and profile atomically
    if (!profile) {
      try {
        profile = await db.transaction(async (tx) => {
          // Double check inside transaction in case another request completed onboarding concurrently
          const existingInTx = await tx.query.userProfiles.findFirst({
            where: eq(userProfiles.firebaseUid, decodedToken.uid),
            with: { gym: true },
          });
          if (existingInTx) return existingInTx;

          // Safe multi-tenant onboarding: Every new user provisions a dedicated new gym
          const gymName = decodedToken.name ? `${decodedToken.name}'s Gym` : 'My Fitness Gym';
          const [newGym] = await tx.insert(gyms).values({
            name: gymName,
            phone: '',
            email: decodedToken.email || '',
            address: '',
            upiId: '',
            gstNumber: '',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            receiptPrefix: 'GM-',
            receiptFooter: 'Thank you for training with us! Fees once paid are non-refundable.',
            status: 'ACTIVE',
          }).returning();

          // Initialize atomic sequence counters for this new gym
          await tx.insert(gymCounters).values({
            gymId: newGym.id,
            memberSequence: 0,
            receiptSequence: 0,
          }).onConflictDoNothing();

          // Seed default plans for the new gym
          await tx.insert(membershipPlans).values([
            {
              gymId: newGym.id,
              name: '1 Month General Fitness',
              durationMonths: 1,
              durationDays: 30,
              price: '2500.00',
              description: 'Access to general gym floor and cardio zone during operating hours.',
              active: true,
            },
            {
              gymId: newGym.id,
              name: '3 Months Strength Pass',
              durationMonths: 3,
              durationDays: 90,
              price: '6500.00',
              description: 'Quarterly membership including basic fitness assessment.',
              active: true,
            },
            {
              gymId: newGym.id,
              name: '6 Months Transformation',
              durationMonths: 6,
              durationDays: 180,
              price: '11500.00',
              description: 'Half-yearly plan with bi-weekly trainer consultations.',
              active: true,
            },
            {
              gymId: newGym.id,
              name: '12 Months Annual Elite',
              durationMonths: 12,
              durationDays: 365,
              price: '19999.00',
              description: 'Full year unrestricted access with locker facility included.',
              active: true,
            },
          ]);

          // Create user profile pointing strictly to their new gym
          const [newProfile] = await tx.insert(userProfiles).values({
            firebaseUid: decodedToken.uid,
            gymId: newGym.id,
            name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Gym Owner',
            email: decodedToken.email || null,
            role: 'OWNER',
          }).returning();

          await logAuditEvent({
            gymId: newGym.id,
            userId: newProfile.id,
            action: 'USER_PROVISIONED',
            entityType: 'USER',
            entityId: newProfile.id,
            details: `New gym and owner profile provisioned for Firebase UID: ${decodedToken.uid}`,
            tx,
          });

          return {
            ...newProfile,
            gym: newGym,
          };
        });
      } catch (raceError) {
        // Concurrency safety: If another concurrent request inserted profile, fetch it now
        profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.firebaseUid, decodedToken.uid),
          with: { gym: true },
        });
        if (!profile) {
          throw raceError;
        }
      }
    }

    const gymStatus = profile.gym?.status || 'ACTIVE';

    // Gym lifecycle check
    if (gymStatus === 'DEACTIVATED') {
      return res.status(403).json({ 
        error: { 
          code: 'GYM_DEACTIVATED', 
          message: 'This gym account has been deactivated. Please contact support or the gym owner.' 
        } 
      });
    }

    if (gymStatus === 'SUSPENDED' && req.method !== 'GET') {
      return res.status(403).json({ 
        error: { 
          code: 'GYM_SUSPENDED', 
          message: 'This gym account is currently suspended. Modifications are restricted.' 
        } 
      });
    }

    req.user = {
      firebaseUid: decodedToken.uid,
      userId: profile.id,
      gymId: profile.gymId,
      role: (profile.role || 'OWNER').toUpperCase(),
      name: profile.name,
      email: profile.email,
      gymStatus,
    };

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or resolving profile:', error);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' } });
  }
};

/**
 * Role-based authorization middleware enforcing server-side permissions
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        error: { 
          code: 'FORBIDDEN', 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}` 
        } 
      });
    }

    next();
  };
};
