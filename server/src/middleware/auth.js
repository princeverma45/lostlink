import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, contribution: true, enrollment: true }
    });
    if (!user) return res.status(401).json({ error: 'Your session is no longer valid.' });
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    return next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    return next();
  };
}
