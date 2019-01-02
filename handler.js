'use strict';
const express = require('express');
const app = express();
const serverlessExpress = require('aws-serverless-express');

app.get('/contactPoints', (req, res) => {
  res.send([{name:"prod1", description:"desc",id:"1"}]);
});

app.get('*',(req,res)=>{
  res.status(404).send('Not found');
});


const server = serverlessExpress.createServer(app);

module.exports.letMeKnow = (event, context) => serverlessExpress.proxy(server, event, context);
