import { Client, Databases, Query } from 'node-appwrite'
const c = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)
const db = new Databases(c)
const dbId = process.env.APPWRITE_DATABASE_ID
const col = process.env.ACTIVITIES_COLLECTION_ID
const shell = process.env.SHELL_ID

let deleted = 0
for (;;) {
  const res = await db.listDocuments(dbId, col, [Query.equal('shellID', shell), Query.limit(100)])
  if (res.documents.length === 0) break
  for (const d of res.documents) {
    await db.deleteDocument(dbId, col, d.$id)
    deleted++
  }
}
console.log(`deleted ${deleted} activities from shell ${shell}`)
