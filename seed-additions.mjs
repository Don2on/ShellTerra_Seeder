/*
 * seed-additions.mjs — seed the 3 "additions to existing shell" batches.
 * Run:  node seed-additions.mjs
 * (Avoids multi-line paste issues — each child runs with --env-file=.env.)
 */
import { execFileSync } from 'node:child_process';

const ADD = [
  ['Sacramento',    '6aba043f0010e3a2ac9c', './b7-Sacramento-activities.json',    './b7-Sacramento-vendors.json'],
  ['SanBernardino', '6abaa385b4b328f7ae43', './b7-SanBernardino-activities.json', './b7-SanBernardino-vendors.json'],
  ['Yolo',          '6aba044800361d504695', './b13-Yolo-activities.json',         './b13-Yolo-vendors.json'],
];

const node = (args) => execFileSync(process.execPath, args, { encoding: 'utf8' });
const tail = (s, n) => s.trim().split('\n').slice(-n).join('\n');

for (const [name, id, act, ven] of ADD) {
  console.log(`\n######## ${name} additions -> ${id} ########`);
  try { console.log(tail(node(['--env-file=.env', 'seed-activities.mjs', '--file', act, '--no-host-grouping', '--shell-id', id]), 3)); }
  catch (e) { console.log('seed-activities error:\n' + (e.stdout || e.stderr || e.message)); }
  try { console.log(tail(node(['--env-file=.env', 'seed-vendors.mjs', '--file', ven]), 3)); }
  catch (e) { console.log('seed-vendors error:\n' + (e.stdout || e.stderr || e.message)); }
}
console.log('\nAdditions done.');
