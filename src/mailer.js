const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOtpEmail(toEmail, otpCode) {
  await transporter.sendMail({
    from: `"Auth System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your OTP Code",
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otpCode}</h1>
      <p>Valid for 5 minutes.</p>
    `
  });
}

module.exports = { sendOtpEmail };
