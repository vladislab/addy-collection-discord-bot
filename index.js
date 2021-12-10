// Import discord.js and create the client
require('dotenv').config();
const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const {
  checkWhitelisted,
  verifyAddressWL,
  checkValidAddr,
} = require('./api/aws');

const discord_token = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

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

// Loading commands from the commands folder
const commandFiles = fs
  .readdirSync('./commands')
  .filter((file) => file.endsWith('.js'));
const commands = [];

// Creating a collection for commands in client
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// Register an event so that when the bot is ready, it will log a messsage to the terminal
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// When the client is ready, this only runs once
client.once('ready', () => {
  console.log('Ready!');
  // Registering the commands in the client
  const CLIENT_ID = client.user.id;
  const rest = new REST({
    version: '9',
  }).setToken(discord_token);
  async () => {
    try {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
      });
      console.log(
        'Successfully registered application commands for development guild'
      );
    } catch (error) {
      if (error) console.error(error);
    }
  };
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  const embedWlTrue = new MessageEmbed()
    .setColor('GREEN')
    .setTitle('Result:')
    .setDescription('✅ Address Whitelisted!');
  const embedWlFalse = new MessageEmbed()
    .setColor('RED')
    .setTitle('Result:')
    .setDescription('❌ Address NOT whitelisted!');

  const embedWlInvalid = new MessageEmbed()
    .setColor('YELLOW')
    .setTitle('Result:')
    .setDescription('⚠️ Not a valid Ethereum address!');

  try {
    function callback(interaction, addr) {
      verifyAddressWL(addr, (isWL) => {
        if (typeof isWL === 'undefined') {
          interaction.reply({ embeds: [embedWlInvalid] });
          return;
        }
        if (isWL) interaction.reply({ embeds: [embedWlTrue] });
        else interaction.reply({ embeds: [embedWlFalse] });
      });
    }
    await command.execute(interaction, callback);
  } catch (error) {
    if (error) console.error(error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true,
    });
  }
});

// Register an event to handle incoming messages
client.on('messageCreate', async (msg) => {
  // This block will prevent the bot from responding to itself and other bots
  if (msg.author.bot || process.env.VERIFY_MODE === 'ON') {
    return;
  }

  if (process.env.WATCH_MODE === 'ON') {
    console.log(msg.content);
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
    return;
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
    } else {
      msg.reply(
        'That’s not a valid address, you rat <:shotty:893972495961559061>'
      );
    }
  }
});

// client.login logs the bot in and sets it up for use. You'll enter your token here.
client.login(discord_token);
