# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. Backend Won't Start

#### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:**
```bash
cd backend
pip install fastapi uvicorn python-dotenv requests
```

#### Issue: "ModuleNotFoundError: No module named 'pandas'"
**Solution:**
```bash
cd backend
pip install -r requirements-ml.txt
```

#### Issue: "Port 8000 is already in use"
**Solution:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9

# Then restart
python main.py
```

---

### 2. ML Training Issues

#### Issue: "FileNotFoundError: data\repositories.csv"
**Solution:**
The dataset file is missing or in the wrong location.
```bash
# Check if file exists (from project root)
ls data/repositories.csv    # Mac/Linux
dir data\repositories.csv    # Windows

# If missing, make sure you have the Kaggle dataset
# It should be at: IBM Bob Hackaton/data/repositories.csv
```

#### Issue: "Training takes too long"
**Solution:**
Reduce the number of repositories:
```python
# Edit backend/ml/train_models.py
# Change line 30 from:
metrics = train_and_save_models(max_repos=5000)
# To:
metrics = train_and_save_models(max_repos=1000)
```

#### Issue: "Out of memory during training"
**Solution:**
```python
# Reduce max_repos as above, or
# Close other applications to free up RAM
```

---

### 3. Frontend Issues

#### Issue: "Module not found" or "Cannot find module"
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json    # Mac/Linux
rmdir /s /q node_modules && del package-lock.json    # Windows
npm install
```

#### Issue: "Port 3000 is already in use"
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Then restart
npm run dev
```

#### Issue: "Failed to compile" or TypeScript errors
**Solution:**
```bash
cd frontend
npm run build
# If build succeeds, try dev again
npm run dev
```

---

### 4. ML Scores Not Showing

#### Issue: Scores are all 0 or not displayed
**Solution:**
1. Check if models are trained:
```bash
ls backend/ml/models/    # Mac/Linux
dir backend\ml\models\   # Windows

# Should see:
# - overall_quality_score_model.joblib
# - maintainability_score_model.joblib
# - scalability_score_model.joblib
# - architecture_score_model.joblib
# - production_readiness_score_model.joblib
# - feature_scaler.joblib
# - feature_names.joblib
```

2. If files are missing, train models:
```bash
cd backend
python -m ml.train_models
```

3. Restart backend:
```bash
python main.py
```

#### Issue: Scores are the same for all repositories
**Solution:**
This is expected if models aren't trained. The system uses heuristic scoring based on repository characteristics. Scores will vary based on:
- Repository size (lines of code)
- Documentation quality (README length)
- Technology diversity
- File organization

---

### 5. Analysis Fails

#### Issue: "Failed to clone repository"
**Possible causes:**
- Repository is private
- Invalid GitHub URL
- Network issues
- Git not installed

**Solution:**
```bash
# Check if git is installed
git --version

# Try a public repository
# Example: https://github.com/vercel/next.js

# Check network connection
ping github.com
```

#### Issue: "Analysis timeout"
**Solution:**
Large repositories take longer. Try:
1. Use a smaller repository first
2. Check backend logs for errors
3. Increase timeout in frontend (services/api.ts)

---

### 6. API Connection Issues

#### Issue: "Failed to fetch" or "Network error"
**Solution:**
1. Check backend is running:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"RepoLens AI"}
```

2. Check CORS settings in backend/main.py

3. Verify frontend is calling correct URL:
```typescript
// frontend/services/api.ts
const API_URL = 'http://localhost:8000';
```

---

### 7. Import Errors

#### Issue: "Import 'dotenv' could not be resolved"
**This is a type checker warning, not a runtime error.**
The code will still work. To fix:
```bash
cd backend
pip install python-dotenv
```

#### Issue: "Import 'fastapi' could not be resolved"
**Solution:**
```bash
cd backend
pip install fastapi
```

---

### 8. Virtual Environment Issues

#### Issue: "pip: command not found" or "python: command not found"
**Solution:**
Make sure virtual environment is activated:
```bash
# Windows
cd backend
venv\Scripts\activate

# Mac/Linux
cd backend
source venv/bin/activate

# You should see (venv) in your terminal prompt
```

#### Issue: "Cannot activate virtual environment"
**Solution:**
Recreate it:
```bash
cd backend
rm -rf venv    # Mac/Linux
rmdir /s /q venv    # Windows

python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate    # Mac/Linux

pip install -r requirements-ml.txt
```

---

### 9. Performance Issues

#### Issue: Analysis is very slow
**Solutions:**
1. **Reduce repository size**: Try smaller repos first
2. **Check system resources**: Close unnecessary applications
3. **Optimize scanning**: The file scanner already ignores node_modules, .git, etc.

#### Issue: High memory usage
**Solutions:**
1. Train with fewer repositories (reduce max_repos)
2. Close other applications
3. Restart backend periodically

---

### 10. UI/Display Issues

#### Issue: ML scores card not showing
**Check:**
1. Backend is returning ml_scores in response
2. Frontend types are updated
3. Browser console for errors (F12)

**Solution:**
```bash
# Check API response
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/vercel/next.js","use_mock":false}'

# Should include "ml_scores" in response
```

#### Issue: Dark theme not applied
**Solution:**
Clear browser cache and hard reload:
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R

---

## 🔍 Debugging Tips

### Check Backend Logs
```bash
# Backend terminal shows:
# - API requests
# - ML model loading status
# - Error messages
# - Analysis progress
```

### Check Frontend Logs
```bash
# Frontend terminal shows:
# - Build errors
# - Component errors
# - Hot reload status
```

### Check Browser Console
```
F12 → Console tab
# Shows:
# - API call errors
# - React errors
# - Network issues
```

### Test API Directly
```bash
# Health check
curl http://localhost:8000/health

# Test analysis (with mock)
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/vercel/next.js","use_mock":true}'
```

---

## 📞 Still Having Issues?

### Checklist
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Git installed
- [ ] Virtual environment activated
- [ ] All dependencies installed
- [ ] ML models trained
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] data/repositories.csv exists

### Clean Restart
```bash
# 1. Stop everything (Ctrl+C in both terminals)

# 2. Backend clean restart
cd backend
venv\Scripts\activate    # Windows
source venv/bin/activate    # Mac/Linux
python -m ml.train_models
python main.py

# 3. Frontend clean restart (new terminal)
cd frontend
rm -rf .next    # Mac/Linux
rmdir /s /q .next    # Windows
npm run dev
```

---

**Made with Bob 🤖**

If you're still experiencing issues, check the terminal logs for specific error messages!