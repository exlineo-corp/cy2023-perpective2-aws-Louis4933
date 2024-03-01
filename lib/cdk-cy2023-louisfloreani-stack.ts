import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; // Table dynamoDB et les attributs de sa clé de partition 
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';// Créer une lambda NodeJS

// Outils Node
import { join } from 'path'; // Simplifier la gestion des adresses vers les fichiers internes
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export class CdkCy2023LouisfloreaniStack extends cdk.Stack {

  eventsAPI: RestApi; // Api du projet
  eventsTb: Table; // Table des events
  getEventsLambda: NodejsFunction; // Lambda pour récupérer les events
  postEventsLambda: NodejsFunction; // Lambda pour ajouter un event
  deleteEventsLambda: NodejsFunction; // Lambda pour supprimer un event
  putEventsLambda: NodejsFunction; // Lambda pour mettre à jour un event

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

    // Créer des lambdas pour chaque HTTP method
    this.getEventsLambda = new NodejsFunction(this, 'getEvents', {
      memorySize: 128,
      description: "Appeler une liste d'évènements",
      entry: join(__dirname, '../lambda/eventsApiHandlerLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.postEventsLambda = new NodejsFunction(this, 'postEvents', {
      memorySize: 128,
      description: "Ajouter un évènement",
      entry: join(__dirname, '../lambda/eventsApiHandlerLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.deleteEventsLambda = new NodejsFunction(this, 'deleteEvents', {
      memorySize: 128,
      description: "Supprimer un évènement",
      entry: join(__dirname, '../lambda/eventsApiHandlerLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.putEventsLambda = new NodejsFunction(this, 'putEvents', {
      memorySize: 128,
      description: "Mettre à jour un évènement",
      entry: join(__dirname, '../lambda/eventsApiHandlerLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    // Donner les permissions pour lire ou écrire dans une table en fonction de la méthode HTTP
    this.eventsTb.grantReadData(this.getEventsLambda);
    this.eventsTb.grantWriteData(this.postEventsLambda);
    this.eventsTb.grantReadWriteData(this.deleteEventsLambda);
    this.eventsTb.grantReadWriteData(this.putEventsLambda);

    // Créer une API Gateway
    this.eventsAPI = new RestApi(this, 'eventsAPI', {
      restApiName: "Accéder aux events",
      description: "Gestion des évènements depuis le CY Feast"
    });

    // Intégration des lambdas pour les connecter à la méthode correspondante dans l'API
    const getEventsLambdaIntegration = new LambdaIntegration(this.getEventsLambda);
    const postEventsLambdaIntegration = new LambdaIntegration(this.postEventsLambda);
    const deleteEventsLambdaIntegration = new LambdaIntegration(this.deleteEventsLambda);
    const putEventsLambdaIntegration = new LambdaIntegration(this.putEventsLambda);

    // Créer une ressource pour les events
    const apiEvents = this.eventsAPI.root.addResource('events');

    apiEvents.addMethod('GET', getEventsLambdaIntegration);
    apiEvents.addMethod('POST', postEventsLambdaIntegration);
    apiEvents.addMethod('DELETE', deleteEventsLambdaIntegration);
    apiEvents.addMethod('PUT', putEventsLambdaIntegration);
  }
}
