import { addAdminLogs, getAdminLogs, removeAdminLogs } from "./db/dbAdmin.js";

import { addAlavirien, removeAlavirien } from "./db/dbAlavirien.js";

import {
  addIgnoredChannel,
  isIgnoredChannel,
  removeIgnoredChannel,
} from "./db/dbIgnore.js";

import {
  //API
  channelSend,
  fetchChannel,
  fetchGuild,
  fetchLogChannel,
  fetchThread,
  //Misc
  checkEmbedContent,
  dbReturnType,
  fetchSpamThread,
  gifParser,
  hasOctagonalSign,
  isAdmin,
  isReleasedCommand,
  isSentinelle,
  parseUnixTimestamp,
  removeEmote,
  setupEmbed,
  sliceData,
} from "./utils.js";

export {
  // utils
  //API
  channelSend,
  fetchChannel,
  fetchGuild,
  fetchSpamThread,
  fetchThread,
  //Misc
  checkEmbedContent,
  dbReturnType,
  fetchLogChannel,
  gifParser,
  hasOctagonalSign,
  isAdmin,
  isReleasedCommand,
  isSentinelle,
  parseUnixTimestamp,
  removeEmote,
  setupEmbed,
  sliceData,
  // dbHelper
  //admin
  addAdminLogs,
  getAdminLogs,
  removeAdminLogs,
  //alavirien
  addAlavirien,
  removeAlavirien,
  //ignore
  addIgnoredChannel,
  isIgnoredChannel,
  removeIgnoredChannel,
};
