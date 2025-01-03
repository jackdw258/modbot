const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const path = require('path');
require('dotenv').config();

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

// Express setup
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const imagePath = path.join(__dirname, 'index.html');
  res.sendFile(imagePath);
});

app.listen(port, () => {
  console.log('\x1b[36m[ SERVER ]\x1b[0m', '\x1b[32m SH : http://localhost:' + port + ' ✅\x1b[0m');
});

// Bot configuration
const modmailCategoryId = "1323342967322443806"; // Replace with the category ID for modmail threads
const modRoleIds = ["1310320998247305336", "1310320998247305334", "1310320998247305333"]; // Replace with moderator role IDs
const guildId = "1310320998238650428"; // Replace with your server's guild ID

client.once('ready', () => {
  console.log(`${client.user.tag} is online and ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  // Handle user DMs
  if (message.channel.type === 1) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.error('Guild not found.');

    // Check if the sender is a member of the guild (server) or not
    const member = guild.members.cache.get(message.author.id);
    const isMember = member ? true : false;

    // If the user is not a member, we still allow them to send a message but hide the channel from them
    const category = guild.channels.cache.get(modmailCategoryId);
    if (!category || category.type !== 4) {
      return console.error('Modmail category not found or invalid.');
    }

    // Check if a modmail channel already exists for the user
    const existingChannel = guild.channels.cache.find(
      (channel) =>
        channel.parentId === modmailCategoryId &&
        channel.name === `modmail-${message.author.username.toLowerCase()}`
    );

    if (existingChannel) {
      const modEmbed = new EmbedBuilder()
        .setTitle('New Message')
        .setDescription(message.content)
        .setColor('Blue')
        .setFooter({ text: `User: ${message.author.tag} | ID: ${message.author.id}` })
        .setTimestamp();

      await existingChannel.send({ embeds: [modEmbed] });
      return message.reply("Your message has been forwarded to the moderators.");
    }

    // Create a new channel for the user (whether a member or not)
    const modmailChannel = await guild.channels.create({
      name: `modmail-${message.author.username.toLowerCase()}`,
      type: 0,
      parent: modmailCategoryId,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel], // Deny view permissions for everyone
        },
        ...modRoleIds.map((roleId) => ({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        })),
        // Allow the user to send messages but deny them view access if they're not a server member
        {
          id: message.author.id,
          allow: [PermissionsBitField.Flags.SendMessages],
          deny: isMember ? [] : [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    const modEmbed = new EmbedBuilder()
      .setTitle('New Modmail Thread')
      .setDescription(`Modmail thread created for ${message.author.tag}.\n\n**Message:**\n${message.content}`)
      .setColor('Green')
      .setFooter({ text: `User ID: ${message.author.id}` })
      .setTimestamp();

    await modmailChannel.send({ content: modRoleIds.map((id) => `<@&${id}>`).join(' '), embeds: [modEmbed] });
    await message.reply("Your message has been forwarded to the moderators. A thread has been created.");
  }

  // Handle commands and responses in modmail threads
  if (message.channel.parentId === modmailCategoryId) {
    // Check if the message was sent by a moderator
    if (modRoleIds.some(roleId => message.member.roles.cache.has(roleId))) {
      const userId = message.channel.name.split('-')[1];
      const user = await client.users.fetch(userId).catch(() => null);

      if (user) {
        const replyEmbed = new EmbedBuilder()
          .setTitle('Moderator Response')
          .setDescription(message.content)
          .setColor('Blue')
          .setFooter({ text: `Moderator: ${message.author.tag} | ID: ${message.author.id}` })
          .setTimestamp();

        // Send the response to the user
        await user.send({ embeds: [replyEmbed] });

        // Optionally, react with a ✅ to confirm the message was sent
        await message.react('✅');
      }
    }
    // Handle closing the modmail thread
    if (message.content.startsWith('!closemail') && modRoleIds.some(roleId => message.member.roles.cache.has(roleId))) {
      const userId = message.channel.name.split('-')[1];
      const user = await client.users.fetch(userId).catch(() => null);

      if (user) {
        await user.send("Your modmail thread has been closed by the moderators. If you need further assistance, feel free to contact us again.");
      }

      await message.channel.delete().catch(console.error);
    }
  }
});

// Log in the bot
client.login(process.env.TOKEN);
