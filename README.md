# Finance Tracker 📈

A modern, real-time financial dashboard built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.  
It tracks live stock prices, market status, and mortgage rates using the Finnhub and API Ninjas APIs.

![Project Preview](https://via.placeholder.com/800x400?text=Finance+Tracker+Dashboard+Preview)

> ⚠️ Replace this placeholder image with a real screenshot after deployment.

---

## 🚀 Features

- 📊 Real-Time Stock Quotes (Price, Change, % Change)
- 🟢 Live Market Status (Open, Closed, Pre-Market, After-Hours)
- 📈 Custom Watchlist (Stocks & ETFs supported)
- 🏠 30-Year Fixed Mortgage Rate Tracker
- 🌙 Dark Mode Support
- ⚡ Server-side data fetching with caching (Next.js revalidation)

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **APIs:**
  - Finnhub (Stocks & Market Data)
  - API Ninjas (Mortgage Rates)
- **Deployment:** Vercel

---

## ⚡ Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/touchthesky-limitless/finance-tracker.git
cd finance-tracker
```

---

### 2️⃣ Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

---

### 3️⃣ Setup Environment Variables

Create a file named:

```
.env.local
```

Add your API keys:

```env
FINNHUB_API_KEY=your_finnhub_key_here
API_NINJAS_KEY=your_api_ninjas_key_here
```

---

### 4️⃣ Run the Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## ⚙️ Configuration
You can easily change the stocks displayed on the dashboard

### 🔹 Change the Hero Stock

Edit:

```
app/page.tsx
```

```ts
const HERO_SYMBOL = "MSFT";
```

Replace with:

```ts
const HERO_SYMBOL = "AAPL";
```

---

### 🔹 Update the Watchlist

Modify:

```ts
const WATCHLIST = [
  "MSFT",
  "NVDA",
  "TSLA",
  "META"
];
```

---

## 📁 Project Structure

```bash
├── app/
│   ├── layout.tsx           # Main layout (Navbar, Footer, ThemeProvider)
│   ├── page.tsx             # Dashboard (Hero + Watchlist)
│   └── globals.css          # Tailwind imports
├── components/
│   ├── FinancialCard.tsx    # Reusable stock card component
│   ├── MarketStatus.tsx     # Open/Closed indicator
│   ├── TrendIndicator.tsx   
│   ├── Navbar.tsx           # Top navigation
│   └── Footer.tsx           # Footer with links & disclaimer
├── lib/
│   ├── stock.ts             # Finnhub API fetcher logic
│   ├── mortgage.ts          # Mortgage rate logic
│   └── date.ts              # Timezone & market session helpers
├── public/
└── README.md
```

---

## 🚀 Deployment

Deploy easily using **Vercel**:

1. Push your project to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Add environment variables:
   - `FINNHUB_API_KEY`
   - `API_NINJAS_KEY`
4. Click **Deploy**.

The project will automatically redeploy on every push to the `main` branch.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Acknowledgments

- Market data provided by Finnhub
- Mortgage data provided by API Ninjas
- Built with Next.js 14

