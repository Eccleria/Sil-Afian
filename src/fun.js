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
  {
    name: "le Chant du Dragon",
    type: ActivityType.Listening,
    state:
      "Songespoir, flammèches ignées talées par l'allubrillance des pyrocarbonides.",
  },
  {
    name: "sonner la cloche",
    type: ActivityType.Playing,
    state: "Aide de camp ?",
  },
  {
    name: "pacifier les Blancs",
    type: ActivityType.Competing,
    state: "La situation nous échappe",
  },
  {
    name: "les 10 tournois",
    type: ActivityType.Watching,
    state: "Tu as réussi, vieux frère !",
  },
  {
    name: "Ewilan gronder Edwin",
    type: ActivityType.Listening,
    state: "J'ai perdu 100 pièces d'or...",
  },
  { name: "compter les poêles", type: ActivityType.Playing, state: "zbim" },
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

  if (isIgnoredChannel(db, message.channel.id)) return; //check for ignore users or channels

  //if Sil'Afian is mentionned, react
  if (message.mentions.has(process.env.CLIENTID))
    await message.react(currentServer.rudolphslichId);
};

//#endregion
