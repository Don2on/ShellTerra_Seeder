import { Client, Databases, Query } from 'node-appwrite';
const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(c);
const DB = process.env.APPWRITE_DATABASE_ID;
for (const [label, sid] of [['Fresno(new)','6acbc8450007daf56f10'],['OC(existing)','6aac35296621e11030a0']]) {
  const v = await db.listDocuments(DB, 'vendors', [Query.equal('shellID', sid), Query.limit(3)]);
  for (const d of v.documents) {
    let n=0; try { n = JSON.parse(d.events||'[]').length; } catch { n = Array.isArray(d.events)?d.events.length:0; }
    console.log(`${label.padEnd(14)} ${String(d.name).slice(0,34).padEnd(34)} events=${n}  hours="${String(d.hours||'').slice(0,40)}"`);
  }
}
