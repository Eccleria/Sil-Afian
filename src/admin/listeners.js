import dayjs from "dayjs";
import {
  AuditLogEvent,
  ChannelType,
  Colors,
  MessageType,
  OverwriteType,
} from "discord.js";
import {
  isTestServer,
  bufferizeEventUpdate,
  endCasesEmbed,
  fetchAuditLog,
  fetchMessage,
  finishEmbed,
  processGeneralEmbed,
  octagonalLog,
  removeUserFromDB,
  onlyInLeft,
  isSameEmojiInGuildUpdate,
} from "./utils.js";
import {
  addAlavirien,
  addAdminLogs,
  checkEmbedContent,
  fetchLogChannel,
  gifParser,
  hasOctagonalSign,
  parseUnixTimestamp,
  setupEmbed,
} from "../helpers/index.js";
import { COMMONS } from "../commons.js";
import { PERSONALITY } from "../personality.js";

//#region LISTENERS

export const onChannelCreate = async (channel) => {
  if (channel.type === ChannelType.DM) return;

  const logType = AuditLogEvent.ChannelCreate;
  const perso = "channelCreate";
  const color = Colors.DarkAqua;
  processGeneralEmbed(perso, channel, color, logType, 1, null, "tag");
};

export const onChannelDelete = async (channel) => {
  if (channel.type === ChannelType.DM) return;

  const logType = AuditLogEvent.ChannelDelete;
  const perso = "channelDelete";
  const color = Colors.DarkAqua;
  processGeneralEmbed(perso, channel, color, logType, 1);
};

export const onChannelUpdate = async (oldChannel, newChannel) => {
  // handle channel update event

  //get personality
  const personality = PERSONALITY.getAdmin();
  const chnUp = personality.channelUpdate;
  const auditLog = personality.auditLog;
  const perm = chnUp.permissionOverwrites;

  //basic operations
  if (process.env.DEBUG === "no" && isTestServer(newChannel)) return; //if in prod && modif in test server
  const logChannel = await fetchLogChannel(newChannel); //get logChannelId
  if (process.env.DEBUG === "no" && isTestServer(logChannel)) return; //if in prod && modif in test server
  const color = Colors.DarkAqua;
  const embed = setupEmbed(color, chnUp, newChannel, "tag"); //setup embed
  const chnLog = await fetchAuditLog(
    oldChannel.guild,
    AuditLogEvent.ChannelUpdate,
    1,
  ); //get auditLog

  //check for permission overwrite
  const oldOverwrite = oldChannel.permissionOverwrites.cache;
  const newOverwrite = newChannel.permissionOverwrites.cache;
  const diffOverwrite = oldOverwrite.difference(newOverwrite);

  if (diffOverwrite.size !== 0) {
    //add/removed permission orverwrite
    const [oldDiffCol, newDiffCol] = diffOverwrite.partition((perm) =>
      oldOverwrite.has(perm.id),
    ); //separate old & new permissions

    if (oldDiffCol.size !== 0) {
      //removed permission overwrite
      const oldDiff = oldDiffCol.first();
      const id = oldDiff.id; //get PO target id
      let obj;
      try {
        obj =
          oldDiff.type === OverwriteType.Member
            ? await oldChannel.guild.members.fetch(id)
            : await oldChannel.guild.roles.fetch(id);
      } catch (e) {
        console.log(e);
        obj = null;
      }
      const name =
        oldDiff.type === OverwriteType.Member
          ? perm.userRemoved
          : perm.roleRemoved;

      if (obj) embed.addFields({ name: name, value: obj.toString() });
      finishEmbed(chnUp, null, embed, false, logChannel);
      return;
    } else if (newDiffCol.size !== 0) {
      //added permission overwrite
      const newDiff = newDiffCol.first();
      const id = newDiff.id; //get PO target id
      const obj =
        newDiff.type === OverwriteType.Member
          ? await newChannel.guild.members.fetch(id)
          : await newChannel.guild.roles.fetch(id);
      const name =
        newDiff.type === OverwriteType.Member ? perm.userAdded : perm.roleAdded;

      embed.addFields({ name: name, value: obj.toString() });
      finishEmbed(chnUp, null, embed, false, logChannel);
      return;
    }
  }

  //sort by id
  oldOverwrite.sort((a, b) => a.id - b.id);
  newOverwrite.sort((a, b) => a.id - b.id);

  //find PO difference by couple
  const diff = oldOverwrite.reduce((acc, cur) => {
    const newPO = newOverwrite.get(cur.id);
    if (
      cur.deny.bitfield !== newPO.deny.bitfield ||
      cur.allow.bitfield !== newPO.allow.bitfield
    )
      return [...acc, [cur, newPO]];
    else return acc;
  }, []);

  if (diff.length !== 0) {
    //if permissionOverwrite changed without add/remove role/user
    //get bit diff, write it along channel.toString()
    const modifs = await diff.reduce(async (acc, cur) => {
      //data: [[old, new], ...]
      const oldAllow = cur[0].allow.toArray();
      const oldDeny = cur[0].deny.toArray();
      const newAllow = cur[1].allow.toArray();
      const newDeny = cur[1].deny.toArray();

      //get permissions differences
      const allowRemoved = oldAllow.filter((perm) => !newAllow.includes(perm)); //if not in new => removed
      const allowAdded = newAllow.filter((perm) => !oldAllow.includes(perm)); //if not in old => added
      const denyRemoved = oldDeny.filter((perm) => !newDeny.includes(perm)); //if not in new => removed
      const denyAdded = newDeny.filter((perm) => !oldDeny.includes(perm)); //if not in old => added

      //get longer between combos
      //allowRemoved/denyAdded, allowAdded/denyRemoved
      const added =
        allowAdded.length >= denyRemoved.length ? allowAdded : denyRemoved;
      const removed =
        allowRemoved.length >= denyAdded.length ? allowRemoved : denyAdded;

      //get role or member having that PO
      const obj =
        cur[0].type === OverwriteType.Member
          ? await newChannel.guild.members.fetch(cur[0].id)
          : await newChannel.guild.roles.fetch(cur[0].id);

      //write text
      const textAdded =
        added.length !== 0
          ? "\n" + perm.permAdded + "\n" + added.join("\n")
          : "";
      const textRemoved =
        removed.length !== 0
          ? "\n" + perm.permRemoved + "\n" + removed.join("\n")
          : "";
      return acc + "\n" + obj.toString() + textAdded + textRemoved;
    }, "");

    if (modifs.length !== 0) {
      embed.addFields({ name: chnUp.text, value: modifs }); //add modifs in embed
      finishEmbed(chnUp, null, embed, false, logChannel);
    } else
      console.log(
        "channelUpdate permOverwrite noModifs",
        new Date(),
        newChannel.name,
        diff,
        [modifs],
      );
    return;
  }

  //get client
  const client = newChannel.client;
  const channelUpdate = client.channelUpdate;

  const changePos = [
    "rawPosition",
    oldChannel.rawPosition,
    newChannel.rawPosition,
  ];
  if (changePos[1] !== changePos[2]) {
    //if position change, no AuditLog

    const timeout = channelUpdate ? channelUpdate.timeout : null;
    if (timeout) clearTimeout(timeout); //if timeout, clear it

    bufferizeEventUpdate(
      client,
      oldChannel,
      newChannel,
      chnUp,
      auditLog,
      logChannel,
      [embed],
      "channel",
    ); //update client data
    return;
  }

  if (chnLog) {
    const changes = chnLog.changes.map((obj) => [obj.key, obj.old, obj.new]);
    const text = changes.reduce((acc, cur) => {
      //create text to send
      console.log("cur", cur);
      if (Array.isArray(cur[1])) {
        //form: [string, [Objects], [Objects]]
        //compare the 2 lists to get the difference
        const onlyInCur1 = onlyInLeft(cur[1], cur[2], isSameEmojiInGuildUpdate);
        const onlyInCur2 = onlyInLeft(cur[2], cur[1], isSameEmojiInGuildUpdate);

        //write diff and return with acc
        const cur1Entries =
          onlyInCur1.length > 0 ? Object.entries(onlyInCur1[0]) : null;
        const cur2Entries =
          onlyInCur2.length > 0 ? Object.entries(onlyInCur2[0]) : null;
        const toReduce = cur1Entries
          ? { obj: cur1Entries, who: "cur1" }
          : { obj: cur2Entries, who: "cur2" };

        //determine update status to add more context on log
        let status;
        if (cur1Entries && cur2Entries) status = " modified";
        else if (cur1Entries) status = " removed";
        else status = " added";

        //write the list of each tag changes
        const draft6 = toReduce.obj.reduce((acc, [k, v], idx) => {
          let otherText;
          if (toReduce.who === "cur1")
            otherText = cur2Entries ? cur2Entries[idx][1] : "null";
          else otherText = cur1Entries ? cur1Entries[idx][1] : "null";

          if (otherText === v) {
            if (k != "id")
              return acc; //ignore when there are no changes
            else return `  - ${k}: ${otherText}\n`; //always print the tag id
          } else if (toReduce.who === "cur2")
            return acc + `  - ${k}: ${otherText} => ${v}\n`; //reverse the text when a tag is added
          else return acc + `  - ${k}: ${v} => ${otherText}\n`;
        }, "");

        //return the changes text
        return acc + `- ${cur[0]}` + status + "\n" + draft6;
      } else if (typeof cur[1] === "object") {
        const obj2 = Object.entries(cur[2]);
        const draft3 = Object.entries(cur[1]).reduce(
          (acc, [k, v], idx) => acc + `  - ${k}: ${v} => ${obj2[idx][1]}\n`,
          "",
        );
        return acc + `- ${cur[0]}\n` + draft3;
      } else return acc + `- ${cur[0]} : ${cur[1]} => ${cur[2]}\n`;
    }, "");

    const logCreationDate = dayjs(chnLog.createdAt);
    const diff = dayjs().diff(logCreationDate, "s");

    endCasesEmbed(
      newChannel,
      chnLog,
      chnUp,
      auditLog,
      embed,
      false,
      logChannel,
      text,
      diff,
    );
    return;
  }
  //no audit log, then nothing can be done
  console.log("channelUpdate auditLog null");
  return;
};

export const onThreadCreate = async (thread, newly) => {
  //handle thread creation
  if (!newly) return; // if not new = joined, return

  if (thread) {
    //sometimes thread is null
    if (thread.joinable && !thread.joined) await thread.join(); //join thread created
    if (process.env.DEBUG === "no" && isTestServer(thread)) return; //if in prod && modif in test server

    const logChannel = await fetchLogChannel(thread); //get logChannel
    const perso = PERSONALITY.getAdmin().threadCreate;
    const log = await fetchAuditLog(
      thread.guild,
      AuditLogEvent.ThreadCreate,
      1,
    ); //get auditLog
    const executor = await thread.guild.members.fetch(thread.ownerId);
    const color = Colors.DarkGrey;
    const embed = setupEmbed(color, perso, thread, "tag"); //setup embed
    console.log(
      "onThreadCreate\nlog.executor",
      log.executor.id,
      "ownerId",
      thread.ownerId,
    );

    finishEmbed(perso, executor, embed, false, logChannel);
  } else console.log("threadCreateIsNull", thread, newly);
};

export const onThreadDelete = async (thread) => {
  //handle thread deletion
  const logType = AuditLogEvent.ThreadDelete;
  const perso = "threadDelete";
  const color = Colors.DarkGrey;
  processGeneralEmbed(perso, thread, color, logType, 1);
};

export const onThreadUpdate = async (oldThread, newThread) => {
  //handle thread update

  //console.log("oldThread", oldThread, "newThread", newThread)
  const logType = AuditLogEvent.ThreadUpdate;
  const perso = "threadUpdate";
  const color = Colors.DarkGrey;
  processGeneralEmbed(perso, newThread, color, logType, 1);
};

export const onRoleCreate = async (role) => {
  const logType = AuditLogEvent.RoleCreate;
  const perso = "roleCreate";
  const color = Colors.DarkGold;
  processGeneralEmbed(perso, role, color, logType, 1);
};

export const onRoleDelete = (role) => {
  const logType = AuditLogEvent.RoleDelete;
  const perso = "roleDelete";
  const color = Colors.DarkGold;
  processGeneralEmbed(perso, role, color, logType, 1);
};

export const onRoleUpdate = async (oldRole, newRole) => {
  //handle role update event

  const personality = PERSONALITY.getAdmin(); //get personality
  const roleUp = personality.roleUpdate;
  const auditLog = personality.auditLog;

  if (process.env.DEBUG === "no" && isTestServer(newRole)) return; //if in prod && modif in test server
  const logChannel = await fetchLogChannel(newRole); //get logChannelId
  if (process.env.DEBUG === "no" && isTestServer(logChannel)) return; //if in prod && modif in test server
  const color = Colors.DarkGold;
  const embed = setupEmbed(color, roleUp, newRole); //setup embed

  //get client
  const client = newRole.client;
  const roleUpdate = client.roleUpdate;

  const changePos = ["rawPosition", oldRole.rawPosition, newRole.rawPosition];
  if (changePos[1] !== changePos[2]) {
    //if position change, no AuditLog
    //if timeout, clear it
    const timeout = roleUpdate ? roleUpdate.timeout : null;
    if (timeout) clearTimeout(timeout);

    bufferizeEventUpdate(
      client,
      oldRole,
      newRole,
      roleUp,
      auditLog,
      logChannel,
      embed,
      "role",
    ); //update client data
    return;
  }

  const roleLog = await fetchAuditLog(
    newRole.guild,
    AuditLogEvent.RoleUpdate,
    1,
  ); //get auditLog

  if (roleLog !== null) {
    //get all data to compare
    const changes = roleLog.changes.map((obj) => {
      if (obj.key === "permissions")
        return [
          obj.key,
          oldRole.permissions.missing(newRole.permissions),
          newRole.permissions.missing(oldRole.permissions),
        ];
      //compare both roles to get only changes and not all data.
      else return [obj.key, obj.old, obj.new];
    });

    //create log to send
    const text = changes.reduce((acc, cur) => {
      //if permissions, get permissions removed and added
      if (cur[0] === "permissions") {
        const draft1 =
          cur[1].length === 0 ? "" : `${roleUp.new} ${cur[1].join(", ")}`; //[new permissions]
        const draft2 =
          cur[2].length === 0 ? "" : `${roleUp.old} ${cur[2].join(", ")}`; //[removed permissions]
        return acc + `${roleUp.permission}` + `${draft1}` + `${draft2}\n`;
      } else {
        if (typeof cur[1] === "object") {
          const obj2 = Object.entries(cur[2]);
          const draft3 = Object.entries(cur[1]).reduce(
            (acc, [k, v], idx) => acc + `  - ${k}: ${v} => ${obj2[idx][1]}\n`,
            "",
          );
          return acc + `- ${cur[0]}\n` + draft3;
        } else return acc + `- ${cur[0]} : ${cur[1]} => ${cur[2]}\n`;
      }
    }, "");

    //get log creation date and compare to now
    const logCreationDate = dayjs(roleLog.createdAt);
    const diff = dayjs().diff(logCreationDate, "s");

    endCasesEmbed(
      newRole,
      roleLog,
      roleUp,
      auditLog,
      embed,
      false,
      logChannel,
      text,
      diff,
    );
    return;
  }
  endCasesEmbed(newRole, null, roleUp, auditLog, embed, false, logChannel);
};

export const onMessageDelete = async (message) => {
  // handle message deleted event
  if (!message.guild) return; //Ignore DM

  const currentServer = COMMONS.fetchFromGuildId(message.guildId);

  if (
    message.channelId === currentServer.logThreadId ||
    message.channelId === currentServer.logChannelId
  )
    return;

  const personality = PERSONALITY.getAdmin(); //get personality
  const messageDel = personality.messageDelete;
  const auditLog = personality.auditLog;

  if (process.env.DEBUG === "no" && isTestServer(message)) return; //if in prod && modif in test server
  const logChannel = await fetchLogChannel(message, "thread"); //get logChannel

  const uDate = new Date(message.createdAt); //set date as Date object
  if (currentServer.name === "prod") uDate.setHours(uDate.getHours() + 1); //add 1h to date

  if (message.partial) {
    //if the message is partial and deleted, no possibility to fetch
    //so only partial data
    const dateStr = uDate.toString().slice(4, 24); //slice date string
    console.log("partial message deleted", dateStr);
    return;
  }

  const timestamp = Math.floor(message.createdTimestamp / 1000);
  const unixTimestamp = parseUnixTimestamp(timestamp, "F");
  const color = Colors.DarkRed;
  const embed = setupEmbed(color, messageDel, message.author, "tag"); //setup embed
  embed.addFields(
    { name: messageDel.date, value: unixTimestamp, inline: true }, //date of message creation
    {
      name: messageDel.channel,
      value: `<#${message.channelId}>`,
      inline: true,
    }, //message channel
  );
  const deletionLog = await fetchAuditLog(
    message.guild,
    AuditLogEvent.MessageDelete,
    1,
  ); //get auditLog

  //test for system message
  if (message.type === MessageType.ChannelPinnedMessage) {
    const msg = await finishEmbed(
      messageDel,
      null,
      embed,
      false,
      logChannel,
      messageDel.pinned,
    );
    addAdminLogs(msg[0].client.db, msg[0].id, "frequent", 6);
    return;
  }

  //get message data
  const attachments = message.attachments.reduce((acc, cur) => {
    return [...acc, cur.attachment];
  }, []);
  const embeds = message.embeds.reduce(
    (acc, cur) => {
      const data = cur.data;
      if (data.type !== "gifv" && data.type !== "image") return [...acc, cur]; //remove gif embeds
      return acc;
    },
    [embed],
  );

  //handle content
  let content = message.content ? message.content : messageDel.note;
  checkEmbedContent(content, embed, messageDel);

  const gifs = gifParser(content); //handle gifs

  //if no AuditLog
  if (!deletionLog) {
    const messageList = await finishEmbed(
      messageDel,
      auditLog.noLog,
      embeds,
      true,
      logChannel,
      null,
      attachments,
    );
    if (gifs !== null)
      gifs.forEach((gif) => {
        const msg = logChannel.send(gif);
        messageList.push(msg);
      });

    messageList.forEach((msg) =>
      addAdminLogs(msg.client.db, msg.id, "frequent", 6),
    );
    return;
  }

  const { executor, target } = deletionLog;
  const logCreationDate = deletionLog ? dayjs(deletionLog.createdAt) : null;
  const diff =
    logCreationDate !== null ? dayjs().diff(logCreationDate, "s") : null;

  if (target.id === message.author.id && diff <= 5) {
    //check if log report the correct user && log is recent
    const messageList = await finishEmbed(
      messageDel,
      executor,
      embeds,
      true,
      logChannel,
      null,
      attachments,
    );
    if (gifs !== null) {
      const content = gifs.join("\n");
      const msg = await logChannel.send(content);
      messageList.push(msg);
    }
    messageList.forEach((msg) =>
      addAdminLogs(msg.client.db, msg.id, "frequent", 6),
    );
  } else {
    //if bot or author deleted the message
    const messageList = await finishEmbed(
      messageDel,
      auditLog.noExec,
      embeds,
      true,
      logChannel,
      null,
      attachments,
    );
    if (gifs !== null) {
      const content = gifs.join("\n");
      const msg = await logChannel.send(content);
      messageList.push(msg);
    }
    messageList.forEach((msg) =>
      addAdminLogs(msg.client.db, msg.id, "frequent", 6),
    );
  }
};

export const onMessageUpdate = async (oldMessage, newMessage) => {
  //handle message update event

  let oMessage = oldMessage;
  let nMessage = newMessage;
  if (oldMessage.partial) {
    const message = await fetchMessage(oldMessage);
    oMessage = message === null ? oldMessage : message;
  }
  if (newMessage.partial) {
    const message = await fetchMessage(newMessage);
    nMessage = message === null ? newMessage : message;
  }

  if (!oMessage.guild) return; //Ignore DM
  if (oMessage.author.id === process.env.CLIENTID) return; //ignore itself

  const currentServer = COMMONS.fetchFromGuildId(newMessage.guildId);
  if (newMessage.channelId === currentServer.logThreadId) return;

  //get personality
  const personality = PERSONALITY.getAdmin();
  const messageU = personality.messageUpdate;
  const auditLog = personality.auditLog;

  if (process.env.DEBUG === "no" && isTestServer(newMessage)) return; //if in prod && modif in test server
  const logChannel = await fetchLogChannel(nMessage, "thread"); //get logChannel

  const color = Colors.DarkGreen;
  const embed = setupEmbed(color, messageU, nMessage.author, "tag"); //setup embed
  //no auditLog when message update

  //check for un/pinned
  if (oMessage.pinned && !nMessage.pinned) {
    const unpinLog = await fetchAuditLog(
      nMessage.guild,
      AuditLogEvent.MessageUnpin,
      1,
    ); //get auditLog
    const unpinned = messageU.unpinned;
    embed.addFields(
      { name: unpinned.title, value: unpinned.text, inline: true }, //add unpinned text
      {
        name: messageU.channel,
        value: `<#${oMessage.channelId}>`,
        inline: true,
      }, //message channel
    );

    //add message link + executor
    const link = `[${messageU.linkMessage}](${nMessage.url})`;
    embed.addFields(
      { name: messageU.linkName, value: link, inline: true },
      {
        name: unpinned.executor,
        value: unpinLog.executor.toString(),
        inline: true,
      },
    );

    const messageList = await endCasesEmbed(
      nMessage,
      null,
      messageU,
      auditLog,
      embed,
      false,
      logChannel,
    );
    messageList.forEach((msg) =>
      addAdminLogs(msg.client.db, msg.id, "frequent", 6),
    );
    return;
  }
  if (!oMessage.pinned && nMessage.pinned) {
    //
  }

  //add creation date + channel
  const uDate = new Date(oMessage.createdAt); //set date as Date object
  const unixDate = Math.floor(uDate / 1000);
  if (currentServer.name === "prod") uDate.setHours(uDate.getHours() + 1); //add 1h to date
  const unixTimestamp = parseUnixTimestamp(unixDate, "F"); //slice date string
  embed.addFields(
    { name: messageU.date, value: unixTimestamp, inline: true }, //date of message creation
    { name: messageU.channel, value: `<#${oMessage.channelId}>`, inline: true }, //message channel
  );

  //check for content modif
  const oldContent = oMessage.content;
  const newContent = nMessage.content;

  //check for octagonal_sign
  const oHasOct = hasOctagonalSign(oldContent, currentServer);
  const nHasOct = hasOctagonalSign(newContent, currentServer);
  if (!oHasOct && nHasOct) octagonalLog(nMessage);

  //filter changes, if < 2 length => return
  const isDiff = oldContent !== newContent;
  if (isDiff) {
    const oLen = oldContent.length;
    const nLen = newContent.length;

    if (oLen !== 0) {
      //slice too long string to fit 1024 length restriction in field
      checkEmbedContent(oldContent, embed, messageU.contentOld);
    }
    if (nLen !== 0) {
      checkEmbedContent(newContent, embed, messageU.contentNew);
    }
  }

  //check for objects changes
  const attachments = oMessage.attachments.reduce((acc, cur) => {
    if (nMessage.attachments.findKey((obj) => obj.id === cur.id) !== cur.id)
      return [...acc, cur.attachment];
    return acc;
  }, []); //check for attachments

  const oldEmbeds = oMessage.embeds;
  const newEmbeds = nMessage.embeds;
  let embeds;
  try {
    embeds =
      oldEmbeds.length !== 0 && newEmbeds.length !== 0
        ? newEmbeds.reduce(
            (acc, cur, idx) => {
              if (!cur.equals(nMessage.embeds[idx]) && cur.type !== "gifv")
                //exclude gifs embed which cannot be sent by bot
                return [...acc, cur];
              return acc;
            },
            [embed],
          )
        : [embed]; //check for embeds. It includes link integration
  } catch (e) {
    console.log("onMessageUpdate embeds", e);
    embeds = [embed];
  }

  if (embeds.length === 1 && attachments.length === 0 && !isDiff) return; //if no apparent modif, return

  //add message link
  const link = `[${messageU.linkMessage}](${nMessage.url})`;
  embed.addFields({ name: messageU.linkName, value: link });

  //send log
  const messageList = await finishEmbed(
    messageU,
    null,
    embeds,
    true,
    logChannel,
    null,
    attachments,
  );
  messageList.forEach((msg) =>
    addAdminLogs(msg.client.db, msg.id, "frequent", 6),
  );
};

export const onGuildBanAdd = async (userBan) => {
  console.log("member banned from Discord Server");

  const personality = PERSONALITY.getAdmin(); //get personality
  const perso = personality.guildBan;

  if (process.env.DEBUG === "no" && isTestServer(userBan)) return; //if in prod && modif in test server

  const user = userBan.user;
  const logChannel = await fetchLogChannel(userBan); //get logChannel
  const color = Colors.DarkNavy;
  const embed = setupEmbed(color, perso, user, "user"); //setup embed
  embed.addFields({ name: perso.id, value: user.id, inline: true });
  const log = await fetchAuditLog(userBan.guild, AuditLogEvent.MemberBanAdd, 1); //get auditLog

  finishEmbed(perso, log.executor, embed, false, logChannel, log.reason);
};

export const onGuildBanRemove = (userBan) => {
  console.log("member unbanned from Discord Server");

  const logType = AuditLogEvent.MemberBanRemove;
  const perso = "guildUnban";
  const color = Colors.DarkNavy;
  processGeneralEmbed(perso, userBan, color, logType, 1, "user", "user");
};

export const onGuildMemberUpdate = async (_oldMember, newMember) => {
  //check if timeout added or removed
  //const oldIsTimeout = oldMember.isCommunicationDisabled();
  const newIsTimeout = newMember.isCommunicationDisabled();
  //console.log(oldIsTimeout, newIsTimeout);
  if (!newIsTimeout) return; // if no timeout added => return
  console.log("member timeout add");

  const user = newMember.user;

  const personality = PERSONALITY.getAdmin(); //get personality
  const timeout = personality.timeout;
  const auditLog = personality.auditLog;

  if (process.env.DEBUG === "no" && isTestServer(newMember)) return; //if in prod && modif in test server
  const logChannel = await fetchLogChannel(newMember); //get logChannel
  const color = Colors.Orange;
  const embed = setupEmbed(color, timeout, user, "tag"); //setup embed
  const timeoutLog = await fetchAuditLog(
    newMember.guild,
    AuditLogEvent.MemberUpdate,
    1,
  ); //get auditLog
  const reason = timeoutLog.reason; //get ban reason

  //add timeout duration + timeout end fields
  const timeoutUntil = dayjs(newMember.communicationDisabledUntil);
  const timeoutDuration = timeoutUntil.diff(dayjs(), "s");
  embed.addFields(
    {
      name: timeout.duration,
      value: timeoutDuration.toString(),
      inline: true,
    },
    {
      name: timeout.endDate,
      value: `<t:${timeoutUntil.unix()}:F>`,
      inline: true,
    },
  );

  endCasesEmbed(
    user,
    timeoutLog,
    timeout,
    auditLog,
    embed,
    false,
    logChannel,
    reason,
  );
};

export const onGuildMemberRemove = async (memberKick) => {
  //handle guildMember kicked or leaving the server
  console.log("member kicked from/left Discord Server");

  const userKick = memberKick.user;
  removeUserFromDB(userKick.id, userKick.client); //remove user from db

  console.log("memberKick", userKick);
  const personality = PERSONALITY.getAdmin(); //get personality
  const auditLog = personality.auditLog;

  if (process.env.DEBUG === "no" && isTestServer(memberKick)) return; //if in prod && modif in test server
  const kickLog = await fetchAuditLog(
    memberKick.guild,
    AuditLogEvent.MemberKick,
    1,
  ); //get auditLog
  const reason = kickLog ? kickLog.reason : null; //get kick reason

  //get log creation date and compare to now
  const logCreationDate = kickLog ? dayjs(kickLog.createdAt) : null;
  const diff =
    logCreationDate !== null ? dayjs().diff(logCreationDate, "s") : null;
  console.log("memberKick diff", diff);

  //get user roles
  const roles = memberKick.roles.cache;
  const textRoles =
    roles.size !== 0
      ? roles.reduce((acc, cur) => `${acc}${cur.toString()}\n`, "")
      : null;

  //get user joinedTimestamp
  const timestamp = Math.round(memberKick.joinedTimestamp / 1000);
  const unixTimestamp = `<t:${timestamp}:f>`;

  if (!diff || diff >= 10) {
    // diff can be null or float
    //no log or too old => not kicked but left
    const guildKick = personality.guildKick.leave;
    const color = Colors.DarkPurple;
    const embed = setupEmbed(color, guildKick, userKick, "user"); //setup embed
    embed.addFields(
      { name: guildKick.id, value: memberKick.id, inline: true }, //add user id
      { name: guildKick.timestamp, value: unixTimestamp, inline: true }, //joined timestamp
    );
    if (textRoles)
      embed.addFields({
        name: guildKick.roles,
        value: textRoles,
        inline: true,
      }); //add user roles if any
    const logChannel = await fetchLogChannel(memberKick, "inAndOut"); //get logChannel
    const messageList = await endCasesEmbed(
      userKick,
      kickLog,
      guildKick,
      auditLog,
      embed,
      false,
      logChannel,
    );

    messageList.forEach((msg) =>
      addAdminLogs(msg.client.db, msg.id, "userAD", 1),
    );
    return;
  }

  const guildKick = personality.guildKick.kick;
  const color = Colors.DarkPurple;
  const embed = setupEmbed(color, guildKick, userKick, "user"); //setup embed
  embed.addFields(
    { name: guildKick.id, value: memberKick.id, inline: true },
    { name: guildKick.timestamp, value: unixTimestamp, inline: true }, //joined timestamp
  ); //add user id
  if (textRoles)
    embed.addFields({ name: guildKick.roles, value: textRoles, inline: true }); //add user roles if any
  const logChannel = await fetchLogChannel(memberKick); //get logChannel

  endCasesEmbed(
    userKick,
    kickLog,
    guildKick,
    auditLog,
    embed,
    false,
    logChannel,
    reason,
    diff,
  );
};

export const onGuildMemberAdd = async (guildMember) => {
  const currentServer = COMMONS.fetchFromGuildId(guildMember.guild.id);

  if (currentServer.name === "prod" && process.env.DEBUG === "no") {
    console.log("onGuildMemberAdd", guildMember.displayName);

    const db = guildMember.client.db;
    const authorId = guildMember.id;
    const date = guildMember.joinedAt.toISOString();
    addAlavirien(db, authorId, 0, date);
  }
};

//#endregion

export const checkPinStatus = async (message) => {
  if (!message.system) return; //if not message system, not pinned

  if (message.reference) {
    if (message.reference.messageId) {
      //is system and has a messageId reference => pin message
      const perso = PERSONALITY.getAdmin().messageUpdate;
      const ref = message.reference;

      //create embed
      const color = Colors.DarkGreen;
      const embed = setupEmbed(color, perso, message.author, "tag"); //setup embed
      const pinLog = await fetchAuditLog(
        message.guild,
        AuditLogEvent.MessagePin,
        1,
      ); //get auditLog
      const pPerso = perso.pinned;
      embed.addFields(
        { name: pPerso.title, value: pPerso.text, inline: true }, //add unpinned text
        {
          name: perso.channel,
          value: `<#${message.channelId}>`,
          inline: true,
        }, //message channel
      );

      //add message link
      const url = `https://discord.com/channels/${message.guildId}/${ref.channelId}/${ref.messageId}`;
      const link = `[${perso.linkMessage}](${url})`;
      embed.addFields({ name: perso.linkName, value: link, inline: true });

      //add executor
      embed.addFields({
        name: pPerso.executor,
        value: pinLog.executor.toString(),
        inline: true,
      });

      //get logChannel
      const logChannel = await fetchLogChannel(message, "thread");
      const logMessage = await logChannel.send({ embeds: [embed] });
      addAdminLogs(message.client.db, logMessage.id, "frequent", 6);
    }
  }
};
