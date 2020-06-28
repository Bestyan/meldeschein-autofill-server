const http = require('http');
const fs = require('fs');

http.createServer(function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(process.env.PORT || 8000);