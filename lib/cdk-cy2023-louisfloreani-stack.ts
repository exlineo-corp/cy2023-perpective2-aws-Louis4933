import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; // Table dynamoDB et les attributs de sa clé de partition 
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';// Créer une lambda NodeJS

// Outils Node
import { join } from 'path'; // Simplifier la gestion des adresses vers les fichiers internes
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export class CdkCy2023LouisfloreaniStack extends cdk.Stack {

  eventsAPI: RestApi; // Api du projet
  eventsTb: Table; // Table des events
  getEventsLambda: NodejsFunction; // Lambda d'origine

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Ma stack va créer une table dans DynamoDB
    this.eventsTb = new Table(this, 'tableEvents', {
      partitionKey: {
        name: 'event-id',
        type: AttributeType.STRING
      },
      tableName: 'cy-feast-events',
      readCapacity: 1,
      writeCapacity: 1
    });

    // Créer une lambda
    this.getEventsLambda = new NodejsFunction(this, 'getEvents', {
      memorySize: 128,
      description: "Appeler une liste d'évènements",
      entry: join(__dirname, '../lambda/getEventsLambda.ts'),
      handler: 'getEventsLambda',
      environment: {
        TABLE: this.eventsTb.tableName
      }
    });

    // Donner des permissions pour lire ou écrire dans une table
    // Ici c'est un get donc on donne le droit de lire
    this.eventsTb.grantReadData(this.getEventsLambda);

    // Créer une API Gateway
    this.eventsAPI = new RestApi(this, 'eventsAPI', {
      restApiName: "Accéder aux events",
      description: "Gestion des évènements depuis le CY Feast"
    });

    // Intégration de la lambda pour la connecter à une méthode de l'API
    const getEventsLambdaIntegration = new LambdaIntegration(this.getEventsLambda);

    this.eventsAPI.root.addMethod('get');
    const apiEvents = this.eventsAPI.root.addResource('events');

    apiEvents.addMethod('get', getEventsLambdaIntegration);
    apiEvents.addMethod('post');
    apiEvents.addMethod('put');
  }
}
