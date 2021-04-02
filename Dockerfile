FROM node:14-alpine
ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY . .

RUN yarn --frozen-lockfile

CMD ["node", "."]
