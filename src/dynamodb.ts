import uuid from "uuid";
import AWS from "aws-sdk";
import moment from "moment";
import { DynamoDB } from "aws-sdk";
import { contactPoint } from "let-me-know-ts-definitions";

const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
const contactPointTableName = "ContactPoints";
const contactPointTableIndex = "cpId-index";

export function getAllContactPoints(userId: string): Promise<contactPoint[]> {
  return new Promise<contactPoint[]>((resolve, reject) => {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: contactPointTableName,
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
  userId: string,
  name: string = "",
  description: string = ""
): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const now = moment()
      .utc()
      .valueOf();
    let cp: contactPoint = {
      name: name,
      cpId: uuid(),
      userId: userId,
      description: description,
      createDate: now,
      modifyDate: now
    };
    const params: DynamoDB.DocumentClient.PutItemInput = {
      TableName: contactPointTableName,
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
  userId: string,
  cpId: string,
  cp: contactPoint
): Promise<contactPoint> {
  return new Promise<contactPoint>((resolve, reject) => {
    const now = moment()
      .utc()
      .valueOf();

    let params: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: contactPointTableName,
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(cpId)",
      Key: { cpId: cpId, userId }
    };

    params = addAttributesToUpdate(params, {"name":cp.name,"description":cp.description,"modifyDate":now});
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
      TableName: contactPointTableName,
      IndexName: contactPointTableIndex,
      KeyConditionExpression: "#cpId = :cpId",
      ExpressionAttributeNames: { "#cpId": "cpId" },
      ExpressionAttributeValues: { ":cpId": cpId }
    };

    dynamoDb
        .query(params)
        .promise()
        .then((data: DynamoDB.QueryOutput) =>{
          if(data.Count && data.Items){
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
    attributes:{ [key: string]: any}
): DynamoDB.DocumentClient.UpdateItemInput {
    if(attributes) {
      params.ExpressionAttributeNames = {};
      params.ExpressionAttributeValues =  {};
      params.UpdateExpression = "";
      for(const attributeName in attributes){
        if(attributes.hasOwnProperty(attributeName)){
          const attributeValue = attributes[attributeName];
          if(attributeValue){
            params.ExpressionAttributeNames["#" + attributeName] = attributeName;
            params.ExpressionAttributeValues[":" + attributeName] = attributeValue;
            let updateExpressionPrefix = ",";
            if(params.UpdateExpression === "") updateExpressionPrefix = "SET "
            params.UpdateExpression += updateExpressionPrefix + "#" + attributeName + "=" + ":" + attributeName;
          }
        }
      }
    }
  return params;
}
