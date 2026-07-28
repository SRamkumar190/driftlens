import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDirectory = resolve(process.cwd(), 'dist');
const reviewDirectory = resolve(distDirectory, 'review');

await mkdir(reviewDirectory, { recursive: true });
await copyFile(
  resolve(distDirectory, 'index.html'),
  resolve(reviewDirectory, 'index.html'),
);
