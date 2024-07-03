FROM node:22-alpine
ENV NODE_ENV production

USER node
WORKDIR /home/node

COPY package*.json ./
RUN npm ci --only=production

COPY --chown=node:node . .

EXPOSE 3000
CMD [ "node", "index.js" ]