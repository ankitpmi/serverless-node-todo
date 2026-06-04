const dynamoDB = require('../utils/dynamodb');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  // const userId = event.requestContext?.identity?.cognitoIdentityId || 'user-default';
  const userId =  'user-default';
  const todoId = event.pathParameters.id;
  const { title, description, completed } = JSON.parse(event.body);

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

  return response(200, result.Attributes);
};