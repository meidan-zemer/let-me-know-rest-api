'use strict';
const express = require('express');
const app = express();
const serverlessExpress = require('aws-serverless-express');

app.get('/products', (req, res) => {
  console.log("1:"+JSON.stringify(req));
  res.send([{name:"prod1", description:"desc",id:"1"}]);
});

app.get('*',(req,res)=>{
  console.log("2:"+req.originalUrl)
  res.send({url:req.originalUrl});
});


const server = serverlessExpress.createServer(app);

module.exports.letMeKnow = (event, context) => serverlessExpress.proxy(server, event, context);
