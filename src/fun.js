import { ActivityType } from "discord.js";
import { octagonalLog } from "./admin/utils.js";
import {
  //db
  isIgnoredChannel,
  //utils
  hasOctagonalSign,
} from "./helpers/index.js";
import { COMMONS } from "./commons.js";

//#region ACTIVITY

const optionalActivities = () => {
  let activities = [];
  //halloween
  const today = new Date();
  if (today.getMonth() == 9 && today.getDate() == 31)
    activities = [
      ...activities,
      { name: "compter ses bonbons", type: ActivityType.Playing },
    ];
  return activities;
};

// activity list
const activityList = [
  { name: "Adrien Sépulchre", type: ActivityType.Listening },
  { name: "JDR Ewilan par Charlie", type: ActivityType.Playing },
  {
    name: "Ewilan EP" + (Math.round(7 * Math.random()) + 1).toString(),
    type: ActivityType.Watching,
  },
  { name: "la bataille contre Azan", type: ActivityType.Competing },
  { name: "la création d'Al-Jeit", type: ActivityType.Competing },
  { name: "épier les clochinettes", type: ActivityType.Playing },
  { name: "compter les poêles", type: ActivityType.Playing },
  ...optionalActivities(),
];

/**
 * Set the timeout for bot activity update.
 * @param {Object} client The bot Client.
 */
export const updateActivity = (client) => {
  // set random waiting time for updating Sil'Afian activity

  const waitingTime = (4 * Math.random() + 4) * 3600 * 1000;
  setTimeout(() => {
    setActivity(client);
    updateActivity(client);
  }, waitingTime);
};

/**
 * Set the bot client activity with a random choice from activityList.
 * @param {Object} client The bot Client.
 */
export const setActivity = (client) => {
  // randomise Sil'Afian activity
  const statusLen = activityList.length - 1;
  const rdmIdx = Math.round(statusLen * Math.random());
  const whichStatus = activityList[rdmIdx];

  //set client activity
  client.user.setActivity(whichStatus);
};

//#endregion

//#region readContentAndReact
/**
 * Analyse message content and makes bot react accordingly
 * @param {object} message Message object with content to read
 * @param {object} currentServer common.json object, related to message.guild.id
 * @returns
 */
export const readContentAndReact = async (message, currentServer) => {
  const db = message.client.db;
  const cmnShared = COMMONS.getShared();
  const loweredContent = message.content.toLowerCase(); //get text in Lower Case

  if (hasOctagonalSign(loweredContent, cmnShared)) octagonalLog(message); //if contains octagonal_sign, log it

  if (isIgnoredChannel(db, message.channel.id))
    return; //check for ignore users or channels

  //if Sil'Afian is mentionned, react
  if (message.mentions.has(process.env.CLIENTID))
    await message.react(currentServer.rudolphslichId);
};

//#endregion
