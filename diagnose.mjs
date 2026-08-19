import { Client, Databases, ID, Permission, Role } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)
const dbId = process.env.APPWRITE_DATABASE_ID
const col = process.env.ACTIVITIES_COLLECTION_ID
const shellId = process.env.SHELL_ID

// Known-good base (this created fine before).
const base = {
  shellID: shellId,
  creatorId: 'diagnostic-test',
  name: 'DIAGNOSTIC TEST — delete me',
  description: '',
  locationText: '',
  linkUrl: '',
  startTime: '9:0',
  endTime: '',
  date: new Date().toISOString(),
  recurrence: 'none',
  isPrivate: true,
  scale: 1.0,
}

// The extra fields the real app adds; test each on top of the base.
const extras = {
  latitude: 32.7157,
  longitude: -117.1611,
  creator_avatar: '🐬',
}

async function tryCreate(label, data) {
  try {
    const doc = await db.createDocument(dbId, col, ID.unique(), data, [
      Permission.read(Role.any()),
    ])
    await db.deleteDocument(dbId, col, doc.$id)
    console.log(`✅ ${label} — OK`)
  } catch (e) {
    console.log(`❌ ${label} — FAILED: ${e.message} (code ${e.code}, type ${e.type})`)
  }
}

await tryCreate('base only (control)', base)
for (const [k, v] of Object.entries(extras)) {
  await tryCreate(`base + ${k}`, { ...base, [k]: v })
}
await tryCreate('base + ALL extras', { ...base, ...extras })
