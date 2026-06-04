const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');

module.exports.handler = async (event) => {
  // const userId = event.requestContext?.identity?.cognitoIdentityId || 'user-default';
  const userId =  'user-default';
  const todoId = event.pathParameters.id;

  await dynamoDB.delete({
    TableName: process.env.TODOS_TABLE,
    Key: { userId, todoId },
    ConditionExpression: 'attribute_exists(todoId)',
  }).promise();

  return response(200, { message: 'Todo deleted successfully', todoId });
};