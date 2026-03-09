import { Request, Response, NextFunction } from 'express';

export function requireParent(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'parent') {
    res.status(403).json({ error: 'Parents only' });
    return;
  }
  next();
}
