FROM node:16.10.0 AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install -g npm@8.19.2
RUN npm install glob rimraf

RUN npm install

COPY . .

RUN npm run build

FROM node:16.10.0 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
