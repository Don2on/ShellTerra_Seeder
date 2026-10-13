// Read-only: print existing FoodDistribution* shell names, one per line.
// Used by seed-all-food-counties.mjs to skip counties already created.
import { Client, Databases, Query } from 'node-appwrite';
const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(c);
const res = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, process.env.SHELLS_COLLECTION_ID, [Query.startsWith('name', 'FoodDistribution'), Query.limit(200)]);
for (const d of res.documents) console.log(d.name);
