import { Client, Account, Databases, ID } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT
const project = process.env.APPWRITE_PROJECT_ID
const dbId = process.env.APPWRITE_DATABASE_ID
const col = process.env.ACTIVITIES_COLLECTION_ID
const shellId = process.env.SHELL_ID

// Guest client — mimics the app's anonymous session. NO API key.
const guest = new Client().setEndpoint(endpoint).setProject(project)
const account = new Account(guest)

// Same shape ActivityService.saveActivity sends (with location + realistic fields).
const data = {
  shellID: shellId,
  creatorId: 'guest-diag',
  name: 'GUEST DIAG — delete me',
  description: '',
  locationText: 'Test',
  linkUrl: '',
  startTime: '9:0',
  endTime: '',
  date: new Date().toISOString(),
  recurrence: 'none',
  isPrivate: true,
  scale: 1.0,
  latitude: 32.7157,
  longitude: -117.1611,
}

let createdId = null
try {
  const s = await account.createAnonymousSession()
  guest.setSession(s.secret)
  console.log('anon session created (same as the app)')
  const db = new Databases(guest)
  // saveActivity passes NO permissions param — reproduce exactly.
  const doc = await db.createDocument(dbId, col, ID.unique(), data)
  createdId = doc.$id
  console.log('✅ GUEST activity create OK:', doc.$id)
} catch (e) {
  console.log('❌ GUEST activity create FAILED')
  console.log('   message:', e.message)
  console.log('   code   :', e.code)
  console.log('   type   :', e.type)
}

// Cleanup with the API key (bypasses permissions).
if (createdId) {
  const admin = new Client().setEndpoint(endpoint).setProject(project).setKey(process.env.APPWRITE_API_KEY)
  try {
    await new Databases(admin).deleteDocument(dbId, col, createdId)
    console.log('cleaned up test doc')
  } catch {
    console.log('cleanup failed — delete this doc manually:', createdId)
  }
}
