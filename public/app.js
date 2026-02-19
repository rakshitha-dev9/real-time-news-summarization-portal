const API_URL = "/api";
const AUTH_URL = "/api/auth";
const FALLBACKS = { "India": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?q=80&w=1000", "World": "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1000", "Business": "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1000", "Technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000", "Science": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000", "Sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000", "Default": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000" };
let allArticles = [], heroArticles = [], bookmarks = new Set(), currentCategory = 'All', currentSlide = 0, isSearching = false, token = localStorage.getItem('token');

// DARK MODE
const htmlEl = document.documentElement;
const darkIcon = document.getElementById('dark-icon');
if (localStorage.getItem('theme') === 'dark') { htmlEl.classList.add('dark'); if(darkIcon) darkIcon.className = "fa-solid fa-sun"; }
else { htmlEl.classList.remove('dark'); if(darkIcon) darkIcon.className = "fa-solid fa-moon"; }
function toggleDarkMode() { if (htmlEl.classList.contains('dark')) { htmlEl.classList.remove('dark'); localStorage.setItem('theme', 'light'); if(darkIcon) darkIcon.className = "fa-solid fa-moon"; } else { htmlEl.classList.add('dark'); localStorage.setItem('theme', 'dark'); if(darkIcon) darkIcon.className = "fa-solid fa-sun"; } }

// --- FASTER INTRO ---
function playIntro() {
    const splashText = document.getElementById('splash-text');
    const targetLetter = document.getElementById('zoom-target-letter');
    const splash = document.getElementById('splash-screen');
    const auth = document.getElementById('auth-view');

    if(!splashText || !targetLetter) { if(splash) splash.classList.add('hidden'); if(auth) auth.classList.remove('hidden'); return; }

    const rect = targetLetter.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const moveX = (window.innerWidth / 2) - centerX;
    const moveY = (window.innerHeight / 2) - centerY;

    // Faster timing: 800ms wait
    setTimeout(() => {
        splashText.classList.remove('animate-appear');
        splashText.style.transition = "transform 1.0s cubic-bezier(0.7, 0, 0.3, 1)";
        splashText.style.transform = `translate(${moveX}px, ${moveY}px) scale(3000)`;
    }, 800);

    // Total 2s wait
    setTimeout(() => {
        splash.classList.add('hidden');
        auth.classList.remove('hidden');
        auth.classList.add('animate-land');
    }, 2000);
}

// ... (Rest of code: checkAuth, handleLogin, etc. remains exactly the same as before) ...
function checkAuth() {
    if (token) {
        document.body.classList.remove('overflow-hidden'); document.body.classList.add('overflow-y-auto');
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        
        // --- AVATAR LOGIC ---
        const username = localStorage.getItem('username') || 'User';
        document.getElementById('display-username').innerText = username;
        const avatar = document.getElementById('user-avatar');
        if(avatar) {
            avatar.innerText = username.charAt(0).toUpperCase();
            avatar.className = `w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md transition transform group-hover:scale-110 ${getAvatarGradient(username)}`;
        }

        loadNews(); loadBookmarks(); setInterval(loadNews, 4000);
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('dashboard-view').classList.add('hidden');
        setTimeout(playIntro, 100);
    }
}
// Gradient Helper
function getAvatarGradient(name) { const gradients = ["bg-gradient-to-tr from-blue-500 to-cyan-500", "bg-gradient-to-tr from-purple-500 to-pink-500", "bg-gradient-to-tr from-emerald-500 to-teal-500", "bg-gradient-to-tr from-orange-500 to-red-500"]; let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash); return gradients[Math.abs(hash) % gradients.length]; }

function toggleAuth() { document.getElementById('login-form').classList.toggle('hidden'); document.getElementById('register-form').classList.toggle('hidden'); }
async function handleLogin(e) { e.preventDefault(); const u = document.getElementById('login-user').value; const p = document.getElementById('login-pass').value; try { const res = await fetch(`${AUTH_URL}/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})}); const d = await res.json(); if(res.ok){localStorage.setItem('token',d.token);localStorage.setItem('username',d.username);token=d.token;location.reload();}else{showError('login', d.error || "Invalid Credentials");} } catch(e){showError('login', "Server Error");} }
async function handleRegister(e) { e.preventDefault(); const u = document.getElementById('reg-user').value; const p = document.getElementById('reg-pass').value; try { const res = await fetch(`${AUTH_URL}/register`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})}); const d = await res.json(); if(res.ok){ toggleAuth(); showSuccess(); } else { showError('register', d.error || "Failed"); } } catch(e){ showError('register', "Server Error"); } }
function logout() { localStorage.clear(); location.reload(); }
function showError(formType, message) { const errorBox = document.getElementById(`${formType}-error`); const errorText = document.getElementById(`${formType}-error-text`); const card = document.getElementById('auth-card'); if(errorText) errorText.innerText = message; if(errorBox) errorBox.classList.remove('hidden'); if(card) { card.classList.remove('animate-shake'); void card.offsetWidth; card.classList.add('animate-shake'); } }
function showSuccess() { const successBox = document.getElementById('login-success'); if(successBox) successBox.classList.remove('hidden'); }
function clearErrors() { document.getElementById('login-error').classList.add('hidden'); document.getElementById('register-error').classList.add('hidden'); document.getElementById('login-success').classList.add('hidden'); }
function openProfile() { const username = localStorage.getItem('username') || 'User'; document.getElementById('profile-name').innerText = username; const gradient = getAvatarGradient(username); document.getElementById('profile-header').className = `p-8 text-center relative text-white ${gradient}`; document.getElementById('profile-avatar-big').innerText = username.charAt(0).toUpperCase(); document.getElementById('profile-count').innerText = bookmarks.size; const list = document.getElementById('profile-list'); if (bookmarks.size === 0) { list.innerHTML = '<p class="text-sm text-slate-500 italic text-center">No saved articles yet.</p>'; } else { const bookmarkedArts = allArticles.filter(a => bookmarks.has(a._id)); list.innerHTML = bookmarkedArts.map(art => `<div onclick="openModal('${art._id}'); closeProfile();" class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition"><img src="${getSmartImage(art)}" class="w-10 h-10 rounded object-cover"><div class="flex-1 min-w-0"><p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${art.title}</p><p class="text-[10px] text-slate-400">${art.source}</p></div></div>`).join(''); } document.getElementById('profile-modal').classList.remove('hidden'); }
function closeProfile() { document.getElementById('profile-modal').classList.add('hidden'); }
async function loadNews() { try { const res = await fetch(`${API_URL}/articles`); const data = await res.json(); const seen = new Set(); allArticles = data.filter(item => { const d = seen.has(item.url); seen.add(item.url); return !d; }); calculateStats(); if (isSearching) handleSearch(); else render(); } catch (err) { console.log("Polling..."); } }
async function loadBookmarks() { try { const res = await fetch('/api/user/bookmarks', { headers: { 'Authorization': `Bearer ${token}` } }); const data = await res.json(); bookmarks = new Set(data.map(b => b._id)); render(); } catch (e) { console.log("Bookmark err"); } }
async function toggleBookmark(e, id) { e.stopPropagation(); try { const res = await fetch(`/api/user/bookmark/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); if(res.ok) { if(bookmarks.has(id)) bookmarks.delete(id); else bookmarks.add(id); render(); } } catch(e) { alert("Error saving"); } }
function calculateStats() { if(allArticles.length === 0) return; let pos = 0, neg = 0, neu = 0; allArticles.forEach(a => { if(a.sentiment === 'Positive') pos++; else if(a.sentiment === 'Negative') neg++; else neu++; }); const total = allArticles.length; updateBar('pos', pos, total); updateBar('neg', neg, total); updateBar('neu', neu, total); }
function updateBar(type, count, total) { const el = document.getElementById(`stat-${type}`); const bar = document.getElementById(`bar-${type}`); if (el && bar) { const pct = Math.round((count / total) * 100); el.innerText = `${pct}%`; bar.style.width = `${pct}%`; } }
function handleSearch() { const query = document.getElementById('searchInput').value.toLowerCase(); if (query.length > 0) { isSearching = true; document.getElementById('backBtn').classList.remove('hidden'); render(query); } else { clearSearch(); } }
function clearSearch() { isSearching = false; document.getElementById('searchInput').value = ''; document.getElementById('backBtn').classList.add('hidden'); render(); }
function setCategory(cat) { currentCategory = cat; document.getElementById('page-title').innerText = cat === 'Bookmarks' ? "My Saved Stories" : (cat === 'All' ? "Top Stories" : `${cat} News`); render(); }
function render(searchQuery = '') { if(allArticles.length === 0) return; document.getElementById('loader').classList.add('hidden'); let data = []; if (searchQuery) { data = allArticles.filter(a => a.title.toLowerCase().includes(searchQuery)); document.getElementById('carousel-container').classList.add('hidden'); } else if (currentCategory === 'Bookmarks') { data = allArticles.filter(a => bookmarks.has(a._id)); document.getElementById('carousel-container').classList.add('hidden'); } else if (currentCategory === 'All') { data = allArticles; document.getElementById('carousel-container').classList.remove('hidden'); const sources = new Set(); heroArticles = []; allArticles.forEach(a => { if(!sources.has(a.source) && heroArticles.length < 5) { sources.add(a.source); heroArticles.push(a); } }); renderHero(); } else { data = allArticles.filter(a => a.category === currentCategory); document.getElementById('carousel-container').classList.add('hidden'); } const grid = document.getElementById('news-grid'); if(!grid) return; if(data.length === 0) { grid.innerHTML = `<div class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 opacity-60 dark:text-slate-400">No stories found.</div>`; return; } grid.innerHTML = data.map((art) => `<div onclick="openModal('${art._id}')" class="bg-white dark:bg-darkcard rounded-xl shadow-sm border border-slate-100 dark:border-darkborder overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"><div class="h-48 overflow-hidden relative"><img src="${getSmartImage(art)}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110"><button onclick="toggleBookmark(event, '${art._id}')" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow flex items-center justify-center transition hover:scale-110 ${bookmarks.has(art._id) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-500 hover:text-amber-500'}"><i class="fa-solid fa-bookmark"></i></button></div><div class="p-5 flex flex-col flex-1"><div class="flex justify-between items-start mb-3"><span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">${art.category || 'News'}</span><span class="text-[10px] font-medium text-slate-400">${getRelativeTime(art.created_at)}</span></div><h3 class="font-bold text-slate-800 dark:text-white mb-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">${art.title}</h3><div class="mt-auto pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center gap-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSentimentColor(art.sentiment)}">${art.sentiment}</span></div></div></div>`).join(''); }
function getSmartImage(art) { return art.image || FALLBACKS[art.category] || FALLBACKS["Default"]; }
function getRelativeTime(dateString) { const diff = Math.floor((new Date() - new Date(dateString)) / 1000); if (diff < 60) return 'Just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; return `${Math.floor(diff / 86400)}d ago`; }
function getSentimentColor(s) { if(s === 'Positive') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'; if(s === 'Negative') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'; return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'; }
function renderHero() { if(heroArticles.length === 0) return; const art = heroArticles[currentSlide]; const hero = document.getElementById('hero-section'); if(hero) hero.innerHTML = `<div class="absolute inset-0 fade-enter"><img src="${getSmartImage(art)}" class="w-full h-full object-cover"><div class="absolute inset-0 image-overlay"></div><div class="absolute bottom-0 left-0 p-10 md:p-14 w-full md:w-3/4 text-white z-10"><div class="flex gap-2 mb-4 opacity-90"><span class="bg-white/20 backdrop-blur text-[10px] font-bold px-3 py-1 rounded-full uppercase">${art.category}</span><span class="bg-white/20 backdrop-blur text-[10px] font-bold px-3 py-1 rounded-full uppercase">${art.source}</span></div><h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg line-clamp-2">${art.title}</h1><p class="text-gray-200 text-lg line-clamp-2 mb-6 font-medium">${art.summary}</p></div></div>`; }
function openHeroModal() { openModal(heroArticles[currentSlide]._id); }
function openModal(id) { 
    const art = allArticles.find(a => a._id === id); if(!art) return;
    document.getElementById('modal-title').innerText = art.title; document.getElementById('modal-summary').innerText = art.summary; document.getElementById('modal-source').innerText = art.source; document.getElementById('modal-time').innerText = "• " + getRelativeTime(art.created_at); document.getElementById('modal-link').href = art.url; document.getElementById('modal-img').src = getSmartImage(art);
    const box = document.getElementById('modal-sentiment-box'); const bar = document.getElementById('modal-sentiment-bar'); const text = document.getElementById('modal-sentiment-text');
    box.className = "mb-8 p-4 rounded-xl border transition-colors duration-500";
    if(art.sentiment === 'Positive') { box.classList.add('bg-green-50','border-green-100','dark:bg-green-900/20','dark:border-green-800'); text.innerText = "Positive News"; text.className = "text-xs font-bold uppercase text-green-700 dark:text-green-400"; bar.className = "h-full w-full bg-green-500"; } 
    else if (art.sentiment === 'Negative') { box.classList.add('bg-red-50','border-red-100','dark:bg-red-900/20','dark:border-red-800'); text.innerText = "Critical"; text.className = "text-xs font-bold uppercase text-red-700 dark:text-red-400"; bar.className = "h-full w-full bg-red-500"; } 
    else { box.classList.add('bg-slate-100','border-slate-200','dark:bg-slate-800','dark:border-slate-700'); text.innerText = "Neutral"; text.className = "text-xs font-bold uppercase text-slate-600 dark:text-slate-400"; bar.className = "h-full w-full bg-slate-400"; }
    document.getElementById('article-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
}
function closeModal() { document.getElementById('article-modal').classList.add('hidden'); document.body.style.overflow = 'auto'; }

checkAuth();
setInterval(() => { if(!isSearching && currentCategory === 'All') { currentSlide = (currentSlide + 1) % heroArticles.length; renderHero(); }}, 5000);