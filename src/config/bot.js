from pathlib import Path
import json, zipfile, shutil, textwrap, os

base = Path("/mnt/data/esoteric-staff-bot-custom")
if base.exists():
    shutil.rmtree(base)
base.mkdir(parents=True)

package_json = {
    "name": "esoteric-staff-bot-custom",
    "version": "2.0.0",
    "description": "Custom Discord staff bot for Esoteric's Community",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "deploy-commands": "node deploy-commands.js"
    },
    "engines": {
        "node": "22.x"
    },
    "dependencies": {
        "discord.js": "^14.26.0",
        "express": "^4.21.2"
    }
}

config_json = {
    "guildId": "1220890930035429376",
    "ownerUserId": "1183147577957437524",
    "roles": {
        "owner": "1396203864222601359",
        "coOwner": "1466950170649301022",
        "manager": "1463489255862177959",
        "admin": "1396203898674352308",
        "moderator": "1465531172665688154",
        "trialMod": "1487281018481414174",
        "staff": "1396205401397006336",
        "loa": "1475283482841452584"
    },
    "channels": {
        "logs": "1407593296271900713",
        "infractionsLogs": "1480359148364234883",
        "loaLogs": "1480360796453343283",
        "quotaLogs": "1480360324128571483",
        "staffAnnouncements": "1414345377913639013",
        "botCommands": "1236105163161210951",
        "loaRequests": "1480360796453343283",
        "appeals": "1490216149047185609"
    },
    "categories": {
        "staff": "1480359828592398346",
        "tickets": "1462263625325609043",
        "loa": None
    },
    "quotas": {
        "trialMod": 0,
        "moderator": 30,
        "admin": 45,
        "manager": 60,
        "weeklyResetTimezone": "America/Los_Angeles",
        "weeklyResetDay": 0,
        "weeklyResetHour": 12,
        "weeklyResetMinute": 0
    },
    "infractions": {
        "types": [
            "Failed to reach weekly quota",
            "Warning",
            "Strike",
            "Demotion",
            "Termination",
            "Blacklist"
        ],
        "strikesToTerminate": 3,
        "inactivityNoticesToStrike": 2,
        "strikeExpiresAfterWeeks": 4,
        "storeAppealInfo": True
    },
    "loa": {
        "requestableBy": "all_staff",
        "reviewableBy": "manager_plus",
        "pauseQuotas": True,
        "addLoaRole": True,
        "logDates": True,
        "sendEndReminders": True
    }
}

index_js = r"""
const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');

const config = require('./config.json');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultDb = {
  guilds: {}
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadDb() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultDb, null, 2));
    return clone(defaultDb);
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Failed to read database:', error);
    return clone(defaultDb);
  }
}

const db = loadDb();

function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getGuildData(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      infractions: [],
      loas: [],
      quota: {
        counts: {},
        weeklyTargetOverrides: {},
        lastResetAt: nowIso()
      },
      staffActions: []
    };
    saveDb();
  }
  return db.guilds[guildId];
}

function unixTs(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 1000);
}

function fmtDate(dateString) {
  const ts = unixTs(dateString);
  return ts ? `<t:${ts}:F>` : dateString;
}

function getRolePriority(member) {
  const roles = config.roles;
  if (member.roles.cache.has(roles.owner) || member.id === config.ownerUserId) return 6;
  if (member.roles.cache.has(roles.coOwner)) return 5;
  if (member.roles.cache.has(roles.manager)) return 4;
  if (member.roles.cache.has(roles.admin)) return 3;
  if (member.roles.cache.has(roles.moderator)) return 2;
  if (member.roles.cache.has(roles.trialMod)) return 1;
  return 0;
}

function isStaff(member) {
  const roles = config.roles;
  return [
    roles.owner,
    roles.coOwner,
    roles.manager,
    roles.admin,
    roles.moderator,
    roles.trialMod,
    roles.staff
  ].filter(Boolean).some(id => member.roles.cache.has(id));
}

function isManagerPlus(member) {
  return getRolePriority(member) >= 4 || member.permissions.has(PermissionFlagsBits.Administrator);
}

function isAdminPlus(member) {
  return getRolePriority(member) >= 3 || member.permissions.has(PermissionFlagsBits.Administrator);
}

function getQuotaTarget(member) {
  const roles = config.roles;
  const quotas = config.quotas;

  if (member.roles.cache.has(roles.manager)) return quotas.manager;
  if (member.roles.cache.has(roles.admin)) return quotas.admin;
  if (member.roles.cache.has(roles.moderator)) return quotas.moderator;
  if (member.roles.cache.has(roles.trialMod)) return quotas.trialMod;
  return 0;
}

function countActiveStrikes(guildData, userId) {
  const weeks = config.infractions.strikeExpiresAfterWeeks;
  const ms = weeks * 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return guildData.infractions.filter(inf => {
    if (inf.userId !== userId || inf.type !== 'Strike') return false;
    if (!inf.expiresAt) return true;
    const exp = new Date(inf.expiresAt).getTime();
    return Number.isFinite(exp) && exp > now;
  }).length;
}

function addInfraction(guildData, payload) {
  const inf = {
    id: makeId('inf'),
    createdAt: nowIso(),
    ...payload
  };

  if (inf.type === 'Strike') {
    const weeks = config.infractions.strikeExpiresAfterWeeks;
    inf.expiresAt = new Date(Date.now() + (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString();
  }

  guildData.infractions.push(inf);
  saveDb();
  return inf;
}

function addStaffAction(guildData, payload) {
  guildData.staffActions.push({
    id: makeId('act'),
    createdAt: nowIso(),
    ...payload
  });
  saveDb();
}

async function sendLog(channelId, embed) {
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send log to ${channelId}:`, error.message);
  }
}

function canUserAppeal() {
  return !!config.infractions.storeAppealInfo;
}

function getActiveApprovedLoa(guildData, userId) {
  const now = Date.now();
  return guildData.loas.find(loa => {
    if (loa.userId !== userId || loa.status !== 'approved') return false;
    const start = new Date(loa.start).getTime();
    const end = new Date(loa.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return start <= now && now <= end;
  });
}

function requireManagerPlus(interaction) {
  if (!isManagerPlus(interaction.member)) {
    interaction.reply({ content: 'Only Manager+ can use this.', ephemeral: true });
    return false;
  }
  return true;
}

function requireAdminPlus(interaction) {
  if (!isAdminPlus(interaction.member)) {
    interaction.reply({ content: 'Only Admin+ can use this.', ephemeral: true });
    return false;
  }
  return true;
}

function makeBasicEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp();
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  startSchedulers();
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.guild.id !== config.guildId) return;
  if (!message.member || !isStaff(message.member)) return;

  const guildData = getGuildData(message.guild.id);
  const loa = getActiveApprovedLoa(guildData, message.author.id);
  if (loa && config.loa.pauseQuotas) return;

  guildData.quota.counts[message.author.id] = (guildData.quota.counts[message.author.id] || 0) + 1;
  saveDb();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild || interaction.guild.id !== config.guildId) {
    return interaction.reply({ content: 'Use this inside the configured server.', ephemeral: true });
  }

  const guildData = getGuildData(interaction.guild.id);

  try {
    if (interaction.commandName === 'warn') {
      if (!requireAdminPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      const appealDate = interaction.options.getString('appeal_date');

      const inf = addInfraction(guildData, {
        type: 'Warning',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        appealDate: appealDate || null
      });

      const embed = makeBasicEmbed('Warning Issued', `${user} has been warned.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Infraction ID', value: inf.id },
          { name: 'Moderator', value: `<@${interaction.user.id}>` },
          { name: 'Appeal Date', value: appealDate || 'Not set' }
        );

      await sendLog(config.channels.infractionsLogs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'strike') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      const appealDate = interaction.options.getString('appeal_date');

      const inf = addInfraction(guildData, {
        type: 'Strike',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        appealDate: appealDate || null
      });

      const strikeCount = countActiveStrikes(guildData, user.id);

      const embed = makeBasicEmbed('Strike Issued', `${user} has received a strike.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Infraction ID', value: inf.id },
          { name: 'Active Strikes', value: String(strikeCount), inline: true },
          { name: 'Expires', value: inf.expiresAt ? fmtDate(inf.expiresAt) : 'Never', inline: true }
        );

      await sendLog(config.channels.infractionsLogs, embed);

      if (strikeCount >= config.infractions.strikesToTerminate) {
        addInfraction(guildData, {
          type: 'Termination',
          userId: user.id,
          moderatorId: interaction.user.id,
          reason: `Reached ${config.infractions.strikesToTerminate} active strikes.`,
          appealDate: appealDate || null
        });

        const termEmbed = makeBasicEmbed('Automatic Termination Triggered', `${user} reached the strike limit.`)
          .addFields(
            { name: 'Limit', value: String(config.infractions.strikesToTerminate), inline: true },
            { name: 'Triggered By', value: `<@${interaction.user.id}>`, inline: true }
          );

        await sendLog(config.channels.infractionsLogs, termEmbed);
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'infractions') {
      const user = interaction.options.getUser('user', true);
      const results = guildData.infractions.filter(i => i.userId === user.id).slice(-15).reverse();

      if (!results.length) {
        return interaction.reply({ content: `No infractions found for ${user}.`, ephemeral: true });
      }

      const desc = results.map(i => {
        const bits = [
          `**${i.id}** • ${i.type}`,
          `Reason: ${i.reason}`,
          `By: <@${i.moderatorId}>`,
          `Date: ${fmtDate(i.createdAt)}`
        ];
        if (i.expiresAt) bits.push(`Expires: ${fmtDate(i.expiresAt)}`);
        if (i.appealDate) bits.push(`Appeal Date: ${i.appealDate}`);
        return bits.join('\n');
      }).join('\n\n');

      return interaction.reply({
        embeds: [makeBasicEmbed(`Infractions for ${user.tag}`, desc)],
        ephemeral: true
      });
    }

    if (interaction.commandName === 'clearinfractions') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const removed = guildData.infractions.filter(i => i.userId === user.id).length;
      guildData.infractions = guildData.infractions.filter(i => i.userId !== user.id);
      saveDb();

      const embed = makeBasicEmbed('Infractions Cleared', `Cleared **${removed}** infractions for ${user}.`);
      await sendLog(config.channels.infractionsLogs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'blacklist') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      const appealDate = interaction.options.getString('appeal_date');

      const inf = addInfraction(guildData, {
        type: 'Blacklist',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        appealDate: appealDate || null
      });

      const embed = makeBasicEmbed('Blacklist Issued', `${user} has been blacklisted.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Infraction ID', value: inf.id }
        );

      await sendLog(config.channels.infractionsLogs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'terminate') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      const appealDate = interaction.options.getString('appeal_date');

      const inf = addInfraction(guildData, {
        type: 'Termination',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        appealDate: appealDate || null
      });

      const embed = makeBasicEmbed('Termination Recorded', `${user} has been terminated from staff.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Infraction ID', value: inf.id }
        );

      await sendLog(config.channels.infractionsLogs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'demote') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'Could not fetch that member.', ephemeral: true });

      const roles = config.roles;
      let removed = null;
      let added = null;

      if (member.roles.cache.has(roles.manager)) {
        removed = roles.manager;
        added = roles.admin;
      } else if (member.roles.cache.has(roles.admin)) {
        removed = roles.admin;
        added = roles.moderator;
      } else if (member.roles.cache.has(roles.moderator)) {
        removed = roles.moderator;
        added = roles.trialMod;
      }

      if (!removed || !added) {
        return interaction.reply({ content: 'This member does not have a demotable role in the configured chain.', ephemeral: true });
      }

      await member.roles.remove(removed).catch(() => null);
      await member.roles.add(added).catch(() => null);

      addInfraction(guildData, {
        type: 'Demotion',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason
      });

      addStaffAction(guildData, {
        type: 'demote',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        removedRoleId: removed,
        addedRoleId: added
      });

      const embed = makeBasicEmbed('Staff Demoted', `${user} has been demoted.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Removed Role', value: `<@&${removed}>`, inline: true },
          { name: 'Added Role', value: `<@&${added}>`, inline: true }
        );

      await sendLog(config.channels.logs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'promote') {
      if (!requireManagerPlus(interaction)) return;
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'Could not fetch that member.', ephemeral: true });

      const roles = config.roles;
      let removed = null;
      let added = null;

      if (member.roles.cache.has(roles.trialMod)) {
        removed = roles.trialMod;
        added = roles.moderator;
      } else if (member.roles.cache.has(roles.moderator)) {
        removed = roles.moderator;
        added = roles.admin;
      } else if (member.roles.cache.has(roles.admin)) {
        removed = roles.admin;
        added = roles.manager;
      }

      if (!removed || !added) {
        return interaction.reply({ content: 'This member does not have a promotable role in the configured chain.', ephemeral: true });
      }

      await member.roles.remove(removed).catch(() => null);
      await member.roles.add(added).catch(() => null);

      addStaffAction(guildData, {
        type: 'promote',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        removedRoleId: removed,
        addedRoleId: added
      });

      const embed = makeBasicEmbed('Staff Promoted', `${user} has been promoted.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Removed Role', value: `<@&${removed}>`, inline: true },
          { name: 'Added Role', value: `<@&${added}>`, inline: true }
        );

      await sendLog(config.channels.logs, embed);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'loa') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'request') {
        const start = interaction.options.getString('start', true);
        const end = interaction.options.getString('end', true);
        const reason = interaction.options.getString('reason', true);

        const entry = {
          id: makeId('loa'),
          userId: interaction.user.id,
          requestedBy: interaction.user.id,
          start,
          end,
          reason,
          status: 'pending',
          createdAt: nowIso(),
          reviewedBy: null,
          reviewedAt: null,
          endReminderSent: false
        };

        guildData.loas.push(entry);
        saveDb();

        const embed = makeBasicEmbed('LOA Request Submitted', `LOA request created for <@${interaction.user.id}>.`)
          .addFields(
            { name: 'Request ID', value: entry.id },
            { name: 'Start', value: start, inline: true },
            { name: 'End', value: end, inline: true },
            { name: 'Reason', value: reason }
          );

        await sendLog(config.channels.loaLogs, embed);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (sub === 'approve') {
        if (!requireManagerPlus(interaction)) return;
        const id = interaction.options.getString('id', true);
        const entry = guildData.loas.find(loa => loa.id === id);

        if (!entry) return interaction.reply({ content: 'LOA request not found.', ephemeral: true });

        entry.status = 'approved';
        entry.reviewedBy = interaction.user.id;
        entry.reviewedAt = nowIso();
        saveDb();

        const member = await interaction.guild.members.fetch(entry.userId).catch(() => null);
        if (member && config.loa.addLoaRole && config.roles.loa) {
          await member.roles.add(config.roles.loa).catch(() => null);
        }

        const embed = makeBasicEmbed('LOA Approved', `Approved LOA **${entry.id}** for <@${entry.userId}>.`)
          .addFields(
            { name: 'Start', value: entry.start, inline: true },
            { name: 'End', value: entry.end, inline: true },
            { name: 'Reviewed By', value: `<@${interaction.user.id}>` }
          );

        await sendLog(config.channels.loaLogs, embed);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'deny') {
        if (!requireManagerPlus(interaction)) return;
        const id = interaction.options.getString('id', true);
        const entry = guildData.loas.find(loa => loa.id === id);

        if (!entry) return interaction.reply({ content: 'LOA request not found.', ephemeral: true });

        entry.status = 'denied';
        entry.reviewedBy = interaction.user.id;
        entry.reviewedAt = nowIso();
        saveDb();

        const embed = makeBasicEmbed('LOA Denied', `Denied LOA **${entry.id}** for <@${entry.userId}>.`)
          .addFields({ name: 'Reviewed By', value: `<@${interaction.user.id}>` });

        await sendLog(config.channels.loaLogs, embed);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'list') {
        const status = interaction.options.getString('status') || 'all';
        let entries = guildData.loas;
        if (status !== 'all') entries = entries.filter(loa => loa.status === status);

        if (!entries.length) {
          return interaction.reply({ content: 'No LOA entries found.', ephemeral: true });
        }

        const desc = entries.slice(-15).reverse().map(loa => [
          `**${loa.id}** • <@${loa.userId}> • ${loa.status}`,
          `${loa.start} → ${loa.end}`,
          `Reason: ${loa.reason}`
        ].join('\n')).join('\n\n');

        return interaction.reply({
          embeds: [makeBasicEmbed(`LOA Requests (${status})`, desc)],
          ephemeral: true
        });
      }
    }

    if (interaction.commandName === 'quota') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'check') {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const count = guildData.quota.counts[user.id] || 0;
        const target = member ? getQuotaTarget(member) : 0;
        const remaining = Math.max(0, target - count);

        return interaction.reply({
          embeds: [
            makeBasicEmbed(`Quota for ${user.tag}`, 'Current weekly quota progress.')
              .addFields(
                { name: 'Messages', value: String(count), inline: true },
                { name: 'Target', value: String(target), inline: true },
                { name: 'Remaining', value: String(remaining), inline: true }
              )
          ],
          ephemeral: true
        });
      }

      if (sub === 'leaderboard') {
        const entries = Object.entries(guildData.quota.counts).sort((a, b) => b[1] - a[1]).slice(0, 15);

        if (!entries.length) {
          return interaction.reply({ content: 'No quota data yet.', ephemeral: true });
        }

        const desc = entries.map(([userId, count], idx) => `${idx + 1}. <@${userId}> — **${count}** messages`).join('\n');
        return interaction.reply({
          embeds: [makeBasicEmbed('Quota Leaderboard', desc)]
        });
      }

      if (sub === 'reset') {
        if (!requireManagerPlus(interaction)) return;
        guildData.quota.counts = {};
        guildData.quota.lastResetAt = nowIso();
        saveDb();

        const embed = makeBasicEmbed('Quota Reset', 'Weekly quota counts were reset manually.');
        await sendLog(config.channels.quotaLogs, embed);
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'staffsummary') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const infractions = guildData.infractions.filter(i => i.userId === user.id);
      const loas = guildData.loas.filter(l => l.userId === user.id);
      const messages = guildData.quota.counts[user.id] || 0;
      const target = member ? getQuotaTarget(member) : 0;
      const activeStrikes = countActiveStrikes(guildData, user.id);

      return interaction.reply({
        embeds: [
          makeBasicEmbed(`Staff Summary: ${user.tag}`, 'Overview of staff records.')
            .addFields(
              { name: 'Messages This Week', value: String(messages), inline: true },
              { name: 'Quota Target', value: String(target), inline: true },
              { name: 'Infractions', value: String(infractions.length), inline: true },
              { name: 'Active Strikes', value: String(activeStrikes), inline: true },
              { name: 'LOAs', value: String(loas.length), inline: true }
            )
        ],
        ephemeral: true
      });
    }

  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content: 'Something went wrong while running that command.', ephemeral: true });
    }
    return interaction.reply({ content: 'Something went wrong while running that command.', ephemeral: true });
  }
});

function getNextResetDate() {
  const now = new Date();
  const la = new Intl.DateTimeFormat('en-US', {
    timeZone: config.quotas.weeklyResetTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Lightweight weekly scheduler approximation using server local time.
  // Best replaced with cron in production.
  const next = new Date();
  next.setMinutes(config.quotas.weeklyResetMinute, 0, 0);
  next.setHours(config.quotas.weeklyResetHour);

  while (next.getDay() !== config.quotas.weeklyResetDay || next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

async function runWeeklyQuotaAudit() {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;

  const fullGuild = await guild.fetch().catch(() => null);
  if (!fullGuild) return;

  await fullGuild.members.fetch().catch(() => null);

  const guildData = getGuildData(config.guildId);
  const members = fullGuild.members.cache.filter(member => isStaff(member) && !member.user.bot);

  for (const [, member] of members) {
    const target = getQuotaTarget(member);
    if (target <= 0) continue;

    const loa = getActiveApprovedLoa(guildData, member.id);
    if (loa && config.loa.pauseQuotas) continue;

    const count = guildData.quota.counts[member.id] || 0;
    if (count >= target) continue;

    const reason = `Failed to reach weekly quota (${count}/${target})`;

    const notice = addInfraction(guildData, {
      type: 'Failed to reach weekly quota',
      userId: member.id,
      moderatorId: client.user.id,
      reason
    });

    const priorNotices = guildData.infractions.filter(i =>
      i.userId === member.id && i.type === 'Failed to reach weekly quota'
    ).length;

    const embed = makeBasicEmbed('Weekly Quota Not Met', `${member} did not reach weekly quota.`)
      .addFields(
        { name: 'Result', value: `${count}/${target}`, inline: true },
        { name: 'Notice ID', value: notice.id, inline: true }
      );

    await sendLog(config.channels.quotaLogs, embed);

    if (priorNotices % config.infractions.inactivityNoticesToStrike === 0) {
      const strike = addInfraction(guildData, {
        type: 'Strike',
        userId: member.id,
        moderatorId: client.user.id,
        reason: `Automatic strike after ${config.infractions.inactivityNoticesToStrike} quota notices.`
      });

      const strikeEmbed = makeBasicEmbed('Automatic Strike Issued', `${member} received an automatic strike.`)
        .addFields(
          { name: 'Reason', value: strike.reason },
          { name: 'Strike ID', value: strike.id }
        );

      await sendLog(config.channels.infractionsLogs, strikeEmbed);
    }
  }

  guildData.quota.counts = {};
  guildData.quota.lastResetAt = nowIso();
  saveDb();

  await sendLog(
    config.channels.quotaLogs,
    makeBasicEmbed('Weekly Quota Reset Complete', 'Quota audit finished and counts were reset.')
  );
}

async function processLoaReminders() {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;

  const guildData = getGuildData(config.guildId);
  const now = Date.now();

  for (const loa of guildData.loas) {
    if (loa.status !== 'approved' || loa.endReminderSent) continue;
    const end = new Date(loa.end).getTime();
    if (!Number.isFinite(end)) continue;

    if (now >= end) {
      loa.endReminderSent = true;
      saveDb();

      const member = await guild.members.fetch(loa.userId).catch(() => null);
      if (member && config.loa.addLoaRole && config.roles.loa && member.roles.cache.has(config.roles.loa)) {
        await member.roles.remove(config.roles.loa).catch(() => null);
      }

      const embed = makeBasicEmbed('LOA Ended', `LOA **${loa.id}** has ended for <@${loa.userId}>.`);
      await sendLog(config.channels.loaLogs, embed);
    }
  }
}

function startSchedulers() {
  scheduleNextQuotaReset();
  setInterval(() => {
    processLoaReminders().catch(console.error);
  }, 60 * 1000);
}

function scheduleNextQuotaReset() {
  const next = getNextResetDate();
  const delay = Math.max(1000, next.getTime() - Date.now());

  console.log(`Next quota reset scheduled for ${next.toISOString()}`);

  setTimeout(async () => {
    try {
      await runWeeklyQuotaAudit();
    } catch (error) {
      console.error('Weekly quota audit failed:', error);
    }
    scheduleNextQuotaReset();
  }, delay);
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    bot: client.user ? client.user.tag : 'starting',
    guildId: config.guildId,
    message: 'Custom staff bot API is online.'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: nowIso()
  });
});

app.use('/api', (req, res, next) => {
  if (!process.env.API_KEY) return next();
  if (req.headers['x-api-key'] !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
});

app.get('/api/stats/:guildId', (req, res) => {
  const guildData = getGuildData(req.params.guildId);
  res.json({
    ok: true,
    guildId: req.params.guildId,
    infractions: guildData.infractions.length,
    loas: guildData.loas.length,
    activeQuotaEntries: Object.keys(guildData.quota.counts).length,
    lastResetAt: guildData.quota.lastResetAt
  });
});

app.get('/api/staff/:guildId/:userId', (req, res) => {
  const guildData = getGuildData(req.params.guildId);
  const userId = req.params.userId;
  res.json({
    ok: true,
    guildId: req.params.guildId,
    userId,
    infractions: guildData.infractions.filter(i => i.userId === userId),
    loas: guildData.loas.filter(l => l.userId === userId),
    messagesThisWeek: guildData.quota.counts[userId] || 0
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});

client.login(process.env.DISCORD_TOKEN);
"""

deploy_commands_js = r"""
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('./config.json');

const commands = [
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user.')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .addStringOption(o => o.setName('appeal_date').setDescription('Optional appeal date'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Issue a strike.')
    .addUserOption(o => o.setName('user').setDescription('User to strike').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .addStringOption(o => o.setName('appeal_date').setDescription('Optional appeal date'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('View a user infractions.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearinfractions')
    .setDescription('Clear all infractions for a user.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .addStringOption(o => o.setName('appeal_date').setDescription('Optional appeal date'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('terminate')
    .setDescription('Record a termination.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .addStringOption(o => o.setName('appeal_date').setDescription('Optional appeal date'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote staff up the role chain.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote staff down the role chain.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Manage leave of absence requests.')
    .addSubcommand(s => s.setName('request')
      .setDescription('Request an LOA')
      .addStringOption(o => o.setName('start').setDescription('Start date/time').setRequired(true))
      .addStringOption(o => o.setName('end').setDescription('End date/time').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(s => s.setName('approve')
      .setDescription('Approve LOA')
      .addStringOption(o => o.setName('id').setDescription('LOA ID').setRequired(true)))
    .addSubcommand(s => s.setName('deny')
      .setDescription('Deny LOA')
      .addStringOption(o => o.setName('id').setDescription('LOA ID').setRequired(true)))
    .addSubcommand(s => s.setName('list')
      .setDescription('List LOAs')
      .addStringOption(o => o.setName('status')
        .setDescription('Filter')
        .addChoices(
          { name: 'all', value: 'all' },
          { name: 'pending', value: 'pending' },
          { name: 'approved', value: 'approved' },
          { name: 'denied', value: 'denied' }
        ))),

  new SlashCommandBuilder()
    .setName('quota')
    .setDescription('Quota commands')
    .addSubcommand(s => s.setName('check')
      .setDescription('Check quota')
      .addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('leaderboard')
      .setDescription('Quota leaderboard'))
    .addSubcommand(s => s.setName('reset')
      .setDescription('Reset quota counts'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('staffsummary')
    .setDescription('View a staff summary.')
    .addUserOption(o => o.setName('user').setDescription('User'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  const clientId = process.env.CLIENT_ID || '1443716248226627584';
  const guildId = process.env.GUILD_ID || config.guildId;

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log(`Registered ${commands.length} commands to guild ${guildId}`);
}

main().catch(console.error);
"""

env_example = """DISCORD_TOKEN=REPLACE_THIS_WITH_YOUR_NEW_TOKEN
CLIENT_ID=1443716248226627584
GUILD_ID=1220890930035429376
API_KEY=make_a_long_random_string_here
PORT=3000
"""

readme_md = """# Esoteric Staff Bot - Custom Build

This build is pre-configured with your role IDs, channel IDs, quota rules, and LOA/infraction settings.

## Included systems
- Infractions
- Strikes with 4 week expiry
- Automatic termination trigger at 3 active strikes
- Weekly message quotas
- Automatic weekly quota audit and reset
- LOA request / approve / deny / end handling
- Promote / demote role chain
- API routes for stats and staff data

## Commands
- /warn
- /strike
- /infractions
- /clearinfractions
- /blacklist
- /terminate
- /promote
- /demote
- /loa request
- /loa approve
- /loa deny
- /loa list
- /quota check
- /quota leaderboard
- /quota reset
- /staffsummary

## Important
Your original bot token was shared in chat. You should immediately reset/regenerate the token in the Discord Developer Portal, then place the new token into Railway as `DISCORD_TOKEN`.

## Railway steps
1. Upload these files to your GitHub repo.
2. In Railway, set the environment variables from `.env.example`.
3. Deploy the repo.
4. Run `node deploy-commands.js` once.
5. Start normally with `npm start`.

## Storage note
This uses a JSON file. It is okay for testing, but long-term production should move to PostgreSQL because Railway redeploys can wipe local files.

## API routes
- GET /
- GET /api/health
- GET /api/stats/:guildId
- GET /api/staff/:guildId/:userId
"""

(base / "package.json").write_text(json.dumps(package_json, indent=2), encoding="utf-8")
(base / "config.json").write_text(json.dumps(config_json, indent=2), encoding="utf-8")
(base / "index.js").write_text(index_js, encoding="utf-8")
(base / "deploy-commands.js").write_text(deploy_commands_js, encoding="utf-8")
(base / ".env.example").write_text(env_example, encoding="utf-8")
(base / "README.md").write_text(readme_md, encoding="utf-8")
(base / "data").mkdir(exist_ok=True)
(base / "data" / "database.json").write_text(json.dumps({"guilds": {}}, indent=2), encoding="utf-8")

zip_path = Path("/mnt/data/esoteric-staff-bot-custom.zip")
if zip_path.exists():
    zip_path.unlink()

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in base.rglob("*"):
        zf.write(p, p.relative_to(base.parent))

print(f"Created {zip_path}")
