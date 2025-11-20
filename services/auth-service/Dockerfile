# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# Copy source code
COPY src ./src

# Copy templates
COPY templates ./templates

# Create keys directory and copy JWT keys (temporary solution for development)
RUN mkdir -p /app/keys
COPY *.pem /app/keys/

# Build TypeScript
RUN npm run build

# Keep all dependencies for now to ensure speakeasy is included
# RUN npm prune --omit=dev && \
#     npm cache clean --force

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini

# Copy compiled application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/keys ./keys

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    mkdir -p /tmp && \
    chown nodejs:nodejs /tmp

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
