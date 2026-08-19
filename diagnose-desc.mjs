import { Client, Databases, ID, Permission, Role } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)
const dbId = process.env.APPWRITE_DATABASE_ID
const shellId = process.env.SHELL_ID

// Minimal valid docs per collection; vary only `description` length.
function activityDoc(desc) {
  return {
    shellID: shellId, creatorId: 'desc-diag', name: 'DESC DIAG',
    description: desc, locationText: '', linkUrl: '', startTime: '9:0',
    endTime: '', date: new Date().toISOString(), recurrence: 'none',
    isPrivate: true, scale: 1.0,
  }
}
function timemarkDoc(desc) {
  return {
    shell_id: shellId, user_id: 'desc-diag', name: 'DESC DIAG',
    description: desc, date: new Date().toISOString(), is_public: false,
    latitude: 32.75, longitude: -117.15, nickname: 'diag', avatar: '🐬',
  }
}

async function probe(col, build) {
  console.log(`\n=== ${col}.description ===`)
  for (const len of [200, 500, 1000, 1500, 2000]) {
    const data = build('x'.repeat(len))
    try {
      const doc = await db.createDocument(dbId, col, ID.unique(), data, [Permission.read(Role.any())])
      await db.deleteDocument(dbId, col, doc.$id).catch(() => {})
      console.log(`✅ ${len} chars — OK`)
    } catch (e) {
      const m = /no longer than (\d+) chars/.exec(e.message)
      console.log(`❌ ${len} chars — ${m ? 'cap is ' + m[1] : e.message}`)
    }
  }
}

await probe(process.env.ACTIVITIES_COLLECTION_ID, activityDoc)
await probe(process.env.TIMEMARKS_COLLECTION_ID, timemarkDoc)
