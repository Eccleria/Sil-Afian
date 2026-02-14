import { ActionRowBuilder, ButtonStyle, Colors, ContainerBuilder, MessageFlags, TextDisplayBuilder } from "discord.js";
import { createButton } from "../commands/utils.js"
import { PERSONALITY } from "../personality.js";
import { COMMONS } from "../commons.js";

export const sendDMCreateTicket = (message) => {
  const perso = PERSONALITY.getAdmin().ticket.createDM;

  // create the components
  const commons = COMMONS.getShared();
  const textDisplay = new TextDisplayBuilder().setContent(perso.text);

  const confirmButton = createButton(
    perso.confirm.customId, 
    perso.confirm.label, 
    ButtonStyle.Success, 
    "🎫"
  );
  const cancelButton = createButton(
    perso.cancel.customId, 
    perso.cancel.label, 
    ButtonStyle.Danger, 
    commons.cancelButton,
  );
  const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const container = new ContainerBuilder()
    .setAccentColor(Colors.Fuchsia)
    .addTextDisplayComponents(textDisplay)
    .addActionRowComponents(actionRow);

  const payload = {components: [container], flags: MessageFlags.IsComponentsV2};
  message.channel.send(payload);
};
