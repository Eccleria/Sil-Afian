import { SlashCommandBuilder } from "discord.js";
import { interactionReply } from "ewilib";

import { PERSONALITY } from "../personality.js";
import { addTicketBannedUser, dbReturnType } from "../helpers/index.js";
import { removeTicketBannedUser } from "../helpers/db/dbTicket.js";

const command = new SlashCommandBuilder()
  .setName(PERSONALITY.getPersonality().ticket.name)
  .setDescription(PERSONALITY.getPersonality().ticket.description)
  .setDefaultMemberPermissions(0x0000010000000000) //MODERATE_MEMBERS bitwise
  .addSubcommandGroup( (group) =>
    group
      .setName(PERSONALITY.getPersonality().ticket.ban.name)
      .setDescription(PERSONALITY.getPersonality().ticket.ban.description)
      .addSubcommand((command) => 
        command
          .setName(PERSONALITY.getPersonality().ticket.ban.add.name)
          .setDescription(PERSONALITY.getPersonality().ticket.ban.add.description)
          .addUserOption((option) => 
            option
              .setName(PERSONALITY.getPersonality().ticket.ban.add.userOption.name)
              .setDescription(PERSONALITY.getPersonality().ticket.ban.add.userOption.description)
              .setRequired(true)
          )
      )
      .addSubcommand((command) => 
        command
          .setName(PERSONALITY.getPersonality().ticket.ban.remove.name)
          .setDescription(PERSONALITY.getPersonality().ticket.ban.remove.description)
          .addUserOption((option) => 
            option
              .setName(PERSONALITY.getPersonality().ticket.ban.remove.userOption.name)
              .setDescription(PERSONALITY.getPersonality().ticket.ban.remove.userOption.description)
              .setRequired(true)
          )
      )
  );

const action = (interaction) => {
  console.log("ticket");
  const perso = PERSONALITY.getPersonality().ticket;
  const { options } = interaction;
  const group = options.getSubcommandGroup();
  const subcommand = options.getSubcommand();

  if (group && group === perso.ban.name) {
    //ban group
    const gPerso = perso.ban;
    if (subcommand && subcommand === gPerso.add.name) {
      const sPerso = gPerso.add;
      const target = options.getUser(sPerso.userOption.name, true);
      console.info(`ban add - author: ${interaction.user.id} - target: ${target.id} ${target.username}`);

      const result = addTicketBannedUser(interaction.client.db, target.id);
      if (result === dbReturnType.isOk)
        interactionReply(interaction, sPerso.banAdded);
      else
        interactionReply(interaction, sPerso.banAlreadyAdded);
      return;
    } else if (subcommand && subcommand === gPerso.remove.name) {
      const sPerso = gPerso.remove;
      const target = options.getUser(sPerso.userOption.name, true);
      console.info(`ban remove - author: ${interaction.user.id} - target: ${target.id} ${target.username}`);

      const result = removeTicketBannedUser(interaction.client.db, target.id);
      if (result === dbReturnType.isOk)
        interactionReply(interaction, sPerso.banRemoved);
      else
        interactionReply(interaction, sPerso.banAlreadyRemoved);
      return;
    }
  }
};

const ticket = {
  command,
  action,
  help: (interaction) => {
    const perso = PERSONALITY.getPersonality().ticket;
    interactionReply(interaction, perso.help);
  },
  admin: true,
  sentinelle: false,
};

export default ticket;
