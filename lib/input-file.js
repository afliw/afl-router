/*jshint esversion: 9 */
const MimeType = require("./mimeType");
const fs = require("fs");

class InputFile {
    constructor(fileObj) {
        this.filename = fileObj.filename;
        this.mime = fileObj.mime;
        this.tmpFile = fileObj.tmpFile;
        this.extension = fileObj.filename.replace(/.*\.([^.]+)$/, "$1");
        this.extFromMime = MimeType.findByMime(fileObj.mime);
    }

    save(path, callback) {
        fs.rename(this.tmpFile, path, callback);
    }

    saveSync(path) {
        fs.renameSync(this.tmpFile, path);
    }
}

module.exports = InputFile;