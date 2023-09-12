FROM node:18-alpine

COPY . /app

RUN apk update &&  \
    apk add --no-cache alpine-sdk autoconf automake libtool python3 ffmpeg &&  \
    cd /app &&  \
    npm install &&  \
    apk del alpine-sdk autoconf automake libtool

WORKDIR /app

ENTRYPOINT [ "npm", "run", "start" ]
