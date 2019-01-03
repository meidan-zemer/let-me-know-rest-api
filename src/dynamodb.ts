import uuid from "uuid";
import AWS from "aws-sdk";
import moment from "moment";
import { DynamoDB } from "aws-sdk";
import { contactPoint } from "../../let-me-know-ts-definitions/definitions";
const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const contactPointTableName = "ContactPoints";
const contactPointTableIndex = "cpId-index";

export function getAllContactPoints(userId: string): Promise<contactPoint[]> {
  return new Promise<contactPoint[]>((resolve, reject) => {
    const params: DynamoDB.QueryInput = {
      TableName: contactPointTableName,
      IndexName: contactPointTableIndex,
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: { "#userId": "userId" },
      ExpressionAttributeValues: { ":userId": { S: userId } }
    };

    dynamoDb
      .query(params)
      .promise()
      .then((data: DynamoDB.QueryOutput) => {
        resolve(data.Items as contactPoint[]);
      })
      .catch(err => {
        reject(err);
      });
  });
}

export function putContcatPoint(
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
      modifyData: now
    };
    const params: DynamoDB.PutItemInput = {
      TableName: contactPointTableName,
      Item: cp as any,
      ReturnValues: "ALL_NEW"
    };

    dynamoDb
      .put(params)
      .promise()
      .then((data: DynamoDB.PutItemOutput) => {
        resolve(cp);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}
