"use strict";
import express from "express";
import serverlessExpress from "aws-serverless-express";
import awsServerlessExpressMiddleware from "aws-serverless-express/middleware";
import { Request } from "express-serve-static-core";
import { getAllContactPoints, putContcatPoint } from "./dynamodb";
import { contactPoint } from "../../let-me-know-ts-definitions/definitions";

const app = express();

app.use(awsServerlessExpressMiddleware.eventContext());

app.get("/rest/contactPoints", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = event.context["user-sub"];
  getAllContactPoints(userId)
    .then((items: contactPoint[]) => {
      res.send(items);
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.put("/rest/contactPoint", (req: Request | any, res) => {
  const event = req.apiGateway.event;
  const userId = event.context["user-sub"];
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
  res.status(404).send("Not found");
});

const server = serverlessExpress.createServer(app);

module.exports.letMeKnow = (event: any, context: any) => {
  serverlessExpress.proxy(server, event, context);
};
