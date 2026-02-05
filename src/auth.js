const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { sendOtpEmail } = require("./mailer");
const config = require('./config')

const ACCESS_SECRET = config.ACCESS_SECRET;
const REFRESH_SECRET = config.REFRESH_SECRET;

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

// ================= SIGNUP =================
router.post("/auth/signup", async (req, res) => {
  try {
    const { email} = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: "User exists" });

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.create({
      data: {
        email,
        otpCode,
        otpExpiresAt,
        role: "UNVERIFIED"
      }
    });

    await sendOtpEmail(email, otpCode);

    res.json({ message: "Signup successful. OTP sent to email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
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

    const refreshToken = generateRefreshToken(user);
    const accessToken = generateAccessToken({
      ...user,
      role: "USER"
    });

    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        role: "USER",
        refreshToken
      }
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: "OTP verified & logged in",
      accessToken
    });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
});

// ================= AUTO LOGIN =================
router.get("/auth/me", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const decoded = jwt.verify(token, REFRESH_SECRET);

    const user = await prisma.user.findFirst({
      where: {
        userId: decoded.userId,
        refreshToken: token
      },
      select: { userId: true, email: true, name: true, role: true }
    });

    if (!user) return res.status(401).json({ message: "Session expired" });

    const accessToken = generateAccessToken(user);
    res.json({ user, accessToken });
  } catch {
    res.status(401).json({ message: "Invalid session" });
  }
});


// ================= REQUEST OTP LOGIN =================
router.post("/auth/request-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "USER") {
      return res.status(400).json({ message: "Invalid user" });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { userId: user.userId },
      data: { otpCode, otpExpiresAt }
    });

    await sendOtpEmail(email, otpCode);

    res.json({ message: "OTP sent for login" });
  } catch {
    res.status(500).json({ message: "OTP request failed" });
  }
});





// ================= LOGIN (PASSWORD) =================
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role !== "USER") {
      return res.status(403).json({ message: "Verify OTP first" });
    }

    const refreshToken = generateRefreshToken(user);
    const accessToken = generateAccessToken(user);

    await prisma.user.update({
      where: { userId: user.userId },
      data: { refreshToken }
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: "Login successful", accessToken });
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
