# Installation

> npm install afl-router

## Usage

```javascript
var path = require('path');
var http = require("http");

var aflRouter = require("afl-router");

// Base dir from wich serve static files. 
// Default value: '/'
aflRouter.baseDir = path.join(__dirname, "app", "dist");

// Default file to search inside folders, if not specified in URL.
// Default value: 'index.html'
aflRouter.defaultFile = 'app.html';

// Adding a route to GET method, callback receives request & response objects,
// the same used by the callback in http server.
aflRouter.get("/data", function(req, res){
    res.writeHead(200);
    res.write(req);
    res.end();
});

aflRouter.post("/update", function(req, res){
    // Methods parameters sent from the webpage
    // can be accessed in request.input.METHOD
    console.log(req.input.post);
});

// Put server to listen on port 8080
http.createServer(aflRouter.route).listen(8080);

```