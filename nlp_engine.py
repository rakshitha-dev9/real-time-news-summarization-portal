import nltk
from newspaper import Article, Config
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Initialize VADER (The better sentiment tool)
analyzer = SentimentIntensityAnalyzer()

# Setup NLTK
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('punkt_tab')

# Browser Config
user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
config = Config()
config.browser_user_agent = user_agent
config.request_timeout = 10

def process_news_url(url):
    print(f"\n--- Processing: {url} ---")
    
    try:
        article = Article(url, config=config)
        article.download()
        article.parse()
        
        image_url = article.top_image 
        
        try:
            article.nlp() 
            summary_text = article.summary
        except Exception:
            summary_text = article.text[:500] + "..."

        # --- VADER ANALYSIS (BETTER THAN TEXTBLOB) ---
        # compound score ranges from -1 (Extremely Negative) to +1 (Extremely Positive)
        scores = analyzer.polarity_scores(summary_text)
        sentiment_score = scores['compound']
        
        # We set stricter thresholds for News
        sentiment_label = "Neutral"
        if sentiment_score >= 0.05:
            sentiment_label = "Positive"
        elif sentiment_score <= -0.05:
            sentiment_label = "Negative"

        return {
            "title": article.title,
            "summary": summary_text,
            "sentiment": sentiment_label,
            "score": sentiment_score,
            "image": image_url
        }

    except Exception as e:
        print(f"❌ Error processing: {e}")
        return None