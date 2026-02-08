const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('./config');


const s3Client = new S3Client({
  region: config.AWS_REGION, 
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey:config.AWS_SECRET_ACCESS_KEY,
  },
});



const LoveApp = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: config.S3_BUCKET_NAME,
    acl: 'public-read',
    key: (req, file, cb) => {
      cb(null, `RevealPhoto/${Date.now()}_${file.originalname}`);
    },
  }),
});
const LoveAppQuesPic = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: config.S3_BUCKET_NAME,
    acl: 'public-read',
    key: (req, file, cb) => {
      cb(null, `LoveAppQuesPic/${Date.now()}_${file.originalname}`);
    },
  }),
});


module.exports = {LoveApp,LoveAppQuesPic};