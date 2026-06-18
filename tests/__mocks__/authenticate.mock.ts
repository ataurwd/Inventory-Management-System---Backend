import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1] || req.headers.cookie?.split('token=')[1]?.split(';')[0];
  
  if (!token) {
    return res.status(401).json({ error: { message: 'No authentication token provided' } });
  }

  try {
    // If the token is a JSON string of the payload, parse and attach it
    const payload = JSON.parse(decodeURIComponent(token));
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
};
