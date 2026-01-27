# FROM hub.hamdocker.ir/alpine:3.21
# CMD ["sh"]
# Base image: Node 20 on Debian/Ubuntu
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Set Ubuntu mirror (Jammy)
# RUN echo > /etc/apt/sources.list
# RUN echo "deb http://mirror.arvancloud.ir/ubuntu bookworm main restricted" > /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-updates main restricted" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm universe" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-updates universe" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm multiverse" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-updates multiverse" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-security main restricted" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-security universe" >> /etc/apt/sources.list && \
#     echo "deb http://mirror.arvancloud.ir/ubuntu bookworm-security multiverse" >> /etc/apt/sources.list

# Cleanup to reduce image size
# RUN rm -rf /etc/apt/sources.list.d/*

# CMD ["/bin/bash"]


# Update package index
# RUN apt-get update

# # Install required packages
# RUN apt-get install -y --no-install-recommends \
#     curl \
#     bash \
#     git \
#     python3 \
#     make \
#     g++


# RUN npm set registry https://repo.hmirror.ir/npm

# Copy package.json
COPY package.json ./

# Set npm registry (optional, if you use a private mirror)

# Install dependencies
RUN npm install --prefer-offline --loglevel=error

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
