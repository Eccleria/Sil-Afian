import { dbReturnType } from "../utils";

const isOctagonalLog = (db, logId, type) => {
  const data = db.data.octagonalLog;
  const results = data.filter((obj) => obj.logId === logId && obj.type === type);
  return results.length === 1;
};

const addOctagonalLog = (db, logId, messageId, channelId, type) => {
  if (isOctagonalLog(db, logId, type))
    return dbReturnType.isIn;
  else {
    db.data.octagonalLog.push({logId, messageId, channelId, type});
    db.wasUpdated = true;
  }
};

export { addOctagonalLog };
