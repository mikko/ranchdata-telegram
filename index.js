process.env["NTBA_FIX_350"] = 1;

const fs = require('fs');
const request = require('request-promise');
const TelegramBot = require('node-telegram-bot-api');
const Promise = require('bluebird');

const Graph = require('./graph');
const telegramConfig = require('./config');

const token = telegramConfig.apikey;
const bot = new TelegramBot(token, {polling: true});

let myName;

bot.getMe().then(me => {
  myName = `@${me.username}`;
  console.log('My username is', myName);
});

let userStash = new Map();

const persistenceFile = 'users.json';

const savePool = () => {
  const str = JSON.stringify(Array.from(userStash), null, 2);
  console.log('Persisting client configs');
  fs.writeFile(persistenceFile, str, err => {
    if (err) {
      console.log('Error persisting client pool', err);
    }
  });
};

const loadPool = () => {
  console.log('Loading client pool');
  fs.readFile(persistenceFile, (err, data) => {
    if (err) {
      return;
    }
    userStash = new Map(JSON.parse(data.toString()));
  });
};

loadPool();

const saveUserLogin = (id, apikey) => {
  userStash.set(id, apikey);
  savePool();
};

const serverHost = process.env.RANCH_SERVER || 'localhost:3000';

const serverApi = `http://${serverHost}/api/v1`;

const validateApiKey = token => request({
  uri: `${serverApi}/apikeyTest`,
  qs: {apikey: token},
  json: true
}).catch((err) => Promise.resolve(false));

const getSensorList = userID => {
  const token = userStash.get(userID);
  if (!token) {
    throw new Error('User not logged in');
  }
  return request({
    uri: `${serverApi}/sensors`,
    qs: {apikey: token},
    json: true
  }).catch((err) => Promise.resolve([]));
};

const getLatestValue = (userID, serial) => {
  const token = userStash.get(userID);
  if (!token) {
    throw new Error('User not logged in');
  }
  const sensorSerial = encodeURIComponent(serial);
  return request({
    uri: `${serverApi}/sensor/${sensorSerial}/latest`,
    qs: {apikey: token},
    json: true
  }).catch((err) => Promise.resolve({}));
};

const getHistory = (userID, serial, hours) => {
  const token = userStash.get(userID);
  if (!token) {
    throw new Error('User not logged in');
  }
  const sensorSerial = encodeURIComponent(serial);
  const end = new Date();
  const timeDiff = hours * 60 * 60 * 1000;
  const start = new Date(end.getTime() - timeDiff);
  return request({
    uri: `${serverApi}/sensor/${sensorSerial}/series`,
    qs: {
      apikey: token,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    json: true
  }).catch((err) => Promise.resolve([]));
}

const helpText = `
commands:
/login apikey
/status
/history
`;

bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, 'This is a bot for Ranchdata home monitoring system');
  setTimeout(() => bot.sendMessage(msg.chat.id, helpText), 1000);
});

bot.onText(/\/help/, (msg, match) => {
  bot.sendMessage(msg.chat.id, helpText);
});

bot.onText(/\/status/, (msg, match) => {
  getSensorList(msg.from.id)
    .then(sensors => Promise.all(sensors.map(s => getLatestValue(msg.from.id, s.serial))))
    .then(latestValues => bot.sendMessage(msg.chat.id,
      latestValues.map(s => `${s.serial} ${s.value}`).join('\n')));
});

bot.onText(/\/history/, (msg, match) => {
  getSensorList(msg.from.id)
    .then(sensors => {
      const optionList = sensors.reduce((memo, s) => {
        const option = { text: s.serial, callback_data: s.serial };
        if (memo[memo.length - 1].length < 2) {
          memo[memo.length - 1].push(option);
        } else {
          memo.push([option]);
        }
        return memo;
      }, [[]]);
      const options = {
        reply_markup: JSON.stringify({
          inline_keyboard: optionList
        })
      };
      bot.sendMessage(msg.chat.id, "Which sensor?", options);
    });
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  const sensorName = callbackQuery.data;
  const msg = callbackQuery.message;
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };
  let text = sensorName;

  // TODO: move constant text somewhere
  if (msg.text === 'Which sensor?') {
    // TODO: is this chat.id always correct for callback query??
    getHistory(msg.chat.id, sensorName, 24)
      .then(series => {
        Graph.getImageBuffer(sensorName, series)
          .then(imageBuffer => {
            bot.sendPhoto(
              msg.chat.id,
              imageBuffer,
              { caption: sensorName },
              {
                filename: 'history.png',
                contentType: 'image/png',
              });
          });
      });
  }
  bot.editMessageText(`Getting history for ${sensorName}`, opts);
});

bot.onText(/\/login[\s*](.*)/, (msg, match) => {
  const apikey = match[1];
  validateApiKey(apikey)
    .then(isValid => {
      if (isValid) {
        bot.sendMessage(msg.from.id, 'Login successful');
        saveUserLogin(msg.from.id, apikey);
      } else {
        bot.sendMessage(msg.from.id, 'Login failed');
      }
    });
});
