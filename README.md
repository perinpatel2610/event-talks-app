# BigQuery Release Notes Dashboard & X Post Builder

A modern, high-performance web application designed to track Google Cloud BigQuery release notes and instantly build optimized social media updates for X (formerly Twitter).

Built using a **Python Flask** backend and a premium, responsive **Vanilla HTML, CSS, and JavaScript** frontend following glassmorphism design principles.

---

## 🚀 Key Features

* **Daily Feed Splitting**: Google's release notes feed groups multiple changes under a single day. This application parses and breaks down entries into granular items by category (*Feature*, *Change*, *Deprecation*, or *General*).
* **Caching & Performance**: Minimizes feed requests and loads instantly using a local file cache (`notes_cache.json`) that expires after 1 hour (clicking **Refresh** bypasses this cache).
* **Advanced Search & Filtering**: Locate updates using instant search keywords or filter by category badges dynamically.
* **X/Twitter Post Builder**:
  * Select any release note to open the post builder modal.
  * Auto-translates HTML code snippets and bulleted lists into clean social text.
  * Choose from 4 style templates (📝 Summary, 🔥 Dev Hype, 💡 TL;DR, and 💼 Professional).
  * Real-time character counter (max 280) with a dynamic progress bar (turns Red when over limit).
  * One-click copying and native integration with the X web intent API.

---

## 🛠️ Tech Stack

* **Backend**: Python, Flask, BeautifulSoup4
* **Frontend**: HTML5, Vanilla CSS3 (Custom Grid/Variables), Vanilla JavaScript (ES6)
* **Fonts**: Outfit, Inter, JetBrains Mono (via Google Fonts)

---

## 📁 Project Structure

```text
bigquery-release-notes-app/
│
├── static/
│   ├── css/
│   │   └── styles.css      # Custom glassmorphic styling
│   └── js/
│       └── main.js        # Main frontend controller & composer logic
│
├── templates/
│   └── index.html         # Application dashboard shell
│
├── app.py                 # Flask server, RSS parsing, and cacher
├── .gitignore             # Git ignore patterns
└── README.md              # Project documentation
```

---

## 🏁 Getting Started

### 1. Prerequisites
Ensure you have Python 3.8+ installed on your system.

### 2. Install Dependencies
Run the following command in your terminal:
```bash
pip install Flask requests beautifulsoup4
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 4. Open Application
Navigate to the following address in your web browser:
🌐 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
