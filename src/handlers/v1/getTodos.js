const dynamoDB = require('../../utils/dynamodb');
const response = require('../../utils/response');

module.exports.handler = async (event) => {
  // const userId = event.requestContext?.identity?.cognitoIdentityId || 'user-default';
  const userId = 'user-default';
  console.log('userId: ', userId);
  const todoId = event.pathParameters?.id;

  // Single item
  if (todoId) {
    const result = await dynamoDB.get({
      TableName: process.env.TODOS_TABLE,
      Key: { userId, todoId },
    }).promise();

    if (!result.Item) return response(404, { message: 'Todo not found' });
    return response(200, result.Item);
  }

  // All items for user
  const result = await dynamoDB.query({
    TableName: process.env.TODOS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  }).promise();

  return response(200, result.Items);
};