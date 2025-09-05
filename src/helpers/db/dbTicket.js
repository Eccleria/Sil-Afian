import { dbReturnType } from "../index.js";

const addTicketBannedUser = (db, userId) => {
  if (!isTicketBannedUser(db, userId)) {
    db.data.ticket.bans.push(userId);
    db.wasUpdated = true;
    return dbReturnType.isOK;
  } else return dbReturnType.isIn;
};

const isTicketBannedUser = (db, userId) => {
  return db.data.ticket.bans.includes(userId);
}

const removeTicketBannedUser = (db, userId) => {
  if (isTicketBannedUser(db, userId)) {
    db.data.ticket.bans = db.data.ticket.bans.filter((id) => id != userId);
    db.wasUpdated = true;
    return dbReturnType.isOk; 
  } else return dbReturnType.isNotIn;
};

export { addTicketBannedUser, isTicketBannedUser, removeTicketBannedUser };
