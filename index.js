/*jshint esversion: 9 */

var path = require("path");
var fs = require('fs');

var Router = {
    defaultFilename: "index.html",
    publicDirectory: undefined,
    fileNotFound: undefined,
    fallbackResource: undefined,
    routes: {
        GET: {},
        POST: {},
        PUT: {},
        PATCH: {},
        DELETE: {},
        HEAD: {},
        TRACE: {},
        CONNECT: {},
        OPTIONS: {}
    },
    get: function(url, callback){
        this.routes.GET[url] = callback;
    },
    post: function(url, callback){
        this.routes.POST[url] = callback;
    },
    put: function(url, callback) {
        this.routes.PUT[url] = callback;
    },
    patch: function(url, callback) {
        this.routes.PATCH[url] = callback;
    },
    delete: function(url, callback) {
        this.routes.DELETE[url] = callback;
    },
    route: function(request, response){
        request.on("data", (d) => onRequestData(request, d));
        request.on("end", () => onRequestEnd(request, response));
    },
    setDefaultFilename(name) {
        this.defaultFilename = name;
    },
    setFallback(resource) {
        this.fallbackResource = resource;
    },
    setPublicDirectory(path) {
        if(typeof path !== "string") throw new Error("Argument 'path' must be of type 'string'");
        this.publicDirectory = path;
    },
    removeRoute(url, method) {
        if(!method) {
            if(this.routes[method.toUpperCase()].hasOwnProperty(url)) return false;
            delete this.this.routes[method.toUpper()][url];
        }
        for(let met in this.routes){
            if(this.routes[met].hasOwnProperty(url)) delete this.this.routes[m][url];
        }
        return true;
    },
    newRoute(url, actions) {
        for(let method in actions) {
            if(!this.routes.hasOwnProperty(method.toUpperCase())) {
                console.warn(`Invalid method '${method}' in route definition.`);
                continue;
            }
            this.routes[method.toUpperCase()][url] = actions[method];
        }
    },
    listen: function(port) {
        if(!port) throw "Must specify a port to listen to.";
        const http = require("http");
        return http.createServer(this.route).listen(port);
    } 
};

function ResponseShortands(originalResponse) {

    var response = originalResponse;

    function genericAnswer(data, opts) {
        response.writeHead(opts.statusCode || 200, opts.statusText, opts.headers);
        response.end(data);
    }

    function parseOptions(opts, contentType) {
        opts = opts || {};
        opts.headers = opts.headers || {};
        opts.headers["Content-Type"] = opts.headers["Content-Type"] || contentType;
        return opts;
    }

    return {
        json(data, opts) {
            opts = parseOptions(opts, "application/json");
            data = typeof data == "string" ? data : JSON.stringify(data);
            genericAnswer(data, opts);
        },
        text(data, opts) {
            opts = parseOptions(opts, "text/plain");
            data = typeof data == "string" ? data : JSON.stringify(data);
            genericAnswer(data, opts);
        },
        html(data, opts) {
            opts = parseOptions(opts, "text/html");
            genericAnswer(data, opts);
        },
        file(path, opts) {
            if(!fs.existsSync(path)) throw `Error: file '${path}' doesn't exists.`;
            var mime = getMimeType(getFileExtension(path));
            fs.readFile(path, (err, content) => {
                if(err) throw err.message;
                opts = parseOptions(opts, mime);
                genericAnswer(content, opts);
            });
        }
    };
}

function onRequestData(request, data) {
    if(!request.body) request.body = "";
    request.body += data.toString("binary");
}

function onRequestEnd(request, response) {
    var decomposedUrl = parseUrl(request.url);
    let parsedRequest = {
        body: parseBody(request) || {},
        query: decomposedUrl.queryParams,
        url: decomposedUrl.url,
        headers: request.headers,
        method: request.method,
        input(name) {
            return this.body[name] || this.query[name] || null;
        }
    };
    let descriptor = {
        configurable: false, 
        enumerable: false, 
        writable: false
    };
    Object.defineProperty(parsedRequest, "__HTTP_Request__", {descriptor, value: request});
    Object.defineProperty(parsedRequest, "__HTTP_Response__", {descriptor, value: response});
    var rs = ResponseShortands(response);
    Object.defineProperty(parsedRequest, "answer", {...descriptor, value: rs});
    handleRequest(parsedRequest);
}

function parseUrl(url) {
    var urlParts = url.split("?");
    return {
        url: urlParts[0],
        queryParams: urlParts.length > 1 ? getQueryParams(urlParts[1]) : {}
    };
}

function getQueryParams(queryString) {
    var queryObj = {};
    var queryStringParts = queryString.split("&");
    for (var i = 0; i < queryStringParts.length; i++) {
        var name = queryStringParts[i].split("=")[0];
        var value = queryStringParts[i].split("=")[1];
        if(/.*\[\]$/.test(name)) {
            name = name.substr(0, name.length - 2);
            queryObj[name] = Array.isArray(queryObj[name]) ? queryObj[name] : [];
            queryObj[name].push(castValue(value));
        } else {
            queryObj[name] = castValue(value);
        }
    }
    return queryObj;
}

function castValue(val) {
    if(isNaN(val) && typeof val == "string") {
        val = val === "true" ? true : val === "false" ? false : val;
        return val;
    }
    return parseFloat(val) || val;
}


function fallbackToResource(parsedRequest) {
    let action = Router.fallbackResource;
    if(!action) {
        return parsedRequest.answer.text("File or action not found on this server.", {statusCode: 404, statusText: "Not found"});
    }
    if(typeof action == "string") {
        if(!fs.existsSync(action))
            throw `File ${action} could not be found.`;
        parsedRequest.answer.file(action);
    } else if(typeof action == "function"){
        action(parsedRequest, parsedRequest.__HTTP_Response__);
    } else {
        throw `Fallback resource '${action}' is not a file or a callback.`;
    }
}

function getMimeType(ext) {
    var MimeTypes = {
        js: "application/javascript",
        css: "text/css",
        jpg: "image/jpeg",
        html: "text/html",
        mp4: "video/mpeg",
        txt: "text/plain",
        png: "image/png",
        gif: "image/gif",
        json: "application/json",
        woff2: "font/woff2",
        mp3: "audio/mpeg3",
        woff: "application/font-woff"
    };
    return MimeTypes.hasOwnProperty(ext) ? MimeTypes[ext] : "text/html";
}

function handleRequest(parsedRequest) {
    parsedRequest.fileExtension = getFileExtension(parsedRequest.url);
    var routeCallback = matchRoute(Router.routes[parsedRequest.method], parsedRequest.url);
    if (parsedRequest.fileExtension) {
        returnStaticContent(parsedRequest);
    } else if (routeCallback) {
        parsedRequest.namedParameters = routeCallback.params;        
        routeCallback.method(parsedRequest, parsedRequest.__HTTP_Response__);
    } else {
        if(Router.defaultFilename && fs.existsSync(path.join(Router.publicDirectory, parsedRequest.url, Router.defaultFilename))) {
            parsedRequest.url += Router.defaultFilename;
            returnStaticContent(parsedRequest);
        } else {
            fallbackToResource(parsedRequest);
        }
    }
}

function matchRoute(routes, url) {
    if(!routes) return false;
    url = url != "/" ? url.replace(/\/$/, "") : url;
    if(routes.hasOwnProperty(url)) {
        return {method: routes[url], params: {}};
    } else {
        var candidates = Object.keys(routes).filter(r => /{[^\/]+}/.test(r));
        for(let candidate of candidates) {
            let splitRoute = candidate.split("/");
            let regexUrl = splitRoute.reduce( (a, c) => {
                let test = /{(?<param>.*)}/.exec(c);
                c = test ? `(?<${test.groups.param}>[^\\/]+)` : c;
                return a + "\\/" + c;
            });
            regexUrl = new RegExp("^" + regexUrl + "$", "i");
            if(regexUrl.test(url)){
                var match = regexUrl.exec(url);
                return {method: routes[candidate] , params: match.groups};
            }
        }
    }
}

function getFileExtension(url){
    var rx = /\.(js|css|jpg|html|mp4|txt|png|gif|json|woff2|mp3)$/;
    var match = rx.exec(url);
    return match ? match[1] : false;
}

function parseBody(request){
    var contentType = request.headers["content-type"] ? request.headers["content-type"].split(";")[0] : "";
    var params;
    switch (contentType) {
        case "application/x-www-form-urlencoded":
            params = parseURLEncodedParameters(request.body);
            break;
        case "application/json":
            try {
                params = JSON.parse(request.body);
            } catch (error) {
                params = error;
            }         
            break;
        case "multipart/form-data":
            params = parseFormData(request.body);
            break;
        default:
            break;
    }
    return params;
}

function parseFormData(data){
    var formData = {};
    var rx = /Content-Disposition: (.*?); name="(.*?)"(?:; filename="(.*?)")?(?:\s{2}Content-Type: (.*))?\s{4}([\s\S]*?)\s{2}--/g;
    var match = rx.exec(data);
    while (match) {
        var val = match[5];
        var name = match[2];
        var filename = match[3];
        var mime = match[4];
        formData[name] = filename ? {
            filename: filename,
            file: val,
            mime: mime
        } : val;
        //if (filename) fs.writeFileSync(path.join(__dirname, "temp", filename), val, "binary");
        match = rx.exec(data);
    }
    return formData;
}

function returnStaticContent(parsedRequest) {
    if(Router.publicDirectory === undefined) return fallbackToResource(parsedRequest);
    var fullPath = path.join(Router.publicDirectory, parsedRequest.url);
    if(!fs.existsSync(fullPath)) return fallbackToResource(parsedRequest);
    parsedRequest.answer.file(fullPath);
}

module.exports = Router;