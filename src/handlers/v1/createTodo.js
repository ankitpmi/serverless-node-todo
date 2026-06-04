'use strict';

const uuid = require('uuid');
const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'local';

  logger.info('createTodo invoked', { requestId });

  const { title, description } = JSON.parse(event.body);
  const userId = 'user-default';

  const todo = {
    userId,
    todoId: uuid.v4(),
    title,
    description: description || '',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await dynamoDB.put({
      TableName: process.env.TODOS_TABLE,
      Item: todo,
    }).promise();

    logger.info('Todo created successfully', {
      requestId,
      userId,
      todoId: todo.todoId,
    });

    return response(201, todo);

  } catch (error) {
    logger.error('Failed to create todo', {
      requestId,
      userId,
      error: error.message,
    });

    return response(500, { message: 'Could not create todo' });
  }
};