FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Run database migrations and start the service
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]
