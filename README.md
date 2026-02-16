# Prompt Wars: Subway Surf

A 3D endless runner game built with Three.js and integrated with Gemini AI for dynamic theming.

## Simplified Structure

All files are now in the root directory for easy deployment:

```
├── index.html          # Main HTML file
├── main.js            # Game logic
├── style.css          # Styles
├── Gemini.js          # Gemini AI integration
├── Dockerfile         # Docker configuration
├── nginx.conf         # Nginx configuration
└── package.json       # Dependencies (for local development)
```

## Local Development

1. Open `index.html` directly in your browser, or
2. Use a local server:
   ```bash
   npx serve .
   ```

## Cloud Deployment (Google Cloud Run)

### Build and Deploy

```bash
# Build the Docker image
docker build -t prompt-wars .

# Tag for Google Container Registry
docker tag prompt-wars gcr.io/YOUR_PROJECT_ID/prompt-wars

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/prompt-wars

# Deploy to Cloud Run
gcloud run deploy prompt-wars \
  --image gcr.io/YOUR_PROJECT_ID/prompt-wars \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Or use the simplified one-command deploy:

```bash
gcloud run deploy prompt-wars \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Game Controls

- **Arrow Keys / WASD**: Move and jump
- **Q / E**: Rotate the world
- **Spacebar**: Jump

## Features

- 3D cylindrical tunnel with 360° gameplay
- Multiple environment themes (Google, Cyberpunk, Mars, Ocean)
- Dynamic AI-powered theming (requires Gemini API key)
- Procedural obstacle generation
- Score tracking and game over system
