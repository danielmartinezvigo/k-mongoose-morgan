# k-mongoose-morgan

A fork of [mongoose-morgan](https://www.npmjs.com/package/mongoose-morgan).

# Install

```npm install k-mongoose-morgan```

# Usage

```
// express
var express = require('express');
var app = express();

// mongoose-morgan
var mongooseMorgan = require('k-mongoose-morgan');

// connection-data
var port = process.env.port || 8080;

// Logger
app.use(
  mongooseMorgan({
    collection: 'test_logger',
    connectionString: process.env.MONGO_URI,
  }, {
    skip: req => req.body.password,
  }),
);

// run
app.listen(port);
console.log('works... ' + port);
```
