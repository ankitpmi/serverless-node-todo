// const { v4: uuidv4 } = require('uuid');
const uuid = require('uuid');

const dynamoDB = require('../utils/dynamodb');
const response = require('../utils/response');



module.exports.handler = async (event) => {
  const { title, description } = JSON.parse(event.body);
  const userId =  'user-default';

  const todo = {
    userId,
    todoId: uuid.v4(),
    title,
    description: description || '',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dynamoDB.put({
    TableName: process.env.TODOS_TABLE,
    Item: todo,
  }).promise();

  return response(201, todo);
};