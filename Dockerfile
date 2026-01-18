# Use latest Node.js version
FROM node:alpine

# Metadata labels for Docker Desktop
LABEL org.opencontainers.image.title="AGDevX OpenAPI MCP Server"
LABEL org.opencontainers.image.description="MCP Server that dynamically exposes OpenAPI/Swagger specifications as tools"
LABEL org.opencontainers.image.vendor="AGDevX"
LABEL org.opencontainers.image.version="0.0.1"
LABEL org.opencontainers.image.source="https://github.com/AGDevX/agdevx-openapi-mcp-server"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Expose the MCP server port
EXPOSE 3000

# Set environment variables with placeholder values
# Users MUST override these when running the container
ENV NODE_ENV=production
ENV PORT=3000
ENV MCP_VERBOSE=false
ENV RATE_LIMIT_ENABLED=true
ENV RATE_LIMIT_REQUESTS=10
ENV RATE_LIMIT_WINDOW_MS=60000
# Required: Set these when running the container
# ENV ENVIRONMENTS=qa,prod
# ENV API_SPEC_URL_QA=https://your-api.com/openapi.json
# ENV API_SPEC_URL_PROD=https://your-api.com/openapi.json

# Run the server
CMD ["node", "dist/index.js"]
