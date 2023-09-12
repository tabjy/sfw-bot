FROM node:18-alpine

COPY . /app

RUN apk update &&  \
    apk add --no-cache alpine-sdk autoconf automake libtool python3 ffmpeg &&  \
    cd /app &&  \
    npm install --prefix ./src/available-modules/jellyfin-media-provider/vendor/jellyfin-client-axios/stable && \
    npm run build --prefix ./src/available-modules/jellyfin-media-provider/vendor/jellyfin-client-axios/stable -- --module commonjs && \
    rm -rf ./src/available-modules/jellyfin-media-provider/vendor/jellyfin-client-axios/stable/node_modules && \
    npm install &&  \
    apk del alpine-sdk autoconf automake libtool

WORKDIR /app

ENTRYPOINT [ "npm", "run", "start" ]
