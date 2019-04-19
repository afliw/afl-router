# About

Just a minimalist router to easily handle serving URLs in a HTTP server project.
At this moment, this router can handle the serving of static files inside a defined
public directory, HTTP request for any method,  parsing url query string, body, and 
also supports named parameters in URL, and a fallback resource if defined.

# Installation

> npm install afl-router

# Usage

## Table of Contents

* [Setting up the router](#setting-up-the-router)
  * [Intial router configuration](#initial-router-configuration)
* [Defining the public directory (static files)](#defining-the-public-directory-(static-files))
* [Setting up routes](#setting-up-routes)
  * [Named parameters in URL](#named-parameters-in-url)
* [Getting requests parameters](#getting-requests-parameters)
  * [Query string](#query-string)
  * [Body Content](#body-content)
* [Answering requests](#answering-requests)
  * [Using node's http.ServerResponse](#using-nodes-http.serverresponse)

## Setting up the router

To setup the router, there are two options:

```javascript
const http = require("http");
const aflRouter = require("afl-router");

var router = new aflRouter();

// Just pass the method `route()` to http's `createServer` callback.
var server = http.createServer(router.route()).listen(8080);
```

Or using the `listen()` method inside the own router: 

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

// The method `listen` will create the http server and return it.
var server = router.listen(8080);
```

### Initial router configuration

An object can be passed to the router's constructor with some optional parameters.

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter({
    publicDirectory: "app/dist",
    defaultFilename: "index.html",
    fallback: function(req) {
        req.answer.text("Oops, resource not found.");
    }
});

// The method `listen` will create the http server and return it.
var server = router.listen(8080);
```

## Defining the public directory (static files)

To serve static files (html files, scripts, images, stylesheets, etc), it's necessary to setup the public directory. It can be setup in the [router constructor](#initial-router-configuration) or with the method `setPublicDirectory()` after being created.

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

// Setting the value to "." will server any file inside the project's root.
router.setPublicDirectory(".");
// Point to a single directory:
router.setPublicDirectory("/app/dist");

var server = router.listen(8080);
```
All static files requested to the server, will be fetch realitve to the public directory defined. So, if the requested url is _http://localhost:8080/scripts/mySript.js_, and the public directory is defined to *"/app/dist"*, the file that is going to be server should be in _%project_root%/app/dist/scripts/myScript.js_.

There is also `setDefaultFilename()` method, that, if setup, will serve that file in case none is specified (and no route is defined for that url).

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

router.setPublicDirectory("/app/dist");
router.setDefaultFilename("index.html");

var server = router.listen(8080);
```
If a **public directory** and a **default filename** are defined, when a URL is requested and no action is defined for that route, the router will look up for the default filename in the public directory. For example: _http://localhost:8080/article_ will serve, in case it exists, the file **index.html** (default filename) inside the directory **%project_root%/app/dist/article** (public directory + url path).

## Setting up routes

There are two ways of setting up routes. The first, is with the HTTP method shorthand:

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

// URL request "http://localhost:8080/items" will land here
router.get("/items", function(request) {
    // do stuff
});

// POST to "http://localhost:8080/item/add" will land here
router.get("/item/add", function(request) {
    // do stuff
});

var server = router.listen(8080);
```

Every HTTP method can be used this way (get, post, put, head, etc.).

An alternative way to setup a route is with an object, wich enables to define several method action for a single route in one invokation:

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

var userActions = {
    get: function(request) {
        // GET requests to http://localhost:8080/user land here
    },
    delete: function(request) {
        // DELETE requests to http://localhost:8080/user land here
    },
    post: function(request) {
        // POST requests to http://localhost:8080/user land here
    }
};

router.newRoute("/user", userActions);

var server = router.listen(8080);
```

### Named parameters in URL

Named parameters can be setup in an URL, and retrieved within the `ParsedRequest` object passed in the callback.

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

// ie: http://localhost:8080/posts/2019/04
router.get("/posts/{year}/{month}", function(request) {
    console.log(request.namedParameters.year); // ie: 2019
    console.log(request.namedParameters.month); // ie: 04
});

// ie: http://localhost:8080/user/do_update/45
router.post("/user/do_{action}/{id}", function(request) {
    console.log(request.namedParameter.action); // ie: 'update'
    console.log(request.namedParameter.id); // ie: 45
});

// ie: http://localhost:8080/main.js
router.head("/{filename}.js", function(request) {
    console.log(request.namedParameters.filename); // ie: 'main'
}); 

var server = router.listen(8080);
```

## Getting requests parameters

### Query string

To get query string parameters passed within the url, the object `query` inside the `request` object received as parameter in the route callback can be used:

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

// ie: http://localhost:8080/posts?month=10&year=2019
router.get("/posts", function(request) {
    console.log(request.query.month);
    console.log(request.query.year);
});

var server = router.listen(8080);
```
Query string parameters are parsed by the router and store inside the `query` object, and can be accessed by their name as properties.

### Body content

Content of request's body will be parsed according to the content-type declared, and is available through `ParsedRequest.body` object:

```javascript
const fs = require("fs");
const aflRouter = require("afl-router");

var router = new aflRouter();

// ie: http://localhost:8080/comments/new
router.post("/comments/new", function(request) {
    console.log(request.body.user);
    console.log(request.body.comment);
});

// Files uploaded with multipart/form-data are available in body object as well.
// In this example, the name of the file uploaded is 'photo':
router.post("/upload", function(request) {
    let filename = request.body.photo.filename;
    let content = request.body.photo.file
    fs.writeFile(filename, content, "binary", function(err) {
        console.log(err || "File saved to disk!");
    });
});

var server = router.listen(8080);
```

## Answering requests

### Response shorthands (answer interface)

Inside the `ParsedRequest` object, there a interface `answer` present to perform the request's response in a quick way.

There are 4 shorthand functions present in `ParsedRequest.answer`: `json()`, `html()`, `text()` and `file()`. There's also a `generic()` function that does not set up automatically the response's header `Content-Type`.

This functions receive a first argument, `data` (or `filepath` in case of `file()`), and a second optional argument, `opts`. This second argument can contain `statusCode`, `statusText` and `headers` that will be writen in the response. If any of those is set, defaults will be overwriten.

```javascript
const path = require("path");
const fs = require("fs");
const aflRouter = require("afl-router");

var router = new aflRouter();

router.get("/users", function(request) {
    var users = [
        {name: "Jack", last_seen: "2019-03-02"},
        {name: "Peter", last_seen: "2018-11-27"}
    ];
    // json() automatically stringify the object and set the response's Content-Type
    request.answer.json(users);
});

router.get("/user/profile_photo/{id}", function(request) {
    let userId = request.namedParameters.id;
    let filepath = path.join("images", "users_profile", userId + ".jpg");
    if(fs.existsSync(filepath)) {
        // file() receives a path to file as parameter, 
        // if the file doesn't exists, will throw an error.
        request.answer.file(filepath);
    } else {
        request.answer.text("File not found", {
            statusCode: 404, 
            statusTest: "Not found"
        }):
    }
});

var server = router.listen(8080);
```

As seen in the previous example, it is possible to change the defaults `statusCode`, `statusText` and `headers` on the response sent to the client by this shorthand functions.

### Using Node's `http.ServerResponse`

On every `RouterCallback`, besides the `ParsedRequest` object that is passed as first parameter, a second argument is passed, containing Node's `http.ServerResponse`. This response can be used to answer the request in the traditional way:

```javascript
const aflRouter = require("afl-router");

var router = new aflRouter();

router.get("/users", function(request, response) {
    response.writeHead(200, "OK", {"Content-Type": "text/html"});
    response.write("<h1>Users page<h1>");
    response.end();    
});

var server = router.listen(8080);
```