#!/usr/bin/env node
/**
 * ShellTerra — batch shell-image seeder.
 * Uploads each image ONCE to the totem bucket, then sets image_file_id on every
 * target shell that shares it (avoids duplicate storage copies).
 *
 *   node --env-file=.env seed-shell-images.mjs
 */
import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import process from 'node:process';

const BUCKET_ID = '69d10162000d676dcff6';

const MAP = [
  { file: 'images/HillcrestActivity.png',      shells: ['6a964e8e04e1b63f6116', '6a834820a8ef8d73e745'] }, // HillcrestActivities, HillcrestToDo
  { file: 'images/GaslampActivities.png',      shells: ['6a966244cb2082796b17'] },                          // GaslampActivities
  { file: 'images/PacificBeachActivities.png', shells: ['6a97507831d24cd42195', '6a975755926775334156'] }, // PB Activities, PB Crawl
  { file: 'images/SDFoodDistribution.png',     shells: ['6a84dbe4ec8215c0345e'] },                          // SD Food Distribution
];

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const storage = new Storage(client);
const db = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;
const colId = process.env.SHELLS_COLLECTION_ID;

for (const { file, shells } of MAP) {
  const bytes = readFileSync(file);
  const up = await storage.createFile(
    BUCKET_ID, ID.unique(),
    InputFile.fromBuffer(bytes, basename(file)),
    [Permission.read(Role.any())],
  );
  console.log(`uploaded ${file}  ->  ${up.$id}`);
  for (const shellId of shells) {
    await db.updateDocument(dbId, colId, shellId, { image_file_id: up.$id });
    console.log(`   set on shell ${shellId}`);
  }
}
console.log('\ndone');
