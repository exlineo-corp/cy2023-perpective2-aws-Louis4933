import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async (event: any) => {
    const userAttributes = event.request.userAttributes;

    // Insérer les détails de l'utilisateur dans la table DynamoDB
    const Item = {
        'user-id': event.userName,
        'email': userAttributes.email,
    };

    try {
        await db.put({ TableName, Item });
        console.log('User added to DynamoDB table successfully.');
    } catch (error) {
        console.error(`Error adding user to DynamoDB table: ${error}`);
    }

    return event;
};
