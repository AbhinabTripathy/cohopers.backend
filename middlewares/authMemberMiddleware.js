const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Allows only users with userType 'member' (KYC-approved space/meeting room users).
// Visitor-type users (cafeteria/utility website) are denied access.
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const SECRET = (process.env.APP_SUPER_SECRET_KEY || "").trim();
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    if (user.userType === "visitor") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Space and meeting room bookings are not available for visitor accounts.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};
