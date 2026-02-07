const jwt = require("jsonwebtoken");

function roleBasedAccess(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token not found" });
    }

    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          message: "Invalid or expired token",
          error: err.message,
        });
      }

      // Role check
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          message: "Access Denied: Insufficient Permissions",
        });
      }

      req.user = decoded; // { userId, role }
      next();
    });
  };
}

module.exports = roleBasedAccess;
