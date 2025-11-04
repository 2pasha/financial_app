# GitHub Pages Deployment Guide

## 🚀 Quick Start

Your Moneta app is now configured for automatic deployment to GitHub Pages!

## ✅ What's Been Set Up

1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
   - Automatically builds and deploys on every push to `main`
   - Can be manually triggered from GitHub Actions tab

2. **Vite Configuration** (`vite.config.ts`)
   - Configured base path for GitHub Pages
   - Build output directory set to `build/`

3. **Package Scripts** (`package.json`)
   - `npm run dev` - Start development server
   - `npm run build` - Build for production
   - `npm run preview` - Preview production build locally

## 📋 Deployment Steps

### Step 1: Push to GitHub

```bash
# Add all files
git add .

# Commit your changes
git commit -m "Setup GitHub Pages deployment"

# Push to main branch
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under **Build and deployment**:
   - Source: Select **GitHub Actions**
5. Save the settings

### Step 3: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You'll see the "Deploy to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)
4. Once completed, your app will be live!

### Step 4: Access Your App

Your app will be available at:
```
https://[your-username].github.io/[repository-name]/
```

For example:
- Username: `vatra`
- Repository: `moneta`
- URL: `https://vatra.github.io/moneta/`

## 🔄 Updating Your Deployment

Every time you push to the `main` branch, GitHub Actions will:
1. Automatically build your app
2. Deploy the new version
3. Your changes will be live in 2-3 minutes

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"
git push origin main

# Wait 2-3 minutes and refresh your deployed site!
```

## 🛠️ Manual Deployment

To manually trigger a deployment:

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **Deploy to GitHub Pages** workflow
4. Click **Run workflow** button
5. Select the `main` branch
6. Click **Run workflow**

## 🐛 Troubleshooting

### Workflow fails during build

**Check:**
- All dependencies are in `package.json`
- No TypeScript errors: run `npm run build` locally
- Check the Actions tab for error logs

### Pages not loading / 404 errors

**Solutions:**
1. Ensure GitHub Pages source is set to **GitHub Actions** (not branch)
2. Check if `.nojekyll` file exists in `public/` folder
3. Verify `base` path in `vite.config.ts` is correct
4. Clear browser cache and try again

### Custom domain setup

If using a custom domain:

1. Update `vite.config.ts`:
   ```ts
   export default defineConfig({
     base: '/', // Change to your domain
     // ... rest of config
   })
   ```

2. Add a `CNAME` file in `public/` folder with your domain:
   ```
   yourdomain.com
   ```

3. Configure DNS settings in your domain provider
4. Enable HTTPS in GitHub Pages settings

## 📊 Monitoring Deployments

- **Actions Tab**: See all deployment runs and logs
- **Pages Settings**: See deployment history and status
- **Workflow Badge**: Add to README for status visibility

To add a workflow status badge to your README:
```markdown
![Deploy Status](https://github.com/[username]/[repo]/actions/workflows/deploy.yml/badge.svg)
```

## 🎉 That's It!

Your Moneta app is now live on the internet! Share your deployment URL with anyone.

## Need Help?

- Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
- Review [GitHub Actions logs](https://github.com/[username]/[repo]/actions) for errors
- Ensure your repository is public (or you have GitHub Pro for private repos)

