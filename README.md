# sfw-bot (不是色图 bot) for Discord

## Features

- [x] extensible framework
- [x] customizable event listeners 
- [x] command injection with annotation
- [x] persistent KV store with [level](https://github.com/Level/level)
- [x] scoped and hierarchical environment variable
- [x] music player with extensible media provider
- [x] local media provider
- [x] [Netease music media](http://music.163.com/) provider
- [ ] Youtube media provider
- [ ] ~bake you a cake~ 

## Usage

```
$ git clone https://github.com/tabjy/sfw-bot.git
$ cd sfw-bot
$ cp .env.example .env
$ vim .env # update your configs
```

### Docker 

```
$ docker build -t sfw-bot .
$ docker run -v <path-to-dot-env>:/app/.env -v <optionally-path-to-data-dir>:/app/.level -d sfw-bot
```

### without Docker

```
$ npm install
$ npm run start
```

### Invite Your Bot

```
https://discord.com/oauth2/authorize?client_id=<your-app-client-id>&permissions=2184185856&scope=bot%20applications.commands
```

### License

MIT License


