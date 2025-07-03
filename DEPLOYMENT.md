# GitHub Pages Deployment

This project is configured for static deployment to GitHub Pages.

## Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository Settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "GitHub Actions"

2. **Push your code:**
   - The GitHub Actions workflow will automatically build and deploy when you push to the `main` branch
   - The workflow builds the static site and deploys it to GitHub Pages

## Configuration

The project is configured with:
- `output: 'export'` in `next.config.ts` for static generation
- `trailingSlash: true` for proper GitHub Pages routing
- `images.unoptimized: true` for static image handling
- GitHub Actions workflow in `.github/workflows/deploy.yml`

## Build Process

The deployment process:
1. Installs Node.js dependencies
2. Runs `npm run build` to generate static files
3. Uploads the `out/` directory to GitHub Pages

## Local Testing

To test the static build locally:
```bash
npm run build
npx serve out/
```

Your site will be available at the GitHub Pages URL: `https://[username].github.io/[repository-name]/` 