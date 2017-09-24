const fs = require('fs');
const request = require('request-promise');
const TelegramBot = require('node-telegram-bot-api');
const Promise = require('bluebird');

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
    return request({
        uri: `${serverApi}/sensor/${serial}/latest`,
        qs: {apikey: token},
        json: true
    }).catch((err) => Promise.resolve({}));
};

const helpText = `
commands:
/login apikey
/status
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
            latestValues.map(s => `${s.name} ${s.value}`).join('\n')));
});

bot.onText(/\/login[\s*](.*)/, (msg, match) => {
    console.log(msg.from.id);
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
