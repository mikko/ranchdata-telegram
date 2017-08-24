const TelegramBot = require('node-telegram-bot-api');

const telegramConfig = require('./config');

const token = telegramConfig.apikey;
const bot = new TelegramBot(token, {polling: true});

const MAX_MESSAGE_LENGTH = 4096;
const MAX_MESSAGES = 3;

let myName;

bot.getMe().then(me => {
    myName = `@${me.username}`;
    console.log('My username is', myName);
});

const userStash = new Map();

const splitMessage = (msg, maxLength) => {
    // const messageCount = parseInt(msg.length / maxLength) + 1;
    const messages = [];

    while(msg.length > 0) {
        let cut = msg.lastIndexOf(' ', maxLength);
        if (cut > MAX_MESSAGE_LENGTH) {
            cut = msg.lastIndexOf(',', maxLength); // Assuming JSON response
        }
        if (cut <= 0 && msg.length > 0) {
            messages.push(msg);
            break;
        }
        const messagePart = msg.slice(0, cut);
        if (messagePart.length > 0) {
            messages.push(messagePart);
        }
        msg = msg.substr(cut);
    }
    return messages;
};

const serverUrl = 'asdasd/api/v1/apikeyTest';

const validateApiKey = token => new Promise(resolve, reject) => {
    const url = `${serverUrl}?apikey=${token}`;
};

bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(msg.chat.id, 'This is a bot for Ranchdata home monitoring system');
});

bot.onText(/\/status/, (msg, match) => {
  bot.sendMessage(msg.chat.id, 'TODO');
});

bot.onText(/\/report[\s*](.*)/, (msg, match) => {
  console.dir(match);
  const hasParams = match.length > 1;
  if (hasParams) {
    const params = match[1].split(' ');
    console.log(params);
  }
  bot.sendMessage(msg.chat.id, 'TODO ' + match);
});

bot.onText(/\/login[\s*](.*)/, (msg, match) => {
  if (match.length > 1) {
    const loginKey = match[1];
    console.log(params);
    bot.sendMessage(msg.chat.id, 'TODO login');
  }
});
