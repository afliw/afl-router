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
* [Defining the public directory (static files)](#defining-the-public-directory-(static-files))
* [Setting up routes](#setting-up-routes)
* [Getting requests parameters](#getting-requests-parameters)
  * [Query string](#query-string)
  * [Body Content](#body-content)

## Setting up the router

To setup the router, there are two options:

```javascript
const http = require("http");
const aflRouter = require("afl-router");

// Just pass the method `route` to http's `createServer` callback.
var server = http.createServer(aflRouter.route).listen(8080);
```

Or using the `listen()` method inside the own router: 

```javascript
const aflRouter = require("afl-router");

// The method `listen` will create the http server and return it.
var server = aflRouter.listen(8080);
```

## Defining the public directory (static files)

To serve static files (html files, scripts, images, stylesheets, etc), it's necessary to setup the public directory:

```javascript
const aflRouter = require("afl-router");

// Setting the value to "." will server any file inside the project's root.
aflRouter.setPublicDirectory(".");
// Point to a single directory:
aflRouter.setPublicDirectory("/app/dist");

var server = aflRouter.listen(8080);
```
All static files requested to the server, will be fetch realitve to the public directory defined. So, if the requested url is _http://example.com/scripts/mySript.js_, and the public directory is defined to *"/app/dist"*, the file that is going to be server should be in _%project_root%/app/dist/scripts/myScript.js_.

There is also `setDefaultFilename()` method, that, if setup, will serve that file in case none is specified (and no route is defined for that url).

```javascript
const aflRouter = require("afl-router");

aflRouter.setPublicDirectory("/app/dist");
aflRouter.setDefaultFilename("index.html");

var server = aflRouter.listen(8080);
```
If a **public directory** and a **default filename** are defined, when a URL is requested and no action is defined for that route, the router will look up for the default filename in the public directory. For example: _http://example.com/article_ will serve, in case it exists, the file **index.html** (default filename) inside the directory **%project_root%/app/dist/article** (public directory + url path).

## Setting up routes

There are two ways of setting up routes. The first, is with the HTTP method shorthand:

```javascript
const aflRouter = require("afl-router");

// URL request "http://example.com/items" will land here
aflRouter.get("/items", function(request) {
    // do stuff
});

// POST to "http://example.com/item/add" will get here
aflRouter.get("/item/add", function(request) {
    // do stuff
});

var server = aflRouter.listen(8080);
```

Every HTTP method can be used this way (get, post, put, head, etc.).

The other way to setup a route is with an object:

```javascript
const aflRouter = require("afl-router");

var userActions = {
    get: function(request) {
        // GET requests to http://example.com/user land here
    },
    delete: function(request) {
        // DELETE requests to http://example.com/user land here
    },
    post: function(request) {
        // POST requests to http://example.com/user land here
    }
};

aflRouter.newRoute("/user", userActions);

var server = aflRouter.listen(8080);
```

## Getting requests parameters

### Query string

To get query string parameters passed with the url, the object `query` inside `request` object received as parameter in the route callback can be used:

```javascript
const aflRouter = require("afl-router");

// ie: http://example.com/posts?month=10&year=2019
aflRouter.get("/posts", function(request) {
    console.log(request.query.month);
    console.log(request.query.year);
});

var server = aflRouter.listen(8080);
```
Query string parameters are parsed by the router and store inside the `query` object, and can be accessed by their name as properties.

### Body content

In progress...