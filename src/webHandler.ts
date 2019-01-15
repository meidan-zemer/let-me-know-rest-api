"use strict";
import express from "express";
import uuid from "uuid";
import cookieParser from "cookie-parser";
import serverlessExpress from "aws-serverless-express";
import awsServerlessExpressMiddleware from "aws-serverless-express/middleware";
import bodyParser from "body-parser";
import { Request } from "express-serve-static-core";
import {
  getAllContactPoints,
  putContactPoint,
  getContactPoint,
  updateContactPoint
} from "./dynamodb";
import { discussion, message } from "let-me-know-ts-definitions";

const app = express();

app.use(awsServerlessExpressMiddleware.eventContext());
app.use(bodyParser.json()); //parse application/json
app.use(cookieParser());

app.get("/rest/discussion/:discussionId", (req: Request | any, res) => {
  res.send(req.cookies);
});

app.put("/rest/discussion/:discussionId", (req: Request | any, res) => {
  res.cookie("clientId", uuid(), { maxAge: 1000 * 10 });
  res.send("OK");
});

app.get(
  "/rest/discussion/:discussionId/messages",
  (req: Request | any, res) => {
    res.send(req.cookies);
  }
);
app.put(
  "/rest/discussion/:discussionId/messages",
  (req: Request | any, res) => {
    res.cookie("clientId", uuid(), { maxAge: 1000 * 10 });
    res.send("OK");
  }
);

app.get("*", (req, res) => {
  res.status(404).send("Not found " + req.originalUrl);
});
app.put("*", (req, res) => {
  res.status(404).send("Not found " + req.originalUrl);
});

const server = serverlessExpress.createServer(app);
module.exports.letMeKnow = (event: any, context: any) => {
  console.log(JSON.stringify(event));
  console.log(JSON.stringify(context));
  return serverlessExpress.proxy(server, event, context);
};
