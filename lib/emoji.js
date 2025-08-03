const EMOJIS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  debug: "🐛",
  trace: "🔎",
  create: "🆕",
  update: "🔄",
  delete: "🗑️",
  start: "▶️",
  stop: "⏹️",
  retry: "🔁",
  cancel: "🚫",
  lock: "🔒",
  unlock: "🔓",
  test: "🧪",
  build: "🛠️",
  deploy: "🚀",
  skip: "⏭️",
  pending: "⏳",
  aiworking: "✨",
};

export function getEmoji(action) {
  if (!action) return "";
  return EMOJIS[action.toLowerCase()] ?? "";
}

export function logWithEmoji(action, ...args) {
  const emoji = getEmoji(action);
  const message = args.join(" ");
  if (emoji) {
    console.log(`${emoji} ${message}`);
  } else {
    console.log(message);
  }
}

export { EMOJIS };
