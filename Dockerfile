FROM node:22-alpine3.20


WORKDIR /app

RUN apk add --no-cache \
  # healthcheck
  curl \
  # MuhammaraJS deps
  g++ make py3-pip \
  # PUPPETEER deps
  chromium msttcorefonts-installer font-noto fontconfig freetype ttf-dejavu ttf-droid ttf-freefont ttf-liberation \
  && rm -rf /var/cache/apk/* /tmp/*

RUN update-ms-fonts && fc-cache -f

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json /app/

RUN npm ci

COPY ./ /app/
RUN chmod a+x docker-entrypoint.sh

RUN npm run build

RUN addgroup webuser \
  && adduser webuser -D -G webuser \
  && mkdir -p /home/webuser/Downloads \
  && chown -R webuser:webuser /home/webuser

USER webuser

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "./dist/src/app.js"]

EXPOSE 3000/tcp
