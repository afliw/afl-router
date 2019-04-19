/*jshint esversion: 9 */
///<reference path="index.d.ts" />

const path = require("path");
const fs = require('fs');

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
        return function(request, response) {
            request.on("data", (d) => onRequestData(request, d));
            request.on("end", () => onRequestEnd(request, response, this));
        }.bind(this);
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
        if (!port)
            throw "Must specify a port to listen to.";
        const http = require("http");
        return http.createServer(this.route()).listen(port);
    }
}

class ResponseShortands {

    constructor(response) {
        this.response = response;
    }

    generic(data, opts) {
        this.response.writeHead(opts.statusCode || 200, opts.statusText || "", opts.headers);
        this.response.end(data);
    }

    parseOptions(opts, contentType) {
        opts = opts || {};
        opts.headers = opts.headers || {};
        opts.headers["Content-Type"] = opts.headers["Content-Type"] || contentType;
        return opts;
    }

    json(data, opts) {
        opts = this.parseOptions(opts, "application/json");
        data = typeof data == "string" ? data : JSON.stringify(data);
        this.generic(data, opts);
    }
    text(data, opts) {
        opts = this.parseOptions(opts, "text/plain");
        data = typeof data == "string" ? data : JSON.stringify(data);
        this.generic(data, opts);
    }
    html(data, opts) {
        opts = this.parseOptions(opts, "text/html");
        this.generic(data, opts);
    }
    file(path, opts) {
        if(!fs.existsSync(path)) throw `Error: file '${path}' doesn't exists.`;
        var mime = MimeTypes.findByExtension(getFileExtension(path));
        fs.readFile(path, (err, content) => {
            if(err) throw err.message;
            opts = this.parseOptions(opts, mime);
            this.generic(content, opts);
        });
    }
}

function handleRequest(parsedRequest, router) {
    parsedRequest.fileExtension = getFileExtension(parsedRequest.url);
    var routeCallback = matchRoute(router.routes[parsedRequest.method], parsedRequest.url);
    if (routeCallback) {
        parsedRequest.namedParameters = routeCallback.params;
        routeCallback.method(parsedRequest, parsedRequest.__HTTP_Response__);
    }
    else if (parsedRequest.fileExtension) {
        returnStaticContent(parsedRequest, router);
    }
    else {
        if (router.defaultFilename && 
            router.publicDirectory && 
            fs.existsSync(path.join(router.publicDirectory, parsedRequest.url, router.defaultFilename))) {
            parsedRequest.url += router.defaultFilename;
            returnStaticContent(parsedRequest);
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

function onRequestData(request, data) {
    if(!request.body) request.body = "";
    request.body += data.toString("binary");
}

function onRequestEnd(request, response, router) {
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
    var rs = new ResponseShortands(response);//ResponseShortands(response);
    Object.defineProperty(parsedRequest, "answer", {...descriptor, value: rs});
    handleRequest(parsedRequest, router);
}

function parseUrl(url) {
    var urlParts = url.split("?");
    return {
        url: urlParts[0],
        queryParams: urlParts.length > 1 ? parseURLEncodedParameters(urlParts[1]) : {}
    };
}

function parseURLEncodedParameters(queryString) {
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

const MimeTypes =  {
    mimes: JSON.parse(fs.readFileSync("mimes.json")),
    
    findByExtension(ext) {
        mime = this.mimes.find( m => {
            return m.ext == ext;
        });
        return mime && mime.type || "text/plain";
    },

    findByMime(mime) {
        ext = this.mimes.find( m => {
            return m.type == mime || m.alt && m.alt.find( a => a == mime);
        });
        return ext && ext.ext || undefined;
    }
};

function matchRoute(routes, url) {
    if(!routes) return false;
    url = url != "/" ? url.replace(/\/$/, "") : url;
    if(routes.hasOwnProperty(url)) {
        return {method: routes[url], params: {}};
    } else {
        var candidates = Object.keys(routes).filter(r => /{[^\/]+}/.test(r));
        for(let candidate of candidates) {
            // let splitRoute = candidate.split("/");
            // let regexUrl = splitRoute.reduce( (a, c) => {
            //     let test = /{(?<param>.*)}/.exec(c);
            //     c = test ? `(?<${test.groups.param}>[^\\/]+)` : c;
            //     return a + "\\/" + c;
            // });
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
    //var rx = /\.(js|css|jpg|html|mp4|txt|png|gif|json|woff2|mp3)$/;
    var rx = /\.([a-zA-Z0-9]+)$/;
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
            params = {_raw: request.body};
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
        formData[name] = filename ? new InputFile(filename, mime, val) : val;
        //if (filename) fs.writeFileSync(path.join(__dirname, "temp", filename), val, "binary");
        match = rx.exec(data);
    }
    return formData;
}

class InputFile {
    constructor(filename, mime, content) {
        this.filename = filename;
        this.mime = mime;
        this.content = content;
        this.extension = filename.replace(/.*\.([^.]+)$/, "$1");
        this.extensionFromMime = MimeTypes.findByMime(mime);
    }

    save(path, encoding, callback) {
        callback = typeof encoding == "function" ? encoding : callback;
        ecoding = typeof encoding == "string" ? encoding : "binary";
        fs.writeFile(path, this.content, encding, callback);
    }

    saveSync(path, encoding) {
        fs.writeFileSync(path, this.content, encoding || "binary");
    }

    destroy() {
        delete this.filename;
        delete this.mime;
        delete this.content;
        delete this.extension;
    }
}

module.exports = Router;