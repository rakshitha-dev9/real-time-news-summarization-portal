from worker import crawl_news

# This manually triggers the crawler task immediately
print("🚀 Sending command to Crawler...")
crawl_news.delay()
print("✅ Command sent! Check your Worker terminal.")
