'use strict';

const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'local';
  const userId = 'user-default';
  const todoId = event.pathParameters.id;

  logger.info('deleteTodo invoked', { requestId, userId, todoId });

  try {
    await dynamoDB.delete({
      TableName: process.env.TODOS_TABLE,
      Key: { userId, todoId },
      ConditionExpression: 'attribute_exists(todoId)',
    }).promise();

    logger.info('Todo deleted successfully', { requestId, userId, todoId });

    return response(200, { message: 'Todo deleted successfully', todoId });

  } catch (error) {
    // ConditionExpression failed means todo does not exist
    if (error.code === 'ConditionalCheckFailedException') {
      logger.warn('Todo not found for delete', { requestId, userId, todoId });
      return response(404, { message: 'Todo not found' });
    }

    logger.error('Failed to delete todo', {
      requestId,
      userId,
      todoId,
      error: error.message,
    });

    return response(500, { message: 'Could not delete todo' });
  }
};