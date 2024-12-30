const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const PREFIX = '!'; // Command prefix for staff actions
const modmailChannelId = "1322853872007647313"; // The ID of your modmail channel

const app = express();
const port = 3000;
app.get('/', (req, res) => {
  const imagePath = path.join(__dirname, 'index.html');
  res.sendFile(imagePath);
});
app.listen(port, () => {
  console.log('\x1b[36m[ SERVER ]\x1b[0m', '\x1b[32m SH : http://localhost:' + port + ' ✅\x1b[0m');
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online and ready!`);
});

// Listen for DMs
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  // Handle direct messages
  if (message.channel.type === 1) {
    const modmailChannel = await client.channels.fetch(modmailChannelId);
    if (!modmailChannel) return console.error('Modmail channel not found!');

    const embed = new EmbedBuilder()
      .setTitle('New Modmail Message')
      .setDescription(message.content)
      .setColor('Blue')
      .setFooter({ text: `User: ${message.author.tag} | ID: ${message.author.id}` })
      .setTimestamp();

    await modmailChannel.send({ embeds: [embed] });
    message.reply('Thank you for your message! A moderator will reply to you soon.');
  }

  // Handle messages in the modmail channel
  if (message.channel.id === modmailChannelId && message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'reply') {
      const userId = args.shift();
      const replyMessage = args.join(' ');
      if (!userId || !replyMessage) {
        return message.reply('Usage: `!reply <userId> <message>`');
      }

      try {
        const user = await client.users.fetch(userId);
        await user.send(replyMessage);
        message.reply(`Message sent to ${user.tag}.`);
      } catch (err) {
        console.error(err);
        message.reply('Failed to send the message. Please check the user ID.');
      }
    }
  }
});

// Log in the bot using an async function
async function login() {
  try {
    await client.login(process.env.TOKEN);
    console.log('Bot logged in successfully.');
  } catch (error) {
    console.error('Failed to log in:', error);
  }
}

login();
