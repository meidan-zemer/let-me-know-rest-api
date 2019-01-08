import uuid from "uuid";
import AWS from "aws-sdk";
import moment from "moment";
import { DynamoDB } from "aws-sdk";
import { contactPoint } from "let-me-know-ts-definitions";
import * as data from "../config.json";

const config = data as any;
const env = process.env.NODE_ENV;
const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
const contacpPointIndexName =
  config.dynamoDb.tables.ContactPoints.globalIndexName;
const contacpPointTableName =
    config.dynamoDb.tables.ContactPoints.tableName + "-" + env;

export function getAllContactPoints(userId: string): Promise<contactPoint[]> {
  return new Promise<contactPoint[]>((resolve, reject) => {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: contacpPointTableName,
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: { "#userId": "userId" },
      ExpressionAttributeValues: { ":userId": userId }
    };

    dynamoDb
      .query(params)
      .promise()
      .then((data: DynamoDB.QueryOutput) =>
        resolve(data.Items as contactPoint[])
      )
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
    const params: DynamoDB.DocumentClient.PutItemInput = {
      TableName: contacpPointTableName,
      Item: cp as any
    };

    dynamoDb
      .put(params)
      .promise()
      .then((data: DynamoDB.PutItemOutput) => resolve(cp))
      .catch((err: any) => reject(err));
  });
}

export function updateContactPoint(
  uid: string,
  cpId: string,
  cp: contactPoint
): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const now = moment()
      .utc()
      .valueOf();

    let params: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: contacpPointTableName,
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(cpId)",
      Key: { cpId: cpId, userId: uid }
    };

    params = addAttributesToUpdate(params, {
      name: cp.name,
      description: cp.description,
      modifyDate: now
    });
    dynamoDb
      .update(params)
      .promise()
      .then((data: DynamoDB.UpdateItemOutput) => {
        return getContactPoint(cpId);
      })
      .then(cp => resolve(cp))
      .catch((err: any) => reject(err));
  });
}

export function getContactPoint(cpId: string): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: contacpPointTableName,
      IndexName: contacpPointIndexName,
      KeyConditionExpression: "#cpId = :cpId",
      ExpressionAttributeNames: { "#cpId": "cpId" },
      ExpressionAttributeValues: { ":cpId": cpId }
    };

    dynamoDb
      .query(params)
      .promise()
      .then((data: DynamoDB.QueryOutput) => {
        if (data.Count && data.Items) {
          resolve(data.Items[0] as contactPoint);
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
