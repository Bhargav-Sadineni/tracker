# Tracker 🎯📊💳📝

An all-in-one personal productivity system combining:
1. **Habits Matrix**: Daily positive routines & negative limits, custom metrics (checkbox, duration, counts, time of day, sleep/wake), historical heatmap, and measurable performance bar charts.
2. **Targets & Deadlines**: Goal countdowns, strict time-remaining ordering, and reminders (e.g., Online Assessments / OAs, Exams, EMI payments).
3. **Monthly Expenditure**: Comprehensive financial management in Indian Rupees (`₹`), calendar spend matrix showing total spend on each day, and multi-horizon comparisons (1M, 3M, 1Y).
4. **Daily Log & Journal**: A dedicated daily diary where you write what you accomplished, track mood and 5-star productivity rating, record key wins, tag focus areas, and 1-click import completed habits and expenses for that day.
5. **Mobile First (iPhone 17 & Android Optimized)**: Clean mobile layout with a floating 4-option bottom dock (`Habits`, `Targets`, `Expenditure`, `Daily Log`) and responsive desktop navigation.

---

## 🚀 Free Deployment Guide (100% Free)

You can deploy both the backend and frontend for **free** with automatic HTTPS and global CDN.

### Step 1: Free MongoDB Database (MongoDB Atlas)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a free shared cluster (**M0 Free**).
3. Under **Database Access**, create a user (e.g. `admin`) and set a password.
4. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Click **Connect** -> **Connect your application (Drivers)**, and copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/activity-tracker?retryWrites=true&w=majority
   ```

---

### Step 2: Deploy Backend for Free (Render / Railway)

#### Option A: Render.com (Recommended Free Backend)
1. Sign up for free at [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`tracker`).
4. Configure the service:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `MONGO_URI`: *Your MongoDB connection string from Step 1*
6. Click **Deploy Web Service**.
7. Once deployed, copy your service URL (e.g. `https://tracker-backend.onrender.com`).

---

### Step 3: Deploy Frontend for Free (Vercel / Netlify)

#### Option A: Vercel (Recommended Free Frontend)
1. Sign up for free at [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`tracker`).
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: *Your Render backend URL from Step 2 (e.g. `https://tracker-backend.onrender.com`)*
6. Click **Deploy**.
7. Your app is live with free global CDN and automatic SSL!

---

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas URI or local MongoDB instance

### 1. Setup Backend
```bash
cd server
npm install
# Create .env from .env.example
cp .env.example .env
# Start development server on port 5000
npm run dev
```

### 2. Setup Frontend
```bash
cd client
npm install
# Start Vite development server on port 5173
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB (Atlas)
- **Currency**: Indian Rupee (`₹`)
