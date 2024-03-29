/*jshint esversion: 9 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const InputFile = require("./input-file");

function parseBody(request, contentType, sizeLimit, tempDirectory, cb) {

    var parsedData = {
        fileWriter: undefined,
        params: {},
        lastParam: undefined,
        size: 0,
        tempDirectory: tempDirectory,
        boundary: getBoundary(contentType)
    };

    var queue = {
        busy: false,
        line: [],
        parseFn: undefined,
        requestEnded: false,
        add(chunk) {
            this.line.push(chunk);
            this.process();
        },
        process() {
            if(!this.busy) {
                if(this.line.length > 0) {
                    this.busy = true;
                    this.parseFn(this.line.shift(), parsedData).then( () => {
                        this.busy = false;
                        return this.process();
                    }).catch(e => console.log(e.message));
                } else if(this.requestEnded) {
                    buildResult(parsedData, contentType, cb);
                }
            }
        },
        requestEnd() {
            this.requestEnded = true;
            this.process();
        }
    }

    queue.parseFn = parseContent;
    if(contentType && contentType.indexOf("multipart/form-data") !== -1) {
        if(!parsedData.boundary) cb(new Error("No boundary found on header"), null);
        queue.parseFn = parseMultipart;
    }

    request.on("data", function(chunk) {
        parsedData.size += chunk.length;
        if(sizeLimit && parsedData.size > sizeLimit) {
            request.destroy(new Error("Size limit exceeded."));
            cb(new Error("Size limit exceeded"), null);
        }
        queue.add(chunk);
    });
    request.on("end", () => queue.requestEnd());
}

function buildResult(parsedData, contentType, cb) {
    if(!contentType) return cb(null, parsedData);
    if(contentType.indexOf("multipart/form-data") !== -1) {
        for(let p in parsedData.params) {
            if(Array.isArray(parsedData.params[p])){
                for(let prop in parsedData.params[p]) {
                    parsedData.params[p][prop] = new InputFile(parsedData.params[p][prop]);
                }
            } else if(parsedData.params[p].tmpFile) {
                parsedData.params[p] = new InputFile(parsedData.params[p]);
                continue;
            }
            try {
                parsedData.params[p] = JSON.parse(parsedData.params[p]);
            } catch(e) {}
        }
        closeOutput(parsedData);
    } else if(contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
        parsedData.params = parseURLEncodedParameters(parsedData._raw);
        delete parsedData._raw;
    } else if(contentType.indexOf("application/json") !== -1) {
        try {
            parsedData.params = JSON.parse(parsedData._raw);
            delete parsedData._raw;     
        } catch (error) {
            parsedData.params = error;
        }      
    } else {
        parsedData.notice = "Content-Type not supported";
    }
    delete parsedData.lastParam;
    cb(null, parsedData);
}

async function parseContent(chunk, parsedData) {
    parsedData._raw = parsedData._raw || "";
    parsedData._raw += chunk;
}

async function parseMultipart(chunk, parsedData) {
    let boundaries = getDataBoundaries(chunk, parsedData.boundary);
    let firstBoundary = boundaries[0];

    if(firstBoundary && firstBoundary.startByte !== firstBoundary.boundaryByteLength) {
        await writeLastPiece(chunk, firstBoundary, parsedData);
        closeOutput(parsedData);
    }

    for(let bound of boundaries) {
        let bufferSize = bound.endByte ? bound.endByte - bound.startByte : chunk.length  - bound.startByte;
        let formChunk = Buffer.alloc(bufferSize);
        chunk.copy(formChunk, 0, bound.startByte, bound.endByte);
        let formData = parseFormData(formChunk);
        if(formData.filename) {
            let tempFilename = path.join(parsedData.tempDirectory, crypto.pseudoRandomBytes(16).toString("hex"));
            parsedData.fileWriter = fs.createWriteStream(tempFilename);
            await writeStream(parsedData.fileWriter, formData.chunk);
            let obj = {
                tmpFile: tempFilename,
                filename: formData.filename,
                mime: formData.contentType
            };
            if(parsedData.params[formData.name] && Array.isArray(parsedData.params[formData.name])) {
                parsedData.params[formData.name].push(obj);
            } else if(parsedData.params[formData.name]) {
                parsedData.params[formData.name] = [parsedData.params[formData.name], obj];
            } else {
                parsedData.params[formData.name] = obj;
            }
        } else if(formData.name) {
            parsedData.params[formData.name] = formData.chunk.toString();
            parsedData.lastParam = formData.name;
        }

        if(bound.endByte) {
            closeOutput(parsedData);
        }
    }

    if(boundaries.length == 0) {
        if(parsedData.fileWriter) {
            await writeStream(parsedData.fileWriter, chunk);
        } else if(parsedData.lastParam) {
            parsedData.params[parsedData.lastParam] += chunk.toString();
        }
    }
}

async function writeStream(stream, data) {
    return new Promise( resolve => {
        if(stream.write(data)) {
            resolve();
        } else {
            stream.once("drain", () => {
                resolve();
            });
        }
    })
}

async function writeLastPiece(chunk, boundary, parsedData) {
    let offset = boundary.startByte - boundary.boundaryByteLength;
        let lastChunk = Buffer.alloc(offset);
        chunk.copy(lastChunk, 0, 0, offset);
        if(parsedData.fileWriter) {      
            await writeStream(parsedData.fileWriter, lastChunk);
        } else if(parsedData.lastParam) {
            parsedData.params[parsedData.lastParam] += lastChunk.toString();
        }
}

function closeOutput(parsedData) {
    if(parsedData.fileWriter) {
        parsedData.fileWriter.end();
    }
    parsedData.lastParam = undefined;
}

function getDataBoundaries(chunk, boundary) {
    let boundaryRgx = new RegExp(`(\r|\n)*--${boundary}(--)?(\r|\n)*`, "g");
    let stringChunk = chunk.toString("binary");

    var boundaryMatch = boundaryRgx.exec(stringChunk);
    var boundaries = [];

    while(boundaryMatch) {
        let bound = {};
        let stringIdx = boundaryMatch.index + boundaryMatch[0].length;
        bound.startByte = stringIdx;
        bound.boundaryByteLength = boundaryMatch[0].length;
        boundaries.push(bound);
        boundaryMatch = boundaryRgx.exec(stringChunk);
    }

    for(let i = 0; i < boundaries.length - 1; i++) {
        boundaries[i].endByte = boundaries[i+1].startByte - boundaries[i+1].boundaryByteLength;
    }
    return boundaries;
}

function parseFormData(chunk) {
    let formDataRgx = /Content-Disposition: (.*?); name="(.*?)"(?:; filename="(.*?)")?(?:(\n|\r)+)?/g;
    let contentTypeRgx = /Content-Type: (.*)(?:(\n|\r)+)?/g;
    let stringChunk = chunk.toString();
    let formDataMatch = formDataRgx.exec(stringChunk);
    if(!formDataMatch) return { chunk };
    let contentTypeMatch = contentTypeRgx.exec(stringChunk);
    let offsetIndex = contentTypeMatch ? contentTypeMatch.index : formDataMatch.index;
    offsetIndex += contentTypeMatch ? contentTypeMatch[0].length : formDataMatch[0].length;
    let offset = stringChunk.substr(0, offsetIndex);
    offset = Buffer.from(offset).length;
    var cutChunk = Buffer.alloc(chunk.length - offset);
    chunk.copy(cutChunk, 0, offset);
    return {
        chunk: cutChunk,
        name: formDataMatch[2],
        filename: formDataMatch[3],
        contentType: contentTypeMatch ? contentTypeMatch[1] : undefined 
    };
}

function getBoundary(header) {
    let match = /boundary=([^;]*)/g.exec(header);
    return match && match[1] || undefined;
}

function parseURLEncodedParameters(queryString) {
    var queryObj = {};
    var queryStringParts = queryString.split("&");
    for (var i = 0; i < queryStringParts.length; i++) {
        var name = decodeURIComponent(queryStringParts[i].split("=")[0]);
        var value = decodeURIComponent(queryStringParts[i].split("=")[1]);
        if(/.*\[\]$/.test(name)) {
            name = name.substr(0, name.length - 2);
            queryObj[name] = Array.isArray(queryObj[name]) ? queryObj[name] : [];
            queryObj[name].push(castValue(value));
        } else if(/(.*)\[([^\]]+)\]$/.test(name)) {
            let match = /(.*)\[([^\]]+)\]$/.exec(name);
            queryObj[match[1]] = queryObj[match[1]] || {};
            queryObj[match[1]][match[2]] = castValue(value);
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
    return isNaN(parseFloat(val)) ? val : parseFloat(val);
}

module.exports = {parseBody, parseURLEncodedParameters, InputFile};
