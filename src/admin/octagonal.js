import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, StringSelectMenuBuilder } from "discord.js";

import { finishEmbed } from "./utils.js";
import { createButton } from "../commands/utils.js";
import { checkEmbedContent, fetchLogChannel, parseUnixTimestamp, setupEmbed } from "../helpers/index.js";
import { COMMONS } from "../commons.js";
import { PERSONALITY } from "../personality.js";

export const octagonalSelectMenu = (interaction) => {

}

export const octagonalButtonHandler = (interaction) => {
  const perso = PERSONALITY.getAdmin().octagonalSign.selectMenu;
  console.log("interaction", interaction);

  //disable the button
  const button = ButtonBuilder.from(interaction.component);
  const disabledComponents = button.setDisabled(true);
  const dActionRow = new ActionRowBuilder().addComponents(disabledComponents);
  //console.log(message.embeds);
  //const embeds = [EmbedBuilder.from(message.embeds[0])];
  const disabledPayload = {components: [dActionRow]};
  interaction.update(disabledPayload);

  //build the rateLimit select menu
  const options = perso.options;
  const selectMenu = new StringSelectMenuBuilder()
    .setMaxValues(1)
    .setPlaceholder(perso.placeholder)
    .addOptions(...options);

  const smActionRow = new ActionRowBuilder().addComponents(selectMenu);

  
}

export const octagonalLog = async (object, user) => {
  //get personality
  const personality = PERSONALITY.getAdmin();
  const octaPerso = personality.octagonalSign;

  let message = user ? object.message : object;
  if (message.partial) await message.fetch();

  //basic operations
  const logChannel = await fetchLogChannel(message); //get logChannelId
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
  const bPerso = octaPerso.button;
  const customId = bPerso.customId;
  const cmnShared = COMMONS.getShared();
  const button = createButton(customId, bPerso.label, ButtonStyle.Danger, cmnShared.octagonalSignEmoji);
  const actionRow = new ActionRowBuilder().addComponents(button);
  const payload = {components: [actionRow]};
  console.log("payload", payload);

  //send message
  finishEmbed(octaPerso, null, embed, false, logChannel, null, null, payload);
};
