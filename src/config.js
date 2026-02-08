require("dotenv").config();

const config = {
    ACCESS_SECRET: process.env.ACCESS_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS:process.env.EMAIL_PASS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AWS_ACCESS_KEY_ID:process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY:process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION:process.env.AWS_REGION,
    S3_BUCKET_NAME:process.env.S3_BUCKET_NAME
};

module.exports = config;
