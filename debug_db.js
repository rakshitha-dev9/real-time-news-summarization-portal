const { MongoClient } = require('mongodb');

async function searchForNews() {
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log("🕵️  Connected to Database. Searching...");

        // 1. List all Databases
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        
        console.log("\n--- DATABASES FOUND ---");
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = client.db(dbName);
            
            // 2. List all Collections in this DB
            const collections = await db.listCollections().toArray();
            
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                if (count > 0) {
                    console.log(`📦 DB: '${dbName}' | Collection: '${col.name}' | Items: ${count}`);
                    
                    // Show us the first item so we know if it's our news
                    const firstItem = await db.collection(col.name).findOne();
                    if (firstItem.title) {
                        console.log(`   ↳ Example: "${firstItem.title.substring(0, 40)}..."`);
                    }
                }
            }
        }
        console.log("\n-----------------------");

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

searchForNews();