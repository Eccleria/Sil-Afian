import { ButtonBuilder } from "discord.js";
import { octagonalButtonHandler } from "../admin/octagonal.js";
import { announceButtonHandler } from "./announce.js";
import { interactionReply } from "../helpers/index.js";

/**
 * Create a button from ButtonBuilder
 * @param {string} id Button id for recognition
 * @param {?string} label Button label shown to user
 * @param {string} style Button style
 * @param {?string} emoji Emoji to add to button label
 * @returns {ButtonBuilder}
 */
export const createButton = (id, label, style, emoji) => {
  const button = new ButtonBuilder().setCustomId(id).setStyle(style);
  if (label) button.setLabel(label);
  if (emoji) button.setEmoji(emoji);
  return button;
};

/**
 * Dispatch button interaction between action functions (here gift and pronuns)
 * @param {object} interaction
 */
export const buttonHandler = (interaction) => {
  const { customId } = interaction;
  if (customId.startsWith("announce")) announceButtonHandler(interaction);
  else if (customId.startsWith("octagonal")) octagonalButtonHandler(interaction);
  else interactionReply(interaction, "ERROR 404");
};

/**
 * Dispatch selectMenu interactions between corresponding functions
 * @param {object} interaction
 */
export const selectMenuHandler = (interaction) => {
  const { customId } = interaction;
  console.log("menuHandler", customId);
};
