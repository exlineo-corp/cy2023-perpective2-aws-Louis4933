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
        let token = event.headers.Authorization;

        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        
        const claims = jwt.decode(token) as jwt.JwtPayload;

        console.log('claims:', claims);

        // Vérifier si claims n'est pas null
        if (!claims) {
            throw { statusCode: 403, message: 'Access denied.'};
        }

        if (event.requestContext.httpMethod === 'PUT') {
            const { 'user-id': userId, email } = JSON.parse(event.body);

            // Vérifier si l'utilisateur authentifié a le même id que l'utilisateur que l'on veut modifier
            if (claims.sub !== userId) {
                throw { statusCode: 403, message: 'The cognito user does not have the correct user ID to modify this user.'};
            }

            const Key = { 'user-id': userId };
            const UpdateExpression = 'set #e = :e';
            const ExpressionAttributeNames = { '#e': 'email' };
            const ExpressionAttributeValues = { ':e': email };

            await db.update({ TableName, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues });

            body = { message: 'User email updated successfully.' };
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