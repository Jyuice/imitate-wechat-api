const sd = require("silly-datetime");

function getTime() {
  const date = new Date();
  const day = sd.format(new Date(), "YYYY-MM-DD");
  const time =
    (date.getHours() >= 10 ? date.getHours() : "0" + date.getHours()) +
    ":" +
    (date.getMinutes() >= 10 ? date.getMinutes() : "0" + date.getMinutes()) +
    ":" +
    (date.getSeconds() >= 10 ? date.getSeconds() : "0" + date.getSeconds());

  const completeTime = day + " " + time;
  return completeTime
}

module.exports = getTime;
