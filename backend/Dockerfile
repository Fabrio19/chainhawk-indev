FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma and other packages
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm ci

# Install Prisma CLI globally
RUN npm install -g prisma

# Copy Prisma schema and generate client (before copying other source code)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the development server
CMD ["npm", "run", "dev"] 