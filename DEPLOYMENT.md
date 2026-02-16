# Quick Deployment Guide for Google Cloud Run

## Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated

## Option 1: Deploy from Source (Easiest)

This is the simplest method - Google Cloud will handle the Docker build for you:

```bash
gcloud run deploy prompt-wars \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

## Option 2: Build and Deploy Manually

If you prefer more control:

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Build using Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/prompt-wars

# Deploy to Cloud Run
gcloud run deploy prompt-wars \
  --image gcr.io/$PROJECT_ID/prompt-wars \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

## What Changed to Make Deployment Easier

### Before (Complex Structure):
```
├── index.html
├── src/
│   ├── main.js
│   ├── style.css
│   └── services/
│       └── Gemini.js
└── Dockerfile (had to copy /src separately)
```

### After (Simplified):
```
├── index.html
├── main.js
├── style.css
├── Gemini.js
└── Dockerfile (copies all files in one line)
```

## Benefits of This Structure

1. **No Path Issues**: All files are in root, eliminating "src not found" errors
2. **Simpler Dockerfile**: Single COPY command for all app files
3. **Faster Builds**: Less layers, faster Docker builds
4. **Easier Debugging**: All files in one place, easier to verify
5. **Cloud Run Ready**: Optimized for serverless deployment

## After Deployment

After running the deploy command, you'll get a URL like:
```
https://prompt-wars-xxxxx-uc.a.run.app
```

Visit this URL to play your game!

## Troubleshooting

If deployment fails:
1. Make sure you're authenticated: `gcloud auth login`
2. Set the correct project: `gcloud config set project YOUR_PROJECT_ID`
3. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```
