import { login } from '../mindlogger-api';
import express from 'express';

export const authenticate = async (req: express.Request, res: express.Response, next: any) => {
  try {
    if (!isHealthCheck(req)) {
      await login(req.headers.token);
    }
    next();
  } catch(e) {
    res.status(403).json({ message: 'Invalid token' })
  }
}

function isHealthCheck(req: express.Request) {
  return req.method === 'GET' && req.url === '/';
}
