
const verifyAdmin = (req, res, next) => {
  // 1. Check if user exists in the request (is logged in)
  if (!req.user_id) {
    res.status(401);
    return next(new Error("User is not logged in"));
  }
  // 2. Check the role. 

  if (req.role === 'admin') {
    next(); 
  } else {
      res.status(403);
      return next(new Error("User is not an admin"));
  }
};

module.exports = verifyAdmin;
