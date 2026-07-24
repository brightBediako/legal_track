import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

const BCRYPT_ROUNDS = 10;

export type AdminBootstrapResult =
  | { status: 'skipped'; reason: string }
  | { status: 'created'; email: string }
  | { status: 'updated'; email: string }
  | { status: 'exists'; email: string };

/**
 * Ensures a single bootstrap admin exists from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Does not overwrite an existing admin password unless ADMIN_FORCE_RESET=true.
 */
export async function ensureAdminFromEnv(
  prisma: PrismaService,
): Promise<AdminBootstrapResult> {
  const emailRaw = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const forceReset = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === 'true';

  if (!emailRaw || !password) {
    return {
      status: 'skipped',
      reason: 'ADMIN_EMAIL / ADMIN_PASSWORD not set',
    };
  }

  if (!emailRaw.includes('@')) {
    throw new Error('ADMIN_EMAIL must be a valid email');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existing = await prisma.user.findUnique({
    where: { email: emailRaw },
    select: { id: true, role: true },
  });

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (!existing) {
    await prisma.user.create({
      data: {
        email: emailRaw,
        password: hash,
        role: 'admin',
        mustChangePassword: false,
      },
    });
    return { status: 'created', email: emailRaw };
  }

  if (existing.role !== 'admin') {
    throw new Error(
      `ADMIN_EMAIL ${emailRaw} already exists with role "${existing.role}"; refuse to overwrite`,
    );
  }

  if (forceReset) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hash, mustChangePassword: false },
    });
    return { status: 'updated', email: emailRaw };
  }

  return { status: 'exists', email: emailRaw };
}
