import { ChannelType } from "discord.js";
import { interactionReply } from "ewilib";

import { checkPinStatus } from "./admin/listeners.js";
import { octagonalLog } from "./admin/utils.js";
import { buttonHandler, selectMenuHandler } from "./commands/utils.js";
import { isReleasedCommand } from "./helpers/index.js";
import { COMMONS } from "./classes/commons.js";
import { readContentAndReact } from "./fun.js";
import { PERSONALITY } from "./classes/personality.js";
import { presentationHandler } from "./admin/alavirien.js";

//#region Listeners
export const onInteractionCreate = (interaction) => {
  if (interaction.isButton()) {
    buttonHandler(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    console.log("selectMenu interaction detected");
    selectMenuHandler(interaction);
    return;
  }

  const client = interaction.client; //get client

  if (interaction.isContextMenuCommand()) {
    //context commands
    const contextCommands = client.contextCommands; //get commands

    const foundCommand = contextCommands.find(
      (cmd) => cmd.command.name === interaction.commandName,
    );

    if (foundCommand) foundCommand.action(interaction); //if found command, execute its action
    return;
  }

  const slashCommands = client.slashCommands;

  if (interaction.isAutocomplete()) {
    //interaction with autocomplete activated
    const autoCompleteCommands = slashCommands.filter(
      (cmd) => cmd.autocomplete,
    ); //get commands with autocomplete action
    const foundCommand = autoCompleteCommands
      ? autoCompleteCommands.find(
          (cmd) => cmd.command.name === interaction.commandName,
        )
      : null; //find command that fired onInteractionCreate
    if (foundCommand && isReleasedCommand(foundCommand))
      foundCommand.autocomplete(interaction);
    else interaction.respond([]); //if not found, return no choices
  } else if (interaction.isCommand()) {
    //slash commands
    const client = interaction.client; //get client
    const slashCommands = client.slashCommands; //get commands

    const foundCommand = slashCommands.find(
      (cmd) => cmd.command.name === interaction.commandName,
    );

    if (foundCommand && isReleasedCommand(foundCommand))
      foundCommand.action(interaction, "/");
    //if found command, execute its action
    else
      interactionReply(
        interaction,
        PERSONALITY.getAdmin().commands.notReleased,
      );
  }
};

export const onMessageCreate = async (message) => {
  // Function triggered for each message sent
  const { channel } = message;

  if (channel.type === ChannelType.DM) return;
  else {
    const currentServer = COMMONS.fetchFromGuildId(channel.guildId);
    onPublicMessage(message, currentServer);
  }
};

export const onReactionAdd = async (messageReaction, user) => {
  // Function triggered for each reaction added
  const cmnShared = COMMONS.getShared();

  //if message not in cache, count == null => requires to fetch
  if (messageReaction.count === null) await messageReaction.fetch();

  if (
    cmnShared.octagonalSignEmoji === messageReaction.emoji.name &&
    messageReaction.count === 1
  ) {
    octagonalLog(messageReaction, user);
    return;
  }

  const currentServer = COMMONS.fetchFromGuildId(
    messageReaction.message.channel.guild.id,
  );
  if (
    messageReaction.message.channel.id ===
      currentServer.presentationChannelId &&
    currentServer.presentationReactId === messageReaction.emoji.name
  ) {
    presentationHandler(currentServer, messageReaction, user);
    return; //no command in presentation channel
  }
};

//#endregion

//#region Listeners helpers

const onPublicMessage = (message, currentServer) => {
  const { author } = message;

  if (
    author.id === process.env.CLIENTID || // ignoring message from himself
    !currentServer || // ignoring if wrong guild
    (process.env.DEBUG === "yes" && currentServer.name === "prod") // ignoring if debug && prod
  )
    return;

  checkPinStatus(message);
  readContentAndReact(message, currentServer);
};

//#endregion
