---

## Frontend Dashboard (Milestone 3: V2.0 Saas Release)

**Institutional Trading Interface built with React + TailwindCSS + Vite + Supabase**

A high-performance "Bloomberg-lite" dashboard designed to visualize AI-driven institutional-grade analysis. V2.0 transitions the application from a functional prototype into a polished, monetized SaaS platform featuring secure authentication, onboarding funnels, and deep psychological trade analytics.

### Key Features Implemented

- **Institutional Design System**
  - **Typography:** `Bebas Neue` (Headlines), `DM Sans` (Body), and `JetBrains Mono` (Data/Pricing) enforced globally.
  - **Color Palette:** Strict dark-theme-only root (`#080810`) with institutional accents (Gold for Premium/Bullish, Purple for AI/Bearish, Emerald/Red for P&L).
  - **Micro-Interactions:** Custom pulse-loading skeletons, fade-in animations, and custom scrollbars for extreme UI polish.

- **High-Converting Onboarding Funnel**
  - **Routing Gatekeeper:** Users are trapped in the setup flow until a `setup_complete` flag is verified in their database profile.
  - **5-Step Wizard:** Captures Trading Experience, Preferred Markets, Base Currency, Initial Watchlist, and Stripe Subscription Tier (Pro vs. Elite).
  - **Analytics Tracking:** Funnel events fire on every step to track drop-off and conversion rates.
  
- **Advanced Trade Journal (Retention Engine)**
  - A Tradezella-tier 4-tab analytics engine: **Overview**, **Journal**, **Analytics**, and **Calendar**.
  - **Consolidated UI:** Live portfolio equity tracking merged into the Journal Overview to reduce tab fatigue.
  - **Psychology Tracking:** Log emotional states (FOMO, Anxious, Calm) and specific mistake tags (Moved SL, Overtraded, Traded during news).
  - **Sync & Import Options:** UI menus prepped for manual CSV uploads, MT4/MT5 EA webhooks, IBKR Flex API, and Binance integration.

- **Command Center Dashboard**
  - Real-time "Risk-On/Risk-Off" regime gauge (driven by VIX & Yields).
  - Live price tickers for Major FX pairs, Gold, and Crypto.
  - "Top 3" active high-confidence opportunities at a glance.

- **AI Trade Idea Feed & Calculator**
  - Live feed of trade setups sorted by AI Confidence Score.
  - **Deep Dive Modals:** Interactive charts (`lightweight-charts`) with technical overlays.
  - **Position Calculator:** Integrated risk calculator in every trade ticket that auto-sizes lots based on your account balance and risk % (e.g., 1%).

- **Sentiment Intelligence Engine**
  - **Global Heatmap:** Visual overview of bullish vs. bearish market breadth.
  - **Asset Scanner:** Drill down into specific pairs to read AI-summarized news articles and their impact scores.

- **Economic Calendar**
  - Real-time event tracking with "Impact" filtering (High/Med/Low).
  - Visual "Surprise" indicators (Green/Red) when Actual data beats/misses Forecasts.

- **System Configuration**
  - **Admin Panel:** Toggle specific AI technical modules (e.g., enable/disable "Elliott Wave") in real-time.
  - **Risk Management:** Define global risk parameters to control the calculator defaults.

  ### Public Landing Page & Routing
- **Entry Point (`/`):** A high-converting landing page featuring:
  - **Sponsors Marquee:** Infinite loop of trusted data partners (Reuters, LSEG, etc.).
  - **Interface Showcase:** 1-2-1 grid layout displaying the Dashboard, Calendar, and Sentiment modules.
  - **FAQ & Contact:** Interactive accordion for common questions and a direct support contact card.
- **Application Route (`/app`):** The main trading dashboard is now isolated under the `/app` route to separate public marketing from private application logic.
- **Static Auth Flow:** Currently configured for seamless testing; clicking "Login" or "Get Started" routes directly to the dashboard without a backend handshake.

### Dynamic Mock Data (Testing Mode)
The system currently uses a **Dynamic Mock Service** (`src/services/api.js`) to simulate a live environment without backend dependencies:
- **Market Data:** Tickers fluctuate ("wiggle") in real-time.
- **Sentiment Engine:** Returns specific news and scores based on the selected asset (e.g., clicking BTC shows Crypto news).
- **Calendar:** Filters events dynamically by Country and Impact.

### Mobile-First Architecture
- **Mobile Bottom Navigation:** The traditional desktop sidebar completely transforms into a native-app style bottom navigation bar on mobile viewports.
- **Frosted-Glass Overlay:** Secondary routes are tucked into a sleek fullscreen mobile menu.
- **Collapsible Desktop Sidebar:** "Chart Mode" toggle allows power users to collapse the left navigation panel into an icon-only strip, maximizing screen real estate.

### API & Security Integration
- **Supabase Auth:** Deprecated legacy `localStorage` in favor of secure, dynamic Supabase JWT session management.
- **Axios Interceptors:** Global API client automatically retrieves and attaches the freshest OAuth tokens before every backend request.
- **Zero-State Handling:** All components feature robust loading states and zero-data fallbacks (no generic spinners or crashed UI states).

#### Assets & Media
- **Screenshot Integration:** The Landing Page dynamically imports images from `src/static/` for the interface showcase.
- **Hover Effects:** Implemented a "Zoom-on-Hover" effect for interface previews using CSS transitions and overflow masking.

### Frontend Tech Stack

- **Core:** React 18, Vite (Build Tool)
- **Styling:** TailwindCSS (Dark Mode optimized), Lucide React (Icons)
- **Visualization:** TradingView Lightweight Charts (Financial plotting)
- **State/API:** React Hooks, Custom Service Layer (Fetch Wrapper)
- **Architecture:** Feature-based folder structure (`features/`, `layouts/`, `services/`)
- **Backend/Auth:** Supabase Client

### Getting Started (Frontend)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file and set your backend and Supabase credentials:
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
echo "VITE_SUPABASE_URL=your_supabase_url" >> .env
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

# Start Development Server
npm run dev
```

### Blueprint Flow Coverage (Implemented)

- Auth flow with route guards and onboarding gate
- Dashboard shell and route modules
- Exchange connections for Binance, Bybit, and OKX (`/dashboard/connections`)
- Sync ingestion into journal storage and analytics refresh
- Journal data table wired to synced trade records
- Notification and admin monitoring views (`/dashboard/admin-monitoring`)

### API Key Setup

See `API_KEYS_GUIDE.md` for official API key creation links, required credential fields, and safe permission settings.

### Data Sources + Database

- Provider map and free-tier setup: `DATA_SOURCES.md`
- Supabase production schema: `supabase/schema.sql`
