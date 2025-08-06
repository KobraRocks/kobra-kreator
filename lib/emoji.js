/**
 * Mapping of action names to emoji characters.
 * @type {Record<string, string>}
 */
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

/**
 * Retrieve the emoji for a given action string.
 *
 * @param {string} [action] Action name such as "success" or "error".
 * @returns {string} Emoji character or empty string if unknown.
 */
export function getEmoji(action) {
  if (!action) return "";
  return EMOJIS[action.toLowerCase()] ?? "";
}

/**
 * Log a message to the console prefixed with the emoji for an action.
 *
 * @param {string} action Action name determining the emoji.
 * @param {...unknown} args Additional values to log.
 * @returns {void}
 */
export function logWithEmoji(action, ...args) {
  const emoji = getEmoji(action);
  const message = args.join(" ");
  const output = emoji ? `${emoji} ${message}` : message;
  switch (action) {
    case "error":
      console.error(output);
      break;
    case "warning":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export { EMOJIS };
