const uuid = require('uuid');
const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');

module.exports.handler = async (event) => {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  const todos = JSON.parse(event.body);

  if (!Array.isArray(todos)) {
    return response(400, { message: 'Request body must be an array of todos' });
  }

  if (todos.length === 0) {
    return response(400, { message: 'Array must not be empty' });
  }

  if (todos.length > 25) {
    return response(400, { message: 'Maximum 25 todos allowed per batch (DynamoDB limit)' });
  }

  const userId =  'user-default';
  const timestamp = new Date().toISOString();

  // Build todos array
  const newTodos = todos.map(({ title, description }) => ({
    userId,
    todoId: uuid.v4(),
    title,
    description: description || '',
    completed: false,
    environment: process.env.ENVIRONMENT || 'staging',
    isSeedData: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // DynamoDB batchWrite accepts max 25 items
  const putRequests = newTodos.map((todo) => ({
    PutRequest: { Item: todo },
  }));

  await dynamoDB.batchWrite({
    RequestItems: {
      [process.env.TODOS_TABLE]: putRequests,
    },
  }).promise();

  return response(201, {
    message: `${newTodos.length} todos created successfully`,
    todos: newTodos,
  });
};