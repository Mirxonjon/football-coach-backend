import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME || 'football-coach';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 env vars');
  process.exit(1);
}

const client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: false,
});

async function main() {
  console.log(`[1/4] Bucket "${bucket}" (skipping HeadBucket — object-scoped token)`);

  const key = `misc/${new Date().toISOString().slice(0, 10)}/r2-bootstrap-test.txt`;
  const body = `R2 bootstrap test @ ${new Date().toISOString()}`;

  console.log(`[2/4] PUT test object at ${key}...`);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    }),
  );
  console.log('   → upload ok');

  console.log(`[3/4] GET test object...`);
  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const contents = await got.Body!.transformToString();
  console.log(`   → ${contents.length} bytes read`);

  console.log(`[4/4] DELETE test object...`);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log('   → deleted');

  console.log('\n✅ R2 end-to-end OK');
}

main().catch((e) => {
  console.error('✗ R2 bootstrap failed:', e);
  process.exit(1);
});
