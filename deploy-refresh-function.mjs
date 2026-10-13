#!/usr/bin/env node
/**
 * deploy-refresh-function.mjs — create/update the scheduled Appwrite Function
 * `refresh_food_events` (node-14.5, dependency-free) that rolls CaliFood vendor
 * events forward monthly. Reads code from functions/refresh-food-events/code.tar.gz
 * (build it first: tar -czf ... -C functions/refresh-food-events .).
 *
 * USAGE: node --env-file=.env deploy-refresh-function.mjs
 */
import { Client, Functions } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import process from 'node:process';

const FN = 'refresh_food_events';
const RUNTIME_CANDIDATES = ['dart-3.3', 'dart-3.5', 'dart-3.8', 'dart-3.0', 'dart-3.1'];
const ENTRYPOINT = 'lib/main.dart';
const BUILD = 'dart pub get';
const SCHEDULE = '0 8 1 * *'; // 08:00 UTC on the 1st of every month
const TIMEOUT = 900;
const TAR = './functions/refresh-food-events-dart/code.tar.gz';

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const fns = new Functions(client);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// No API key stored — the function uses Appwrite's injected dynamic key (scopes below).
// Endpoint/project come from the auto-provided APPWRITE_FUNCTION_* env vars; DB and
// collection IDs are hardcoded in the function. So no variables are set at all.
const SCOPES = ['databases.read', 'databases.write'];
const VARS = {};

async function ensureFunction() {
  try { const f = await fns.get(FN); console.log('function exists:', FN, '| runtime', f.runtime); return; }
  catch (e) { if (e.code !== 404) throw e; }
  for (const rt of RUNTIME_CANDIDATES) {
    try {
      await fns.create(FN, 'refresh_food_events', rt, [], [], SCHEDULE, TIMEOUT, true, true, ENTRYPOINT, BUILD, SCOPES);
      console.log('created function', FN, '| runtime', rt, '| schedule', SCHEDULE, '| timeout', TIMEOUT);
      return;
    } catch (e) {
      if (/not supported/i.test(e.message)) { console.log('  runtime', rt, 'not supported, trying next…'); continue; }
      throw e;
    }
  }
  throw new Error('No supported Node runtime found among: ' + RUNTIME_CANDIDATES.join(', '));
}

async function setVars() {
  const existing = (await fns.listVariables(FN)).variables;
  const byKey = new Map(existing.map((v) => [v.key, v.$id]));
  for (const [k, val] of Object.entries(VARS)) {
    if (!val) { console.warn('  (skip empty var', k, ')'); continue; }
    if (byKey.has(k)) await fns.updateVariable(FN, byKey.get(k), k, val);
    else await fns.createVariable(FN, k, val);
    console.log('  var', k, '=', k === 'API_KEY' ? '<redacted>' : val);
  }
}

async function deploy() {
  console.log('uploading deployment from', TAR, '...');
  const dep = await fns.createDeployment(FN, InputFile.fromPath(TAR, 'code.tar.gz'), true, ENTRYPOINT, BUILD);
  console.log('deployment', dep.$id, 'status', dep.status);
  // poll build
  for (let i = 0; i < 60; i++) {
    const d = await fns.getDeployment(FN, dep.$id);
    if (d.status === 'ready') { console.log('BUILD READY ✅'); return; }
    if (d.status === 'failed') { console.error('BUILD FAILED:\n', (d.buildLogs || '').slice(-1500)); process.exit(1); }
    if (i % 3 === 0) console.log('  build status:', d.status, '...');
    await sleep(3000);
  }
  console.warn('build still pending after poll window — check the Appwrite console.');
}

async function run() {
  await ensureFunction();
  await setVars();
  await deploy();
  // schedule confirm
  const f = await fns.get(FN);
  console.log(`\nDone. '${FN}' schedule='${f.schedule}' enabled=${f.enabled} runtime=${f.runtime}`);
  console.log('Next run: 08:00 UTC on the 1st of each month. To test now, execute it once from the Appwrite console or:');
  console.log('  node --env-file=.env -e "import(\'node-appwrite\').then(async({Client,Functions})=>{const c=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);await new Functions(c).createExecution(\'' + FN + '\');console.log(\'triggered\')})"');
}
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
