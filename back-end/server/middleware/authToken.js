const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Get the token from the header
  // usually sent as "Authorization: Bearer <token>"
  const token = req.headers['authorization'];

  if (!token) {
	  res.status(401);
    return next(new Error ("No token provided. Access denied."));
  }

  // 2. Remove the "Bearer " prefix if present (optional but standard)
  const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

  // 3. Verify the signature
  jwt.verify(tokenString, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
	    res.status(401);
      return next(new Error("Invalid Token"));
    }
    
    // 4. Success! Save the user ID so the controller can use it
    req.user_id = decoded.user_id; 
    req.role = decoded.role;
    // 5. Move to the next step (the Controller)
    next();
  });
};

module.exports = verifyToken;
