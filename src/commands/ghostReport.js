import { SlashCommandBuilder, ContainerBuilder, Colors, SectionBuilder, ButtonStyle, ButtonBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContextMenuCommandBuilder } from "discord.js";
import { PERSONALITY } from "../personality.js";
import { fetchLogChannel, interactionReply, parseUnixTimestamp } from "../helpers/index.js";
import { createButton } from "./utils.js";
import { GHOSTREPORT, ghostReportObject } from "../classes/ghostReport.js";

//#region ButtonHandlers

export const ghostReportButtonHandler = (interaction) => {
  const { customId } = interaction;
  console.log(customId)
  if (customId.includes("_confirmButton")) 
    ghostReportConfirmContextButton(interaction);
  else if (customId.includes("_cancelButton"))
    ghostReportCancelContextButton(interaction);
}

const ghostReportConfirmContextButton = (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport.modal;

  const textInput = new TextInputBuilder()
    .setCustomId(perso.textInput.customId)
    .setLabel(perso.textInput.label)
    .setPlaceholder(perso.textInput.placeholder)
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setRequired(true);

  const actionRow = new ActionRowBuilder()
    .addComponents(textInput);

  const modal = new ModalBuilder()
    .setTitle(perso.title)
    .setCustomId(perso.customId)
    .addComponents(actionRow);

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
    .setContent(content);
  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .setAccentColor(Colors.DarkRed);

  const oldContainer = new ContainerBuilder(logMessage.components[0].toJSON());
  
  try {
    logMessage.edit({
      components: [oldContainer, container]
    })

    interactionReply(interaction, perso.sentContext);
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

const createLogMainPayload = (interaction, perso) => {
  //button
  const bPerso = perso.button;
  const channelLink = bPerso.link + `${interaction.guildId}/${interaction.channelId}`;
  const button = new ButtonBuilder()
    .setLabel(bPerso.label)
    .setStyle(ButtonStyle.Link)
    .setURL(channelLink);

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
    interactionReply(interaction, perso.errorNotSent);
    return null;
  }
}

//#endregion

//#region Slash Command

const command = new SlashCommandBuilder()
  .setDefaultMemberPermissions(0)
  .setName(PERSONALITY.getPersonality().ghostReport.name)
  .setDescription(PERSONALITY.getPersonality().ghostReport.description)

const action = async (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport;
 
  //build the interaction reply
  const confirmActionRow = createInteractionPayload(perso);
  const interactionPayload = {
    content: perso.sent, 
    components: [confirmActionRow], 
    flags: MessageFlags.Ephemeral, 
    withResponse: true
  };
  
  //build the log (NOTE: Components V2)
  const payload = createLogMainPayload(interaction, perso);
  
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
  console.log(interaction);
  const message = interaction.targetMessage;
  const perso = PERSONALITY.getPersonality().ghostMessageReport;

  //build the message log payload
  const messagePayload = {
    content: message.content,
    
  }

  //build the interaction reply
  const interactionPayload = createInteractionPayload(perso);

  //build the log main container
  const payload = createLogMainPayload(interaction, perso);

  const log = await sendLogAndReply(interaction, perso, payload, interactionPayload);
  log.reply(messagePayload);
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
