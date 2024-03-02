import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async (stock: any) => {

    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (stock.requestContext.httpMethod) {
            case 'GET':
                body = await db.scan({ TableName });
                body = body.Items;
                break;
            case 'POST':
                body = await db.put({ TableName, Item: JSON.parse(stock.body) });
                break;
            case 'DELETE':
                body = await db.delete({ TableName, Key: JSON.parse(stock.body) });
                break;
            case 'PUT':
                const { Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = JSON.parse(stock.body);
                body = await db.update({ TableName, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues });
                break;
            default:
                throw new Error(`Unsupported method "${stock.requestContext.httpMethod}"`);
        }
    } catch (err: any) {
        statusCode = err.statusCode || 500;
        body = { error: err.message };
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
}