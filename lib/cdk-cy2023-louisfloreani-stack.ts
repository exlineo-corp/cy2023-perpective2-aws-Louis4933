import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; // Table dynamoDB et les attributs de sa clé de partition 
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';// Créer une lambda NodeJS
import { UserPool, UserPoolClient, UserPoolDomain, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito'; // User Pool
import { CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway'; // Authorizer pour l'API Gateway

// Outils Node
import { join } from 'path'; // Simplifier la gestion des adresses vers les fichiers internes
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export class CdkCy2023LouisfloreaniStack extends cdk.Stack {

  cyFeastApi: RestApi; // Api du CY Feast

  // Events

  eventsTb: Table; // Table des events
  getEventsLambda: NodejsFunction; // Lambda pour récupérer les events
  postEventsLambda: NodejsFunction; // Lambda pour ajouter un event
  deleteEventsLambda: NodejsFunction; // Lambda pour supprimer un event
  putEventsLambda: NodejsFunction; // Lambda pour mettre à jour un event

  // Stocks

  stocksTb: Table; // Table des stocks
  getStocksLambda: NodejsFunction; // Lambda pour récupérer les stocks
  postStocksLambda: NodejsFunction; // Lambda pour ajouter un stock
  deleteStocksLambda: NodejsFunction; // Lambda pour supprimer un stock
  putStocksLambda: NodejsFunction; // Lambda pour mettre à jour un stock

  // Users

  usersTb: Table; // Table des utilisateurs
  getUsersLambda: NodejsFunction; // Lambda pour récupérer les utilisateurs
  deleteUsersLambda: NodejsFunction; // Lambda pour supprimer un utilisateur

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    // Créer une API Gateway globale
    this.cyFeastApi = new RestApi(this, 'cyFeastApi', {
      restApiName: "CY Feast API",
      description: "Gestionnaire d'évènements du CY Feast"
    });
    
    // Création de la User Pool
    const cytechUserPool = new UserPool(this, 'cytechUserPool', {
      userPoolName: 'CyTechUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Créer une application client pour le pool d'utilisateurs
    const cytechUserPoolClient = new UserPoolClient(this, 'cytechUserPoolClient', {
      userPool: cytechUserPool,
      userPoolClientName: 'cytechUserPoolClient', 
      generateSecret: false,
      authFlows: {
        userPassword: true, 
        userSrp: true
      }
    });

    cytechUserPoolClient.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Créer un domaine personnalisé pour le pool d'utilisateurs Cognito
    const cytechUserPoolDomain = new UserPoolDomain(this, 'cytechUserPoolDomain', {
      userPool: cytechUserPool,
      cognitoDomain: {
        domainPrefix: 'cytech-user-pool-domain'
      }
    });

    cytechUserPoolDomain.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [cytechUserPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Events

    // Ma stack va créer une table dans DynamoDB
    this.eventsTb = new Table(this, 'tableEvents', {
      partitionKey: {
        name: 'event-id',
        type: AttributeType.STRING
      },
      tableName: 'cy-feast-events',
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY
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

    // Intégration des lambdas pour les connecter à la méthode correspondante dans l'API
    const getEventsLambdaIntegration = new LambdaIntegration(this.getEventsLambda);
    const postEventsLambdaIntegration = new LambdaIntegration(this.postEventsLambda);
    const deleteEventsLambdaIntegration = new LambdaIntegration(this.deleteEventsLambda);
    const putEventsLambdaIntegration = new LambdaIntegration(this.putEventsLambda);

    // Créer une ressource pour les events
    const apiEvents = this.cyFeastApi.root.addResource('events');

    apiEvents.addMethod('GET', getEventsLambdaIntegration);
    apiEvents.addMethod('POST', postEventsLambdaIntegration, { authorizer: cognitoAuthorizer });
    apiEvents.addMethod('DELETE', deleteEventsLambdaIntegration, { authorizer: cognitoAuthorizer });
    apiEvents.addMethod('PUT', putEventsLambdaIntegration, { authorizer: cognitoAuthorizer });

    // Lambda pour récupérer un événement par ID
    const getEventByIdLambda = new NodejsFunction(this, 'getEventById', {
      memorySize: 128,
      description: "Récupérer un évènement par ID",
      entry: join(__dirname, '../lambda/getEventByIdLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.eventsTb.grantReadData(getEventByIdLambda);

    const getEventByIdLambdaIntegration = new LambdaIntegration(getEventByIdLambda);

    // Créer une ressource enfant pour un événement spécifique par ID sous 'events'
    const apiEventById = apiEvents.addResource('{id}');

    // Ajouter une méthode GET à cette ressource pour récupérer un événement par son ID
    apiEventById.addMethod('GET', getEventByIdLambdaIntegration);

    // Stocks

    // Ma stack va créer une table dans DynamoDB
    this.stocksTb = new Table(this, 'tableStocks', {
      partitionKey: {
        name: 'stock-id',
        type: AttributeType.STRING
      },
      tableName: 'cy-feast-stocks',
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Créer des lambdas pour chaque HTTP method
    this.getStocksLambda = new NodejsFunction(this, 'getStocks', {
      memorySize: 128,
      description: "Appeler une liste de stocks",
      entry: join(__dirname, '../lambda/stocksApiHandlerLambda.ts'),
      environment: {
        TABLE: this.stocksTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.postStocksLambda = new NodejsFunction(this, 'postStocks', {
      memorySize: 128,
      description: "Ajouter un stock",
      entry: join(__dirname, '../lambda/stocksApiHandlerLambda.ts'),
      environment: {
        TABLE: this.stocksTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.deleteStocksLambda = new NodejsFunction(this, 'deleteStocks', {
      memorySize: 128,
      description: "Supprimer un stock",
      entry: join(__dirname, '../lambda/stocksApiHandlerLambda.ts'),
      environment: {
        TABLE: this.stocksTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.putStocksLambda = new NodejsFunction(this, 'putStocks', {
      memorySize: 128,
      description: "Mettre à jour un stock",
      entry: join(__dirname, '../lambda/stocksApiHandlerLambda.ts'),
      environment: {
        TABLE: this.stocksTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    // Donner les permissions pour lire ou écrire dans une table en fonction de la méthode HTTP
    this.stocksTb.grantReadData(this.getStocksLambda);
    this.stocksTb.grantWriteData(this.postStocksLambda);
    this.stocksTb.grantReadWriteData(this.deleteStocksLambda);
    this.stocksTb.grantReadWriteData(this.putStocksLambda);

    // Intégration des lambdas pour les connecter à la méthode correspondante dans l'API
    const getStocksLambdaIntegration = new LambdaIntegration(this.getStocksLambda);
    const postStocksLambdaIntegration = new LambdaIntegration(this.postStocksLambda);
    const deleteStocksLambdaIntegration = new LambdaIntegration(this.deleteStocksLambda);
    const putStocksLambdaIntegration = new LambdaIntegration(this.putStocksLambda);

    // Créer une ressource pour les stocks
    const apiStocks = this.cyFeastApi.root.addResource('stocks');

    apiStocks.addMethod('GET', getStocksLambdaIntegration);
    apiStocks.addMethod('POST', postStocksLambdaIntegration);
    apiStocks.addMethod('DELETE', deleteStocksLambdaIntegration);
    apiStocks.addMethod('PUT', putStocksLambdaIntegration);

    // Lambda pour récupérer un stock par ID
    const getStockByIdLambda = new NodejsFunction(this, 'getStockById', {
      memorySize: 128,
      description: "Récupérer un stock par ID",
      entry: join(__dirname, '../lambda/getStockByIdLambda.ts'),
      environment: {
        TABLE: this.stocksTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.stocksTb.grantReadData(getStockByIdLambda);

    const getStockByIdLambdaIntegration = new LambdaIntegration(getStockByIdLambda);

    // Créer une ressource enfant pour un événement spécifique par ID sous 'stocks'
    const apiStockById = apiStocks.addResource('{id}');

    // Ajouter une méthode GET à cette ressource pour récupérer un stock par son ID
    apiStockById.addMethod('GET', getStockByIdLambdaIntegration);

    // Users

    // Ma stack va créer une table dans DynamoDB
    this.usersTb = new Table(this, 'tableUsers', {
      partitionKey: {
        name: 'user-id',
        type: AttributeType.STRING
      },
      tableName: 'cy-feast-users',
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Créer des lambdas pour chaque HTTP method
    const getUsersLambda = new NodejsFunction(this, 'getUsers', {
      memorySize: 128,
      description: "Appeler une liste d'utilisateurs",
      entry: join(__dirname, '../lambda/usersApiHandlerLambda.ts'),
      environment: {
        TABLE: this.usersTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    const deleteUsersLambda = new NodejsFunction(this, 'deleteUsers', {
      memorySize: 128,
      description: "Supprimer un utilisateur",
      entry: join(__dirname, '../lambda/usersApiHandlerLambda.ts'),
      environment: {
        TABLE: this.usersTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    const postUsersLambda = new NodejsFunction(this, 'postUsers', {
      memorySize: 128,
      description: "Ajouter un utilisateur",
      entry: join(__dirname, '../lambda/usersApiHandlerLambda.ts'),
      environment: {
        TABLE: this.usersTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    const putUsersLambda = new NodejsFunction(this, 'putUsers', {
        memorySize: 128,
        description: "Mettre à jour un utilisateur",
        entry: join(__dirname, '../lambda/usersApiHandlerLambda.ts'),
        environment: {
            TABLE: this.usersTb.tableName
        },
        runtime: lambda.Runtime.NODEJS_18_X
    });
    
    // Donner les permissions pour lire ou écrire dans une table en fonction de la méthode HTTP
    this.usersTb.grantReadData(getUsersLambda);
    this.usersTb.grantReadWriteData(deleteUsersLambda);
    this.usersTb.grantWriteData(postUsersLambda);
    this.usersTb.grantReadWriteData(putUsersLambda);

    // Intégration des lambdas pour les connecter à la méthode correspondante dans l'API
    const getUsersLambdaIntegration = new LambdaIntegration(getUsersLambda);
    const deleteUsersLambdaIntegration = new LambdaIntegration(deleteUsersLambda);
    const postUsersLambdaIntegration = new LambdaIntegration(postUsersLambda);
    const putUsersLambdaIntegration = new LambdaIntegration(putUsersLambda);

    // Créer une ressource pour les utilisateurs
    const apiUsers = this.cyFeastApi.root.addResource('users');

    apiUsers.addMethod('GET', getUsersLambdaIntegration);
    apiUsers.addMethod('DELETE', deleteUsersLambdaIntegration);
    apiUsers.addMethod('POST', postUsersLambdaIntegration);
    apiUsers.addMethod('PUT', putUsersLambdaIntegration);

    // Inscription / Désinscription à un évènement

    // Lambda pour récupérer un user par ID
    const getUserByIdLambda = new NodejsFunction(this, 'getUserById', {
      memorySize: 128,
      description: "Récupérer un user par ID",
      entry: join(__dirname, '../lambda/getUserByIdLambda.ts'),
      environment: {
        TABLE: this.usersTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.usersTb.grantReadData(getUserByIdLambda);

    const getUserByIdLambdaIntegration = new LambdaIntegration(getUserByIdLambda);

    // Créer une ressource enfant pour un user spécifique par ID sous 'users'
    const apiUserById = apiUsers.addResource('{id}');

    // Ajouter une méthode GET à cette ressource pour récupérer un user par son ID
    apiUserById.addMethod('GET', getUserByIdLambdaIntegration);

    //Lambda pour s'inscrire à un évènement
    const signUpToEventLambda = new NodejsFunction(this, 'signUpToEvent', {
      memorySize: 128,
      description: "S'inscrire à un évènement",
      entry: join(__dirname, '../lambda/signUpToEventLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.eventsTb.grantReadWriteData(signUpToEventLambda);

    const signUpToEventLambdaIntegration = new LambdaIntegration(signUpToEventLambda);

    const apiSignUpToEvent = apiEvents.addResource('sign-up-to-event');

    // On peut s'inscrire uniquement si on est un user authentifié
    apiSignUpToEvent.addMethod('POST', signUpToEventLambdaIntegration, { authorizer: cognitoAuthorizer });

    //Lambda pour se désinscrire d'un évènement
    const signOutFromEventLambda = new NodejsFunction(this, 'signOutFromEvent', {
      memorySize: 128,
      description: "Se désinscrire d'un évènement",
      entry: join(__dirname, '../lambda/signOutFromEventLambda.ts'),
      environment: {
        TABLE: this.eventsTb.tableName
      },
      runtime: lambda.Runtime.NODEJS_18_X
    });

    this.eventsTb.grantReadWriteData(signOutFromEventLambda);

    const signOutFromEventLambdaIntegration = new LambdaIntegration(signOutFromEventLambda);

    const apiSignOutFromEvent = apiEvents.addResource('sign-out-from-event');

    apiSignOutFromEvent.addMethod('POST', signOutFromEventLambdaIntegration, { authorizer: cognitoAuthorizer });
  }
}
