FROM ubuntu

ENV DEBIAN_FRONTEND=noninteractive

COPY . /app

RUN apt update &&  \
    apt install -y curl sudo &&  \
    curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash - &&  \
    apt install -y nodejs build-essential libtool &&  \
    cd /app &&  \
    npm install &&  \
    apt remove -y build-essential libtool && \
    apt clean &&  \
    apt autoremove -y &&  \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app

ENTRYPOINT [ "npm", "run", "start" ]
