# Publishing Docker Images

This guide explains how to publish the AGDevX OpenAPI MCP Server Docker image to container registries.

## Prerequisites

- Docker Desktop installed and running
- Account on Docker Hub or GitHub
- Image built locally with `docker-compose build` or `npm run build && docker build -t agdevx-openapi-mcp-server .`

## Option 1: Publishing to Docker Hub (Recommended)

Docker Hub is the most popular container registry and easiest for users to access.

### Initial Setup

1. Create a Docker Hub account at https://hub.docker.com if you don't have one

2. Log in to Docker Hub from your terminal:
   ```bash
   docker login
   ```
   Enter your Docker Hub username and password when prompted.

### Publishing Steps

1. **Tag your image with your Docker Hub username:**
   ```bash
   docker tag agdevx-openapi-mcp-server:latest YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:latest
   docker tag agdevx-openapi-mcp-server:latest YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:0.0.1
   ```

2. **Push to Docker Hub:**
   ```bash
   docker push YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:latest
   docker push YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:0.0.1
   ```

3. **Verify the image is public:**
   - Go to https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server
   - Ensure the repository is set to "Public" (not "Private")

### Users Can Now Pull Your Image

```bash
docker pull YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:latest
```

### Updating the README

After publishing, update the README.md placeholders:
- Replace `<dockerhub-username>` with your actual Docker Hub username
- Update the pull commands to use your published image name

## Option 2: Publishing to GitHub Container Registry (GHCR)

GitHub Container Registry is great if your code is already on GitHub.

### Initial Setup

1. Create a GitHub Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scopes: `write:packages`, `read:packages`, `delete:packages`
   - Copy the token

2. Log in to GitHub Container Registry:
   ```bash
   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

### Publishing Steps

1. **Tag your image for GHCR:**
   ```bash
   docker tag agdevx-openapi-mcp-server:latest ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
   docker tag agdevx-openapi-mcp-server:latest ghcr.io/agdevx/agdevx-openapi-mcp-server:0.0.1
   ```

2. **Push to GHCR:**
   ```bash
   docker push ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
   docker push ghcr.io/agdevx/agdevx-openapi-mcp-server:0.0.1
   ```

3. **Make the package public:**
   - Go to your GitHub repository
   - Navigate to the "Packages" section on the right sidebar
   - Click on your package
   - Click "Package settings"
   - Scroll to "Danger Zone" and click "Change visibility"
   - Change to "Public"

### Users Can Now Pull Your Image

```bash
docker pull ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
```

## Option 3: Automated Publishing with GitHub Actions

The best practice is to automate publishing whenever you create a release.

### Create `.github/workflows/docker-publish.yml`

```yaml
name: Publish Docker Image

on:
  release:
    types: [published]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build TypeScript
        run: npm run build

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

### How to Use GitHub Actions

1. **Create the workflow file:**
   - Create directory: `.github/workflows/`
   - Add the file: `.github/workflows/docker-publish.yml`
   - Commit and push to your repository

2. **Create a release:**
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag version: `v0.0.1`
   - Release title: `v0.0.1`
   - Click "Publish release"

3. **GitHub Actions will automatically:**
   - Build the TypeScript code
   - Build the Docker image
   - Push to GitHub Container Registry
   - Tag with version numbers and `latest`

4. **Manual trigger:**
   - Go to Actions tab → "Publish Docker Image" → "Run workflow"

## Publishing to Multiple Registries

You can publish to both Docker Hub and GHCR:

```bash
# Build once
docker build -t agdevx-openapi-mcp-server .

# Tag for both registries
docker tag agdevx-openapi-mcp-server:latest YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:latest
docker tag agdevx-openapi-mcp-server:latest ghcr.io/agdevx/agdevx-openapi-mcp-server:latest

# Push to both
docker push YOUR_DOCKERHUB_USERNAME/agdevx-openapi-mcp-server:latest
docker push ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
```

## Version Tagging Best Practices

Always tag with multiple version tags:

```bash
# Example for version 1.2.3
docker tag agdevx-openapi-mcp-server:latest YOUR_USERNAME/agdevx-openapi-mcp-server:1.2.3
docker tag agdevx-openapi-mcp-server:latest YOUR_USERNAME/agdevx-openapi-mcp-server:1.2
docker tag agdevx-openapi-mcp-server:latest YOUR_USERNAME/agdevx-openapi-mcp-server:1
docker tag agdevx-openapi-mcp-server:latest YOUR_USERNAME/agdevx-openapi-mcp-server:latest

# Push all tags
docker push YOUR_USERNAME/agdevx-openapi-mcp-server:1.2.3
docker push YOUR_USERNAME/agdevx-openapi-mcp-server:1.2
docker push YOUR_USERNAME/agdevx-openapi-mcp-server:1
docker push YOUR_USERNAME/agdevx-openapi-mcp-server:latest
```

This allows users to:
- Pin to exact version: `image: username/app:1.2.3`
- Auto-update patch versions: `image: username/app:1.2`
- Auto-update minor versions: `image: username/app:1`
- Always get latest: `image: username/app:latest`

## Verifying the Published Image

After publishing, verify users can pull and run your image:

```bash
# Remove local images
docker rmi agdevx-openapi-mcp-server
docker rmi YOUR_USERNAME/agdevx-openapi-mcp-server:latest

# Pull from registry
docker pull YOUR_USERNAME/agdevx-openapi-mcp-server:latest

# Test run
docker run --rm \
  -e ENVIRONMENTS=prod \
  -e API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json \
  YOUR_USERNAME/agdevx-openapi-mcp-server:latest
```

## Summary

**For quick publishing:**
1. Build: `docker-compose build`
2. Tag: `docker tag agdevx-openapi-mcp-server:latest YOUR_USERNAME/agdevx-openapi-mcp-server:latest`
3. Push: `docker push YOUR_USERNAME/agdevx-openapi-mcp-server:latest`

**For production:**
- Set up GitHub Actions for automated publishing on release
- Tag with semantic versions (not just `latest`)
- Publish to GHCR (free, integrated with GitHub)
- Update README with actual image names after publishing
