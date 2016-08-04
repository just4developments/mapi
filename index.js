var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var secure = require('./apps/secure');

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

secure.crossdomain(app);

app.use('/oauth', require('./apps/oauth/index')());
app.use('/notesecurity', require('./apps/node-security/index')());
app.use('/api/savemoney', require('./apps/note-expensive/index')());
app.use('/saleonline', require('./apps/sale-online/index')());

app.listen(8001, function () {
  console.log('Example app listening on port 3000!');
});