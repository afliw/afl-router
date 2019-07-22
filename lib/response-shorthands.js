/*jshint esversion: 9 */
const fs = require("fs");
const path = require("path");
const MimeType = require("./mimeType");

class ResponseShortands {

    constructor(response, defaultResponseHeaders) {
        this.response = response;
        this.defaultHeaders = defaultResponseHeaders;
    }

    generic(data, opts) {
        let headers = mergeHeaders(opts.headers, this.defaultHeaders);
        this.response.writeHead(opts.statusCode || 200, opts.statusText || "OK", headers);
        if(typeof data != "string" && data.pipe) {
            data.pipe(this.response);
        } else {
            this.response.end(data);
        }
    }

    json(data, opts) {
        let defaults = {
            headers: {
                "Content-Type": "application/json"
            }
        };
        opts = mergeOptions(opts, defaults);
        data = typeof data == "string" ? data : JSON.stringify(data);
        this.generic(data, opts);
    }
    text(data, opts) {
        let defaults = {
            headers: {
                "Content-Type": "text/plain"
            }
        };
        opts = mergeOptions(opts, defaults);
        data = typeof data == "string" ? data : JSON.stringify(data);
        this.generic(data, opts);
    }
    html(data, opts) {
        let defaults = {
            headers: {
                "Content-Type": "text/html"
            }
        };
        opts = mergeOptions(opts, defaults);
        this.generic(data, opts);
    }
    file(filepath, opts) {
        if(!fs.existsSync(filepath)) throw `Error: file '${filepath}' doesn't exists.`;
        var mime = MimeType.findByExtension(getFileExtension(filepath));
        let defaults = {
            filename: path.basename(filepath),
            download: false,
            headers: {
                "Content-Type": mime
            }
        };
        let sr = fs.createReadStream(filepath);
        opts = mergeOptions(opts, defaults);
        this.generic(sr, opts);
    }
    redirect(redirectUrl, opts) {
        let defaults = {
            statusCode: 301,
            statusText: "Redirect",
            headers: {
                Location: redirectUrl
            }
        };
        opts = mergeOptions(opts, defaults);
        this.generic("", opts);
    }
}

function mergeOptions(opts, defaults) {
    opts = opts || {};
    for(let name in defaults) {
        if(typeof opts[name] == "object") {
            opts[name] = mergeOptions(opts[name], defaults[name]);
            continue;
        }
        opts[name] = opts[name] || defaults[name];
    }
    if(opts.download) opts.headers["Content-Disposition"] = `attachment; filename=${opts.filename}`;
    return opts;
}

function mergeHeaders(custom, defaults) {
    let def = {... defaults};
    for(let c in custom) {
        def[c] = custom[c];
    }
    return def;
}

function getFileExtension(url){
    var rx = /\.([a-zA-Z0-9]+)$/;
    var match = rx.exec(url);
    return match ? match[1] : false;
}

module.exports = ResponseShortands;