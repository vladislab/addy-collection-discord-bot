// Import discord.js and create the client
require('dotenv').config();
const AWS = require('aws-sdk');
const { Client, Intents } = require('discord.js');
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const discord_token = process.env.DISCORD_TOKEN;

// Update our AWS Connection Details
AWS.config.update({
  region: process.env.AWS_DEFAULT_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
// Create the service used to connect to DynamoDB
const docClient = new AWS.DynamoDB.DocumentClient();
// Setup the parameters required to save to Dynamo
const TableName = process.env.AWS_TABLE_NAME;

function checkValidAddr(addr) {
  console.log(addr, addr.length);

  if (addr[0] === '0' && addr[1] === 'x' && addr.length === 42) {
    console.log('addr valid');
    return true;
  } else return false;
}

function checkWhitelisted(sender, callback) {
  let wl = false;
  let addr = 'No address registered! :no:';

  const params = {
    TableName,
    Key: {
      id: sender,
    },
  };
  docClient.get(params, (err, data) => {
    wl =
      Object.keys(data).length > 0 &&
      !!data['Item'] &&
      !!data['Item']['address'];
    if (wl) addr = data['Item']['address'] + ' :yes';
    console.error('Unable to check whitelist record, err' + err);

    console.log(addr, sender);
    return callback(addr);
  });
}

function store(whitelistObj, callback) {
  const params = {
    TableName,
    Item: {
      ...whitelistObj,
    },
  };
  docClient.put(params, (error) => {
    if (!error) {
      // Return a message to the user stating that the app was saved
      return callback();
    } else {
      console.error('Unable to save whitelist, err' + error);
    }
  });
}

// Register an event so that when the bot is ready, it will log a messsage to the terminal
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Register an event to handle incoming messages
client.on('message', async (msg) => {
  // This block will prevent the bot from responding to itself and other bots
  if (msg.author.bot) {
    return;
  }

  if (msg.content.startsWith('!check')) {
    const {
      author: { bot, system, username, discriminator },
    } = msg;
    if (!bot && !system) {
      const sender = `${username}#${discriminator}`;
      checkWhitelisted(sender, (addr) => msg.reply(addr));
    }
  }

  if (msg.content) {
    const {
      content,
      id,
      author: { bot, system, username, discriminator },
      nonce,
    } = msg;
    if (!bot && !system && checkValidAddr(content)) {
      const log = {
        address: content,
        messageId: id,
        id: `${username}#${discriminator}`,
        timestamp: Date.now().toString(),
        nonce,
      };
      console.log(log);
      store(log, () => msg.reply(`<a:noted:913180241155981362>`));
    }
  }
});

// client.login logs the bot in and sets it up for use. You'll enter your token here.
client.login(discord_token);
