# 🏏 IPL Cricket Analytics Dashboard

A modern, full-stack IPL (Indian Premier League) Analytics web application powered by a **Python Flask REST API** and a **Tailwind CSS + Chart.js** frontend.

![IPL Analytics](https://img.shields.io/badge/IPL-Analytics-blue?style=for-the-badge&logo=python)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## ✨ Features

- **🏏 Batter Analysis**: Total runs, balls faced, strike rate, average, highest score, boundary counts (4s/6s), and **50s / 100s** counter. Interactive season-by-season run chart.
- **⚡ Bowler Analysis**: Wickets, balls bowled, economy rate, bowling average, best bowling figures, and **5-Wicket Hauls (Fifers)** counter. Interactive season-by-season wicket chart.
- **🛡️ Team Analysis**: Total matches, wins, losses, win percentage, total franchise runs & wickets, average runs per match, and yearly performance table.
- **📅 Season Analysis**: Orange Cap winner, Purple Cap winner, Highest Individual Score, Highest & Lowest Team Scores (rain-adjusted criteria), and complete Team Standings Leaderboard. Supports dynamic selection of all IPL seasons (up to 2026).
- **📍 Venue Analysis**: Stadium match counts, average pitch score, highest & lowest team totals, and Batting 1st vs Chasing win ratio doughnut chart.
- **⚔️ Player Comparison**: Head-to-head batting and bowling comparison between any two players with 50s/100s and 5-Wicket Hauls.
- **🔍 Instant Live Autocomplete**: Real-time search suggestions for batters, bowlers, teams, and venues as you type.
- **🌙 Light / Dark Mode**: Seamless theme toggle with local storage persistence.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Pandas, Flask, Flask-CORS, RapidFuzz, NumPy
- **Frontend**: HTML5, JavaScript (ES6+), Tailwind CSS (via CDN), Chart.js, Lucide Icons

---

## 🚀 Getting Started

### Prerequisites

Ensure you have Python 3.9+ installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR-USERNAME/ipl-analytics-dashboard.git
cd ipl-analytics-dashboard
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Web Server
```bash
python server.py
```

### 4. Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 📡 REST API Endpoints

| Endpoint | Method | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `/api/batter` | `GET` | Get batter statistics | `name` (string), `exact` (optional) |
| `/api/bowler` | `GET` | Get bowler statistics | `name` (string), `exact` (optional) |
| `/api/team` | `GET` | Get team performance history | `team` (string/alias e.g. `rcb`, `csk`) |
| `/api/season` | `GET` | Get season overview & standings | `year` (int e.g. `2024`) |
| `/api/seasons` | `GET` | List all available IPL season years | None |
| `/api/venue` | `GET` | Get venue pitch trends & win stats | `name` (string) |
| `/api/compare` | `GET` | Head-to-head comparison of 2 players | `p1` (string), `p2` (string) |
| `/api/suggest` | `GET` | Live autocomplete suggestions | `q` (string), `type` (`batter`/`bowler`/`team`/`venue`) |

---

## 📂 Project Structure

```
ipl-analytics-dashboard/
│
├── project.py          # Backend data processing & API calculation logic
├── server.py           # Flask REST API server & static file host
├── index.html          # Responsive single-page dashboard UI (Tailwind CSS)
├── app.js              # Frontend API client, Chart.js & state management
├── IPL.csv             # Complete ball-by-ball IPL dataset (2008–2026)
├── requirements.txt    # Python package dependencies
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

---

## 📄 License
This project is open-source and available under the MIT License.
