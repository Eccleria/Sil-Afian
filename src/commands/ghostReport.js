import { SlashCommandBuilder, ContainerBuilder, Colors, SectionBuilder, ButtonStyle, ButtonBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContextMenuCommandBuilder, EmbedBuilder, LabelBuilder } from "discord.js";
import { interactionReply } from "ewilib";

import { PERSONALITY } from "../classes/personality.js";
import { checkEmbedContent, fetchLogChannel, gifParser, parseUnixTimestamp, setupEmbed } from "../helpers/index.js";
import { createButton } from "./utils.js";
import { GHOSTREPORT, ghostReportObject } from "../classes/ghostReport.js";
import { COMMONS } from "../classes/commons.js";

//#region ButtonHandlers

export const ghostReportButtonHandler = (interaction) => {
  const { customId } = interaction;
  if (customId.includes("_confirmButton")) 
    ghostReportConfirmContextButton(interaction);
  else if (customId.includes("_cancelButton"))
    ghostReportCancelContextButton(interaction);
}

const ghostReportConfirmContextButton = (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport.modal;

  const textInput = new TextInputBuilder()
    .setCustomId(perso.textInput.customId)
    .setPlaceholder(perso.textInput.placeholder)
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setRequired(true);

  const label = new LabelBuilder()
    .setLabel(perso.textInput.label)
    .setTextInputComponent(textInput);

  const modal = new ModalBuilder()
    .setTitle(perso.title)
    .setCustomId(perso.customId)
    .addLabelComponents(label);

  interaction.showModal(modal);
};

const ghostReportCancelContextButton = (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport.cancelButton;
  interaction.update({content: perso, components: []}); //reply and remove buttons
};

//#endregion

//#region Modal

export const ghostReportModalHandler = async (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport;

  //fetch the log to which user add context
  const logChannel = await fetchLogChannel(interaction);
  const report = GHOSTREPORT.getReportFromConfirmMessage(interaction.message.id);
  if (!report) {
    console.warn("ghostReport - report not found", interaction);
    interaction.update({content: perso.errorReportNotFound, components: []}); //remove the ghostReport interaction reply
    return;
  }
  const logMessage = await logChannel.messages.fetch(report.reportId);

  //create the context payload
  const content = interaction.fields.getTextInputValue(perso.modal.textInput.customId);
  const textDisplay = new TextDisplayBuilder()
    .setContent(perso.userContext + content);
  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .setAccentColor(Colors.DarkRed);

  const oldContainer = new ContainerBuilder(logMessage.components[0].toJSON());
  
  try {
    logMessage.edit({
      allowedMentions: { parse: [] }, 
      components: [oldContainer, container],
    })

    interaction.update({content: perso.sentContext, components: []});
  } catch(e) {
    console.error("ghostReport - fail to edit log with context", e);
    console.log("ghostReport context: ", content);
  }
};

//#endregion

//#region Log Helpers

const createInteractionPayload = (perso) => {
  const cPerso = perso.confirmButton;
  const confirmButton = createButton(
    cPerso.confirmButton.customId, 
    cPerso.confirmButton.label, 
    ButtonStyle.Success
  );
  const cancelButton = createButton(
    cPerso.cancelButton.customId, 
    cPerso.cancelButton.label, 
    ButtonStyle.Secondary
  );
  const confirmActionRow = new ActionRowBuilder()
    .addComponents(confirmButton, cancelButton);

  const interactionPayload = {
    content: perso.sent, 
    components: [confirmActionRow], 
    flags: MessageFlags.Ephemeral, 
    withResponse: true
  };
  return interactionPayload;
};

const createLogMainPayload = (interaction, perso, isChannel) => {
  //button
  const bPerso = perso.button;
  const link = isChannel ? interaction.channel.url : interaction.targetMessage.url;
  const button = new ButtonBuilder()
    .setLabel(bPerso.label)
    .setStyle(ButtonStyle.Link)
    .setURL(link);

  //text
  const tPerso = perso.components.text;
  const tChannel = tPerso.channel + interaction.channel.toString();
  const timestamp = Math.floor(interaction.createdTimestamp / 1000);
  const tTimestamp = parseUnixTimestamp(timestamp, "F");
  const tExecutor = tPerso.executor + interaction.user.toString();
  const text = [tChannel, tExecutor, tTimestamp].reduce((acc, cur) => acc + cur + '\n\n', "");
  const textComponent = new TextDisplayBuilder().setContent(text);

  //components
  const titleComponent = new TextDisplayBuilder().setContent(perso.components.title);
  const section = new SectionBuilder()
    .addTextDisplayComponents(textComponent)
    .setButtonAccessory(button);
  const container = new ContainerBuilder()
    .setAccentColor(Colors.DarkVividPink)
    .addTextDisplayComponents(titleComponent)
    .addSectionComponents(section);

  const payload = {
    allowedMentions: { parse: [] }, 
    components: [container], 
    flags: MessageFlags.IsComponentsV2 
  };
  return payload;
}

const sendLogAndReply = async (interaction, perso, logPayload, interactionPayload) => {
  //get log channel
  const logChannel = await fetchLogChannel(interaction);

  try {
    const msg = await logChannel.send(logPayload);
    if (msg)  {
      //send confirmation
      const reply = await interaction.reply(interactionPayload); 

      //store the report in GHOSTREPORT
      const timeout = setTimeout(() => {
        console.log("ghostReport - delete report ", msg.id);
        GHOSTREPORT.removeReport(msg.id);
      }, 2 * 60 * 60 * 1000); //2h timeout
      const report = new ghostReportObject(msg.id, interaction.user.id, timeout, interaction.channelId, reply.resource.message.id);
      GHOSTREPORT.addReport(report);
    }
    else interactionReply(interaction, perso.errorNotSent);
    return msg;
  } catch (err) {
    console.error("ghostReport ERROR ", err);
    console.error("err.requestBody.json.data ", err.requestBody.json.data);
    interactionReply(interaction, perso.errorNotSent);
    return null;
  }
}

//#endregion

//#region Slash Command

const command = new SlashCommandBuilder()
  //.setDefaultMemberPermissions(0)
  .setName(PERSONALITY.getPersonality().ghostReport.name)
  .setDescription(PERSONALITY.getPersonality().ghostReport.description)

const action = async (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport;
 
  //build the interaction reply
  const interactionPayload = createInteractionPayload(perso);
  
  //build the log (NOTE: Components V2)
  const payload = createLogMainPayload(interaction, perso, true);
  
  sendLogAndReply(interaction, perso, payload, interactionPayload);
}

const ghostReport = {
  command,
  action,
  help: (interaction) => {
    const perso = PERSONALITY.getPersonality().ghostReport;
    interactionReply(interaction, perso.help);
  },
  admin: false,
  sentinelle: false,
};

//#endregion

//#region Context Command

const contextCommand = new ContextMenuCommandBuilder()
  .setName(PERSONALITY.getPersonality().ghostMessageReport.name)
  .setType(3);

const contextAction = async (interaction) => {
  const message = await interaction.targetMessage.fetch();
  const perso = PERSONALITY.getPersonality().ghostMessageReport;
  const mPerso = perso.messageEmbed;

  //build the message log payload
  const messageEmbed = setupEmbed(Colors.DarkVividPink, mPerso, message.author, "tag")

  //add creation date + channel
  const uDate = new Date(message.createdAt); //set date as Date object
  const unixDate = Math.floor(uDate / 1000);
  const currentServer = COMMONS.fetchFromGuildId(message.guildId);
  if (currentServer.name === "prod") uDate.setHours(uDate.getHours() + 1); //add 1h to date
  const unixTimestamp = parseUnixTimestamp(unixDate, "F"); //slice date string
  messageEmbed.addFields(
    { name: mPerso.date, value: unixTimestamp, inline: true }, //date of message creation
    { name: mPerso.channel, value: `<#${message.channelId}>`, inline: true }, //message channel
  );

  //sneak the snapshot as if it is the original message.
  //create the snapshot embed
  const isSnapshot = message.messageSnapshots.size != 0;
  const sMessage = isSnapshot ? message.messageSnapshots.first() : message;
  const sEmbed = new EmbedBuilder()
    .setTitle(mPerso.snapshot)
    .setColor(Colors.LuminousVividPink);
    
  //get message data
  const attachments = sMessage.attachments.reduce((acc, cur) => {
    return [...acc, cur.attachment];
  }, []);
  let gifReduceInput = isSnapshot ? [messageEmbed, sEmbed] : [messageEmbed];
  const embeds = sMessage.embeds.reduce((acc, cur) => {
    const data = cur.data;
    if (data.type !== "gifv" && data.type !== "image") return [...acc, cur]; //remove gif embeds
    return acc;
  }, gifReduceInput);

  //stickers
  const stickers = message.stickers;
  const stickersUrl = stickers.reduce((acc, cur) => [...acc, cur.url], []);

  //handle content
  let content = sMessage.content ? sMessage.content : mPerso.note;
  checkEmbedContent(content, messageEmbed, mPerso.content);
  const gifs = gifParser(content); //handle gifs
  
  //build the interaction reply
  const interactionPayload = createInteractionPayload(perso);

  //build the log main container and send the log first part
  const payload = createLogMainPayload(interaction, perso, false);
  const log = await sendLogAndReply(interaction, perso, payload, interactionPayload);

  //Add the message data to the log
  const messagePayload = {embeds};
  await log.reply(messagePayload);
  if (stickersUrl && stickersUrl.length !== 0) {
    const textUrl = stickersUrl.reduce((acc, cur) => acc + "\n" + cur, "");
    await log.reply(textUrl);
  }
  if (attachments && attachments.length !== 0) {
    await log.reply({ files: attachments }); //if attachments, send new message
  }
  if (gifs !== null) {
    for (const gif of gifs) {
      await log.reply({ content: gif });
    }
  }
};

const ghostMessageReport = {
  command: contextCommand,
  action: contextAction,
    help: (interaction) => {
    const perso = PERSONALITY.getPersonality().ghostMessageReport;
    interactionReply(interaction, perso.help);
  },
  admin: false,
  sentinelle: false,
}

//#endregion

export { ghostReport, ghostMessageReport };
