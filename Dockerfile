FROM node:22 AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install glob rimraf

RUN npm install

COPY . .

RUN npm run build

FROM node:22 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm run build

RUN npm ci --only=production && npm cache clean --force

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
