/*jshint esversion: 9 */
const ResponseShorthands = require("./response-shorthands");

class ParsedRequest {
    constructor(request, response, parsedContent) {
        let decomposedUrl = parseUrl(request.url);
        this.body = parsedContent.params || parsedContent._raw;
        this.query = decomposedUrl.queryParams;
        this.url = decomposedUrl.path;
        this.headers = request.headers;
        this.method = request.method;
        addReadonlyProperties(request, response, this);
    }

    input(name) {
        return this.body[name] || this.query[name] || null;
    }

}

function addReadonlyProperties(request, response, obj) {
    let descriptor = {
        configurable: false, 
        enumerable: false, 
        writable: false
    };
    Object.defineProperty(obj, "__HTTP_Request__", {descriptor, value: request});
    Object.defineProperty(obj, "__HTTP_Response__", {descriptor, value: response});
    var rs = new ResponseShorthands(response);
    Object.defineProperty(obj, "answer", {...descriptor, value: rs});
}

function parseUrl(url) {
    var urlParts = url.split("?");
    return {
        path: urlParts[0],
        queryParams: urlParts.length > 1 ? ContentParser.parseURLEncodedParameters(urlParts[1]) : {}
    };
}

module.exports = ParsedRequest;