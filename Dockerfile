# FROM hub.hamdocker.ir/alpine:3.21
# CMD ["sh"]
# Base image: Node 20 on Debian/Ubuntu
FROM node:22-alpine

# Set working directory
WORKDIR /app


# RUN npm set registry https://repo.hmirror.ir/npm

# # Copy package.json
COPY package.json ./

# Set npm registry (optional, if you use a private mirror)

# # Install dependencies
RUN npm install --prefer-offline --loglevel=error

# # Copy the rest of the app
COPY . .

# # Expose port
EXPOSE 3000

# # Start the app
CMD ["npm", "start"]
