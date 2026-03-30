require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.log("❌ Thiếu TOKEN hoặc CHANNEL_ID trong .env");
  process.exit(0);
}

// ===== BOT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== DATA =====
function loadData() {
  return JSON.parse(fs.readFileSync("./data.json"));
}

function saveData(data) {
  fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));
}

// ===== EMBED =====
function createEmbed(data) {
  const embed = new EmbedBuilder()
    .setTitle("📢 Status Tools")
    .setColor(0x00AEFF)
    .setTimestamp();

  const tools = [
    { name: "Fluorite", emoji: "💎" },
    { name: "Migul VN", emoji: "🔥" },
    { name: "Sonic", emoji: "⚡" },
    { name: "Proxy Aim", emoji: "🎯" }
  ];

  tools.forEach(t => {
    let status = data[t.name];
    let icon = status === "safe" ? "🟢" : "🔴";
    let text = status === "safe" ? "Safe" : "Update";

    embed.addFields({
      name: `${t.emoji} ${t.name}`,
      value: `Status: ${icon} ${text}`,
      inline: false
    });
  });

  return embed;
}

// ===== BUTTON =====
function createButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit_status")
        .setLabel("⚙️ Edit Status")
        .setStyle(ButtonStyle.Primary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("download_fluorite")
        .setLabel("💎 Fluorite")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("download_migul")
        .setLabel("🔥 Migul VN")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("download_sonic")
        .setLabel("⚡ Sonic")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("download_proxy")
        .setLabel("🎯 Proxy Aim")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== MENU =====
function toolMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select_tool")
      .setPlaceholder("Chọn tool")
      .addOptions([
        { label: "Fluorite", value: "Fluorite" },
        { label: "Migul VN", value: "Migul VN" },
        { label: "Sonic", value: "Sonic" },
        { label: "Proxy Aim", value: "Proxy Aim" }
      ])
  );
}

function statusMenu(tool) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`set_${tool}`)
      .setPlaceholder(`Chọn trạng thái cho ${tool}`)
      .addOptions([
        { label: "🟢 Safe", value: "safe" },
{ label: "🔴 Update", value: "update" }
      ])
  );
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  const data = loadData();
  const channel = await client.channels.fetch(CHANNEL_ID);

  let message = null;

  if (data.messageId) {
    try {
      message = await channel.messages.fetch(data.messageId);
    } catch {}
  }

  if (!message) {
    message = await channel.send({
      embeds: [createEmbed(data)],
      components: createButtons()
    });

    data.messageId = message.id;
    saveData(data);
  } else {
    await message.edit({
      embeds: [createEmbed(data)],
      components: createButtons()
    });
  }
});

// ===== INTERACTION =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const data = loadData();

  // ===== BUTTON =====
  if (interaction.isButton()) {

    // ===== DOWNLOAD (AI CŨNG DÙNG) =====
    if (interaction.customId.startsWith("download_")) {
      let link = "";
      let name = "";

      switch (interaction.customId) {
        case "download_fluorite":
          name = "Fluorite";
          link = "https://www.mediafire.com/file/88zoe08gtgc9wfx/FF_1.120.1_1.7.1.ipa/file";
          break;

        case "download_migul":
          name = "Migul VN";
          link = "https://www.mediafire.com/file/7xjc7fqb7xybbys/Free_Fire_1.120.1_1774083029.ipa/file";
          break;

        case "download_sonic":
          name = "Sonic";
          link = "https://www.mediafire.com/file/69ym6nmiye9cuwd/Free_Fire_1.120.1_1773767109.ipa/file";
          break;

        case "download_proxy":
          name = "Proxy Aim";
          link = "❌ Vui lòng mua để được cấp link tải";
          break;
      }

      return interaction.reply({
        content: `📥 **${name}**:\n${link}`,
        ephemeral: true
      });
    }

    // ===== ADMIN =====
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Không phải admin", ephemeral: true });
    }

    if (interaction.customId === "edit_status") {
      return interaction.reply({
        content: "Chọn tool:",
        components: [toolMenu()],
        ephemeral: true
      });
    }
  }

  // ===== MENU =====
  if (interaction.customId === "select_tool") {
    const tool = interaction.values[0];

    return interaction.update({
      content: `Chọn trạng thái cho ${tool}:`,
      components: [statusMenu(tool)]
    });
  }

  if (interaction.customId.startsWith("set_")) {
    const tool = interaction.customId.replace("set_", "");
    const status = interaction.values[0];

    data[tool] = status;
    saveData(data);

    const channel = await client.channels.fetch(CHANNEL_ID);
    const message = await channel.messages.fetch(data.messageId);

    await message.edit({
      embeds: [createEmbed(data)],
components: createButtons()
    });

    return interaction.update({
      content: `✅ ${tool} → ${status}`,
      components: []
    });
  }
});

// ===== ERROR =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== START =====
client.login(TOKEN).catch(err => {
  console.error("❌ Lỗi TOKEN:", err.message);
});
