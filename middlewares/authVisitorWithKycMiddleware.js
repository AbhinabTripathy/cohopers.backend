const jwt = require("jsonwebtoken");
const { User, Kyc } = require("../models");

// Allows members without KYC and visitors with approved KYC
// Denies visitors without KYC or with pending/rejected KYC
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

    // Members can access without KYC requirement
    if (user.userType === "member") {
      req.user = user;
      return next();
    }

    // Visitors must have approved KYC
    if (user.userType === "visitor") {
      const userKyc = await Kyc.findOne({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
      });

      if (!userKyc) {
        return res.status(403).json({
          success: false,
          message:
            "KYC submission is required to access meeting room bookings. Please submit your KYC details.",
        });
      }

      if (userKyc.status !== "Approve") {
        return res.status(403).json({
          success: false,
          message: `Your KYC status is ${userKyc.status}. Please wait for KYC approval or resubmit if rejected.`,
        });
      }

      req.user = user;
      return next();
    }

    // Unknown user type
    return res.status(403).json({
      success: false,
      message: "Invalid user type",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};
