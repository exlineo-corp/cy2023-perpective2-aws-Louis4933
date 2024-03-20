import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async (event: any) => {

    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        // Récupérer le token JWT de l'en-tête d'autorisation
        let token = event.headers.Authorization;

        // Supprimer le préfixe "Bearer " du token
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }

        // Décoder le token pour obtenir les claims
        const claims = jwt.decode(token) as jwt.JwtPayload;

        // Vérifier si claims n'est pas null et si l'utilisateur appartient au groupe requis
        if (!claims || !(claims['cognito:groups'] && (claims['cognito:groups'].includes('Orga') || claims['cognito:groups'].includes('Admin')))) {
            throw { statusCode: 403, message: 'Access denied.'};
        }

        switch (event.requestContext.httpMethod) {
            case 'GET':
                body = await db.scan({ TableName });
                body = body.Items;
                break;
            case 'POST':
                body = await db.put({ TableName, Item: JSON.parse(event.body) });
                break;
            case 'DELETE':
                body = await db.delete({ TableName, Key: JSON.parse(event.body) });
                break;
            case 'PUT':
                const { Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = JSON.parse(event.body);
                body = await db.update({ TableName, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues });
                break;
            default:
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
}