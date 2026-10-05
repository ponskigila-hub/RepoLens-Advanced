# 🚀 Complete Setup and Run Guide

## Prerequisites

Before you start, make sure you have:
- **Python 3.8+** installed
- **Node.js 16+** and npm installed
- **Git** installed

## 📦 Step-by-Step Setup

### 1. Backend Setup

#### A. Navigate to Backend Directory
```bash
cd backend
```

#### B. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

#### C. Install Backend Dependencies
```bash
# Install main dependencies
pip install fastapi uvicorn python-dotenv requests

# Install ML dependencies
pip install -r requirements-ml.txt
```

This installs:
- pandas
- numpy
- scikit-learn
- xgboost (or falls back to RandomForest)
- joblib

#### D. Configure Environment Variables (Optional)
```bash
# Copy example env file
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux

# Edit .env and add your IBM Bob API key if you have one
# If not, the system will use mock analysis
```

#### E. Train ML Models (IMPORTANT!)
```bash
# This takes 2-5 minutes
python -m ml.train_models
```

**Expected Output:**
```
INFO:__main__:Starting model training...
INFO:ml.dataset_loader:Loading dataset from data\repositories.csv
INFO:ml.dataset_loader:Loaded 5000 repositories
INFO:ml.model_trainer:Training model for overall_quality_score...
...
Training completed successfully!
Models saved to backend/ml/models/
```

#### F. Start Backend Server
```bash
python main.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
ML service initialized successfully
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!** The backend is now running on http://localhost:8000

---

### 2. Frontend Setup

#### A. Open New Terminal
Open a **new terminal window** (keep backend running in the first one)

#### B. Navigate to Frontend Directory
```bash
cd frontend
```

#### C. Install Frontend Dependencies
```bash
npm install
```

This installs:
- Next.js
- React
- Tailwind CSS
- TypeScript
- Other dependencies

#### D. Start Frontend Development Server
```bash
npm run dev
```

**Expected Output:**
```
> frontend@0.1.0 dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

**Keep this terminal open too!** The frontend is now running on http://localhost:3000

---

## 🎯 Using the Application

### 1. Open Your Browser
Navigate to: **http://localhost:3000**

### 2. Enter a GitHub Repository URL
Examples to try:
- `https://github.com/vercel/next.js`
- `https://github.com/facebook/react`
- `https://github.com/microsoft/vscode`
- Any public GitHub repository!

### 3. Click "Analyze Repository"
The system will:
1. Clone the repository
2. Scan files and structure
3. Extract features
4. Generate ML scores
5. Get AI explanations
6. Display beautiful results!

### 4. View ML Scores
At the top of the results, you'll see:
- 🤖 **ML Quality Scores** card
- Overall Quality (0-100)
- Maintainability (0-100)
- Scalability (0-100)
- Architecture (0-100)
- Production Readiness (0-100)

---

## 🔧 Troubleshooting

### Backend Issues

#### "Module not found" errors
```bash
cd backend
pip install -r requirements-ml.txt
```

#### "ML models not found"
```bash
cd backend
python -m ml.train_models
```

#### "Port 8000 already in use"
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

#### "Dataset not found"
Make sure `data/repositories.csv` exists in the project root:
```bash
# From project root
ls data/repositories.csv    # Mac/Linux
dir data\repositories.csv    # Windows
```

### Frontend Issues

#### "Module not found" errors
```bash
cd frontend
rm -rf node_modules package-lock.json    # Mac/Linux
rmdir /s node_modules & del package-lock.json    # Windows
npm install
```

#### "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

#### Build errors
```bash
cd frontend
npm run build
```

---

## 📁 Project Structure

```
IBM Bob Hackaton/
├── backend/
│   ├── ml/                      # ML pipeline
│   │   ├── __init__.py
│   │   ├── dataset_loader.py
│   │   ├── feature_engineering.py
│   │   ├── label_generator.py
│   │   ├── model_trainer.py
│   │   ├── ml_service.py
│   │   ├── train_models.py
│   │   └── models/              # Trained models (created after training)
│   ├── services/                # Backend services
│   │   ├── analysis_service.py
│   │   ├── file_scanner.py
│   │   ├── prompt_builder.py
│   │   └── repo_cloner.py
│   ├── routes/                  # API routes
│   │   └── analyze.py
│   ├── main.py                  # Backend entry point
│   └── requirements-ml.txt      # ML dependencies
├── frontend/
│   ├── app/                     # Next.js app directory
│   │   ├── page.tsx            # Main page
│   │   ├── layout.tsx          # Layout
│   │   └── globals.css         # Global styles
│   ├── components/              # React components
│   │   ├── MLScoresCard.tsx    # ML scores display
│   │   ├── AnalysisCard.tsx    # Analysis results
│   │   ├── RepoInput.tsx       # Input form
│   │   └── ...
│   ├── types/                   # TypeScript types
│   │   └── analysis.ts
│   └── package.json
└── data/
    └── repositories.csv         # Kaggle dataset
```

---

## 🎨 Features

### ML Scoring System
- ✅ Trained on 5,000+ GitHub repositories
- ✅ 5 quality metrics (0-100 scale)
- ✅ Real-time predictions
- ✅ Beautiful dark UI

### Analysis Features
- ✅ Repository overview
- ✅ Technology stack detection
- ✅ Architecture analysis
- ✅ Security insights
- ✅ Performance recommendations
- ✅ Onboarding guide

---

## 🚦 Quick Start Commands

### Full Setup (First Time)
```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux
pip install fastapi uvicorn python-dotenv requests
pip install -r requirements-ml.txt
python -m ml.train_models
python main.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### Regular Start (After Setup)
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 📊 Testing

### Test Backend API
```bash
# Health check
curl http://localhost:8000/api/health

# Expected response:
# {"status":"healthy","service":"RepoLens AI Backend"}
```

### Test Frontend
Open http://localhost:3000 in your browser

---

## 🎯 What to Expect

### First Analysis (2-5 minutes)
- Repository cloning
- File scanning
- Feature extraction
- ML prediction
- AI analysis

### Subsequent Analyses (30-60 seconds)
- Faster due to caching
- Same quality results

---

## 💡 Tips

1. **Use Mock Mode** for testing without API key
2. **Train models first** for accurate ML scores
3. **Keep both terminals open** while using the app
4. **Try different repositories** to see score variations
5. **Check console logs** if something goes wrong

---

## 🆘 Need Help?

### Check Logs
- **Backend**: Look at the terminal running `python main.py`
- **Frontend**: Look at the terminal running `npm run dev`
- **Browser**: Open Developer Tools (F12) → Console

### Common Issues
1. **Models not loading**: Run `python -m ml.train_models`
2. **Port conflicts**: Kill processes on ports 3000/8000
3. **Import errors**: Reinstall dependencies
4. **Dataset missing**: Check `data/repositories.csv` exists

---

## ✅ Success Checklist

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] ML models trained (files in `backend/ml/models/`)
- [ ] Can access http://localhost:3000 in browser
- [ ] Can analyze a GitHub repository
- [ ] ML scores display correctly

---

**Made with Bob 🤖**

Enjoy your AI-powered repository intelligence platform!