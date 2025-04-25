import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET; // Retrieve the secret key from .env

// Middleware to check if a token exists and is valid
export function jwtMiddleware(req, res, next) {
  const token = req.cookies.token; // Use req.cookies.token to retrieve the token
  if (token) {
    try {
      const jwtContent = jwt.verify(token, jwtSecret); // Verify the token using the secret key
      req.user = jwtContent; // Attach the token's decoded content to the request object
      //await controller(req,res,next); // Uncomment if needed for controller chaining
    } catch (err) {
      console.log('Invalid token', err); // Log error details for debugging
      return res.status(401).json({ error: 'Invalid token.' }); // Respond with 401 for invalid token
    }
  } else {
    return res.status(401).json({ error: 'Token not provided.' }); // Respond with 401 if token is missing
  }
  next(); // Proceed to the next middleware
};
