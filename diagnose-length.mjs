import { Client, Account, Databases, ID } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT
const project = process.env.APPWRITE_PROJECT_ID
const dbId = process.env.APPWRITE_DATABASE_ID
const col = process.env.ACTIVITIES_COLLECTION_ID
const shellId = process.env.SHELL_ID

// Guest client — same as the app's anonymous session.
const guest = new Client().setEndpoint(endpoint).setProject(project)
const account = new Account(guest)
const s = await account.createAnonymousSession()
guest.setSession(s.secret)
const db = new Databases(guest)

// Admin client just for cleanup.
const admin = new Client().setEndpoint(endpoint).setProject(project).setKey(process.env.APPWRITE_API_KEY)
const adminDb = new Databases(admin)

const base = {
  shellID: shellId, creatorId: 'len-diag', name: 'LEN DIAG',
  description: '', linkUrl: '', startTime: '9:0', endTime: '',
  date: new Date().toISOString(), recurrence: 'none', isPrivate: true, scale: 1.0,
  latitude: 32.7505, longitude: -117.1492,
}

async function tryLoc(label, locationText) {
  const data = { ...base, locationText }
  try {
    const doc = await db.createDocument(dbId, col, ID.unique(), data)
    await adminDb.deleteDocument(dbId, col, doc.$id).catch(() => {})
    console.log(`✅ ${label} (${locationText.length} chars) — OK`)
  } catch (e) {
    console.log(`❌ ${label} (${locationText.length} chars) — ${e.message}`)
  }
}

await tryLoc('real address', '3960 Normal Street, San Diego, California 92103')
for (const len of [20, 50, 100, 128, 150, 200, 256, 300]) {
  await tryLoc(`len ${len}`, 'x'.repeat(len))
}
