"use strict";
import express from "express";
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
import { contactPoint } from "let-me-know-ts-definitions";

const app = express();

app.use(awsServerlessExpressMiddleware.eventContext());
app.use(bodyParser.json()); //parse application/json
app.get("/rest/contactPoints", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = getUserId(event);
  getAllContactPoints(userId)
    .then((items: contactPoint[]) => {
      res.send(items);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send(err);
    });
});
app.get("/rest/contactPoint/:cpId", (req: Request | any, res) => {
  const cpId = req.params.cpId;
  getContactPoint(cpId)
    .then((cp: contactPoint) => {
      res.send(cp);
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
  putContactPoint(userId, cp.name, cp.description)
    .then((item: contactPoint) => {
      res.send(item);
    })
    .catch(err => {
      res.status(500).send(err);
    });
});
app.post("/rest/contactPoint/:cpId", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = getUserId(event);
  const cp: contactPoint = req.body;
  const cpId = req.params.cpId;
  updateContactPoint(userId, cpId, cp)
    .then((item: contactPoint) => {
      res.send(item);
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("*", (req, res) => {
  res.status(404).send("Not found " + req.originalUrl);
});
app.put("*", (req, res) => {
  res.status(404).send("Not found " + req.originalUrl);
});
app.post("*", (req, res) => {
  res.status(404).send("Not found " + req.originalUrl);
});

function getUserId(event: any): string {
  let userId = event.requestContext.authorizer.claims.sub;
  return userId;
}

const server = serverlessExpress.createServer(app);
module.exports.letMeKnow = (event: any, context: any) => {
  console.log(JSON.stringify(event));
  console.log(JSON.stringify(context));
  return serverlessExpress.proxy(server, event, context);
};
