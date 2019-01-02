"use strict";
import express from "express";
import serverlessExpress from "aws-serverless-express";

const app = express();

app.get("/contactPoints", (req, res) => {
  res.send([{ name: "prod1", description: "desc", id: "1" }]);
});

app.get("*", (req, res) => {
  res.status(404).send("Not found");
});

const server = serverlessExpress.createServer(app);

module.exports.letMeKnow = (event: any, context: any) =>
  serverlessExpress.proxy(server, event, context);
