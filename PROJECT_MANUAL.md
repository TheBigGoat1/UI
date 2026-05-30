# MRKT Edge - Institutional Trading Dashboard

**Version:** 1.0.0  
**Status:** Production Ready  
**Tech Stack:** React 18, TailwindCSS, Vite, Nginx, Docker

---

## Table of Contents
1. [Installation & Setup](#1-installation--setup)
2. [Deployment Guide](#2-deployment-guide)
3. [User Manual](#3-user-manual)
4. [API Usage & Integration](#4-api-usage--integration)
5. [Maintenance & Troubleshooting](#5-maintenance--troubleshooting)

---

## 1. Installation & Setup

### Prerequisites
- Node.js v18+
- npm v9+

### Local Development
Follow these steps to run the dashboard on your local machine.

1.  **Clone the Repository**
    ```bash
    git clone <https://github.com/prevyne/UI-Trading-prevyne-fork.git>
    cd frontend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the `frontend` root:
    ```env
    VITE_API_URL=[https://api.tommlyjumah.dev/trading-app/api/v1](https://api.tommlyjumah.dev/trading-app/api/v1)
    ```

4.  **Start Dev Server**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

---

## 2. Deployment Guide

The application is fully containerized using Docker and Nginx.

### Docker Deployment
1.  **Build & Run**
    ```bash
    docker-compose up --build -d
    ```
    The app will be available at `http://localhost:8080`.

### AWS/Cloud Deployment
1.  **Push to Registry:** Push the built image to AWS ECR or Docker Hub.
2.  **Deploy:** Pull the image on your EC2 instance or ECS cluster.
3.  **SSL/TLS:** It is recommended to put this container behind a load balancer (AWS ALB) or reverse proxy (Nginx/Traefik) that handles SSL termination (`https://`).

### Navigation Structure
- **Landing Page:** `http://localhost:5173/`
  - Public facing marketing site.
- **Dashboard:** `http://localhost:5173/app`
  - Main application interface.
  - **Note:** If you navigate directly to `/app`, you will bypass the landing page.

---

## 3. User Manual

### Dashboard Command Center
- **Risk Gauge:** Monitors the global "Risk-On/Risk-Off" sentiment.
    - **Green:** Safe to trade high-beta assets (Crypto, Tech Stocks).
    - **Red:** Caution advised. Stick to safe havens (Gold, USD).
- **Active Tickers:** Real-time price updates for major pairs.

### Trade Ideas Feed
- **Confidence Score:** AI assigns a 0-100% score based on technical confluence.
- **Ticket View:** Click "Details" to open the trade ticket.
    - **Chart:** Interactive candlestick chart with auto-plotted Support/Resistance.
    - **Calculator:** Enter your account balance and risk % (e.g., 1%) to get the exact Lot Size to trade.

### Economic Calendar
- Filters events by **Country** and **Impact**.
- **Surprise Factor:** Green text indicates data beat expectations (Bullish), Red indicates a miss (Bearish).

### Sentiment Scanner
- **Heatmap:** Visualizes the entire market. Green = Bullish News Flow, Red = Bearish.
- **News Feed:** Select an asset to read AI-summarized articles and their specific sentiment scores.

### Admin & Settings
- **Modules:** Toggle specific AI analysis features (e.g., disable "Elliott Wave" if it's adding too much noise).
- **Risk Parameters:** Set global defaults for the position size calculator.

### Landing Page (Public)
The entry point of the application designed to convert visitors into users.
- **Data Partners:** Visual confirmation of institutional data sources.
- **Feature Showcase:** Interactive preview of the core modules (Dashboard, News, Calendar).
- **Newsletter:** Email capture form for weekly macro analysis (currently logs to console).

### Dashboard Command Center (`/app`)
*Accessible via "Get Started" or "Login" buttons.*

- **Sidebar Navigation:**
  - **Overview:** Real-time tickers and Risk Gauge.
  - **Trade Ideas:** AI-generated setup cards.
  - **News & Sentiment:** **[NEW]** Defaults to EURUSD. Select any asset in the top bar to view specific AI summaries and articles.
  - **Calendar:** **[NEW]** Filter by Region (US, EU, UK) and Impact (High/Med/Low).
  - **Backtest:** Historical strategy simulation.

### Navigation & Layout

**Desktop View:**
- The **Sidebar** is always visible on the left, providing quick access to all modules.
- Hover over the user profile to sign out.

**Mobile View:**
- **Menu Access:** The Sidebar is hidden by default to maximize screen space. Tap the **Hamburger Icon (☰)** in the top-left corner to open the navigation drawer.
- **Closing the Menu:** The menu closes automatically when you:
  - Select a page (e.g., "Trade Ideas").
  - Tap the "X" close button.
  - Tap the dark backdrop outside the menu.

---

## 4. API Usage & Integration

The frontend connects to the `mrkt-edge-backend` via standard REST endpoints.

**Base URL:** `https://api.tommlyjumah.dev/trading-app/api/v1`

| Feature | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Market Data** | `/market/prices` | GET | Live asset prices |
| **Analysis** | `/analysis/risk-environment` | GET | VIX & Macro Regime |
| **Trade Ideas** | `/ideas?minConfidence=70` | GET | Filtered trade setups |
| **Backtest** | `/ideas/backtest` | POST | Run historical simulation |
| **Calendar** | `/calendar/events` | GET | Macro economic events |
| **Admin** | `/ideas/modules/status` | GET | Check active AI modules |

---

## 5. Maintenance & Troubleshooting

### Updating the API URL
If the backend moves to a new domain, update the `VITE_API_URL` variable in:
1.  `.env` (for local dev)
2.  `docker-compose.yml` (for production)

### Common Issues
* **"Network Error" or White Screen:**
    * Check if the API URL is reachable.
    * Ensure CORS is enabled on the backend server.
* **Chart not loading:**
    * Ensure `lightweight-charts` is installed.
    * Verify the API is returning valid OHLC data structure.
* **Dropdown text invisible:**
    * This is a Dark Mode issue. Ensure `<select>` elements have `class="bg-surface"` applied.

### Managing Interface Screenshots
The Landing Page displays three key interface previews. To update these images:

1.  **Capture:** Take high-resolution screenshots of the Calendar, Dashboard, and News pages.
2.  **Location:** Save them to the `src/static/` directory (create this folder if it doesn't exist).
3.  **Naming:** Ensure files are named exactly:
    - `calendar.png`
    - `dashboard.png`
    - `sentiment.png`
4.  **Rebuild:** The Vite bundler will automatically pick up these changes on the next hot-reload or build.

*Note: If an image is missing, the UI will gracefully fallback to a placeholder box.*

---
