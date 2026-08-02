import { config } from '@/lib/config';

/**
 * Server-side access gate (Story 2.3 / AD-10).
 *
 * In AUTH_MODE=open every request is allowed and stamped with an anonymous
 * actor. In AUTH_MODE=enforced this is the single enforcement point routes
 * call before side effects — the identity adapter (Epic F4) plugs in here
 * without rewriting handlers.
 */

export const ACTOR_ID_HEADER = 'x-actor-id';
export const ACTOR_ROLE_HEADER = 'x-actor-role';

export type ActorRole = 'anonymous' | 'member' | 'administrator';

export interface AccessContext {
  actorId: string;
  role: ActorRole;
}

export class AccessDeniedError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

const ROLE_RANK: Record<ActorRole, number> = {
  anonymous: 0,
  member: 1,
  administrator: 2,
};

/** Open-mode actor stamped by middleware on every protected request. */
export const ANONYMOUS_ACTOR: AccessContext = {
  actorId: 'anonymous',
  role: 'anonymous',
};

export function openModeActorHeaders(): Record<string, string> {
  return {
    [ACTOR_ID_HEADER]: ANONYMOUS_ACTOR.actorId,
    [ACTOR_ROLE_HEADER]: ANONYMOUS_ACTOR.role,
  };
}

export function getAccessContext(request: { headers: Headers }): AccessContext {
  const actorId = request.headers.get(ACTOR_ID_HEADER)?.trim() || ANONYMOUS_ACTOR.actorId;
  const roleHeader = request.headers.get(ACTOR_ROLE_HEADER)?.trim() as ActorRole | undefined;
  const role =
    roleHeader === 'member' || roleHeader === 'administrator' ? roleHeader : 'anonymous';
  return { actorId, role };
}

/**
 * Assert the caller may proceed. In open mode this is always true. In enforced
 * mode without an identity adapter wired, fail closed (NFR9).
 */
export function requireAccess(
  request: { headers: Headers },
  minimumRole: ActorRole = 'member'
): AccessContext {
  const ctx = getAccessContext(request);

  if (config.authMode === 'open') {
    return ctx;
  }

  // Epic F4 will replace this branch with session validation.
  if (ctx.actorId === 'anonymous' || ctx.role === 'anonymous') {
    throw new AccessDeniedError(
      503,
      'auth_not_configured',
      'Authentication is enforced but no identity adapter is configured yet.'
    );
  }

  if (ROLE_RANK[ctx.role] < ROLE_RANK[minimumRole]) {
    throw new AccessDeniedError(403, 'forbidden', 'Insufficient privileges.');
  }

  return ctx;
}
