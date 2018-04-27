var path = require("path");
var fs = require('fs');

var Router = {
    defaultFile: "index.html",
    baseDir: path.join(__dirname, "app", "dist"),
    routes: {
        GET: {},
        POST: {}
    },
    get: function(url, callback){
        this.routes.GET[url] = callback;
    },
    post: function(url, callback){
        this.routes.POST[url] = callback;
    },
    route: function(request, response){
        request.on("data", (d) => onRequestData(request, d));
        request.on("end", () => onRequestEnd(request, response));
    }
}

function onRequestData(request, data) {
    if(!request.body) request.body = "";
    request.body += data.toString("binary");
}

function onRequestEnd(request, response) {
    parseBody(request);
    getUrlQueryParams(request);
    handleRequest(request, response);
}

function getUrlQueryParams(request) {
    if (request.url.indexOf("?") == -1) return;
    var urlParts = request.url.split("?");
    request.url = urlParts[0];
    if(!request.input) request.input = {};
    request.input.get = parseURLEncodedParameters(urlParts[1]);
}

function parseURLEncodedParameters(params) {
    var paramObj = {};
    var fullParams = params.split("&");
    for (var i = 0; i < fullParams.length; i++) {
        var name = fullParams[i].split("=")[0];
        var value = fullParams[i].split("=")[1];
        paramObj[name] = value;
    }
    return paramObj
}

function fileNotFound(response) {
    // OPTION FOR CUSTOM FILE INSIDE ROUTER OPTIONS
    response.writeHead(404, "File not found.");
    response.write("The file was not found on this server.");
    response.end();
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
        mp3: "audio/mpeg3"
    }
    return MimeTypes.hasOwnProperty(ext) ? MimeTypes[ext] : "text/html";
}

function handleRequest(request, response) {
    //console.log(`Request ${request.method} > ${request.url}`);
    //console.dir(request.input);
    request.fileExtension = getFileExtension(request.url);
    if (request.fileExtension) {
        returnStaticContent(request, response);
    } else if (Router.routes[request.method].hasOwnProperty(request.url)) {
        Router.routes[request.method][request.url](request, response);
    } else {
        request.url += Router.defaultFile;
        returnStaticContent(request, response);
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
            params = JSON.parse(request.body);
            break;
        case "multipart/form-data":
            params = parseFormData(request.body);
            break;
        default:
            break;
    }
    if(!params) return;
    if(!request.input) request.input = {};
    request.input.post = params;
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

function returnStaticContent(request, response) {
    var fullPath = path.join(Router.baseDir, request.url);
    fs.exists(fullPath, (exists) => {
        if (exists) {
            fs.readFile(fullPath, (err, data) => {
                if (err) {
                    response.writeHead(500, "There was an error with your request.");
                    response.end();
                } else {
                    response.writeHead(200, {
                        "Content-Type": getMimeType(request.fileExtension)
                    });
                    response.write(data);
                    response.end();
                }            
            });
        } else {
            fileNotFound(response);
        }
    })
}

module.exports = Router;