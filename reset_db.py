from pymongo import MongoClient

# Connect
client = MongoClient('mongodb://127.0.0.1:27017/')
db = client['news_db']

# 1. Count before deleting
count = db.articles.count_documents({})
print(f"🗑️  Found {count} old articles.")

# 2. Delete everything
db.articles.delete_many({})
print("✅ Database wiped clean!")

# 3. Verify
new_count = db.articles.count_documents({})
print(f"🧐 Current count: {new_count}")