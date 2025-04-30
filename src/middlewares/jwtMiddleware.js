import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET; // Retrieve the secret key from .env

// Enhanced middleware to verify the token's validity
export function jwtMiddleware(req, res, next) {
  // Try to get the token from different sources
  let token = req.cookies.token; // Main option: from cookie

  // If no cookie, check the Authorization header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Extract token after 'Bearer '
    }
  }

  // If still no token, check in the request body (useful in some contexts)
  if (!token && req.body && req.body.token) {
    token = req.body.token;
  }

  // If still no token, check in the query string (for GET requests)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const jwtContent = jwt.verify(token, jwtSecret); // Verify the token
      req.user = jwtContent; // Attach decoded content to the request object
      next(); // Proceed to the next middleware
    } catch (err) {
      console.log('Invalid token:', err.message); // Log error details for debugging
      return res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    console.log('No token provided'); // Log for debugging
    return res.status(401).json({ error: 'Token not provided' });
  }
}
