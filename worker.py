from celery import Celery
from pymongo import MongoClient
import datetime
import feedparser
from nlp_engine import process_news_url

app = Celery('news_worker', 
             broker='amqp://guest:guest@localhost:5672//',
             backend='redis://localhost:6379/0')

client = MongoClient('mongodb://127.0.0.1:27017/')
db = client['news_db']
collection = db['articles']

FEED_CONFIG = [
    {"url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "cat": "India", "src": "Times of India"},
    {"url": "https://www.thehindu.com/news/national/feeder/default.rss", "cat": "India", "src": "The Hindu"},
    {"url": "https://feeds.feedburner.com/ndtvnews-top-stories", "cat": "India", "src": "NDTV"},
    {"url": "http://feeds.bbci.co.uk/news/world/rss.xml", "cat": "World", "src": "BBC"},
    {"url": "https://www.aljazeera.com/xml/rss/all.xml", "cat": "World", "src": "Al Jazeera"},
    {"url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms", "cat": "Business", "src": "Economic Times"},
    {"url": "https://www.livemint.com/rss/money", "cat": "Business", "src": "Mint"},
    {"url": "https://www.theverge.com/rss/index.xml", "cat": "Technology", "src": "The Verge"},
    {"url": "https://techcrunch.com/feed/", "cat": "Technology", "src": "TechCrunch"},
    {"url": "https://www.sciencedaily.com/rss/top/science.xml", "cat": "Science", "src": "Science Daily"},
    {"url": "http://feeds.bbci.co.uk/sport/rss.xml", "cat": "Sports", "src": "BBC Sport"},
    {"url": "https://sports.ndtv.com/rss/all", "cat": "Sports", "src": "NDTV Sports"},
    {"url": "https://www.hindustantimes.com/feeds/rss/entertainment/bollywood/rssfeed.xml", "cat": "Entertainment", "src": "Hindustan Times"},
    {"url": "https://www.sciencedaily.com/rss/health_medicine.xml", "cat": "Health", "src": "Medical News"}
]

@app.task(name='tasks.process_article')
def process_article(url, category, source_name):
    if collection.find_one({"url": url}): return "Duplicate"
    if "youtube.com" in url: return "Skipped"

    print(f"⚡ Analyzing ({category}): {url}")
    result = process_news_url(url)
    
    if result:
        document = {
            "url": url,
            "title": result['title'],
            "summary": result['summary'],
            "sentiment": result['sentiment'],
            "score": result['score'],
            "image": result['image'],
            "source": source_name,
            "category": category,
            "created_at": datetime.datetime.utcnow()
        }
        collection.insert_one(document)
        print(f"💾 Saved: {result['title'][:20]}...")
        return "Success"
    return "Failed"


@app.task(name='tasks.crawl_news')
def crawl_news():
    # --- STEP 1: PROTECT BOOKMARKS ---
    # Connect to the users collection to find what is saved
    users_collection = db['users'] 
    
    # Get a list of ALL IDs that are currently bookmarked by ANY user
    # .distinct() is a fast way to get all unique bookmark IDs
    protected_ids = users_collection.distinct("bookmarks")
    
    print(f"🛡️  Protecting {len(protected_ids)} bookmarked articles from deletion.")

    # --- STEP 2: CLEANUP OLD NEWS ---
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    
    # Delete older than 24h BUT NOT if it is in the protected list
    result = collection.delete_many({
        "created_at": {"$lt": cutoff},
        "_id": {"$nin": protected_ids}  # $nin means "Not In"
    })
    
    if result.deleted_count > 0:
        print(f"🧹 Janitor: Deleted {result.deleted_count} old articles.")
    else:
        print("🧹 Janitor: No old articles to delete.")

    # --- STEP 3: GET FRESH NEWS ---
    print("🕷️ Starting Fresh Crawl...")
    for item in FEED_CONFIG:
        try:
            feed = feedparser.parse(item["url"])
            for entry in feed.entries[:4]: 
                process_article.delay(entry.link, item["cat"], item["src"])
        except Exception as e:
            print(f"❌ Error reading {item['src']}: {e}")
    print("✅ Crawl Dispatched")