import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'jade-kahoot-secret-2024'

export interface AuthRequest extends Request {
  userId?: number
  username?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: number; username: string }
    req.userId = payload.id
    req.username = payload.username
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: number; username: string }
      req.userId = payload.id
      req.username = payload.username
    } catch { /* ignore */ }
  }
  next()
}
