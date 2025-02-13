FROM node:22 AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install glob rimraf

RUN npm install --only=development

COPY . .

RUN npm run build

FROM node:22 AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["npm", "run", "start:prod"]
