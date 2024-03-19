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
        switch (event.httpMethod) {
            case 'POST':
                const { eventId } = JSON.parse(event.body || '{}');
                const userId = event.requestContext?.authorizer?.claims?.sub;

                if (!userId) {
                    throw new Error('Unauthorized');
                }

                if (!eventId) {
                    throw new Error('Missing eventId');
                }

                // Vérifier si l'événement existe
                const eventItem = await db.get({ TableName, Key: { 'event-id': eventId } });
                if (!eventItem.Item) {
                    throw new Error('Event not found');
                }

                // Ajouter l'utilisateur à la liste des participants
                await db.update({
                    TableName,
                    Key: { 'event-id': eventId },
                    UpdateExpression: 'SET participants = list_append(if_not_exists(participants, :empty_list), :userId)',
                    ExpressionAttributeValues: {
                        ':userId': [userId],
                        ':empty_list': []
                    }
                });

                body = { message: 'Successfully signed up to event' };
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err: any) {
        statusCode = err.statusCode || 500;
        body = { error: err.message };
    }

    return {
        statusCode,
        body: JSON.stringify(body),
        headers,
    };
};
