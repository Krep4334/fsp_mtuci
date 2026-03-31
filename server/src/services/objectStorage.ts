import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export type StorageConfig = {
  endpoint: string;
  publicUrl: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

/**
 * В development без .env подставляются типичные значения локального MinIO.
 * В production все критичные переменные должны быть заданы явно.
 * Отключить хранилище: DISABLE_OBJECT_STORAGE=true
 */
export function getStorageConfig(): StorageConfig | null {
  if (process.env['DISABLE_OBJECT_STORAGE'] === 'true') {
    return null;
  }

  const isProd = process.env['NODE_ENV'] === 'production';

  const endpoint =
    process.env['S3_ENDPOINT']?.trim() ||
    (!isProd ? 'http://localhost:9000' : '');
  const publicUrlRaw =
    process.env['S3_PUBLIC_URL']?.trim() ||
    (!isProd ? 'http://localhost:9000' : '');
  const publicUrl = publicUrlRaw.replace(/\/$/, '');
  const accessKey =
    process.env['S3_ACCESS_KEY']?.trim() ||
    (!isProd ? 'minioadmin' : '');
  const secretKey =
    process.env['S3_SECRET_KEY']?.trim() ||
    (!isProd ? 'minioadmin' : '');
  const bucket = process.env['S3_BUCKET']?.trim() || 'tournament-objects';
  const region = process.env['S3_REGION']?.trim() || 'us-east-1';

  if (!endpoint || !publicUrl || !accessKey || !secretKey) {
    return null;
  }

  return { endpoint, publicUrl, region, bucket, accessKey, secretKey };
}

let client: S3Client | null = null;
let clientCacheKey = '';

export function isObjectStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}

function getClient(): S3Client {
  const cfg = getStorageConfig();
  if (!cfg) {
    throw new Error('Object storage is not configured');
  }
  const key = `${cfg.endpoint}|${cfg.accessKey}|${cfg.region}|${cfg.bucket}`;
  if (!client || clientCacheKey !== key) {
    client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
      forcePathStyle: true,
    });
    clientCacheKey = key;
  }
  return client;
}

export async function ensureBucketExists(): Promise<void> {
  const cfg = getStorageConfig();
  if (!cfg) return;
  const s3 = getClient();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
  }
}

export function publicUrlForKey(key: string): string {
  const cfg = getStorageConfig();
  if (!cfg) throw new Error('Object storage is not configured');
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${cfg.publicUrl}/${cfg.bucket}/${path}`;
}

export async function uploadBuffer(params: {
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<{ key: string; url: string }> {
  const cfg = getStorageConfig();
  if (!cfg) throw new Error('Object storage is not configured');
  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || 'application/octet-stream',
      ACL: 'public-read',
    })
  );
  return { key: params.key, url: publicUrlForKey(params.key) };
}

export async function deleteObjectKey(key: string): Promise<void> {
  const cfg = getStorageConfig();
  if (!cfg) throw new Error('Object storage is not configured');
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export function newObjectKey(userId: string, prefix: string, originalName: string): string {
  const safe = sanitizeFilename(originalName);
  return `users/${userId}/${prefix}/${uuidv4()}-${safe}`;
}
