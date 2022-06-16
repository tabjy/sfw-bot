# sfw-bot (不是色图 bot) for Discord

## Features

- [x] extensible modular framework
- [x] customizable event listeners 
- [x] command injection with annotation
- [x] persistent KV store with [level](https://github.com/Level/level)
- [x] scoped and hierarchical environment variable
- [x] music player with extensible media provider
- [x] local media provider
- [x] [Netease music media](http://music.163.com/) provider
- [x] [Jellyfin](https://jellyfin.org/) media provider
- [x] [youtube-dl](https://youtube-dl.org/) (Youtube, Bilibili, ~Pornhub~, etc.) media provider
- [ ] ~bake you a cake~ 

## Usage

### Docker 

```
$ curl https://raw.githubusercontent.com/tabjy/sfw-bot/master/.env-example -o .env
$ vim .env # update your configs
$ docker run -v $PWD/.env:/app/.env -v [<path-to-data-dir>:/app/.level] -d ghcr.io/tabjy/sfw-bot:latest
```

### without Docker

```
$ git clone https://github.com/tabjy/sfw-bot.git
$ cd sfw-bot
$ cp .env.example .env
$ vim .env # update your configs
$ npm install
$ npm run start
```

### Invite Your Bot

```
https://discord.com/oauth2/authorize?client_id=<your-app-client-id>&permissions=2184185856&scope=bot%20applications.commands
```

### License

MIT License


