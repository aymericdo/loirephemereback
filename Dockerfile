###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:22 as development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

USER node

###################
# BUILD FOR PRODUCTION
###################

FROM node:22 as build

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY . .

RUN npm run build

ENV NODE_ENV production

RUN npm ci --only=production && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:18-alpine as production

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
