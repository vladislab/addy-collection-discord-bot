// Import discord.js and create the client
require('dotenv').config();
const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
// const fs = require('fs');
// const { REST } = require('@discordjs/rest');
// const { Routes } = require('discord-api-types/v9');
const {
  checkWhitelisted,
  verifyAddressWL,
  checkValidAddr,
  store,
} = require('./api/aws');

const discord_token = process.env.DISCORD_TOKEN;
// const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// Loading commands from the commands folder
// const commandFiles = fs
//   .readdirSync('./commands')
//   .filter((file) => file.endsWith('.js'));
// const commands = [];

// // Creating a collection for commands in client
// client.commands = new Collection();

// for (const file of commandFiles) {
//   const command = require(`./commands/${file}`);
//   commands.push(command.data.toJSON());
//   client.commands.set(command.data.name, command);
// }

const embedWlTrue = new MessageEmbed()
  .setColor('GREEN')
  .setTitle('✅')
  .setDescription('  Address Whitelisted!');
const embedWlFalse = new MessageEmbed()
  .setColor('RED')
  .setTitle('❌')
  .setDescription(
    ' Address NOT whitelisted! \nPlease try again using MM address (case sensitive).'
  );

const embedWlInvalid = new MessageEmbed()
  .setColor('YELLOW')
  .setTitle('⚠️')
  .setDescription(' Address Invalid!');

// Register an event so that when the bot is ready, it will log a messsage to the terminal
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Required Permissions: Send messages, View channel, Send embeds`);
});

// When the client is ready, this only runs once
// client.once('ready', () => {
//   console.log('Ready!');
//   // Registering the commands in the client
//   const CLIENT_ID = client.user.id;
//   const rest = new REST({
//     version: '9',
//   }).setToken(discord_token);
//   async () => {
//     try {
//       await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
//         body: commands,
//       });
//       console.log(
//         'Successfully registered application commands for development guild'
//       );
//     } catch (error) {
//       if (error) console.error(error);
//     }
//   };
// });

//Broken
// client.on('interactionCreate', async (interaction) => {
//   if (!interaction.isCommand()) return;
//   const command = client.commands.get(interaction.commandName);
//   if (!command) return;

//   try {
//     function callback(interaction, addr) {
//       verifyAddressWL(addr, (isWL) => {
//         if (typeof isWL === 'undefined') {
//           interaction.reply({ embeds: [embedWlInvalid] });
//           return;
//         }
//         if (isWL) interaction.reply({ embeds: [embedWlTrue] });
//         else interaction.reply({ embeds: [embedWlFalse] });
//       });
//     }
//     await command.execute(interaction, callback);
//   } catch (error) {
//     if (error) console.error(error);
//     await interaction.reply({
//       content: 'There was an error while executing this command!',
//       ephemeral: true,
//     });
//   }
// });

// Register an event to handle incoming messages
client.on('messageCreate', async (msg) => {
  // This block will prevent the bot from responding to itself and other bots
  if (msg.author.bot) {
    return;
  }

  if (process.env.WATCH_MODE === 'ON') {
    console.log(msg.content);
    return;
  }

  if (msg.content.startsWith('!check') && process.env.VERIFY_MODE === 'OFF') {
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
      if (process.env.VERIFY_MODE === 'ON') {
        verifyAddressWL(content, (isWL) => {
          if (isWL) msg.reply({ embeds: [embedWlTrue] });
          else msg.reply({ embeds: [embedWlFalse] });
        });
      } else {
        store(log, () => msg.reply(`<a:noted:913180241155981362>`));
      }
    } else {
      msg.reply({ embeds: [embedWlInvalid] });
    }
  }
});

// client.login logs the bot in and sets it up for use. You'll enter your token here.
client.login(discord_token);
