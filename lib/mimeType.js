/*jshint esversion: 9 */

const fs = require("fs");
const path = require("path");

module.exports = {
    mimes: JSON.parse(fs.readFileSync(path.join(__dirname, "mimes.json"))),
    
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