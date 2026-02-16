import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  StringSelectMenuBuilder,
} from "discord.js";

import { finishEmbed } from "./utils.js";
import { createButton } from "../commands/utils.js";
import {
  checkEmbedContent,
  fetchLogChannel,
  parseUnixTimestamp,
  setupEmbed,
} from "../helpers/index.js";
import { COMMONS } from "../classes/commons.js";
import { PERSONALITY } from "../classes/personality.js";
import { fetchChannel, fetchGuild, interactionReply } from "ewilib";

export const octagonalSelectMenu = async (interaction) => {
  //handle the result selected in the selectMenu
  console.log("octagonalSelectMenu");
  const perso = PERSONALITY.getAdmin().octagonalSign;

  //get channel to rate limit
  const embed = interaction.message.embeds[0];
  const channelField = embed.fields.find((fld) => fld.name === perso.channel);
  const channelId = channelField.value.slice(2, channelField.value.length - 1);
  const guild = await fetchGuild(interaction.client, interaction.guildId);
  const channel = await fetchChannel(guild.channels, channelId);
  console.log(channel.id);
  //get the new rate limit value
  const selected = interaction.values;
  const rateLimit = Number(selected[0]);
  console.log("ratelimit", rateLimit);
  //apply the rate limit
  try {
    await channel.setRateLimitPerUser(rateLimit, perso.reason);
    interactionReply(interaction, perso.rateLimitApplied);
  } catch (e) {
    console.error("octagonal ratelimit", e);
    interactionReply(interaction, perso.errorRejection);
  }
};

export const octagonalButtonHandler = async (interaction) => {
  //dispatch the interaction to proper handler
  const { customId } = interaction;
  const perso = PERSONALITY.getAdmin().octagonalSign;
  if (customId === perso.buttonRateLimit.customId)
    octagonalRatelimitButton(interaction);
  else if (customId === perso.buttonCancel.customId)
    octagonalCancelButton(interaction);
  else interactionReply(interaction, "ERROR 404");
};

const octagonalRatelimitButton = async (interaction) => {
  //reply to the rate limit button
  await interaction.deferUpdate();
  const perso = PERSONALITY.getAdmin().octagonalSign;
  const sPerso = perso.selectMenu;

  //disable the button
  const button = ButtonBuilder.from(interaction.component);
  const disabledComponents = button.setDisabled(true);
  const dActionRow = new ActionRowBuilder().addComponents(disabledComponents);
  const disabledPayload = { components: [dActionRow] };
  await interaction.editReply(disabledPayload);

  //build the rateLimit select menu
  const options = sPerso.options;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(sPerso.customId)
    .setMaxValues(1)
    .setPlaceholder(sPerso.placeholder)
    .addOptions(...options);

  const smActionRow = new ActionRowBuilder().addComponents(selectMenu);

  //build the cancel button
  const bCPerso = perso.buttonCancel;
  const cmnShared = COMMONS.getShared();
  const cancelButton = createButton(
    bCPerso.customId,
    bCPerso.label,
    ButtonStyle.Primary,
    cmnShared.cancelButton,
  );
  const bActionRow = new ActionRowBuilder().addComponents(cancelButton);

  //send payload
  const payload = { components: [smActionRow, bActionRow] };
  interaction.editReply(payload);
};

const octagonalCancelButton = async (interaction) => {
  //reply to the cancel button
  const perso = PERSONALITY.getAdmin().octagonalSign;

  //remove the button and the selectMenu, get back to "rateLimit" button
  await interaction.deferUpdate();

  //get channel to rate limit
  const embed = interaction.message.embeds[0];
  const channelField = embed.fields.find((fld) => fld.name === perso.channel);
  const channelId = channelField.value.slice(2, channelField.value.length - 1);
  const guild = await fetchGuild(interaction.client, interaction.guildId);
  const channel = await fetchChannel(guild.channels, channelId);

  //remove the rate limit
  try {
    channel.setRateLimitPerUser(0, perso.reason);
  } catch (e) {
    console.error("octagonal ratelimit", e);
    interactionReply(interaction, perso.errorRejection);
  }

  //add the rateLimit button
  const bRlPerso = perso.buttonRateLimit;
  const cmnShared = COMMONS.getShared();
  const ratelimitButton = createButton(
    bRlPerso.customId,
    bRlPerso.label,
    ButtonStyle.Danger,
    cmnShared.octagonalSignEmoji,
  );

  //assemble buttons in the ActionRow
  const actionRow = new ActionRowBuilder().addComponents(ratelimitButton);
  const payload = { components: [actionRow] };
  interaction.editReply(payload);
};

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
  const ratelimitButton = createButton(
    bRlPerso.customId,
    bRlPerso.label,
    ButtonStyle.Danger,
    cmnShared.octagonalSignEmoji,
  );

  //assemble buttons in the ActionRow
  const actionRow = new ActionRowBuilder().addComponents(ratelimitButton);
  const payload = { components: [actionRow] };
  console.log("payload", payload);

  //send message
  finishEmbed(
    octaPerso,
    null,
    embed,
    false,
    logChannel,
    null,
    null,
    null,
    payload,
  );
};
