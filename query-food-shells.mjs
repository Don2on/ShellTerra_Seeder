// Read-only: run CaliFood's exact shell-discovery query against the shared backend
// and report whether the 10 new county shells are returned, public, and have coords.
import { Client, Databases, Query } from 'node-appwrite';
const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(c);
const DB = process.env.APPWRITE_DATABASE_ID, SHELLS = process.env.SHELLS_COLLECTION_ID;
const want = new Set(['Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Fresno', 'Glenn', 'Humboldt', 'Imperial'].map((x) => 'FoodDistribution' + x));
const res = await db.listDocuments(DB, SHELLS, [Query.startsWith('name', 'FoodDistribution'), Query.limit(50)]);
console.log('prefix query returned', res.documents.length, 'FoodDistribution shells');
let newFound = 0;
for (const d of res.documents.sort((a, b) => a.name.localeCompare(b.name))) {
  const isNew = want.has(d.name);
  if (isNew) newFound++;
  const coords = (d.latitude != null && d.longitude != null) ? `${d.latitude},${d.longitude}` : 'NONE';
  console.log(`${isNew ? '* ' : '  '}${d.name.padEnd(30)} priv=${d.is_private} pub=${d.public_override} coords=${coords}`);
}
console.log(`\nnew shells present in query: ${newFound}/10`);
const fres = res.documents.find((d) => d.name === 'FoodDistributionFresno');
if (fres) { const v = await db.listDocuments(DB, 'vendors', [Query.equal('shellID', fres.$id), Query.limit(1)]); console.log('Fresno vendors readable via vendors collection:', v.total); }
