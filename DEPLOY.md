# Deployment Guide - Automata Simulator

This guide explains how to deploy the TypeScript Automata Simulator to various hosting platforms.

## Build Process

### 1. Create Production Build
```bash
npm run build
```

This generates a `dist/` folder with optimized files:
```
dist/
├── index.html              # Main entry point
├── vite.svg               # Static assets
└── assets/
    ├── index-[hash].js    # Bundled JavaScript (minified)
    └── index-[hash].css   # Bundled CSS (minified)
```

### 2. Test Production Build Locally
```bash
npm run preview
```
- Serves on `http://localhost:4173/`
- **Important**: This serves ONLY files from `dist/`, simulating a real web server
- If this works, deployment will work

## Deployment Options

### Option 1: Static File Hosting (Recommended)

#### Netlify (Free)
1. **GitHub Integration**:
   - Push code to GitHub repository
   - Connect Netlify to your GitHub repo
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Netlify auto-deploys on git push

2. **Manual Upload**:
   - Run `npm run build`
   - Drag and drop `dist/` folder to [netlify.com/drop](https://netlify.com/drop)

#### Vercel (Free)
1. Install Vercel CLI: `npm install -g vercel`
2. In project root: `vercel`
3. Follow prompts (build command: `npm run build`, output: `dist`)

#### GitHub Pages
1. Install gh-pages: `npm install -D gh-pages`
2. Add to package.json scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```
3. Run: `npm run deploy`
4. Enable GitHub Pages in repo settings

### Option 2: Traditional Web Hosting

#### Apache/Nginx Server
1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Upload via FTP/SFTP**:
   ```bash
   # Upload entire contents of dist/ to web root
   scp -r dist/* user@server:/var/www/html/
   ```

3. **Server configuration** (optional):
   - Most static sites work without configuration
   - For SPA routing (if added later), configure fallback to `index.html`

#### Shared Hosting (cPanel, etc.)
1. Run `npm run build`
2. Zip the contents of `dist/` folder
3. Upload and extract in `public_html/` or equivalent
4. Ensure `index.html` is in the root

### Option 3: CDN/Cloud Storage

#### AWS S3 + CloudFront
1. **S3 Bucket Setup**:
   ```bash
   aws s3 mb s3://your-bucket-name
   aws s3 sync dist/ s3://your-bucket-name --delete
   aws s3 website s3://your-bucket-name --index-document index.html
   ```

2. **CloudFront** (optional): Add CDN for faster global delivery

#### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init hosting`
   - Public directory: `dist`
   - Single-page app: `No` (unless SPA routing added)
3. Deploy: `firebase deploy`

## Custom Domain Setup

### DNS Configuration
Point your domain to hosting provider:
- **A Record**: Point to hosting IP
- **CNAME**: Point to hosting subdomain (e.g., `your-app.netlify.app`)

### HTTPS
Most modern hosts (Netlify, Vercel, Firebase) provide free SSL certificates automatically.

## Deployment Checklist

### Pre-Deploy
- [ ] Run `npm run build` successfully
- [ ] Test with `npm run preview` 
- [ ] Verify all functionality works
- [ ] Check browser console for errors
- [ ] Test on mobile/different browsers

### Post-Deploy
- [ ] Visit deployed URL
- [ ] Test all features work in production
- [ ] Check browser developer tools for errors
- [ ] Verify assets load correctly (no 404s)
- [ ] Test on mobile devices

## Continuous Deployment Setup

### GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './dist'
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Environment Variables

If you need environment variables in production:

### Build-time Variables
Create `.env.production`:
```
VITE_API_URL=https://api.yoursite.com
VITE_APP_TITLE=Automata Simulator
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

**Important**: Only variables prefixed with `VITE_` are included in the build.

## Performance Optimization

### Pre-Deploy Optimizations
- [ ] Enable gzip compression on server
- [ ] Set proper cache headers for assets
- [ ] Consider adding service worker for offline functionality
- [ ] Optimize images in `src/assets/`

### Bundle Analysis
```bash
npm run build -- --analyze
```

## Troubleshooting

### Common Issues
1. **White screen after deploy**: Check browser console, usually missing assets
2. **404 for assets**: Verify base URL in `vite.config.ts`
3. **CSS not loading**: Check Content-Type headers on server
4. **JavaScript errors**: Ensure all dependencies are in `package.json`

### Debug Production Build
```bash
# Build and serve locally to debug
npm run build
npm run preview
```

## Rollback Strategy

### Quick Rollback
- Keep previous `dist/` folder as `dist-backup/`
- For immediate rollback, replace current files with backup
- For git-based deploys, revert commit and redeploy

### Versioned Deployments
Use deployment services that support rollback (Netlify, Vercel) for one-click rollbacks.

## Security Considerations

- [ ] HTTPS enabled
- [ ] Security headers configured (CSP, HSTS)
- [ ] No sensitive data in client-side code
- [ ] Regular dependency updates (`npm audit`)

## Cost Estimates

- **Free Tier Sufficient**: Netlify, Vercel, GitHub Pages, Firebase Hosting
- **Paid Options**: AWS S3 (~$1-5/month), traditional hosting (~$5-20/month)
- **Traffic**: Most free tiers handle 100GB+ bandwidth/month

---

**Quick Start**: For immediate deployment, run `npm run build` and drag the `dist/` folder to [netlify.com/drop](https://netlify.com/drop). Your site will be live in seconds!