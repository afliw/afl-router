/*jshint esversion: 9 */
///<reference path="index.d.ts" />

const path = require("path");
const fs = require('fs');
const os = require("os");
const ContentParser = require("./lib/content-parser");
const ParsedRequest = require("./lib/parsed-request");


class Router {
    constructor(options) {
        options = options || {};
        this.routes = {
            GET: {},
            POST: {},
            PUT: {},
            PATCH: {},
            DELETE: {},
            HEAD: {},
            TRACE: {},
            CONNECT: {},
            OPTIONS: {}
        };
        this.publicDirectory = options.publicDirectory;
        this.fallback = options.fallback;
        this.defaultFilename = options.defaultFilename;
        this.tempDirectory = options.tempDirectory || os.tmpdir() || "tmp";
        this.sizeLimit = options.sizeLimit;
        if(!fs.existsSync(path.resolve(this.tempDirectory))) {
            fs.mkdirSync(path.resolve(this.tempDirectory));
        }
    }
    get(url, callback) {
        this.routes.GET[url] = callback;
    }
    post(url, callback) {
        this.routes.POST[url] = callback;
    }
    put(url, callback) {
        this.routes.PUT[url] = callback;
    }
    patch(url, callback) {
        this.routes.PATCH[url] = callback;
    }
    delete(url, callback) {
        this.routes.DELETE[url] = callback;
    }
    route() {
        return (request, response) => {
            ContentParser.parseBody(request, request.headers["content-type"], this.sizeLimit, this.tempDirectory, (err, parsedContent) => {
                if(err) console.log(err);
                onRequestEnd(request, response, parsedContent, this);
            });
        };
    }
    setDefaultFilename(name) {
        this.defaultFilename = name;
    }
    setFallback(callback) {
        this.fallback = callback;
    }
    setPublicDirectory(path) {
        if (typeof path !== "string")
            throw new Error("Argument 'path' must be of type 'string'");
        this.publicDirectory = path;
    }
    removeRoute(url, method) {
        if (!method) {
            if (this.routes[method.toUpperCase()].hasOwnProperty(url))
                return false;
            delete this.routes[method.toUpper()][url];
        }
        for (let met in routes) {
            if (this.routes[met].hasOwnProperty(url))
                delete this.routes[m][url];
        }
        return true;
    }
    newRoute(url, actions) {
        for (let method in actions) {
            if (!this.routes.hasOwnProperty(method.toUpperCase())) {
                console.warn(`Invalid method '${method}' in route definition.`);
                continue;
            }
            this.routes[method.toUpperCase()][url] = actions[method];
        }
    }
    listen(port) {
        if (!port) throw "Must specify a port to listen to.";
        const http = require("http");
        return http.createServer(this.route()).listen(port);
    }
}

function handleRequest(parsedRequest, router) {
    parsedRequest.fileExtension = getFileExtension(parsedRequest.url);
    var routeCallback = matchRoute(router.routes[parsedRequest.method], parsedRequest.url);
    if (routeCallback) {
        parsedRequest.route = routeCallback.params;
        routeCallback.method(parsedRequest, parsedRequest.__HTTP_Response__);
    }
    else if (parsedRequest.fileExtension) {
        returnStaticContent(parsedRequest, router);
    }
    else {
        let defaultFileExists = fs.existsSync(path.join(router.publicDirectory, parsedRequest.url, router.defaultFilename));
        if (router.defaultFilename && router.publicDirectory && defaultFileExists) {
            parsedRequest.url += router.defaultFilename;
            returnStaticContent(parsedRequest, router);
        }
        else {
            fallbackToResource(parsedRequest, router);
        }
    }
}

function fallbackToResource(parsedRequest, router) {
    let action = router.fallbackResource;
    if (!action) {
        return parsedRequest.answer.text("File or action not found on this server.", { statusCode: 404, statusText: "Not found" });
    }
    if (typeof action == "string") {
        if (!fs.existsSync(action))
            throw `File ${action} could not be found.`;
        parsedRequest.answer.file(action);
    }
    else if (typeof action == "function") {
        action(parsedRequest, parsedRequest.__HTTP_Response__);
    }
    else {
        throw `Fallback resource '${action}' is not a file or a callback.`;
    }
}

function returnStaticContent(parsedRequest, router) {
    if (router.publicDirectory === undefined)
        return fallbackToResource(parsedRequest, router);
    var fullPath = path.join(router.publicDirectory, parsedRequest.url);
    if (!fs.existsSync(fullPath))
        return fallbackToResource(parsedRequest, router);
    parsedRequest.answer.file(fullPath);
}

function onRequestEnd(request, response, parsedContent, router) {
    var parsedRequest = new ParsedRequest(request, response, parsedContent);
    handleRequest(parsedRequest, router);
}

function matchRoute(routes, url) {
    if(!routes) return false;
    url = url != "/" ? url.replace(/\/$/, "") : url;
    if(routes.hasOwnProperty(url)) {
        return {method: routes[url], params: {}};
    } else {
        var candidates = Object.keys(routes).filter(r => /{[^\/]+}/.test(r));
        for(let candidate of candidates) {
            let paramMatch = null;
            let regexUrl = candidate;
            var paramRegex =  /{(?<param>[a-z0-9]+)}/ig;
            while((paramMatch = paramRegex.exec(candidate))) {
                regexUrl = regexUrl.replace(paramMatch[0], `(?<${paramMatch[1]}>[^\\/]+)`);
            }
            regexUrl = new RegExp("^" + regexUrl + "$", "i");
            if(regexUrl.test(url)){
                let match = regexUrl.exec(url);
                return {method: routes[candidate] , params: match.groups};
            }
        }
    }
}

function getFileExtension(url){
    var rx = /\.([a-zA-Z0-9]+)$/;
    var match = rx.exec(url);
    return match ? match[1] : false;
}

module.exports = Router;