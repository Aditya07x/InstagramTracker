# ── Stage 1: Build Phase ──
# We use Node.js purely as a build tool to compile app.jsx into app.bundle.js using esbuild.
FROM node:20-alpine AS builder
WORKDIR /app

# Install esbuild globally in the builder container
RUN npm install -g esbuild@0.20.2

# Copy only the dashboard source assets
COPY app/src/main/assets/www/ ./src/

# Bundle JSX to IIFE JavaScript matching Reelio's exact bundler configuration
RUN esbuild src/app.jsx \
    --bundle \
    --format=iife \
    --target=es2018 \
    --outfile=src/app.bundle.js \
    --jsx-factory=React.createElement \
    --jsx-fragment=React.Fragment

# ── Stage 2: Production Server Phase ──
# We use an ultra-lightweight Nginx alpine image to serve static HTML/JS/CSS.
# No Node.js runtime is present in the final image, drastically reducing attack surface and image size (~25MB vs ~1.2GB).
FROM nginx:1.27-alpine-slim

# Copy custom Nginx configuration
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy bundled web assets and offline fonts from Stage 1 into Nginx web root
COPY --from=builder /app/src/index.html /usr/share/nginx/html/
COPY --from=builder /app/src/*.js /usr/share/nginx/html/
COPY --from=builder /app/src/fonts/ /usr/share/nginx/html/fonts/

# Expose standard HTTP port
EXPOSE 80

# Healthcheck for container liveness/readiness probes in Kubernetes
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
