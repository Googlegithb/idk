> [<img src="https://img.shields.io/badge/Telegram-%40Me-orange">](https://t.me/roddyfred)

![img1](./.github/image/hero.png)

# Use Node.Js 18 or later

## Functionality

| Functional                       | Supported |
| -------------------------------- | :-------: |
| Claiming daily reward            |    ✅     |
| Claiming Farming reward          |    ✅     |
| Claiming Friends reward          |    ✅     |
| Starting Farming                 |    ✅     |
| Playing games                    |    ✅     |
| Multithreading                   |    ✅     |
| Binding a proxy to a session     |    ✅     |
| Random sleep time between clicks |    ✅     |


| Settings                      | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| **API_ID / API_HASH**         | Platform data from which to launch a Telegram session (stock - Android)   |
| **CLAIM_DAILY_REWARD**        | Whether the bot should Claim daily rewards (True / False)                 |
| **CLAIM_FRIENDS_REWARD**      | Whether the bot should Claim friends rewards (True / False)               |
| **AUTO_PLAY_GAMES**           | Whether the bot should play blum game and claim reward (True / False)     |
| **AUTO_START_FARMING**        | Whether the bot should start farming (True / False)                       |
| **AUTO_CLAIM_FARMING_REWARD** | Whether the bot should claim farming rewards(True / False)                |
| **AUTO_JOIN_TRIBE**           | Whether the bot should join tribe [Freddy_bots] (True / False)            |
| **SLEEP_BETWEEN_TAP**         | Delay between taps in seconds (eg. 70)                                    |
| **USE_PROXY_FROM_FILE**       | Whether to use proxy from the `bot/config/proxies.js` file (True / False) |

## Installation

You can download [**Repository**](https://github.com/Googlegithb/idk) by cloning it to your system and installing the necessary dependencies:

```shell
~ >>> git clone https://github.com/Googlegithb/idk.git
~ >>> cd idk

remove node_modules
remove session_user_agents.json
#Linux and MocOS
~/idk >>> chmod +x check_node.sh
~/idk >>> ./check_node.sh

OR

~/idk >>> npm install
~/idk >>> cp .env-example .env
~/idk >>> nano .env # Here you must specify your API_ID and API_HASH , the rest is taken by default
~/idk >>> edit queryIds.json
~/idk >>> node index.js

#Windows
1. Double click on INSTALL.bat in idk directory to install the dependencies
2. Double click on START.bat in idk directory to start the bot

OR

~/idk >>> npm install
~/idk >>> cp .env-example .env
~/idk >>> # Specify your API_ID and API_HASH, the rest is taken by default
~/idk >>> node index.js
```

Also for quick launch you can use arguments, for example:

```shell
~/idk >>> node index.js --action=1

OR

~/idk >>> node index.js --action=2

#1 - Create session
#2 - Run clicker
```
