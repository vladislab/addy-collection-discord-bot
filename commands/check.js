const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Verify if your MetaMask address is whitelisted.')
    .addStringOption((option) =>
      option
        .setName('address')
        .setDescription('Enter your Ethereum address.')
        .setRequired(true)
    ),
  async execute(interaction, callback) {
    const addrObj = interaction.options.get('address');
    const addr = addrObj.value;
    callback(interaction, addr);
  },
};
