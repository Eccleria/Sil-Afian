import dayjs from "dayjs";
import { EmbedBuilder } from "discord.js";
import { fetchChannel } from "ewilib";

import { COMMONS } from "../classes/commons.js";

//#region Misc

/**
 * Import types exclusively for jsdocs
 * @import { TextChannel } from "discord.js"
 */

/**
 * Slice a string or an Array len times and returns it as an array
 * @param {number} len Length of the returned array
 * @param {string|Array} content The data to slice
 * @param {number} size Size of the slices
 * @returns {string[]} Array of sliced things
 */
export const sliceData = (len, content, size) => {
  const lenArray = Array.from(new Array(len));
  const sliced = lenArray.reduce((acc, _cur, idx) => {
    if (idx === len - 1) return [...acc, content.slice(idx * size)]; //last index
    const sliced = content.slice(idx * size, (idx + 1) * size);
    return [...acc, sliced];
  }, []); //slice content in less than size characters
  return sliced;
};

/**
 * Slice content if required then add it to the embed
 * @param {string} content Old Content from previous embed to slice
 * @param {object} embed New embed that will have sliced content
 * @param {object} personality The personality object of the embed.
 */
export const checkEmbedContent = (content, embed, personality) => {
  const size = 1024;
  const slice = Math.ceil(content.length / size); //get number of time to slice oldContent by 1024

  if (slice > 1) {
    //if need to slice
    const sliced = sliceData(slice, content, size); //slice content

    //add content to embed, according to its index
    sliced.forEach((str, idx) => {
      if (idx === 0)
        embed.addFields({
          name: personality.text,
          value: str,
        });
      //name's different from others
      else embed.addFields({ name: personality.textAgain, value: str });
    });
  } else embed.addFields({ name: personality.text, value: content });
};

/**
 * @enum {number} return values for most db helper functions
 */
export const dbReturnType = Object.freeze({
  isNotOk: -1,
  isOk: 0,
  isIn: 1,
  isNotIn: 2,
});

/**
 * Fetch Log Channel using commons value
 * @param {string} guildId The guild id.
 * @param {string} type String to ditinguish which channel/thread to return.
 *  Can be "thread" or "inAndOut" channel. Empty argument is for log channel.
 * @returns {Promise<TextChannel>}
 */
export const fetchLogChannel = async (guild, type = null) => {
  const currentServer = COMMONS.fetchFromGuildId(guild.id); //get server local data

  let id;
  switch (type) {
    default:
      id = currentServer.logChannelId;
      break;
    case "thread":
      id = currentServer.logThreadId;
      break;
    case "inAndOut":
      id = currentServer.inAndOutLogChannelId;
      break;
  }

  return await fetchChannel(guild.channels, id); //return the log channel
};

export const fetchSpamThread = async (guild) => {
  const commons = COMMONS.fetchFromGuildId(guild.id);
  const logChannel = await fetchLogChannel(guild);
  return await fetchThread(logChannel, commons.spamThreadId);
};

/**
 * Get strings corresponding to gif url.
 * @param {string} content Message content where to look for gifs.
 * @returns {?string[]} If any, returns array of gif url strings.
 */
export const gifParser = (content) => {
  const tenor = "tenor.com/";
  const end = ".gif";

  if (content.includes(tenor) || content.includes(end)) {
    //if any gif inside content
    const words = content.split(" "); //split content into words
    const results = words.reduce((acc, cur) => {
      //look for gif position in content
      if (cur.includes(tenor) || cur.endsWith(end)) {
        //if has link
        const start = cur.indexOf("https://"); //look for link position
        const sliced = start !== -1 ? cur.slice(start) : cur; //slice start of link
        return [...acc, sliced]; //return link
      }
      return acc;
    }, []);
    return results;
  }
  return null;
};

export const hasOctagonalSign = (content, cmnShared) => {
  return content.includes(cmnShared.octagonalSignEmoji);
};

export const isAdmin = (authorId) => {
  // Check if is admin users
  const admins = COMMONS.getShared().admins;
  return admins.includes(authorId);
};

/**
 * Return if command has been released or not. No releaseDate is True.
 * @param {object} command
 * @returns {boolean}
 */
export const isReleasedCommand = (command) => {
  const day = dayjs();
  if (command.releaseDate) return command.releaseDate.diff(day) <= 0;
  else return true;
};

export const isProduction = process.env.PROD === "yes" ? true : false;

/**
 * Return if guildMember has Sentinelle role or not.
 * @param {any} member guildMember to verify role
 * @param {any} currentServer current server data from commons.json
 * @returns {boolean}
 */
export const isSentinelle = (member, currentServer) => {
  const roles = member.roles.cache;
  return roles.has(currentServer.sentinelleRoleId);
};

/**
 * Remove starting emote from a string
 * @param {string} str String to modify
 * @returns {string} New string sliced without emote
 */
export const removeEmote = (str) => {
  //remove emote from the begining of a string
  const ascii = str[0].charCodeAt(0);
  if (ascii > 255) return str.slice(str[0].length); //if not a standard char => emote
  return str;
};

/**
 * 
 * @param {Channel} channel 
 * @param {string} msg 
 * @param {ColorResolvable} colour 
 */
export const sendBotSpamEmbed = async (channel, msg, colour) => {
  const embed = new EmbedBuilder()
    .setColor(colour)
    .setDescription(msg);

  try {
    await channelSend(channel, {embeds: [embed]});
  } catch (e) {
    console.error("Cannot send bot spam message", e);
  }
}

/**
 * Create and setup a EmbedBuilder with common properties.
 * @param {string} color The color of the embed.
 * @param {object} personality The personality object of the embed.
 * @param {?object} object Object containing or not the author.
 * @param {?string} type Differentiate object use case.
 *                       tag for user as embed, skip to ignore this field, user for its username,
 *                       otherwise for mentionable as embed
 * @returns {EmbedBuilder} Embed with basic properties.
 */
export const setupEmbed = (color, personality, object, type) => {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(personality.title)
    .setTimestamp();

  if (personality.description) embed.setDescription(personality.description);

  const field = { name: personality.author, inline: true }; //field init
  if (type === "tag") {
    //add user as embed if required
    field.value = object.toString();
    embed.addFields(field);
  } else if (type === "skip")
    return embed; //allows to skip the 3rd field
  else if (type === "user") {
    //add user if required
    field.value = object.username;
    embed.addFields(field);
  } else {
    //otherwise, add the object name as embed (for mentionables)
    field.value = object.name.toString();
    embed.addFields(field);
  }
  return embed;
};

/**
 * Parse unix timestamp into dynamic Discord embed timestamp
 * @param {string} time Unix timestamp
 * @param {string} type Dynamic type. Default "R"
 * @returns {string}
 */
export const parseUnixTimestamp = (time, type = "R") => {
  return `<t:${time}:${type}>`;
};

//#endregion
