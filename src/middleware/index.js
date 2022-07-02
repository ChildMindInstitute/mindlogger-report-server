import { login } from '../mindlogger-api.js';

export const authenticate = async (req, res, next) => {
  try {
    await login(req.headers.token);
    next();
  } catch(e) {
    console.log('error', e)
    res.status(403).json({ message: 'permission denied' })
  }
}

