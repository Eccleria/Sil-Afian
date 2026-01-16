import dotenv from "dotenv";
dotenv.config();
import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { ChannelType, Routes } from "discord-api-types/v9";
import {   interactionReply } from "ewilib";

import announce from "./announce.js";
import botEmote from "./botEmote.js";
import botMessage from "./botMessage.js";
import saveLog from "./save-log.js";
import timeout from "./timeout.js";
import {
  //dbHelper
  addIgnoredChannel,
  isIgnoredChannel,
  removeIgnoredChannel,
  //utils
  isAdmin,
  isReleasedCommand,
  isSentinelle,
} from "../helpers/index.js";
import { COMMONS } from "../commons.js";
import { PERSONALITY } from "../personality.js";

const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

const ping = {
  command: new SlashCommandBuilder()
    .setName(PERSONALITY.getPersonality().helloWorld.name)
    .setDescription(PERSONALITY.getPersonality().helloWorld.description)
    .setDefaultMemberPermissions(0x0000010000000000), //set default permission to 0x0000010000000000 (manage messages)
  action: (interaction) => {
    const personality = PERSONALITY.getPersonality();
    interactionReply(interaction, personality.helloWorld.pong);
  },
  help: (interaction) => {
    const personality = PERSONALITY.getPersonality();
    interactionReply(interaction, personality.helloWorld.help);
  },
  admin: false,
  releaseDate: null,
  sentinelle: true,
};

const ignoreChannel = {
  command: new SlashCommandBuilder()
    .setName(PERSONALITY.getPersonality().ignoreChannel.name)
    .setDescription(PERSONALITY.getPersonality().ignoreChannel.description)
    .setDefaultMemberPermissions(0x0000010000000000)
    .addChannelOption((option) =>
      option
        .setName(PERSONALITY.getPersonality().ignoreChannel.channelOption.name)
        .setDescription(
          PERSONALITY.getPersonality().ignoreChannel.channelOption.description,
        )
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText),
    ),
  action: (interaction) => {
    const db = interaction.client.db; // get db
    const iPerso = PERSONALITY.getPersonality().ignoreChannel; //get personality

    //get corresponding channel data
    const ignoredChannel =
      interaction.options.getChannel(iPerso.channelOption.name) ||
      interaction.channel;
    const ignoredChannelId = ignoredChannel.id;

    if (isIgnoredChannel(db, ignoredChannelId)) {
      removeIgnoredChannel(db, ignoredChannelId);
      const content = iPerso.notIgnored + `<#${ignoredChannelId}>.`;
      interactionReply(interaction, content);
    } else {
      addIgnoredChannel(db, ignoredChannelId);
      const content = iPerso.ignored + `<#${ignoredChannelId}>.`;
      interactionReply(interaction, content);
    }
  },
  help: (interaction) => {
    const personality = PERSONALITY.getPersonality();
    interactionReply(interaction, personality.ignoreChannel.help);
  },
  admin: true,
  releaseDate: null,
  sentinelle: true,
};

//regroup all commands
const contextCommands = [saveLog]; //context commands (message, channel, user)
const slashCommands = [
  announce,
  botEmote,
  botMessage,
  ignoreChannel,
  ping,
  timeout,
]; //command + action

// HELP

const helpCommands = [...contextCommands, ...slashCommands];

const help = {
  action: (interaction) => {
    const perso = PERSONALITY.getPersonality().help;

    const userOption = interaction.options.getString(perso.stringOption.name); //get option given by user
    const foundCommand = helpCommands.find((cmd) =>
      userOption.startsWith(cmd.command.name),
    ); //find associated command

    if (foundCommand) {
      const member = interaction.member;

      const currentServer = COMMONS.fetchFromGuildId(interaction.guildId);
      const isModo = isSentinelle(interaction.member, currentServer);
      const isAdminUser = isAdmin(member.id);

      if (isModo && foundCommand.sentinelle)
        foundCommand.help(interaction, userOption);
      //execute sentinelle commands help
      else if (isAdminUser) foundCommand.help(interaction, userOption);
      //execute admin foundCommand help
      else if (
        isReleasedCommand(foundCommand) &&
        (!foundCommand.sentinelle || !foundCommand.admin)
      )
        foundCommand.help(interaction, userOption);
      //execute released foundCommand help
      else interactionReply(interaction, perso.notFound);
    } else interactionReply(interaction, perso.notFound);
  },
  autocomplete: (interaction) => {
    const focusedValue = interaction.options.getFocused(); //get value which is currently user edited
    const member = interaction.member;
    const currentServer = COMMONS.fetchFromGuildId(interaction.guildId);

    const isModo = isSentinelle(member, currentServer);
    const isDev = isAdmin(member.id);
    const commands = helpCommands.reduce((acc, cmd) => {
      if (isModo && cmd.sentinelle) return [...acc, cmd];
      else if (isDev) return [...acc, cmd];
      else if (isReleasedCommand(cmd) && !cmd.sentinelle && !cmd.admin)
        return [...acc, cmd];
      else return acc;
    }, []);

    const helpOptions = commands.reduce((acc, cur) => {
      const name = cur.subcommands ? cur.subcommands : [cur.command.name];
      return [...acc, ...name];
    }, []);

    const filtered = helpOptions.filter((choice) =>
      choice.startsWith(focusedValue),
    ); //filter to corresponding commands names

    const sliced = filtered.length > 24 ? filtered.slice(0, 24) : filtered;
    interaction.respond(
      sliced.map((choice) => ({ name: choice, value: choice })),
    );
  },
  command: new SlashCommandBuilder()
    .setName(PERSONALITY.getPersonality().help.name)
    .setDescription(PERSONALITY.getPersonality().help.description)
    .addStringOption((option) =>
      option
        .setName(PERSONALITY.getPersonality().help.stringOption.name)
        .setDescription(
          PERSONALITY.getPersonality().help.stringOption.description,
        )
        .setRequired(true)
        .setAutocomplete(true),
    ),
  help: (interaction) => {
    const personality = PERSONALITY.getPersonality().help.help;
    interactionReply(interaction, personality);
  },
  admin: false,
  releaseDate: null,
  sentinelle: false,
};

helpCommands.push(help);
slashCommands.push(help);

// API

// COMMANDS SENDING TO API
export const slashCommandsInit = async (guildId, client) => {
  try {
    console.log("Started refreshing application (/) commands.");

    const self = process.env.CLIENTID; //get self Discord Id
    await rest.put(Routes.applicationGuildCommands(self, guildId), {
      body: helpCommands.map((cmd) => cmd.command.toJSON()),
    }); //send commands jsons to API for command create/update

    console.log("Successfully reloaded application (/) commands.");

    //save commands in client
    client.slashCommands = slashCommands; //save slashCommands
    client.contextCommands = contextCommands; //save contextCommands
  } catch (error) {
    console.error(error);
  }
};
