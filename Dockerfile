FROM node:18-alpine

WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app code
COPY . .

# App runs on port 8080
EXPOSE 8080

# Start the app
CMD ["npm", "start"]
