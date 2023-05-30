FROM node:16.17.0

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY ./ /app/

CMD ["node", "./src/app.js"]
EXPOSE 3000/tcp
