const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = "newsai_secret_key_999"; 

// 1. Connect to DB
mongoose.connect('mongodb://127.0.0.1:27017/news_db')
    .then(() => console.log("✅ DB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }] 
});
const User = mongoose.model('User', UserSchema);

// 3. Article Schema
const ArticleSchema = new mongoose.Schema({
    url: String, title: String, summary: String, sentiment: String,
    score: Number, image: String, source: String, category: String,
    created_at: Date
}, { collection: 'articles' });
const Article = mongoose.model('Article', ArticleSchema);

// 4. RabbitMQ
let channel;
async function connectQueue() {
    try {
        const conn = await amqp.connect('amqp://guest:guest@localhost:5672');
        channel = await conn.createChannel();
        await channel.assertQueue('celery', { durable: true });
        console.log("✅ RabbitMQ Connected");
    } catch (e) { console.log("RabbitMQ Error (Is Docker running?)"); }
}
connectQueue();

// 5. Auth Middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if user exists
        if(await User.findOne({ username })) return res.status(400).json({ error: "Username already taken" });
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        
        res.status(201).json({ message: "User created" });
    } catch (e) { res.status(500).json({ error: "Server Error during registration" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        // Check user and password
        if (!user) return res.status(400).json({ error: "User not found" });
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: "Wrong password" });

        // Issue Token
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
        res.json({ token, username: user.username });
    } catch (e) { res.status(500).json({ error: "Server Error during login" }); }
});

app.post('/api/process', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send("URL required");
    const taskPayload = { id: new mongoose.Types.ObjectId().toString(), task: 'tasks.process_article', args: [url, "General", "User"], kwargs: {}, retries: 0 };
    if (channel) { channel.sendToQueue('celery', Buffer.from(JSON.stringify(taskPayload)), { contentType: 'application/json', contentEncoding: 'utf-8' }); res.json({ message: "Processing" }); }
    else { res.status(500).json({ error: "RabbitMQ down" }); }
});

app.get('/api/articles', async (req, res) => {
    try { const articles = await Article.find().sort({ created_at: -1 }).limit(100); res.json(articles); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/bookmarks', authenticateToken, async (req, res) => {
    try { const user = await User.findById(req.user.id).populate('bookmarks'); res.json(user.bookmarks); } 
    catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/user/bookmark/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const idx = user.bookmarks.indexOf(req.params.id);
        if (idx === -1) { user.bookmarks.push(req.params.id); } else { user.bookmarks.splice(idx, 1); }
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));