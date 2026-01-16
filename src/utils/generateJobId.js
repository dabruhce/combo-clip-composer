const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique job identifier.
 *
 * By default, uses a millisecond timestamp which provides ordered IDs and is
 * sufficient for local single-user systems where collisions are not a concern.
 *
 * For scenarios where collisions could be an issue (e.g., multi-user systems,
 * parallel processing), set useUuid to true to use UUIDv4 instead.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.useUuid - If true, use UUIDv4 instead of timestamp (default: false)
 * @returns {string} - Unique identifier
 */
function generateJobId(options = {}) {
  const { useUuid = false } = options;

  if (useUuid) {
    return uuidv4();
  }

  return Date.now().toString();
}

module.exports = { generateJobId };
