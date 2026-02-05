import { EmbedBuilder } from "discord.js";
import { channelSend, fetchGuild } from "ewilib";

import { client } from "./bot.js";
import { COMMONS } from "./classes/commons.js";
import { fetchSpamThread, sendBotSpamEmbed } from "./helpers/index.js";

export const onShardError = (error) => {
  console.error("A websocket connection encountered an error:", error);
};

export const onUnhandledRejection = async (error) => {
  console.error("❌ Unhandled promise rejection:", error);

  //send a spam status
  const server = COMMONS.fetchFromEnv();
  const guild = await fetchGuild(client, server.guildId);
  const spamChannel = await fetchSpamThread(guild);
  const msg = "Unhandled promise rejection\n" + error;
  sendBotSpamEmbed(spamChannel, msg, COMMONS.getKO());
};

export const onUncaughtException = async (error) => {
  console.error("Uncaught exception:", error);
  console.log("message", error.message);
  console.log("name", error.name);
  console.log("cause", error.cause);

  //build spam data
  const server = COMMONS.fetchFromEnv();
  const guild = await fetchGuild(client, server.guildId);
  const spamChannel = await fetchSpamThread(guild);
  const msg = "❌ Uncaught Exception: " + error + "\n**Shutting down**"
  const embed = new EmbedBuilder()
    .setColor(COMMONS.getKO())
    .setDescription(msg);

  //send a spam status and exit
  await channelSend(spamChannel, {content: "<@290505766631112714>", embeds: [embed]});
  process.exit();
};
