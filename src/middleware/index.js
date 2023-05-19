import { login } from '../mindlogger-api.js';

export const authenticate = async (req, res, next) => {
  try {
    if (!isHealthCheck(req)) {
      await login(req.headers.token);
    }
    next();
  } catch(e) {
    res.status(403).json({ message: 'Invalid token' })
  }
}

function isHealthCheck(req) {
  return req.method === 'GET' && req.url === '/';
}
