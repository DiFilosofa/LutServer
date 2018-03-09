var AWS = require('aws-sdk');

exports.bucketName = "lutdatabase";
exports.region = 'us-east-1';
exports.dataUrlInitial = "https://s3-ap-southeast-1.amazonaws.com/lutdatabase/";
exports.accessKeyId = process.env.AWS_ACCESS;
exports.secretKey = process.env.AWS_SECRET;
exports.supportedFileExtensions = [".jpg", ".png", ".jpeg", ".mp4", ".mov", ".avi"];
exports.s3 = new AWS.S3({
    accessKeyId: this.accessKeyId,
    secretAccessKey: this.secretKey,
    region: this.region
});