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
                const { Item: eventItem } = await db.get({ TableName, Key: { 'event-id': eventId } });

                if (!eventItem) {
                    throw new Error('Event not found');
                }

                // On trouve l'index de l'user dans la liste des participants
                const index = eventItem.participants.indexOf(userId);

                if (index !== -1) {
                    // On le supprime de la liste
                    await db.update({
                        TableName,
                        Key: { 'event-id': eventId },
                        UpdateExpression: `REMOVE participants[${index}]`
                    });
                }

                body = { message: 'Successfully unsubscribed from event' };
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
