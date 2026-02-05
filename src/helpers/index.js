import { addAdminLogs, getAdminLogs, removeAdminLogs } from "./db/dbAdmin.js";

import { addAlavirien, removeAlavirien } from "./db/dbAlavirien.js";

import {
  addIgnoredChannel,
  isIgnoredChannel,
  removeIgnoredChannel,
} from "./db/dbIgnore.js";

import {
  //API
  fetchLogChannel,
  //Misc
  checkEmbedContent,
  dbReturnType,
  fetchSpamThread,
  gifParser,
  hasOctagonalSign,
  isAdmin,
  isReleasedCommand,
  isProduction,
  isSentinelle,
  parseUnixTimestamp,
  removeEmote,
  sendBotSpamEmbed,
  setupEmbed,
  sliceData,
} from "./utils.js";

export {
  // utils
  //API
  fetchSpamThread,
  //Misc
  checkEmbedContent,
  dbReturnType,
  fetchLogChannel,
  gifParser,
  hasOctagonalSign,
  isAdmin,
  isReleasedCommand,
  isProduction,
  isSentinelle,
  parseUnixTimestamp,
  removeEmote,
  sendBotSpamEmbed,
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
