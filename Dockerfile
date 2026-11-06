FROM node:22-alpine
# ffmpeg: komprimerar samtal över Groq Whispers 25 MB-gräns (services/audioCompress.js)
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
