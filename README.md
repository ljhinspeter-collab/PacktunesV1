# 🎵 PackTunes

**PackTunes** is a music trading card game and digital music collection app. Open booster packs, collect rare songs and artists, trade with friends, level up your vinyl albums, and battle rival record labels!

---

## ✨ Features

- 📦 **Pack Opening**: Open Genre packs (Pop, Hip-Hop, Indie, Rock, K-Pop, R&B) and Mystery packs with full 30-second audio previews, animations, and sound effects.
- 💿 **Vinyl Collection**: Inspect vinyl records, filter by rarity (Common, Uncommon, Rare, Epic, Legendary, Mythic), and track artist mastery.
- 🔄 **Real-Time Trade Hub**: Create trade offers, browse the global marketplace, review incoming offers with live counters and trade history.
- ⚔️ **Label Battles & Raids**: Build decks of your top collected tracks to battle boss record labels and earn bonus coins.
- 👤 **Guest & Cloud Accounts**: Play instantly in Guest Mode (zero setup required) or log in with cloud sync.
- 🌐 **Deploy Anywhere**: Works seamlessly on Vercel, Netlify, Cloud Run, GitHub Pages, or Docker.

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/packtunes.git
cd packtunes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production
```bash
npm run build
```

---

## ⚡ Free 1-Click Deployment (Zero Credit Card Required)

### Deploy to Vercel (Recommended)
1. Push this project to your GitHub account (see instructions below).
2. Go to [vercel.com](https://vercel.com) and sign up / log in with your GitHub account.
3. Click **"Add New Project"** and select your `packtunes` repository.
4. Keep the default settings (Framework: Vite, Build command: `npm run build`, Output directory: `dist`).
5. Click **"Deploy"**. Within 60 seconds, you'll receive a live public URL (e.g. `https://packtunes.vercel.app`) that you and your friends can play on from any phone, tablet, or PC!

### Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) and sign up with GitHub.
2. Click **"Add new site"** > **"Import an existing project"** > **"GitHub"**.
3. Select `packtunes`.
4. The included `netlify.toml` automatically handles build and SPA redirects.
5. Click **"Deploy site"**!

---

## 🛠️ Pushing to GitHub

1. Create a new repository on [GitHub](https://github.com/new) named `packtunes`. Leave it empty (do NOT check "Add a README" or ".gitignore").
2. Run the following commands in your terminal:

```bash
git init
git add .
git commit -m "Initial commit - PackTunes full release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/packtunes.git
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your actual GitHub username)*

---

## 🎧 Technologies Used

- **React 19** + **TypeScript**
- **Vite** for ultra-fast bundling
- **Tailwind CSS v4** for responsive UI
- **Firebase Firestore & Auth** for real-time cloud data
- **Deezer Music API** for song previews and album artwork
- **Canvas Confetti & Motion** for pack opening animations
