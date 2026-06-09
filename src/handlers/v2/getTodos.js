'use strict';

const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'local';
  const userId = 'user-default';
  const todoId = event.pathParameters?.id;

  logger.info('getTodos invoked', { requestId, userId, todoId: todoId || null });

  try {
    // Single todo
    if (todoId) {
      const result = await dynamoDB.get({
        TableName: process.env.TODOS_TABLE,
        Key: { userId, todoId },
      }).promise();

      if (!result.Item) {
        logger.warn('Todo not found', { requestId, userId, todoId });
        return response(404, { message: 'Todo not found' });
      }

      logger.info('Todo fetched successfully', { requestId, userId, todoId });
      return response(200, result.Item);
    }

    // All todos for user
    const result = await dynamoDB.query({
      TableName: process.env.TODOS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    }).promise();

    logger.info('Todos fetched successfully', {
      requestId,
      userId,
      count: result.Items.length,
    });

    return response(200, result.Items);

  } catch (error) {
    logger.error('Failed to fetch todo(s)', {
      requestId,
      userId,
      todoId: todoId || null,
      error: error.message,
    });

    return response(500, { message: 'Could not fetch todo(s)' });
  }
};