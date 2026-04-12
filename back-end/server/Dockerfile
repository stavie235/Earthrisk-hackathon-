FROM node:20-slim

# Python3 is needed for ML prediction scripts called by the backend
RUN apt-get update && apt-get install -y python3 python3-pip --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 9876
CMD ["node", "index.js"]
