"use strict";
import express from "express";
import serverlessExpress from "aws-serverless-express";
import awsServerlessExpressMiddleware from "aws-serverless-express/middleware";
import bodyParser from 'body-parser';
import { Request } from "express-serve-static-core";
import { getAllContactPoints, putContcatPoint } from "./dynamodb";
import { contactPoint } from "let-me-know-ts-definitions";

const app = express();


app.use(awsServerlessExpressMiddleware.eventContext());
app.use(bodyParser.json()); //parse application/json
app.get("/rest/contactPoints", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = getUserId(event);
  console.log("userID:"+userId);
  getAllContactPoints(userId)
    .then((items: contactPoint[]) => {
      res.send(items);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.put("/rest/contactPoint", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = getUserId(event);
  const cp: contactPoint = req.body;
  putContcatPoint(userId, cp.name, cp.description)
    .then((item: contactPoint) => {
      res.send(item);
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("*", (req, res) => {
  console.log("Got to 404:"+req.originalUrl);
  res.status(404).send("Not found "+req.originalUrl);
});


function getUserId(event:any) : string {
  let userId = null;
  try{
    userId = event.requestContext.authorizer.claims.sub;
  }
  catch(err){

  }
  return userId;
}


const server = serverlessExpress.createServer(app);
module.exports.letMeKnow = (event: any, context: any) => serverlessExpress.proxy(server, event, context);
