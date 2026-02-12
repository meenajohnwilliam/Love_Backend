// const nodemailer = require("nodemailer");
// const config = require('./config')

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: config.EMAIL_USER,
//     pass: config.EMAIL_PASS
//   }
// });

// async function sendOtpEmail(toEmail, otpCode) {
//   await transporter.sendMail({
//     from: `"Auth System" <${config.EMAIL_USER}>`,
//     to: toEmail,
//     subject: "Your OTP Code",
//     html: `
//       <h2>OTP Verification</h2>
//       <p>Your OTP is:</p>
//       <h1>${otpCode}</h1>
//       <p>Valid for 5 minutes.</p>
//     `
//   });
// }

// module.exports = { sendOtpEmail };



const { Resend } = require("resend");
const config = require("./config");

const resend = new Resend(config.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otpCode) {
  try {
    await resend.emails.send({
      from: "info@webzspot.com",
      to: toEmail,
      subject: "Your OTP Code",
      html: `
       <div style="
  max-width: 520px;
  margin: auto;
  background: #fff0f6;
  border-radius: 14px;
  padding: 24px;
  font-family: 'Arial', sans-serif;
  border: 1px solid #ffc1d6;
">
  <!-- Header -->
  <div style="text-align: center;">
    <h1 style="
      color: #d6336c;
      margin-bottom: 4px;
    ">
      💖 Pookie Couple 💖
    </h1>
    <p style="
      color: #a61e4d;
      font-size: 14px;
      margin-top: 0;
    ">
      Valentine’s Special 
    </p>
  </div>

  <!-- Heart Divider -->
  <div style="text-align: center; font-size: 22px; margin: 12px 0;">
    💗 💕 💗
  </div>

  <!-- Content -->
  <h2 style="
    text-align: center;
    color: #c2255c;
  ">
    OTP Verification
  </h2>

  <p style="
    text-align: center;
    color: #6a1b3a;
    font-size: 15px;
  ">
    Your love code is here 💌
  </p>

  <!-- OTP Box -->
  <div style="
    background: #ffe3ec;
    border: 2px dashed #f06595;
    border-radius: 12px;
    padding: 18px;
    text-align: center;
    margin: 20px 0;
  ">
    <h1 style="
      margin: 0;
      letter-spacing: 6px;
      color: #ad1457;
    ">
      ${otpCode}
    </h1>
  </div>

  <p style="
    text-align: center;
    color: #7a1f3d;
    font-size: 14px;
  ">
    This OTP is valid for <b>5 minutes</b> ⏳
  </p>

  <!-- Footer -->
  <div style="
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: #9c4668;
  ">
    Made with 💕 for couples <br/>
    © 2026 Pookie Couple
  </div>
</div>

      `,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}

module.exports = { sendOtpEmail };
