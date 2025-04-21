# Use node version 18 as the base image (Node 22 doesn't exist yet)
FROM node:18

# Set the working directory inside the container
WORKDIR /mobile

# Copy package.json and package-lock.json to the container
COPY mobile/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the mobile folder to the container
COPY mobile/ .

# Expose the port Expo uses (default is 19000 for the app, 19001 for the manifest, and 19002 for the web interface)
EXPOSE 19000 19001 19002

# Start the Expo app
CMD ["npx", "expo", "start", "--tunnel"]