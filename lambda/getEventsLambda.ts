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
        // Vérifier si la méthode HTTP est GET
        if (event.requestContext.httpMethod !== 'GET') {
            throw new Error(`Unsupported method "${event.requestContext.httpMethod}"`);
        }

        // Récupérer tous les événements
        const result = await db.scan({ TableName });
        body = result.Items;
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