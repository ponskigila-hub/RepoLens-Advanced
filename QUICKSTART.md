# RepoLens AI - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- Git installed
- IBM Bob API key (optional for mock mode)

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd RepoLens-AI
```

## Step 2: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env and add your IBM Bob API key (or leave empty for mock mode)
# IBM_BOB_API_KEY=your_key_here

# Start the backend server
python main.py
```

✅ Backend should now be running on `http://localhost:8000`

## Step 3: Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start the development server
npm run dev
```

✅ Frontend should now be running on `http://localhost:3000`

## Step 4: Test the Application (1 minute)

1. Open your browser to `http://localhost:3000`
2. Paste a GitHub URL (try: `https://github.com/vercel/next.js`)
3. Click "Analyze Repository"
4. View the results!

## Testing Without API Key

If you don't have an IBM Bob API key yet, the backend will automatically use mock data for testing. This allows you to:
- Test the full user interface
- See example analysis results
- Verify the application flow

To use mock mode explicitly, you can also pass `use_mock: true` in the API request.

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# Try a different port
uvicorn main:app --port 8001
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Can't connect to backend
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Look for CORS errors in browser console

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [backend/README.md](backend/README.md) for API details
- Check [frontend/README.md](frontend/README.md) for UI customization
- Review [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for architecture details

## Development Workflow

### Making Changes

**Backend:**
```bash
cd backend
# Make your changes
# Server auto-reloads with uvicorn --reload
```

**Frontend:**
```bash
cd frontend
# Make your changes
# Next.js auto-reloads in dev mode
```

### Testing

**Backend:**
```bash
# Test analyze endpoint
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/user/repo", "use_mock": true}'
```

**Frontend:**
- Open `http://localhost:3000`
- Test with various GitHub URLs
- Check browser console for errors

## Production Deployment

### Backend (Render)
1. Push code to GitHub
2. Create Web Service on Render
3. Connect repository
4. Add environment variables
5. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

See [README.md](README.md) for detailed deployment instructions.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in terminal/console
3. Check the README files for more details
4. Open an issue on GitHub

---

Happy coding! 🚀