import dotenv from "dotenv";
dotenv.config();

import dayjs from "dayjs";
import RelativeTime from "dayjs/plugin/relativeTime.js";
import "dayjs/locale/fr.js";
dayjs.extend(RelativeTime);
dayjs.locale("fr");

import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import { join } from "path";

// listeners imports
import {
  onChannelCreate,
  onChannelDelete,
  onChannelUpdate,
  onThreadCreate,
  onThreadDelete,
  onRoleCreate,
  onRoleDelete,
  onRoleUpdate,
  onMessageDelete,
  onMessageUpdate,
  onGuildBanAdd,
  onGuildBanRemove,
  onGuildMemberAdd,
  onGuildMemberRemove,
  onGuildMemberUpdate,
} from "./admin/listeners.js";
import {
  onInteractionCreate,
  onMessageCreate,
  onReactionAdd,
} from "./listeners.js";

// admin inits
import { setupAlavirien } from "./admin/alavirien.js";
import { initAdminLogClearing } from "./admin/utils.js";

// commands import
import { slashCommandsInit } from "./commands/slash.js";

// helpers imports

// jsons import
import { COMMONS } from "./commons.js";

// fun imports
import { setActivity, updateActivity } from "./fun.js";

// DB
const file = join("db", "db.json"); // Use JSON file for storage
const adapter = new JSONFile(file);
const db = new Low(adapter, {});

db.read(); // Read data from JSON file, this will set db.data content
db.wasUpdated = false;

setInterval(async () => {
  // db updater loop, used to centralize db.write()
  if (db.wasUpdated) {
    await db.write();
    db.wasUpdated = false;
  }
}, 10000);

// Discord CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Channel, // Required to receive DMs
    Partials.Message, // MESSAGE && REACTION for role handling
    Partials.Reaction,
  ],
});

client.db = db; // db cache

// Create bot startup
client.once("ready", async () => {
  // Time variables
  const tomorrow = dayjs().add(1, "day").hour(8).minute(0).second(0);
  const frequency = 24 * 60 * 60 * 1000; // 24 hours in ms

  // Bot init
  console.log("I am ready!");
  setupAlavirien(client, tomorrow, frequency);

  //Sil'Afian activity
  setActivity(client);
  updateActivity(client);

  //slash commands
  const server =
    process.env.DEBUG === "yes" ? COMMONS.getTest() : COMMONS.getProd();
  const guildId = server.guildId;
  slashCommandsInit(guildId, client); //commands submit to API

  //LOGS
  const tomorrow2Am = tomorrow.hour(2); //tomorrow @ 2am
  const timeTo2Am = tomorrow2Am.diff(dayjs()); //10000; //waiting time in ms
  initAdminLogClearing(client, timeTo2Am); //adminLogs clearing init
});

// Create an event listener for messages
client.on(Events.MessageCreate, onMessageCreate);
client.on(Events.MessageReactionAdd, onReactionAdd);

// listener for buttons/modals
client.on(Events.InteractionCreate, onInteractionCreate);

// listeners for LOGS
client.on(Events.MessageDelete, onMessageDelete);
client.on(Events.MessageUpdate, onMessageUpdate);

client.on(Events.GuildRoleCreate, onRoleCreate);
client.on(Events.GuildRoleDelete, onRoleDelete);
client.on(Events.GuildRoleUpdate, onRoleUpdate);

client.on(Events.ChannelCreate, onChannelCreate);
client.on(Events.ChannelDelete, onChannelDelete);
client.on(Events.ChannelUpdate, onChannelUpdate);

client.on(Events.ThreadCreate, onThreadCreate);
client.on(Events.ThreadDelete, onThreadDelete);

client.on(Events.GuildBanAdd, onGuildBanAdd);
client.on(Events.GuildBanRemove, onGuildBanRemove);

client.on(Events.GuildMemberAdd, onGuildMemberAdd);
client.on(Events.GuildMemberRemove, onGuildMemberRemove);
client.on(Events.GuildMemberUpdate, onGuildMemberUpdate);

// Log the bot in
client.login(process.env.TOKEN);
