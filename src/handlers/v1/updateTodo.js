'use strict';

const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'local';
  const userId = 'user-default';
  const todoId = event.pathParameters.id;

  logger.info('updateTodo invoked', { requestId, userId, todoId });

  try {
    const body = JSON.parse(event.body || '{}');

    const updates = [];
    const attributeValues = {
      ':updatedAt': new Date().toISOString(),
    };
    const attributeNames = {};

    if (body.title !== undefined) {
      updates.push('#title = :title');
      attributeNames['#title'] = 'title';
      attributeValues[':title'] = body.title;
    }

    if (body.description !== undefined) {
      updates.push('description = :description');
      attributeValues[':description'] = body.description;
    }

    if (body.completed !== undefined) {
      updates.push('completed = :completed');
      attributeValues[':completed'] = body.completed;
    }

    // Prevent empty update requests
    if (updates.length === 0) {
      return response(400, {
        message: 'At least one field (title, description, completed) must be provided',
      });
    }

    // Always update timestamp
    updates.push('updatedAt = :updatedAt');

    const params = {
      TableName: process.env.TODOS_TABLE,
      Key: {
        userId,
        todoId,
      },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(todoId)',
    };

    if (Object.keys(attributeNames).length > 0) {
      params.ExpressionAttributeNames = attributeNames;
    }

    const result = await dynamoDB.update(params).promise();

    logger.info('Todo updated successfully', {
      requestId,
      userId,
      todoId,
    });

    return response(200, result.Attributes);

  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      logger.warn('Todo not found for update', {
        requestId,
        userId,
        todoId,
      });

      return response(404, {
        message: 'Todo not found',
      });
    }

    logger.error('Failed to update todo', {
      requestId,
      userId,
      todoId,
      error: error.message,
    });

    return response(500, {
      message: 'Could not update todo',
    });
  }
};