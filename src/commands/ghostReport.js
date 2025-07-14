import { SlashCommandBuilder, ContainerBuilder, Colors, SectionBuilder, ButtonStyle, ButtonBuilder, TextDisplayBuilder, MessageFlags } from "discord.js";
import { PERSONALITY } from "../personality.js";
import { fetchLogChannel, interactionReply, parseUnixTimestamp } from "../helpers/index.js";

const command = new SlashCommandBuilder()
  .setDefaultMemberPermissions(0)
  .setName(PERSONALITY.getPersonality().ghostReport.name)
  .setDescription(PERSONALITY.getPersonality().ghostReport.description)

const action = async (interaction) => {
  const perso = PERSONALITY.getPersonality().ghostReport;

  //build the log (NOTE: Components V2)
  //button
  const bPerso = perso.button;
  const channelLink = bPerso.link + `${interaction.guildId}/${interaction.channelId}`;
  const button = new ButtonBuilder()
    .setLabel(bPerso.label)
    .setStyle(ButtonStyle.Link)
    .setURL(channelLink);

  //text
  const cPerso = perso.components;
  const tPerso = cPerso.text;
  const tChannel = tPerso.channel + interaction.channel.toString();
  const timestamp = Math.floor(interaction.createdTimestamp / 1000);
  const tTimestamp = parseUnixTimestamp(timestamp, "F");
  const tExecutor = tPerso.executor + interaction.user.toString();
  const text = [tChannel, tExecutor, tTimestamp].reduce((acc, cur) => acc + cur + '\n\n', "");
  const textComponent = new TextDisplayBuilder().setContent(text);

  //components
  const titleComponent = new TextDisplayBuilder().setContent(cPerso.title);
  const section = new SectionBuilder()
    .addTextDisplayComponents(textComponent)
    .setButtonAccessory(button);
  const container = new ContainerBuilder()
    .setAccentColor(Colors.DarkVividPink)
    .addTextDisplayComponents(titleComponent)
    .addSectionComponents(section);

  
  //get log channel
  const logChannel = await fetchLogChannel(interaction);
  
  //send log
  const payload = {
    allowedMentions: { parse: [] }, 
    components: [container], 
    flags: MessageFlags.IsComponentsV2 
  };
  try {
    const msg = await logChannel.send(payload);
    if (msg) interactionReply(interaction, perso.sent);
    else interactionReply(interaction, perso.errorNotSent);
  } catch (err) {
    console.log("ghostReport ERROR ", err);
  }
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

export default ghostReport;
