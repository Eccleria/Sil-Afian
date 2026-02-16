import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, StringSelectMenuBuilder } from "discord.js";

import { finishEmbed } from "./utils.js";
import { createButton } from "../commands/utils.js";
import { checkEmbedContent, fetchLogChannel, parseUnixTimestamp, setupEmbed } from "../helpers/index.js";
import { COMMONS } from "../classes/commons.js";
import { PERSONALITY } from "../classes/personality.js";

export const octagonalSelectMenu = (interaction) => {
  //handle the result selected in the selectMenu
}

export const octagonalButtonHandler = async (interaction) => {
  await interaction.deferUpdate();
  const perso = PERSONALITY.getAdmin().octagonalSign
  const sPerso = perso.selectMenu;

  //disable the button
  const button = ButtonBuilder.from(interaction.component);
  const disabledComponents = button.setDisabled(true);
  const dActionRow = new ActionRowBuilder().addComponents(disabledComponents);
  //console.log(message.embeds);
  //const embeds = [EmbedBuilder.from(message.embeds[0])];
  const disabledPayload = {components: [dActionRow]};
  await interaction.editReply(disabledPayload);

  //build the rateLimit select menu
  const options = sPerso.options;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(sPerso.customId)
    .setMaxValues(1)
    .setPlaceholder(sPerso.placeholder)
    .addOptions(...options);

  const smActionRow = new ActionRowBuilder()
    .addComponents(selectMenu);

  //build the cancel button
  const bCPerso = perso.buttonCancel;
  const cmnShared = COMMONS.getShared();
  const cancelButton = createButton(bCPerso.customId, bCPerso.label, ButtonStyle.Primary, cmnShared.cancelButton);
  const bActionRow = new ActionRowBuilder()
    .addComponents(cancelButton);

  const payload = {components: [smActionRow, bActionRow]};
  interaction.editReply(payload);
}

const octagonalRatelimitButton = (interaction) => {
  //reply to the rate limit button
}

const octagonalCancelButton = (interaction) => {
  //reply to the cancel button
}

export const octagonalLog = async (object, user) => {
  //get personality
  const personality = PERSONALITY.getAdmin();
  const octaPerso = personality.octagonalSign;
  const cmnShared = COMMONS.getShared();

  let message = user ? object.message : object;
  if (message.partial) await message.fetch();

  //basic operations
  const logChannel = await fetchLogChannel(message.guild); //get logChannelId
  const embed = setupEmbed(
    Colors.LuminousVividPink,
    octaPerso,
    message.author,
    "tag",
  ); //setup embed

  //add more info to embed
  const executor = user
    ? await message.guild.members.fetch(user.id)
    : object.author; //get executor
  const date = Math.floor(message.createdTimestamp / 1000);
  const unixTimestamp = parseUnixTimestamp(date, "F");

  embed.addFields(
    { name: octaPerso.date, value: unixTimestamp, inline: true }, //date of message creation
    { name: octaPerso.channel, value: `<#${message.channelId}>`, inline: true }, //message channel
  );
  checkEmbedContent(message.content, embed, octaPerso); //slice content if required and add it to embed
  embed.addFields(
    { name: octaPerso.executor, value: executor.toString(), inline: true }, //emote sent by
    {
      name: octaPerso.linkName,
      value: `[${octaPerso.linkMessage}](${message.url})`,
      inline: true,
    }, //get message link
  );

  //create rateLimit button
  const bRlPerso = octaPerso.buttonRateLimit;
  const ratelimitButton = createButton(bRlPerso.customId, bRlPerso.label, ButtonStyle.Danger, cmnShared.octagonalSignEmoji);

  //assemble buttons in the ActionRow
  const actionRow = new ActionRowBuilder().addComponents(ratelimitButton);
  const payload = {components: [actionRow]};
  console.log("payload", payload);

  //send message
  finishEmbed(octaPerso, null, embed, false, logChannel, null, null, null, payload);
};
