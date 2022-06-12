FROM ubuntu

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update  \
    && apt install -y curl sudo  \
    && curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -  \
    && apt install -y nodejs git build-essential libtool

RUN git clone https://github.com/tabjy/sfw-bot.git /app && cd /app && npm install

WORKDIR /app

CMD [ "npm", "run", "start" ]
