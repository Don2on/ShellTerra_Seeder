import { Client, Databases, Query } from 'node-appwrite';
const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(c);
const DB = process.env.APPWRITE_DATABASE_ID;
const shells = (await db.listDocuments(DB, process.env.SHELLS_COLLECTION_ID, [Query.startsWith('name','FoodDistribution'), Query.limit(200)])).documents;
console.log(`${shells.length} FoodDistribution shells\n`);
const newOnes = ['Alameda','Alpine','Amador','Butte','Calaveras','Colusa','Fresno','Glenn','Humboldt','Imperial','Lassen','Madera','Marin','Mariposa'].map(x=>'FoodDistribution'+x);
for (const s of shells.filter(d=>newOnes.includes(d.name)).sort((a,b)=>a.name.localeCompare(b.name))) {
  // count vendors + how many have non-empty events
  let cur=null, total=0, withEv=0;
  while(true){
    const r = await db.listDocuments(DB,'vendors',[Query.equal('shellID',s.$id),Query.limit(100),...(cur?[Query.cursorAfter(cur)]:[])]);
    for(const v of r.documents){ total++; let n=0; try{n=JSON.parse(v.events||'[]').length;}catch{} if(n>0)withEv++; }
    if(r.documents.length<100)break; cur=r.documents.at(-1).$id;
  }
  console.log(`${s.name.replace('FoodDistribution','').padEnd(12)} vendors=${String(total).padStart(4)}  withEvents=${String(withEv).padStart(4)}`);
}
