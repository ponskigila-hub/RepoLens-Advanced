# RepoLens AI - Frontend

Next.js frontend for AI-powered GitHub repository analysis.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, set this to your deployed backend URL.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Main landing page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── RepoInput.tsx         # URL input component
│   ├── AnalysisCard.tsx      # Analysis result display
│   ├── LoadingSpinner.tsx    # Loading indicator
│   └── SectionCard.tsx       # Reusable card component
├── services/
│   └── api.ts                # Backend API integration
├── types/
│   └── analysis.ts           # TypeScript interfaces
└── package.json
```

## Features

- **Modern UI**: Built with Tailwind CSS and dark mode
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Real-time Analysis**: Live updates during repository analysis
- **Error Handling**: Comprehensive error messages and validation
- **Type Safety**: Full TypeScript support

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy

### Manual Deployment

```bash
npm run build
```

Deploy the `.next` folder to your hosting provider.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **API Client**: Fetch API

## Development

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused

### Adding New Features

1. Create component in `components/`
2. Add types in `types/`
3. Update API service if needed
4. Test thoroughly

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### API Connection Issues

- Check `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running
- Check CORS settings in backend