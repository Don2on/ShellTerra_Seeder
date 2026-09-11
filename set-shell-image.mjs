#!/usr/bin/env node
/**
 * ShellTerra - upload a picture and set it as the shell's image_file_id
 *
 * USAGE
 *   node --env-file=.env set-shell-image.mjs --file path/to/photo.jpg
 *   node --env-file=.env set-shell-image.mjs --file photo.jpg --shell-id 6a964e8e04e1b63f6116
 *
 * If --shell-id is omitted, uses SHELL_ID from .env (HillcrestActivities by default).
 * The uploaded file is stored in the totem storage bucket and the file ID is
 * written to image_file_id on the shell document.
 */

import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import process from 'node:process';

const BUCKET_ID = '69d10162000d676dcff6';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };

const imageFile = valOf('--file');
const shellId   = valOf('--shell-id') || process.env.SHELL_ID;

if (!imageFile) {
  console.error('Usage: node --env-file=.env set-shell-image.mjs --file <path/to/image>');
  process.exit(1);
}
if (!existsSync(imageFile)) {
  console.error(`File not found: ${imageFile}`);
  process.exit(1);
}
if (!shellId) {
  console.error('No shell ID. Set SHELL_ID in .env or pass --shell-id <id>');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);
const db      = new Databases(client);

const dbId  = process.env.APPWRITE_DATABASE_ID;
const colId = process.env.SHELLS_COLLECTION_ID;

console.log(`Uploading ${imageFile} ...`);
const fileBytes = readFileSync(imageFile);
const fileName  = basename(imageFile);

let uploaded;
try {
  uploaded = await storage.createFile(
    BUCKET_ID,
    ID.unique(),
    InputFile.fromBuffer(fileBytes, fileName),
    [Permission.read(Role.any())],
  );
} catch (err) {
  console.error(`Upload failed: ${err.message}`);
  process.exit(1);
}

const fileId = uploaded.$id;
console.log(`Uploaded  file ID: ${fileId}`);

console.log(`Updating shell ${shellId} ...`);
try {
  await db.updateDocument(dbId, colId, shellId, { image_file_id: fileId });
} catch (err) {
  console.error(`Shell update failed: ${err.message}`);
  console.error(`You can set it manually: image_file_id = "${fileId}"`);
  process.exit(1);
}

const viewUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
console.log(`Done!`);
console.log(`  Shell:    ${shellId}`);
console.log(`  File ID:  ${fileId}`);
console.log(`  Preview:  ${viewUrl}`);
