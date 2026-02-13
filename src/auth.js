const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { sendOtpEmail } = require("./mailer");
const config = require('./config')
const roleBasedAccess = require('./authorizeRoles')

const ACCESS_SECRET = config.ACCESS_SECRET;
const REFRESH_SECRET = config.REFRESH_SECRET;


const isProd = process.env.NODE_ENV === "production";

// ================= UTILS =================
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateAccessToken = (user) =>
  jwt.sign(
    { userId: user.userId, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { userId: user.userId },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );


  
// ================= REFRESH =================
  router.post("/auth/refresh", async (req, res) => {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        return res.status(401).json({ message: "No refresh token" });
      }
  
      const decoded = jwt.verify(token, REFRESH_SECRET);
  
      const user = await prisma.user.findUnique({
        where: { userId: decoded.userId }
      });
  
      if (!user || user.refreshToken !== token) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }
  
      const accessToken = generateAccessToken({
        userId: user.userId,
        role: user.role
      });
  
      res.json({ accessToken });
    } catch {
      res.status(403).json({ message: "Token expired" });
    }
  });

// ================= SIGNUP =================
router.post("/auth/signup", async (req, res) => {
  try {
    const { email} = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const existingUser  = await prisma.user.findUnique({ where: { email } });
    // if (exists) return res.status(400).json({ message: "User exists" });

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (existingUser) {
      await prisma.user.update({
        where: { userId: existingUser.userId },
        data: { otpCode, otpExpiresAt }
      });

      await sendOtpEmail(email, otpCode);

      return res.json({
        message: "OTP sent. Please verify to continue."
      });
    }

    // 🟢 CREATE new user
    await prisma.user.create({
      data: {
        email,
        otpCode,
        otpExpiresAt,
        role: "UNVERIFIED"
      }
    });

    await sendOtpEmail(email, otpCode);

    res.json({
      message: "Signup successful. OTP sent to email."
    });
    res.json({ message: "Signup successful. OTP sent to email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});


// ================= RESEND-OTP =================
router.post("/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({
        message: "No account found with this email."
      });
    }

  

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { userId: user.userId },
      data: { otpCode, otpExpiresAt }
    });

    await sendOtpEmail(email, otpCode);

    res.json({ message: "OTP resent successfully." });
  } catch {
    res.status(500).json({ message: "Resend failed" });
  }
});

// ================= VERIFY OTP =================
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        email,
        otpCode: code,
        otpExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const finalRole = user.role === "ADMIN" ? "ADMIN" : "USER";

    const refreshToken = generateRefreshToken(user);
    const accessToken = generateAccessToken({
      userId: user.userId,
      role: finalRole
    });

    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        role: finalRole,
        refreshToken
      }
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,                 // false in dev, true in prod
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: "OTP verified & logged in",
      role: finalRole,
      userId: user.userId ,
      accessToken
    });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
});

// ================= LOGIN =================
router.post("/auth/login", async (req, res) => {
  try {
    const { email } = req.body;

    
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please signup."
      });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);


    await prisma.user.update({
      where: { userId: user.userId },
      data: { otpCode, otpExpiresAt }
    });

    await sendOtpEmail(email, otpCode);

    res.json({
      message: "OTP sent. Please verify to login."
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});



// ================= LOGOUT =================
router.post("/auth/logout", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, REFRESH_SECRET);
      await prisma.user.update({
        where: { userId: decoded.userId },
        data: { refreshToken: null }
      });
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  } catch {
    res.status(500).json({ message: "Logout failed" });
  }
});



module.exports = router;
