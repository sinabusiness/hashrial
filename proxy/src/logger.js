"use strict";

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level, event, data = {}) {
  if (LEVELS[level] <= LEVELS[LOG_LEVEL]) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      ...data,
    };
    console.log(JSON.stringify(entry));
  }
}

const logger = {
  info: (event, data) => log('info', event, data),
  warn: (event, data) => log('warn', event, data),
  error: (event, data) => log('error', event, data),
  debug: (event, data) => log('debug', event, data),
};

module.exports = { logger };
