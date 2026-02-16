FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /opt/render/project/src/sessions

EXPOSE 3000

CMD ["npm", "start"]
