require("dotenv").config();

const config = {
    ACCESS_SECRET: process.env.ACCESS_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS:process.env.EMAIL_PASS,
    RESEND_API_KEY: process.env.RESEND_API_KEY
};

module.exports = config;
