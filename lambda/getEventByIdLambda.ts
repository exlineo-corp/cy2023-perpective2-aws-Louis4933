import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async (event: any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        if (event.requestContext.httpMethod === 'GET' && event.pathParameters && event.pathParameters.id) {
            const { id } = event.pathParameters;
            const Key = { 'event-id': id };
            
            const result = await db.get({ TableName, Key });
            
            if (!result.Item) {
                throw { statusCode: 404, message: "Événement non trouvé." };
            }

            body = result.Item;
        } else {
            throw new Error(`Unsupported method "${event.requestContext.httpMethod}"`);
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
};
