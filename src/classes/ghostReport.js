
export class ghostReportObject {
  constructor(reportId, authorId, timeout, channelId, confirmMessageId, messageId) {
    this._reportId = reportId;   //Id of the log message
    this._authorId = authorId;   //Id of the log author
    this._timeout = timeout;     //The timeout before cleaning GHOSTREPORT
    this._channelId = channelId; //The id of the channel where the ghostReport has been used
    this._confirmMessageId = confirmMessageId; //The id of the interaction reply to the ghostReport
    this._messageId = messageId; //The id of the reported message, if any
  }

  get reportId() {
    return this._reportId;
  }

  get confirmMessageId() {
    return this._confirmMessageId;
  }
}

class GhostReport {
  constructor() {}

  addReport(report) {
    this[report.reportId] = report;
    console.log("GhostReport - addReport ", report.reportId);
  };

  getReportFromConfirmMessage(confirmMessageId) {
    console.log("getReportFromConfirmMessage - Object.values(this)", Object.values(this));
    const report = Object.values(this).find((rprt) => rprt.confirmMessageId === confirmMessageId);
    return report;
  }

  removeReport(reportId) {
    delete this[reportId];
  }
}

export const GHOSTREPORT = new GhostReport();
