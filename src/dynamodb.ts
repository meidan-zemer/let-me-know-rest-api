import uuid from "uuid";
import AWS from "aws-sdk";
import moment from "moment";
import { DynamoDB } from "aws-sdk";
import { contactPoint } from "let-me-know-ts-definitions";
import * as data from "../config.json";

enum contactPointRoles {
  None,
  Owner
}
const config = data as any;
const env = process.env.NODE_ENV;
const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const contacpPointsTableName =
  config.dynamoDb.tables.ContactPoints.tableName + "-" + env;

const contactPointsUsersTableName =
  config.dynamoDb.tables.ContactPointsUsers.tableName + "-" + env;

export function getAllContactPoints(userId: string): Promise<contactPoint[]> {
  return new Promise<contactPoint[]>((resolve, reject) => {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: contactPointsUsersTableName,
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: { "#userId": "userId" },
      ExpressionAttributeValues: { ":userId": userId }
    };
    dynamoDb
      .query(params)
      .promise()
      .then((data: DynamoDB.DocumentClient.QueryOutput) => {
        const cpIds: string[] = data.Items ? data.Items.map(cp => cp.cpId) : [];
        const keysArray = cpIds.map(cpId => {
          return {
            [config.dynamoDb.tables.ContactPoints.fields.cpId]: cpId
          };
        });
        keysArray.push({
          [config.dynamoDb.tables.ContactPoints.fields.cpId]: "Dummy"
        });
        let params: DynamoDB.DocumentClient.BatchGetItemInput = {
          RequestItems: {
            [contacpPointsTableName]: {
              Keys: keysArray
            }
          }
        };
        return dynamoDb.batchGet(params).promise();
      })
      .then(data => {
        let cpIdsArr: any[] = [];
        if (data && data.Responses && data.Responses[contacpPointsTableName]) {
          cpIdsArr = data.Responses[contacpPointsTableName];
        }
        resolve(cpIdsArr as contactPoint[]);
      })
      .catch(err => reject(err));
  });
}
export function putContactPoint(
  uid: string,
  name: string = "",
  desc: string = ""
): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const now = moment()
      .utc()
      .valueOf();
    let cp: contactPoint = {
      name: name,
      cpId: uuid(),
      userId: uid,
      description: desc,
      createDate: now,
      modifyDate: now
    };
    const putCpIdparams: DynamoDB.DocumentClient.Put = {
      TableName: contacpPointsTableName,
      Item: cp as any
    };

    const putCpIdUserparams: DynamoDB.DocumentClient.Put = {
      TableName: contactPointsUsersTableName,
      Item: {
        cpId: cp.cpId,
        userId: cp.userId,
        role: contactPointRoles.Owner
      }
    };
    const writeTransPara: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: [{ Put: putCpIdparams }, { Put: putCpIdUserparams }]
    };

    dynamoDb
      .transactWrite(writeTransPara)
      .promise()
      .then((data: DynamoDB.DocumentClient.TransactWriteItemsOutput) => {
        resolve(cp);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

export function updateContactPoint(
  uid: string,
  cpId: string,
  cp: contactPoint
): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    getCpRolePerId(cpId, uid)
      .then((role: contactPointRoles) => {
        if (role !== contactPointRoles.Owner) {
          throw "No Permissions";
        }
        const now = moment()
          .utc()
          .valueOf();

        let params: DynamoDB.DocumentClient.UpdateItemInput = {
          TableName: contacpPointsTableName,
          ReturnValues: "ALL_NEW",
          ConditionExpression: "attribute_exists(cpId)",
          Key: { cpId: cpId }
        };

        params = addAttributesToUpdate(params, {
          name: cp.name,
          description: cp.description,
          modifyDate: now
        });
        return dynamoDb.update(params).promise();
      })
      .then((data: DynamoDB.UpdateItemOutput) => getContactPoint(cpId))
      .then(cp => resolve(cp))
      .catch((err: any) => {
        reject(err);
      });
  });
}

export function getContactPoint(cpId: string): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const params: DynamoDB.DocumentClient.GetItemInput = {
      TableName: contacpPointsTableName,
      Key: { cpId: cpId }
    };
    dynamoDb
      .get(params)
      .promise()
      .then((data: DynamoDB.DocumentClient.GetItemOutput) => {
        if (data.Item) {
          resolve(data.Item as contactPoint);
        } else {
          reject();
        }
      })
      .catch(err => reject(err));
  });
}

function addAttributesToUpdate(
  params: DynamoDB.DocumentClient.UpdateItemInput,
  attributes: { [key: string]: any }
): DynamoDB.DocumentClient.UpdateItemInput {
  if (attributes) {
    params.ExpressionAttributeNames = {};
    params.ExpressionAttributeValues = {};
    params.UpdateExpression = "";
    for (const attributeName in attributes) {
      if (attributes.hasOwnProperty(attributeName)) {
        const attributeValue = attributes[attributeName];
        if (attributeValue) {
          params.ExpressionAttributeNames["#" + attributeName] = attributeName;
          params.ExpressionAttributeValues[
            ":" + attributeName
          ] = attributeValue;
          let updateExpressionPrefix = ",";
          if (params.UpdateExpression === "") updateExpressionPrefix = "SET ";
          params.UpdateExpression +=
            updateExpressionPrefix +
            "#" +
            attributeName +
            "=" +
            ":" +
            attributeName;
        }
      }
    }
  }
  return params;
}

function getCpRolePerId(cpId: string, userId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const params: DynamoDB.DocumentClient.GetItemInput = {
      TableName: contactPointsUsersTableName,
      Key: {
        cpId: cpId,
        userId: userId
      }
    };
    dynamoDb
      .get(params)
      .promise()
      .then((data: DynamoDB.DocumentClient.GetItemOutput) => {
        let role = data.Item ? data.Item.role : contactPointRoles.None;
        resolve(role);
      })
      .catch(err => reject(err));
  });
}
