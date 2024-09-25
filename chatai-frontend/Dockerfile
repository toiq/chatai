# Use the official Node.js image from the Docker Hub with Alpine Linux
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

RUN rm -rf .next

# Install the project dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port 3000
EXPOSE 3000


# Command to start the Next.js application in production mode
CMD ["npm", "start"]


