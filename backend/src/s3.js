import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// If credentials are not explicitly provided, AWS SDK automatically checks:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. EC2 Instance Metadata / IAM Instance Profile (Best practice for EC2!)
const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export const s3 = new S3Client(clientConfig);
export const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';
