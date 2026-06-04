'use strict';

const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'local';
  const userId = 'user-default';
  const todoId = event.pathParameters.id;

  logger.info('updateTodo invoked', { requestId, userId, todoId });

  const { title, description, completed } = JSON.parse(event.body);

  try {
    const result = await dynamoDB.update({
      TableName: process.env.TODOS_TABLE,
      Key: { userId, todoId },
      UpdateExpression:
        'SET #title = :title, description = :description, completed = :completed, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#title': 'title' },
      ExpressionAttributeValues: {
        ':title': title,
        ':description': description,
        ':completed': completed,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(todoId)',
    }).promise();

    logger.info('Todo updated successfully', { requestId, userId, todoId });

    return response(200, result.Attributes);

  } catch (error) {
    // ConditionExpression failed means todo does not exist
    if (error.code === 'ConditionalCheckFailedException') {
      logger.warn('Todo not found for update', { requestId, userId, todoId });
      return response(404, { message: 'Todo not found' });
    }

    logger.error('Failed to update todo', {
      requestId,
      userId,
      todoId,
      error: error.message,
    });

    return response(500, { message: 'Could not update todo' });
  }
};