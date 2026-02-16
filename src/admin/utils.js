import {
  AuditLogEvent,
  Colors,
  EmbedBuilder,
  Guild,
  GuildAuditLogsEntry,
  Message,
  TextChannel,
} from "discord.js";
import { channelSend, fetchChannel, fetchMessage, messageReply } from "ewilib";

import {
  checkEmbedContent,
  fetchLogChannel,
  getAdminLogs,
  isProduction,
  parseUnixTimestamp,
  removeAdminLogs,
  removeEmote,
  removeAlavirien,
  setupEmbed,
  sliceData,
} from "../helpers/index.js";
import { COMMONS } from "../classes/commons.js";
import { PERSONALITY } from "../classes/personality.js";

/**
 * Fetch AuditLog from API.
 * @param {Guild} guild Guild.
 * @param {AuditLogEvent} auditType AuditLogEvent for audit type request.
 * @param {number} limit Number of auditLogs fetched.
 * @param {string} [type] String for audit type request.
 * @returns {Promise<?GuildAuditLogsEntry>} Returns first auditLog entry or null if error.
 */
export const fetchAuditLog = async (guild, auditType, limit, type) => {
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: limit,
      type: auditType,
    }); //fetch logs
    if (type === "list") return fetchedLogs.entries; //return all entries
    return fetchedLogs.entries.first(); //return the first
  } catch (e) {
    //if no permission => crash
    console.log("AuditLog Fetch Error", e);
    return null;
  }
};

/**
 * Finish embeds and send them in the logChannel.
 * @param {object} eventPerso The personality related to the triggered event.
 * @param {?object} executor Object containing or not the executor, if any.
 * @param {(EmbedBuilder|EmbedBuilder[])} logEmbed Log embed, or array of embeds with log at index 0.
 * @param {boolean} isEmbedList Defines if the embed is an EmbedBuilder or an EmbedBuilder[]
 * @param {TextChannel} logChannel Log channel where to send embed.s.
 * @param {?string} text Additional text to add.
 * @param {?object} attachments Message attachments.
 * @param {?string[]} stickers Url of stickers.
 * @param {?object} iPayload Message payload.
 * @returns {Promise<?[Message]>} The log message.s sent
 */
export const finishEmbed = async (
  eventPerso,
  executor,
  logEmbed,
  isEmbedList,
  logChannel,
  text,
  attachments,
  stickers,
  iPayload,
) => {
  const currentServer = COMMONS.getTest(); //get test data
  if (isProduction && logChannel.guildId === currentServer.guildId) {
    //Sil'Afian detects test in test server => return
    console.log("Sil'Afian log in Test server", eventPerso.title);
    return null;
  }

  const embed = isEmbedList ? logEmbed[0] : logEmbed; //if contains multiple embeds, the 1st is the log

  if (eventPerso.executor && executor !== null)
    embed.addFields({
      name: eventPerso.executor,
      value: executor.toString(),
      inline: true,
    }); //add the executor section
  if (text)
    embed.addFields({
      name: eventPerso.text,
      value: text,
    }); //if any text (reason or content), add it

  //build embed message payload
  const payload = iPayload ? iPayload : {};
  payload.allowed_mentions = { parse: [] };

  try {
    payload.embeds = isEmbedList ? [embed, ...logEmbed.slice(1)] : [embed];
    const message = await channelSend(logChannel, payload); //send
    let result = [message];
    if (stickers && stickers.length !== 0) {
      console.log("stickers", stickers);
      const textUrl = stickers.reduce((acc, cur) => acc + "\n" + cur, "");
      const stickerMessage = await messageReply(message, { content: textUrl });
      result.push(stickerMessage);
    }
    if (attachments && attachments.length !== 0) {
      const attachmentPayload = {
        content: eventPerso.attachment,
        files: attachments,
      };
      const gifMessage = await messageReply(message, attachmentPayload); //if attachments, send new message
      result.push(gifMessage);
    }
    return result;
  } catch (e) {
    console.log("finishEmbed error\n", eventPerso.title, new Date(), e);
    return [];
  }
};

/**
 * Differentiate finishEmbed cases with corresponding input.
 * @param {object} obj Object related to listened event.
 * @param {?GuildAuditLogsEntry} log Audit log.
 * @param {object} eventPerso Personality related to the listened event.
 * @param {object} logPerso Audit log personality.
 * @param {(EmbedBuilder|EmbedBuilder[])} embed Embed, or array of embeds with log at index 0.
 * @param {boolean} isEmbedList Defines if the embed is an EmbedBuilder or an EmbedBuilder[]
 * @param {TextChannel} logChannel Log channel where to send embed.s.
 * @param {string} [text] Text to add when finishing the embed.
 * @param {number} [diff] Timing difference between log and listener fire. If diff >= 5 log too old.
 * @returns {?[Message]}
 */
export const endCasesEmbed = async (
  object,
  log,
  eventPerso,
  logPerso,
  embed,
  isEmbedList,
  logChannel,
  text,
  diff,
) => {
  //if no AuditLog

  if (diff >= 5) {
    //if log too old
    return await finishEmbed(
      eventPerso,
      logPerso.tooOld,
      embed,
      isEmbedList,
      logChannel,
    );
  }

  if (!log) {
    //if no AuditLog
    return await finishEmbed(
      eventPerso,
      logPerso.noLog,
      embed,
      isEmbedList,
      logChannel,
      text,
    );
  }

  const { executor, target } = log;

  if (target.id === object.id) {
    //check if log report the correct kick
    return await finishEmbed(
      eventPerso,
      executor,
      embed,
      isEmbedList,
      logChannel,
      text,
    );
  } else {
    //if bot or author executed the kick
    return await finishEmbed(
      eventPerso,
      logPerso.noExec,
      embed,
      isEmbedList,
      logChannel,
      text,
    );
  }
};

/**
 * Handle basic admin log cases.
 * @param {string} persoType Personnality type used for personalities fetch.
 * @param {any} object Listener argument.
 * @param {string} color Embed color.
 * @param {string} logType AuditType for fetchAuditLog.
 * @param {number} nb Number of log fetched in fetchAuditLog.
 * @param {string} [objType] If object concerns a user, "user", nullable otherwise.
 * @param {string} [embedType] If "tag", add obj as embed in the log embed.
 * @param {boolean} [needReason] If true, get reason to add to the embed.
 * @param {number} [diff] Timing difference between log and listener fire. If diff >= 5 log too old.
 */
export const processGeneralEmbed = async (
  persoType,
  obj,
  color,
  logType,
  nb,
  objType,
  embedType,
  needReason,
  diff,
) => {
  const personality = PERSONALITY.getAdmin(); //get personality
  const perso = personality[persoType];
  const aLog = personality.auditLog;

  if (isProduction && isTestServer(obj)) return; //if in prod && modif in test server

  const channel = await fetchLogChannel(obj.guild); //get logChannel
  const objToSend = objType === "user" ? obj.user : obj; //handle user objects case
  const embed = setupEmbed(color, perso, objToSend, embedType); //setup embed
  embed.addFields({ name: perso.id, value: objToSend.id, inline: true });
  const log = await fetchAuditLog(obj.guild, logType, nb); //get auditLog
  const text = needReason ? log.reason : null; //if needed, get reason

  endCasesEmbed(objToSend, log, perso, aLog, embed, false, channel, text, diff);
};

export const bufferizeEventUpdate = (
  client,
  oldObj,
  newObj,
  personality,
  logPerso,
  logChannel,
  type,
) => {
  //create timeout, store channels & timeout
  //differentiate type
  let obj, newData, timeout;
  if (type === "channel") {
    //get client data
    const channelUpdate = client.channelUpdate;
    obj = channelUpdate ? channelUpdate.channels : null;

    //create timeout
    timeout = setTimeout(
      channelUpdateLog,
      5000,
      client,
      personality,
      logPerso,
      logChannel,
    );

    //setup new data
    newData = {
      id: newObj.id,
      name: oldObj.name,
      parentId: newObj.parentId,
    };
  } else if (type === "role") {
    const roleUpdate = client.roleUpdate;
    obj = roleUpdate ? roleUpdate.roles : null; //get data

    //create timeout
    timeout = setTimeout(
      roleUpdateLog,
      5000,
      client,
      personality,
      logPerso,
      logChannel,
    );

    newData = { id: newObj.id, name: oldObj.name };
  }

  //initialise data to add to client
  let updateData;

  //check for identical obj
  if (obj !== null && obj !== undefined) {
    const names = obj.map((obj) => obj.name); //get all obj names
    const index = names.findIndex((name) => name === oldObj.name); //find any doublon
    if (index !== -1) {
      //if any doublon
      const precedent = obj[index]; //get precedent
      newData.oldPos = precedent.oldPos; //keep precedent oldPosition
      newData.newPos = newObj.rawPosition; //update newPosition

      //remove doublon
      const filtered = obj.filter((_obj, idx) => idx !== index);
      if (type === "channel")
        updateData = { channels: [...filtered, newData], timeout: timeout };
      else if (type === "role")
        updateData = { roles: [...filtered, newData], timeout: timeout };
    } else {
      //if no doublon
      newData.oldPos = oldObj.rawPosition;
      newData.newPos = newObj.rawPosition;
      if (type === "channel")
        updateData = { channels: [...obj, newData], timeout: timeout };
      else if (type === "role")
        updateData = { roles: [...obj, newData], timeout: timeout };
    }
    //store in client
    if (type === "channel") client.channelUpdate = updateData;
    else if (type === "role") client.roleUpdate = updateData;
  } else {
    //client not initialised or channels changes are too quick for client
    newData.oldPos = oldObj.rawPosition;
    newData.newPos = newObj.rawPosition;
    if (type === "channel") {
      updateData = { channels: [newData], timeout: timeout };
      client.channelUpdate = updateData;
    } else if (type === "role") {
      updateData = { roles: [newData], timeout: timeout };
      client.roleUpdate = updateData;
    }
  }
};

const channelUpdateLog = (client, chnUp, logPerso, logChannel) => {
  //Function called after channelUpdate timeout end
  //client == {channels: [data], timeout: timeout}
  //data == {id, name, parentId, oldPos, newPos}

  const { channels } = client.channelUpdate;

  //create embed
  const color = Colors.DarkAqua;
  const embed = setupEmbed(color, chnUp, null, "skip");

  //sort by parentId
  const parentIdOrder = channels
    .sort((a, b) => a.parentId - b.parentId)
    .slice(); //sort channels with parentId

  //regroup channels w/ same parent && sort parent channels
  const oRegrouped = regroup(parentIdOrder, "oldPos");
  const nRegrouped = regroup(parentIdOrder);

  //create old/new channel order
  const oldOrder = oRegrouped.list.reduce((acc, cur) => {
    if (cur.length && cur.length > 1)
      return [...acc, cur.sort((a, b) => a.oldPos - b.oldPos).slice()];
    return [...acc, cur];
  }, []); //sort channels with oldPosition
  const newOrder = nRegrouped.list.reduce((acc, cur) => {
    if (cur.length && cur.length > 1)
      return [...acc, cur.sort((a, b) => a.newPos - b.newPos).slice()];
    return [...acc, cur];
  }, []); //slice() for variable shallow copy

  //write text for embed
  const oLen = oldOrder.length;
  const oldText = oldOrder.reduce((acc, cur, idx) => {
    //cur = [x*{name, id, parent, old, new}]
    //write text for futur concatenation
    const len = cur.length;
    const lenNext = idx < oLen - 1 ? oldOrder[idx + 1].length : null;
    const sep = lenNext !== null && lenNext !== 1 && len !== 1 ? `\n` : null;

    const text = cur.reduce((acc, cur) => {
      //get text from list
      const name = removeEmote(cur.name); //remove the emote if any
      const indent = cur.parentId ? `  ${name}` : name; //if has parent, ident
      return [...acc, `\n${indent}`];
    }, []);
    if (sep !== null) return [...acc, ...text, sep];
    return [...acc, ...text];
  }, []);

  const newText = newOrder.reduce((acc, cur, idx) => {
    //write text for futur concatenation
    //check length for separation
    const len = cur.length;
    const lenNext = idx < oLen - 1 ? newOrder[idx + 1].length : null;
    const sep = lenNext !== null && lenNext !== 1 && len !== 1 ? "" : null;

    const text = cur.reduce((acc, cur) => {
      //get text from list
      const name = removeEmote(cur.name); //remove the emote if any
      const indent = cur.parentId ? `  ${name}` : name; //if has parent, ident
      return [...acc, indent];
    }, []);

    if (sep !== null) return [...acc, ...text, sep];
    return [...acc, ...text];
  }, []);
  console.log(
    "channelLog position update\n",
    "oldText",
    oldText,
    "newText",
    newText,
  );

  //delete duplicate channels not in bulk of changes
  const isDuplicate = oldText.reduce((acc, cur, idx) => {
    const nCur = newText[idx];
    const o = cur.includes(" ") ? cur.split(" ")[2] : cur.slice(1);
    const n = nCur.includes(" ") ? nCur.split(" ")[2] : nCur;

    return [...acc, o === n];
  }, []); //true if no change, false else
  const first = isDuplicate.findIndex((bool) => !bool);
  const last = isDuplicate.lastIndexOf(false) + 1;
  const oText = oldText.slice(first, last);
  const nText = newText.slice(first, last);

  //check for empty modifs
  if (oText.length === 0) {
    finishEmbed(
      chnUp,
      logPerso.noLog,
      embed,
      false,
      logChannel,
      chnUp.noModifs,
    ); //send embed
    return;
  }

  const space = 15;
  const orderText = oText.reduce(
    (acc, cur, idx) => {
      const spaced = space2Strings(cur, nText[idx], space, " |");
      if (idx === oText.length - 1) {
        //if last one
        return acc + spaced + "\n```"; //add end of code line code
      }
      return acc + spaced;
    },
    "```md\n" + space2Strings("avant", "apres", space, " |") + "\n",
  );

  finishEmbed(chnUp, logPerso.noLog, embed, false, logChannel, orderText); //send embed

  client.channelUpdate = {}; //remove from client
};

const roleUpdateLog = (client, roleUp, logPerso, logChannel) => {
  //Function called after roleUpdate timeout end
  //client == {roles: [data], timeout: timeout}
  //data == {id, name, oldPos, newPos}
  const { roles } = client.roleUpdate;

  //change embed
  const color = Colors.DarkGold;
  const embed = setupEmbed(color, roleUp, null, "skip");
  embed.setTitle(roleUp.titleRoles); //change title

  //create old/new channel order
  const oldSortedOrder = roles.sort((a, b) => b.oldPos - a.oldPos).slice(); //sort channels with oldPosition
  const newSortedOrder = roles.sort((a, b) => b.newPos - a.newPos).slice();

  //filter duplicate ids (same old/new position)
  const filtered = oldSortedOrder.reduce(
    (acc, cur, idx) => {
      const newCur = newSortedOrder[idx];
      //console.log("newCur", newCur.id, "cur.id", cur.id)
      if (cur.id === newCur.id) return acc;
      else
        return {
          oldOrder: [...acc.oldOrder, cur],
          newOrder: [...acc.newOrder, newCur],
        };
    },
    { oldOrder: [], newOrder: [] },
  );
  if (filtered.oldOrder.length === 0) {
    //if empty, no changes => return
    finishEmbed(
      roleUp,
      logPerso.noLog,
      embed,
      false,
      logChannel,
      roleUp.noModifs,
    ); //send embed
    return;
  }

  const { oldOrder, newOrder } = filtered;

  const space = 15;
  const orderText = oldOrder.reduce(
    (acc, cur, idx) => {
      const spaced = space2Strings(cur.name, newOrder[idx].name, space, " |");
      if (idx === oldOrder.length - 1) {
        //if last one
        return acc + "\n" + spaced + "\n```"; //add end of code line code
      }
      return acc + "\n" + spaced;
    },
    "```md\n" + space2Strings("avant", "apres", space, " |") + "\n",
  );

  finishEmbed(roleUp, logPerso.noLog, embed, false, logChannel, orderText); //send embed

  client.roleUpdate = {}; //remove from client
};

const space2Strings = (str1, str2, dist, sep) => {
  //slice 2 strings, pad the end using dist + add a separator
  const sliced1 = str1.startsWith("\n")
    ? str1.slice(0, dist + 1).padEnd(dist + 1, " ")
    : str1.slice(0, dist).padEnd(dist, " ");
  const sliced2 = str2.startsWith("\n")
    ? str2.slice(0, dist + 1).padEnd(dist + 1, " ")
    : str2.slice(0, dist).padEnd(dist, " ");

  return `${sliced1}${sep}${sliced2}`;
};

const regroup = (element, type) => {
  return element.reduce(
    (acc, cur) => {
      //regroup according to parentId
      const list = acc.list; //get list
      const len = list.length; //get list length
      const lastParentId = acc.lastParentId; //get lastParentId
      if (lastParentId === cur.parentId && cur.parentId !== null) {
        //same parentId && not null : regroup
        list[acc.lastAddIdx].push(cur);
        return {
          list: list,
          lastParentId: lastParentId,
          lastAddIdx: acc.lastAddIdx,
        };
      } else if (lastParentId !== cur.parentId && cur.parentId !== null) {
        //new to place correctly :
        const parentsIds = list.map((obj) => obj[0].id); //get all parent ids
        const parentIdx = parentsIds.findIndex((id) => cur.parentId === id); //find parent index in list
        if (parentIdx === -1) {
          //no parent => new goup alone
          return {
            list: [...list, [cur]],
            lastParentId: cur.parentId,
            lastAddIdx: len,
          };
        }
        //has parent
        parentIdx === len - 1
          ? list.push([cur])
          : list.splice(parentIdx + 1, 0, [cur]); //insert [cur]
        return {
          list: list,
          lastParentId: cur.parentId,
          lastAddIdx: parentIdx + 1,
        };
      }
      //is a parent => sort with others
      const parents = list.reduce((acc, cur) => {
        if (cur.length === 1 && cur[0].parentId === null) {
          if (type === "oldPos") return [...acc, cur[0].oldPos];
          return [...acc, cur[0].newPos];
        }
        return [...acc, null]; //return null for index preservation
      }, []); //[id, [], id, id, [], id]...
      const parentIdx = parents.reduce((saved, now, indx) => {
        //if is number && id < idToAdd => save index
        const toCheck = type === "oldPos" ? cur.oldPos : cur.newPos;
        if (typeof now === "number" && toCheck > now) return indx + 1;
        return saved;
      }, 0); //find parent index in list
      list.splice(parentIdx, 0, [cur]);
      return { list: list, lastParentId: cur.parentId, lastAddIdx: len };
    },
    { list: [], lastParentId: null, lastAddIdx: 0 },
  ); //{list: [[{id, name, parentId, oldPos, newPos}, ...],], lastParentId
};

export const fetchMessageItself = async (message) => {
  try {
    return await message.fetch();
  } catch (e) {
    console.log(e);
    return null;
  }
};

const logsRemover = async (client) => {
  console.log("logsRemover");
  const db = client.db;
  const server = isProduction ? COMMONS.getProd() : COMMONS.getTest();

  // frequent logs remove
  let type = "frequent"; //differentiate process for "frequent" and "userAD" logs
  const dbData = getAdminLogs(db);
  let data = dbData[type][0]; //get corresponding data
  if (data.length !== 0) {
    const threadChannel = await client.channels.fetch(server.logThreadId);
    const size = 100;
    const slice = Math.ceil(data.length / size); //get number of time to slice the array by 100
    const sliced = sliceData(slice, data, size);

    sliced.forEach(async (elements) => {
      const result = await threadChannel.bulkDelete(elements); //bulkDelete and get ids where it was okay

      const diff = elements.reduce((acc, cur) => {
        if (result.has(cur))
          return acc; //if no diff
        else return [...acc, cur];
      }, []); //find diff for error check

      console.log("frequent diff", diff); //log for debug
    });
  }
  removeAdminLogs(db, type); //remove from db

  // userAD logs remove
  type = "userAD";
  data = dbData[type][0];
  if (data.length !== 0) {
    const logChannel = await fetchChannel(
      client.channels,
      server.inAndOutLogChannelId,
    );
    const result = await logChannel.bulkDelete(data);

    const diff = data.reduce((acc, cur) => {
      if (result.has(cur))
        return acc; //if no diff
      else return [...acc, cur];
    }, []); //find diff for error check
    console.log("userAD diff", diff); //log for debug
  }
  removeAdminLogs(db, type); //remove from db
};

export const initAdminLogClearing = (client, waitingTime) => {
  setTimeout(
    () => {
      logsRemover(client);
      setInterval(
        () => {
          logsRemover(client);
        },
        24 * 3600 * 1000,
        client,
      );
    },
    waitingTime,
    client,
  );
};

/**
 * Check if the event comes from test server
 * @param {object} eventObject eventObject given to listener from API
 * @returns {boolean} True if is test server
 */
export const isTestServer = (eventObject) => {
  const testServer = COMMONS.getTest();
  const test = testServer.guildId === eventObject.guild.id;
  return test; //if test, return true
};

export const removeUserFromDB = (userId, client) => {
  //check if user is in db for removal
  const db = client.db;
  removeAlavirien(db, userId);
};

export const isSameEmojiInGuildUpdate = (a, b) => {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.emoji_id === b.emoji_id &&
    a.emoji_name === b.emoji_name &&
    a.moderated === b.moderated
  );
};

export const onlyInLeft = (left, right, compareFunction) => {
  return left.filter(
    (leftValue) =>
      !right.some((rightValue) => compareFunction(leftValue, rightValue)),
  );
};

export const createMessageReferenceEmbed = async (client, reference, color) => {
  const perso = PERSONALITY.getAdmin().messageReference;

  let channel = null;
  if (reference.channelId && reference.messageId)
    channel = await fetchChannel(client.channels, reference.channelId);

  let embed;
  if (!channel) {
    //no channel => send placeholder embed
    embed = new EmbedBuilder().setTitle(perso.title).setColor(color);
    embed.addFields({
      name: perso.title,
      value: perso.placeholder,
    });
    return embed;
  }

  const message = await fetchMessage(channel.messages, reference.messageId);
  embed = setupEmbed(color, perso, message.author, "tag");

  const currentServer = COMMONS.fetchFromGuildId(reference.guildId);

  //add creation date + channel
  const uDate = new Date(message.createdAt); //set date as Date object
  const unixDate = Math.floor(uDate / 1000);
  if (currentServer.name === "prod") uDate.setHours(uDate.getHours() + 1); //add 1h to date
  const unixTimestamp = parseUnixTimestamp(unixDate, "F"); //slice date string
  embed.addFields(
    { name: perso.date, value: unixTimestamp, inline: true }, //date of message creation
    { name: perso.channel, value: `<#${message.channelId}>`, inline: true }, //message channel
  );

  //add reference messsage content
  const len = message.content.length;
  if (len > 0) checkEmbedContent(message.content, embed, perso);

  //add message link
  const link = `[${perso.linkMessage}](${message.url})`;
  embed.addFields({ name: perso.linkName, value: link });
  return embed;
};
