// jsons import
import { Colors } from "discord.js";
import { readFileSync } from "fs";
const commons = JSON.parse(readFileSync("static/commons.json"));

/**
 * Class giving access to commons.json data for all bot files
 */
export class Commons {
  constructor(test, prod, shared) {
    this.test = test;
    this.prod = prod;
    this.shared = shared;
    this._OK = Colors.DarkGreen;
    this._KO = Colors.Red;
  }

  /**
   * get Test server values
   * @returns {object} specific values for test server
   */
  getTest() {
    return this.test;
  }

  /**
   * get Prod server values
   * @returns {object} specific values for prod server
   */
  getProd() {
    return this.prod;
  }

  /**
   * get Shared values for both servers
   * @returns {object} values shared for both servers
   */
  getShared() {
    return this.shared;
  }

  getOK() {
    return this._OK;
  }

  getKO() {
    return this._KO;
  }

  /**
   * get correct commons.json data, according to given guildId
   * @param {string} guildId Guild id
   * @returns {object} specific values for prod or test server
   */
  fetchFromGuildId(guildId) {
    return this.getList().find((obj) => guildId === obj.guildId);
  }
  /**
   * get both test & prod values in a list
   * @returns {object} Both test, prod object in a list
   */
  getList() {
    return [this.test, this.prod];
  }
}

//Unique instance of Commons class, used in all files
export const COMMONS = new Commons(commons.test, commons.prod, commons.shared);
