import { logger } from '../utils/logger.js';

export const botConfig = {
  // =========================
  // BOT PRESENCE
  // =========================
  presence: {
    status: "online",
    activities: [
      {
        name: "Assisting Esoteric’s Community 👑 | 1,000+ Members",
        type: 4,
      },
    ],
  },

  // =========================
  // COMMAND BEHAVIOR + PERMISSIONS
  // =========================
  commands: {
    owners: ["1183147577957437524"],
    coOwners: ["563871965107060757"],

    permissions: {
      staffRoles: {
        manager: ["1463489255862177959"],
        admin: ["1396203898674352308"],
        mod: ["1465531172665688154"],
        trialMod: ["1487281018481414174"],
      },

      commandAccess: {
        ownerOnly: ["shutdown", "eval", "ownerpanel", "forcereload"],
        coOwnerAndUp: ["reload", "config", "blacklist", "systemsettings"],
        managerAndUp: ["promote", "demote", "loa-approve", "strike", "unstrike", "staffnote"],
        adminAndUp: ["warn", "mute", "kick", "ticketpanel", "reviewapps"],
        modAndUp: ["close", "claim", "note", "activitycheck"],
        trialModAndUp: ["help", "userinfo", "serverinfo"],
      },
    },

    defaultCooldown: 3,
    deleteCommands: false,
    testGuildId: process.env.TEST_GUILD_ID,
  },

  // =========================
  // APPLICATIONS SYSTEM
  // =========================
  applications: {
    defaultQuestions: [
      { question: "What is your Discord username?", required: true },
      { question: "How old are you?", required: true },
      { question: "What timezone are you in?", required: true },
      { question: "How active can you be each week?", required: true },
      { question: "Do you have any past staff experience? If yes, explain.", required: true },
      { question: "Why do you want to join Esoteric’s Community Staff Team?", required: true },
      { question: "Which department are you more interested in: Media or Relations?", required: true },
      { question: "How would you handle a rude or disrespectful member?", required: true },
      { question: "How would you help keep the server active and professional?", required: true },
      { question: "Why should we choose you over other applicants?", required: true },
      { question: "Are you willing to attend orientation if accepted?", required: true },
      { question: "Do you understand that inactivity may result in notices or strikes?", required: true },
    ],

    statusColors: {
      pending: "#FFA500",
      underReview: "#5865F2",
      interview: "#FEE75C",
      approved: "#00FF00",
      denied: "#FF0000",
    },

    applicationCooldown: 24,
    deleteDeniedAfter: 7,
    deleteApprovedAfter: 30,

    managerRoles: ["1470589959713984686", "1463489255862177959"],

    logChannelId: "1490216123516583977",
    reviewChannelId: "1490216149047185609",
    resultsChannelId: "1490216175681147032",

    statuses: ["pending", "underReview", "interview", "approved", "denied"],

    autoResponses: {
      submitted: "Your application has been submitted successfully.",
      approved: "Congratulations! Your application has been approved.",
      denied: "Unfortunately, your application was not accepted at this time.",
    },
  },

  // =========================
  // EMBED COLORS & BRANDING
  // =========================
  embeds: {
    colors: {
      primary: "#49c5e4",
      secondary: "#2F3136",

      success: "#57F287",
      error: "#ED4245",
      warning: "#FEE75C",
      info: "#3498DB",

      light: "#FFFFFF",
      dark: "#202225",
      gray: "#99AAB5",

      blurple: "#5865F2",
      green: "#57F287",
      yellow: "#FEE75C",
      fuchsia: "#EB459E",
      red: "#ED4245",
      black: "#000000",

      giveaway: {
        active: "#57F287",
        ended: "#ED4245",
      },
      ticket: {
        open: "#57F287",
        claimed: "#FAA61A",
        closed: "#ED4245",
        pending: "#99AAB5",
      },

      economy: "#F1C40F",
      birthday: "#E91E63",
      moderation: "#9B59B6",

      priority: {
        none: "#95A5A6",
        low: "#3498db",
        medium: "#2ecc71",
        high: "#f1c40f",
        urgent: "#e74c3c",
      },
    },

    footer: {
      text: "Esoteric’s Community • Powered by Eso",
      icon: null,
    },

    thumbnail: null,

    author: {
      name: "Esoteric’s Community",
      icon: null,
      url: "https://discord.gg/esoteric597",
    },
  },

  // =========================
  // ECONOMY SETTINGS
  // =========================
  economy: {
    currency: {
      name: "coins",
      namePlural: "coins",
      symbol: "💰",
    },

    startingBalance: 0,
    baseBankCapacity: 100000,
    dailyAmount: 100,
    workMin: 10,
    workMax: 100,
    begMin: 5,
    begMax: 50,
    robSuccessRate: 0.4,
    robFailJailTime: 3600000,
  },

  // =========================
  // SHOP SETTINGS
  // =========================
  shop: {},

  // =========================
  // TICKET SYSTEM
  // =========================
  tickets: {
    defaultCategory: "1462263625325609043",
    supportRoles: ["1465531172665688154", "1396203898674352308", "1463489255862177959"],

    priorities: {
      none: {
        emoji: "⚪",
        color: "#95A5A6",
        label: "None",
      },
      low: {
        emoji: "🟢",
        color: "#2ECC71",
        label: "Low",
      },
      medium: {
        emoji: "🟡",
        color: "#F1C40F",
        label: "Medium",
      },
      high: {
        emoji: "🔴",
        color: "#E74C3C",
        label: "High",
      },
      urgent: {
        emoji: "🚨",
        color: "#E91E63",
        label: "Urgent",
      },
    },

    defaultPriority: "none",
    archiveCategory: null,
    logChannel: "1396063917742100591",
  },

  // =========================
  // GIVEAWAY SETTINGS
  // =========================
  giveaways: {
    defaultDuration: 86400000,
    minimumWinners: 1,
    maximumWinners: 10,
    minimumDuration: 300000,
    maximumDuration: 2592000000,
    allowedRoles: ["1470589959713984686", "1463489255862177959"],
    bypassRoles: ["1470589959713984686"],
  },

  // =========================
  // BIRTHDAY SETTINGS
  // =========================
  birthday: {
    defaultRole: "1490200805658202185",
    announcementChannel: "1490201328411213915",
    timezone: "PST",
  },

  // =========================
  // VERIFICATION SETTINGS
  // =========================
  verification: {
    defaultMessage: "Click below to verify and unlock the server 🔓",
    defaultButtonText: "Verify Me",

    autoVerify: {
      defaultCriteria: "none",
      defaultAccountAgeDays: 7,
      serverSizeThreshold: 1000,

      minAccountAge: 1,
      maxAccountAge: 365,

      sendDMNotification: true,

      criteria: {
        account_age: "Account must be older than specified days",
        server_size: "All users if server has less than 1000 members",
        none: "All users immediately",
      },
    },

    verificationCooldown: 5000,
    maxVerificationAttempts: 3,
    attemptWindow: 60000,
    maxCooldownEntries: 10000,
    maxAttemptEntries: 10000,
    cooldownCleanupInterval: 300000,
    maxAuditMetadataBytes: 4096,
    maxInMemoryAuditEntries: 1000,
    logAllVerifications: true,
    keepAuditTrail: true,
  },

  // =========================
  // WELCOME / GOODBYE MESSAGES
  // =========================
  welcome: {
    defaultWelcomeMessage:
      "Ello Ello {user}! 👋 Welcome to Esoteric’s Community — we now got {memberCount} members!",
    defaultGoodbyeMessage:
      "{user} dipped 😔 — we now got {memberCount} members left.",
    defaultWelcomeChannel: "1490207813044011169",
    defaultGoodbyeChannel: "1490207825224536247",
  },

  // =========================
  // COUNTER CHANNELS
  // =========================
  counters: {
    defaults: {
      name: "{name} Counter",
      description: "Esoteric’s Community {name} counter",
      type: "voice",
      channelName: "📊・{name}: {count}",
    },
    permissions: {
      deny: ["CONNECT", "SPEAK"],
      allow: ["VIEW_CHANNEL"],
    },
    messages: {
      created: "✅ Created counter **{name}** successfully.",
      deleted: "🗑️ Deleted counter **{name}** successfully.",
      updated: "🔄 Updated counter **{name}** successfully.",
    },
    types: {
      members: {
        name: "All Members",
        description: "Total members in Esoteric’s Community",
        getCount: (guild) => guild.memberCount.toString(),
      },
      bots: {
        name: "Bots",
        description: "Total bot accounts in the server",
        getCount: (guild) =>
          guild.members.cache.filter((m) => m.user.bot).size.toString(),
      },
      members_only: {
        name: "Members",
        description: "Total human members in the server",
        getCount: (guild) =>
          guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      },
    },
  },

  // =========================
  // STAFF SYSTEM
  // =========================
  staffSystem: {
    enabled: true,

    roles: {
      owner: ["1183147577957437524"],
      coOwner: ["563871965107060757"],
      manager: ["1463489255862177959"],
      admin: ["1396203898674352308"],
      mod: ["1465531172665688154"],
      trialMod: ["1487281018481414174"],
    },

    hierarchy: ["trialMod", "mod", "admin", "manager", "coOwner", "owner"],

    staffTickets: {
      enabled: true,
      categoryId: "1484707736028581916",
      logChannelId: "1484708223758893086",
      allowedRoles: ["MANAGER_ROLE_ID", "ADMIN_ROLE_ID", "OWNER_ROLE_ID"],
    },

    orientation: {
      enabled: true,
      required: true,
      logChannelId: "1469150868371804295",
      reminderHours: 24,
      message:
        "Welcome to the staff team! You must attend orientation before beginning your trial period.",
    },

    trialSystem: {
      enabled: true,
      roleId: "1487281018481414174",
      durationDays: 7,
      autoPromoteOnPass: false,
      autoRemoveOnFail: false,
      logChannelId: "1469150868371804295",
      requirements: {
        minimumMessages: 30,
        mustAttendOrientation: true,
        mustCompleteTasks: true,
        mustPassFinalReview: true,
      },
    },

    promotions: {
      enabled: true,
      logChannelId: "1469150868371804295",
      requirements: {
        modToAdmin: {
          minimumMessagesPerWeek: 30,
          minimumDaysInRole: 14,
          minimumStrikeCount: 0,
        },
        adminToManager: {
          minimumMessagesPerWeek: 45,
          minimumDaysInRole: 30,
          minimumStrikeCount: 0,
        },
      },
    },

    loa: {
      enabled: true,
      channelId: "1469150868371804295",
      logChannelId: "1469150868371804295",
      approvalRoles: ["1470589959713984686", "1463489255862177959"],
      maxDays: 14,
      requireReason: true,
      autoExpire: true,
    },

    strikes: {
      enabled: true,
      logChannelId: "1469150868371804295",
      maxStrikesBeforeTermination: 3,
      resetOnPolicyUpdate: false,
      reasons: [
        "Inactivity",
        "Unprofessional behavior",
        "Failure to follow instructions",
        "Abuse of permissions",
        "Disrespect",
        "Missed responsibilities",
      ],
      inactivityRule: {
        consecutiveNoticesForStrike: 2,
        strikesBeforeTermination: 2,
      },
    },

    activity: {
      enabled: true,
      resetDay: "Sunday",
      logChannelId: "STAFF_ACTIVITY_LOG_CHANNEL_ID",

      requirements: {
        trialMod: {
          messagesPerWeek: null,
        },
        mod: {
          messagesPerWeek: 30,
        },
        admin: {
          messagesPerWeek: 45,
        },
        manager: {
          messagesPerWeek: 30,
        },
      },

      extras: {
        qotdCountsTowardPromotion: true,
        eventsCountTowardPromotion: true,
        partnershipsCountTowardPromotion: true,
        onlyMessagesRequired: true,
      },

      notices: {
        enabled: true,
        maxNoticesBeforeStrike: 2,
        logChannelId: "1469150868371804295",
      },
    },

    blacklist: {
      enabled: true,
      logChannelId: "1469150868371804295",
      appealAllowed: true,
      appealWaitDays: 14,
    },

    appeals: {
      enabled: true,
      channelId: "1469150868371804295",
      formLink: "1469150868371804295",
    },

    logs: {
      staffActionsChannelId: "1469150868371804295",
      moderationChannelId: "1469150868371804295",
      applicationChannelId: "1469150868371804295",
    },
  },

  // =========================
  // GENERIC BOT MESSAGES
  // =========================
  messages: {
    noPermission: "You ain’t got permission for this twin ❌",
    cooldownActive: "Chill 😭 wait {time} before using this again.",
    errorOccurred: "Something went wrong icl 💀 try again.",
    missingPermissions: "I’m missing perms to do that 😭",
    commandDisabled: "This command has been disabled.",
    maintenanceMode: "Bot under maintenance 🛠️",
  },

  // =========================
  // FEATURE TOGGLES
  // =========================
  features: {
    economy: true,
    leveling: true,
    moderation: true,
    logging: true,
    welcome: true,

    tickets: true,
    giveaways: true,
    birthday: true,
    counter: true,

    verification: true,
    reactionRoles: true,
    joinToCreate: true,

    voice: true,
    search: true,
    tools: true,
    utility: true,
    community: true,
    fun: true,

    staffSystem: true,
    applications: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Environment variables check:');
    logger.debug('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN exists:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID exists:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID exists:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST exists:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("Bot token is required (DISCORD_TOKEN or TOKEN environment variable)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("Client ID is required (CLIENT_ID environment variable)");
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.POSTGRES_HOST) {
      errors.push("PostgreSQL host is required in production (POSTGRES_HOST environment variable)");
    }
    if (!process.env.POSTGRES_USER) {
      errors.push("PostgreSQL user is required in production (POSTGRES_USER environment variable)");
    }
    if (!process.env.POSTGRES_PASSWORD) {
      errors.push("PostgreSQL password is required in production (POSTGRES_PASSWORD environment variable)");
    }
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("Bot configuration errors:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

export function getColor(path, fallback = "#99AAB5") {
  if (typeof path === "number") return path;
  if (typeof path === "string" && path.startsWith("#")) {
    return parseInt(path.replace("#", ""), 16);
  }

  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );

  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }

  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
