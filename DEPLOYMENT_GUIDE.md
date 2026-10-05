# 🚀 Deployment Guide - ML-Powered Repository Intelligence Platform

## 📋 Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Training ML Models](#training-ml-models)
3. [Running the Application](#running-the-application)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## 🏠 Local Development Setup

### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **Git** (for cloning repositories)
- **pip** (Python package manager)
- **npm** (Node package manager)

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd IBM-Bob-Hackaton
```

### Step 2: Backend Setup

#### 2.1 Create Python Virtual Environment
```bash
# Windows
cd backend
python -m venv venv
venv\Scripts\activate

# macOS/Linux
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 Install Backend Dependencies
```bash
# Install core dependencies
pip install -r requirements.txt

# Install ML dependencies
pip install -r requirements-ml.txt
```

#### 2.3 Configure Environment Variables
```bash
# Copy example env file
copy .env.example .env    # Windows
cp .env.example .env      # macOS/Linux

# Edit .env file and add your IBM Bob API key
# IBM_BOB_API_KEY=your_api_key_here
# IBM_BOB_API_URL=https://api.ibm.com/bob/v1
```

### Step 3: Frontend Setup

#### 3.1 Install Frontend Dependencies
```bash
cd frontend
npm install
```

#### 3.2 Configure Frontend Environment
```bash
# Copy example env file
copy .env.example .env.local    # Windows
cp .env.example .env.local      # macOS/Linux

# Edit .env.local if needed
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🤖 Training ML Models

### Step 1: Prepare Dataset
The Kaggle dataset should already be in the `data/` folder. If not:
```bash
# Download from Kaggle
# https://www.kaggle.com/datasets/donbarbos/github-repos

# Place repositories.csv in data/ folder
mkdir data
# Copy repositories.csv to data/
```

### Step 2: Train Models
```bash
# Activate virtual environment
cd backend
venv\Scripts\activate    # Windows
source venv/bin/activate # macOS/Linux

# Run training script
python ml/train_models.py
```

**Expected Output:**
```
Loading dataset...
Dataset loaded: 10000 repositories
Engineering features...
Generating labels...
Training models...
XGBoost Model - RMSE: 8.45, MAE: 6.23, R²: 0.87
RandomForest Model - RMSE: 9.12, MAE: 6.89, R²: 0.84
Models saved to backend/ml/models/
```

**Models will be saved to:**
- `backend/ml/models/xgboost_model.joblib`
- `backend/ml/models/random_forest_model.joblib`
- `backend/ml/models/feature_names.joblib`

---

## 🏃 Running the Application

### Option 1: Run Both Services Separately

#### Terminal 1 - Backend
```bash
cd backend
venv\Scripts\activate    # Windows
source venv/bin/activate # macOS/Linux

# Run FastAPI server
uvicorn routes.analyze:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** `http://localhost:8000`

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

**Frontend will be available at:** `http://localhost:3000`

### Option 2: Use Start Scripts

#### Windows (PowerShell)
```powershell
# Backend
cd backend
.\start.ps1

# Frontend (new terminal)
cd frontend
npm run dev
```

#### macOS/Linux (Bash)
```bash
# Backend
cd backend
chmod +x start.sh
./start.sh

# Frontend (new terminal)
cd frontend
npm run dev
```

---

## 🌐 Production Deployment

### Backend Deployment (Vercel/Railway/Render)

#### Option 1: Vercel
```bash
cd backend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**vercel.json** (already configured):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "routes/analyze.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "routes/analyze.py"
    }
  ]
}
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway up
```

#### Option 3: Render
1. Go to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `pip install -r requirements.txt && pip install -r requirements-ml.txt`
   - **Start Command:** `uvicorn routes.analyze:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3.11

### Frontend Deployment (Vercel)

```bash
cd frontend

# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
vercel --prod
```

**Or use Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select `frontend` as root directory
4. Deploy automatically

---

## 🔐 Environment Variables

### Backend (.env)
```env
# IBM Bob API Configuration
IBM_BOB_API_KEY=your_api_key_here
IBM_BOB_API_URL=https://api.ibm.com/bob/v1

# Optional: GitHub API Token (for enhanced metadata)
GITHUB_TOKEN=your_github_token_here
```

### Frontend (.env.local)
```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production
# NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

---

## 🐳 Docker Deployment (Optional)

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-ml.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "routes.analyze:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - IBM_BOB_API_KEY=${IBM_BOB_API_KEY}
    volumes:
      - ./backend/ml/models:/app/ml/models
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

**Run with Docker Compose:**
```bash
docker-compose up -d
```

---

## 🔧 Troubleshooting

### Issue: ML Models Not Found
**Solution:**
```bash
cd backend
python ml/train_models.py
```

### Issue: Port Already in Use
**Solution:**
```bash
# Backend - use different port
uvicorn routes.analyze:app --port 8001

# Frontend - use different port
npm run dev -- -p 3001
```

### Issue: CORS Errors
**Solution:** Update `backend/routes/analyze.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-url.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Module Not Found
**Solution:**
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt -r requirements-ml.txt

cd frontend
npm install
```

### Issue: Git Clone Fails
**Solution:** Ensure Git is installed and accessible:
```bash
git --version
```

---

## 📊 Performance Optimization

### Backend
- Use **Gunicorn** with multiple workers:
```bash
gunicorn routes.analyze:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
- Enable Next.js optimizations in `next.config.js`:
```javascript
module.exports = {
  swcMinify: true,
  compress: true,
  images: {
    domains: ['github.com'],
  },
}
```

---

## 🎯 Quick Start Commands

### Development
```bash
# Terminal 1 - Backend
cd backend && venv\Scripts\activate && uvicorn routes.analyze:app --reload

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Production Build
```bash
# Backend
cd backend && pip install -r requirements.txt -r requirements-ml.txt

# Frontend
cd frontend && npm run build && npm start
```

---

## 📝 Notes

- **ML Models:** Train models before first use
- **API Keys:** Required for IBM Bob integration
- **Dataset:** Included in `data/` folder
- **Temp Repos:** Automatically cleaned up after analysis
- **Logs:** Check console for detailed error messages

---

## 🆘 Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review console logs
3. Verify environment variables
4. Ensure all dependencies are installed

---

**Made with Bob 🤖**