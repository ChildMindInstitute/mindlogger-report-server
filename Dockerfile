FROM node:16.17.0

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY ./ /app/

RUN npm run build

CMD ["node", "./dist/src/app.js"]
EXPOSE 3000/tcp
