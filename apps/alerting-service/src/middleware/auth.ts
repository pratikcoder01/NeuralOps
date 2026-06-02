import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface UserClaims {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'sre' | 'readonly';
}

export function verifyToken(token: string): UserClaims | null {
  try {
    const secret = config.JWT_SECRET;
    const decoded = jwt.verify(token, secret) as any;

    if (!decoded || !decoded.sub || !decoded.workspace_id || !decoded.role) {
      return null;
    }

    return {
      userId: decoded.sub,
      workspaceId: decoded.workspace_id,
      role: decoded.role as any,
    };
  } catch (error) {
    return null;
  }
}

export function getClaimsFromHeader(authHeader?: string): UserClaims | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return verifyToken(parts[1]);
}
