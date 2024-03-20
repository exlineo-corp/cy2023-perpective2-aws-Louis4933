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

        console.log('Token:', token);

        // Supprimer le préfixe "Bearer " du token
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }

        console.log('Token:', token);

        // Décoder le token pour obtenir les claims
        const claims = jwt.decode(token) as jwt.JwtPayload;

        // Vérifier si claims n'est pas null et si l'utilisateur appartient au groupe requis
        if (!claims || !(claims['cognito:groups'] && (claims['cognito:groups'].includes('Orga')) || claims['cognito:groups'].includes('Admin'))){
            throw { statusCode: 403, message: 'Access denied.'};
        }

        if (event.requestContext.httpMethod === 'GET' && event.pathParameters && event.pathParameters.id) {
            const { id } = event.pathParameters;
            const Key = { 'stock-id': id };
            
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