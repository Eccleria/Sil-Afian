import { ContainerBuilder, SlashCommandBuilder, TextDisplayBuilder } from "@discordjs/builders";
import {
  channelSend,
  interactionReply,
} from "ewilib";

import { PERSONALITY } from "../classes/personality.js";
import { Colors, MessageFlags } from "discord.js";

const command = new SlashCommandBuilder()
  .setDefaultMemberPermissions(0)
  .setName(PERSONALITY.getPersonality().copypasta.name)
  .setDescription(PERSONALITY.getPersonality().copypasta.description)
  .setDefaultMemberPermissions(0x0000010000000000)
  .addSubcommandGroup((group) => 
    group
      .setName(PERSONALITY.getPersonality().copypasta.spoilers.name)
      .setDescription(PERSONALITY.getPersonality().copypasta.spoilers.description)
      .addSubcommand((subcommand) => 
        subcommand 
          .setName(PERSONALITY.getPersonality().copypasta.spoilers.seeThread.name)
          .setDescription(PERSONALITY.getPersonality().copypasta.spoilers.seeThread.description)
      )
  );

const action = async (interaction) => {
  const options = interaction.options;
  const personnality = PERSONALITY.getPersonality().copypasta; 

  const group = options.getSubcommandGroup();

  if (group === personnality.spoilers.name) {
    //copypasta about animated series spoilers
    const subcommand = options.getSubcommand();
    const gPerso = personnality.spoilers;

    if (subcommand === gPerso.seeThread.name) {
      //redirect users to the spoiler thread
      const perso = gPerso.seeThread;

      //create the content to send
      const textDisplay = new TextDisplayBuilder()
        .setContent(perso.text);

      const container = new ContainerBuilder()
        .setAccentColor(Colors.Yellow)
        .addTextDisplayComponents(textDisplay);

      const components = [container];

      //send the container
      const payload = {flags: MessageFlags.IsComponentsV2, components};
      const message = await channelSend(interaction.channel, payload);
      if (message) interactionReply(interaction, personnality.sent);
      else interactionReply(interaction, personnality.errorNotSent);
    }
  }
};

const copypasta = {
  command,
  action,
  help: (interaction) => {
    const perso = PERSONALITY.getPersonality().copypasta;
    interactionReply(interaction, perso.help);
  },
  admin: false,
  sentinelle: true,
};

export default copypasta;
