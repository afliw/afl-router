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
// Example: In this case, "http://example.com/some/resource" will try 
// to get file "%baseDir%/some/resource/app.html" relative to 'baseDir'.
aflRouter.defaultFile = 'app.html';

// Resource to use in case an URL is request which doesn't have any action defined
// and 'defaultFile' doesn't exists in 'baseDir'.
// Path is relative to 'baseDir'.
// In this example, URL "http://example.com/some/resource" will 
// serve the file "%baseDir%/index.html" if 'defaultFile' is not found.
aflRouter.fallbackResource = "index.html";

// File to call in case a static file is requested and not found.
// If not set, a 404 text/plain response will be served.
aflRouter.fileNotFound = "404.html";

// Adding a route to GET method, callback receives request & response objects,
// the same used by the callback in http server.
aflRouter.get("/data", function(req, res){
    res.writeHead(200, "OK", {"Content-type": "text/plain"});
    res.write("myData);
    res.end();
});

// All HTTP methods (get, post, put, patch and delete) can be used in this fashion.
aflRouter.post("/update", function(req, res){
    // Parameters sent from the webpage
    // can be accessed in request.input.body or request.input.url, 
    // depending on the parameter origin.
    console.log(req.input.body);
});

// Put server to listen on port 8080
http.createServer(aflRouter.route).listen(8080);

```