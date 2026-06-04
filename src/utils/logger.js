'use strict';

/**
 * Structured Logger Utility
 * Outputs JSON logs instead of plain console.log()
 * Works with AWS CloudWatch Logs Insights for querying
 */

const createLog = (level, message, context = {}) => {
  const log = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // All levels use console.log so CloudWatch captures everything
  // console.error would go to a separate stream
  console.log(JSON.stringify(log));
};

const logger = {
  /**
   * INFO — normal operations
   * e.g. "Todo created", "Fetched todos"
   */
  info: (message, context = {}) => {
    createLog('INFO', message, context);
  },

  /**
   * WARN — something unexpected but not breaking
   * e.g. "Todo not found", "Missing optional field"
   */
  warn: (message, context = {}) => {
    createLog('WARN', message, context);
  },

  /**
   * ERROR — something failed
   * e.g. "DynamoDB put failed", "Invalid request body"
   */
  error: (message, context = {}) => {
    createLog('ERROR', message, context);
  },
};

module.exports = logger;