const { default: axios } = require("axios");
const logger = require("../utils/logger");
const headers = require("./header");
const { SocksProxyAgent } = require("socks-proxy-agent");
const settings = require("../config/config");
const app = require("../config/app");
const user_agents = require("../config/userAgents");
const fs = require("fs");
const sleep = require("../utils/sleep");
const ApiRequest = require("./api");
var _ = require("lodash");

class NonSessionTapper {
  constructor(query_id, query_name) {
    this.session_name = query_name;
    this.query_id = query_id;
    this.session_user_agents = this.#load_session_data();
    this.headers = { ...headers, "user-agent": this.#get_user_agent() };
    this.api = new ApiRequest(this.session_name);
  }

  #load_session_data() {
    try {
      const data = fs.readFileSync("session_user_agents.json", "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    logger.info(`${this.session_name} | Generating new user agent...`);
    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    fs.writeFileSync(
      "session_user_agents.json",
      JSON.stringify(session_user_agents, null, 2),
    );
  }

  #proxy_agent(proxy) {
    try {
      if (!proxy) return null;
      let proxy_url;
      if (!proxy.password && !proxy.username) {
        proxy_url = `socks${proxy.socksType}://${proxy.ip}:${proxy.port}`;
      } else {
        proxy_url = `socks${proxy.socksType}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
      }
      return new SocksProxyAgent(proxy_url);
    } catch (e) {
      logger.error(
        `${
          this.session_name
        } | Proxy agent error: ${e}\nProxy: ${JSON.stringify(proxy, null, 2)}`,
      );
      return null;
    }
  }

  async #get_tg_web_data() {
    try {
      const json = {
        query: this.query_id,
      };
      return json;
    } catch (error) {
      logger.error(
        `${this.session_name} | ❗️Unknown error during Authorization: ${error}`,
      );
      throw error;
    } finally {
      /* await this.tg_client.disconnect(); */
      await sleep(1);
      logger.info(`${this.session_name} | 🚀 Starting session...`);
    }
  }

  async #get_access_token(tgWebData, http_client) {
    try {
      const response = await http_client.post(
        `${app.gatewayApiUrl}/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP`,
        JSON.stringify(tgWebData),
      );

      return response.data?.token;
    } catch (error) {
      logger.error(
        `${this.session_name} | ❗️Kesalahan tidak diketahui saat mendapatkan Token Akses: ${error}`,
      );
      await sleep(3); // 3 seconds delay
    }
  }

  async #check_proxy(http_client, proxy) {
    try {
      const response = await http_client.get("https://httpbin.org/ip");
      const ip = response.data.origin;
      logger.info(`${this.session_name} | Proxy IP: ${ip}`);
    } catch (error) {
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("getaddrinfo") ||
        error.message.includes("ECONNREFUSED")
      ) {
        logger.error(
          `${this.session_name} | Kesalahan: Tidak dapat menentukan alamat proxy. Server proxy di ${proxy.ip}:${proxy.port} tidak dapat ditemukan. Silakan periksa alamat proxy dan koneksi jaringan Anda.`,
        );
        logger.error(`${this.session_name} | No proxy will be used.`);
      } else {
        logger.error(
          `${this.session_name} | Proxy: ${proxy.ip}:${proxy.port} | Error: ${error.message}`,
        );
      }

      return false;
    }
  }

  async run(proxy) {
    let http_client;
    let access_token_created_time = 0;

    let profile_data;
    let sleep_reward = 0;
    let access_token;

    if (settings.USE_PROXY_FROM_FILE && proxy) {
      http_client = axios.create({
        httpsAgent: this.#proxy_agent(proxy),
        headers: this.headers,
        withCredentials: true,
      });
      const proxy_result = await this.#check_proxy(http_client, proxy);
      if (!proxy_result) {
        http_client = axios.create({
          headers: this.headers,
          withCredentials: true,
        });
      }
    } else {
      http_client = axios.create({
        headers: this.headers,
        withCredentials: true,
      });
    }
    while (true) {
      try {
        const currentTime = Date.now() / 1000;
        if (currentTime - access_token_created_time >= 1800) {
          const tg_web_data = await this.#get_tg_web_data();
          access_token = await this.#get_access_token(tg_web_data, http_client);
          http_client.defaults.headers["authorization"] =
            `Bearer ${access_token?.access}`;
          access_token_created_time = currentTime;
          await sleep(2);
        }

        profile_data = await this.api.get_user_data(http_client);
        const time = await this.api.get_time(http_client);
        const checkJWT = await this.api.check_jwt(http_client);

        if (!checkJWT) {
          logger.info(
            `${this.session_name} | Token JWT telah kedaluwarsa. Mencoba menyegarkan...`,
          );
          profile_data = null;
          access_token = null;
          access_token_created_time = 0;
          continue;
        }

        if (!profile_data) {
          continue;
        }

        // Tribe
        if (settings.AUTO_JOIN_TRIBE) {
          const check_my_tribe = await this.api.check_my_tribe(http_client);
          if (check_my_tribe === false) {
            const get_tribes = await this.api.get_tribes(http_client);
            if (
              Array.isArray(get_tribes?.items) &&
              get_tribes?.items?.length > 0
            ) {
              await this.api.join_tribe(http_client, get_tribes?.items[0].id);
              logger.info(
                `${this.session_name} | Joined tribe: <lb>${get_tribes?.items[0].chatname}</lb>`,
              );
            } else {
              logger.info(`${this.session_name} | No tribe to join`);
            }
          }
        }

        // Farming
        if (!profile_data?.farming) {
          if (settings.AUTO_START_FARMING) {
            const farm_response = await this.api.start_farming(http_client);
            logger.info(
              `${
                this.session_name
              } | Farming Dimulai  | End Time: <la>${new Date(
                farm_response?.endTime,
              )}</la> | Penghasilan Rate: <pi>${farm_response?.earningsRate}</pi>`,
            );
          }
        } else if (time?.now >= profile_data?.farming?.endTime) {
          if (settings.AUTO_CLAIM_FARMING_REWARD) {
            logger.info(`${this.session_name} | Claim hadiah farming ...`);
            const farm_reward = await this.api.claim_farming(http_client);
            logger.info(
              `${this.session_name} | 🎉 Claim hadiah farming | Balance <lb>${farm_reward?.availableBalance}</lb> | Tersedia Play Pass <ye>${farm_reward?.playPasses}</ye>`,
            );
          }
        } else if (time?.now >= profile_data?.farming?.startTime) {
          // in hours
          logger.info(
            `${this.session_name} | Farming ends in ${Math.floor(
              (profile_data?.farming?.endTime - time?.now) / 1000 / 60 / 60,
            )} hour(s)`,
          );
        }

        // Sleep
        await sleep(3);

        // Re-assign profile data
        profile_data = await this.api.get_user_data(http_client);
        if (settings.AUTO_PLAY_GAMES) {
          // Game
          if (profile_data?.playPasses > 0) {
            const game_response = await this.api.start_game(http_client);
            if (game_response?.gameId) {
              logger.info(
                `${this.session_name} | Game Dimulai  | Durasi: <la> 35 seconds</la>`,
              );
              await sleep(35);
              const points = _.random(100, 200);
              const data = {
                gameId: game_response?.gameId,
                points: points,
              };
              const game_reward = await this.api.claim_game_reward(
                http_client,
                data,
              );

              // Re-assign profile data
              profile_data = await this.api.get_user_data(http_client);
              if (game_reward.toLowerCase() == "ok") {
                logger.info(
                  `${this.session_name} | Game Slesai  | Mendatkan: <gr>+${points}</gr> Blum points | Available Play Passes: <ye>${profile_data?.playPasses}</ye> | Balance: <lb>${profile_data?.availableBalance}</lb>`,
                );
              }
            }
          }
        }

        // Sleep
        await sleep(3);

        if (settings.CLAIM_FRIENDS_REWARD) {
          // Friend reward
          const friend_reward = await this.api.get_friend_balance(http_client);
          if (
            friend_reward?.canClaim &&
            !isNaN(parseInt(friend_reward?.amountForClaim))
          ) {
            if (parseInt(friend_reward?.amountForClaim) > 0) {
              const friend_reward_response =
                await this.api.claim_friends_balance(http_client);
              if (friend_reward_response?.claimBalance) {
                // Re-assign profile data
                profile_data = await this.api.get_user_data(http_client);
                logger.info(
                  `${this.session_name} | 🎉 Claim hadiah teman <gr>+${friend_reward_response?.claimBalance}</gr> | Balance: <lb>${profile_data?.availableBalance}</lb>`,
                );
              }
            }
          }
        }
        // Sleep
        await sleep(3);

        // Daily reward
        if (currentTime >= sleep_reward) {
          if (settings.CLAIM_DAILY_REWARD) {
            const daily_reward = await this.api.daily_reward(http_client);
            if (daily_reward) {
              logger.info(`${this.session_name} | 🎉 Claim hadiah harian`);
            } else {
              sleep_reward = currentTime + 18000;
              logger.info(
                `${
                  this.session_name
                } | ⏰ Hadiah harian tidak tersedia. Silahkan check: <b><lb>${new Date(
                  sleep_reward * 1000,
                )}</lb></b>`,
              );
            }
          }
        }
      } catch (error) {
        logger.error(`${this.session_name} | ❗️Unknown error: ${error}`);
      } finally {
        logger.info(
          `${this.session_name} | 😴 sleeping for ${settings.SLEEP_BETWEEN_TAP} seconds...`,
        );
        await sleep(settings.SLEEP_BETWEEN_TAP);
      }
    }
  }
}
module.exports = NonSessionTapper;
