declare module "afl-router" {
    import { ServerResponse, IncomingMessage, RequestListener, Server } from "http";
    import { ReadStream } from "fs";

    class Router {
        
        /**
         * Creates a new instance of Router
         * @constructor
         * @param  {RouterOptions} options? Initial router configuration options.
         * @returns Router
         */
        constructor(options?: RouterOptions);
        /**
         * Creates a new route over HTTP method GET.
         * @param  {string} url URL to match route to.
         * @param  {RouterCallback} callback Action to perform on route match
         * @returns void
         */
        get(url: string, callback: RouterCallback) : void;
        /**
         * Creates a new route over HTTP method POST.
         * @param  {string} url URL to match route to.
         * @param  {RouterCallback} callback Action to perform on route match
         * @returns void
         */
        post(url: string, callback: RouterCallback) : void;
        /**
         * Creates a new route over HTTP method PUT.
         * @param  {string} url URL to match route to.
         * @param  {RouterCallback} callback Action to perform on route match
         * @returns void
         */
        put(url: string, callback: RouterCallback) : void;
        /**
         * Creates a new route over HTTP method DELETE.
         * @param  {string} url URL to match route to.
         * @param  {RouterCallback} callback Action to perform on route match
         * @returns void
         */
        delete(url: string, callback: RouterCallback) : void;
        /**
         * Creates a new route over HTTP method PATCH.
         * @param  {string} url URL to match route to.
         * @param  {RouterCallback} callback Action to perform on route match
         * @returns void
         */
        patch(url: string, callback: RouterCallback) : void;
        /**
         * Returns an HTTP Request listener function to feed as callback for http.createServer()
         * @returns http.RequestListener
         */
        route() : RequestListener;
        /**
         * Add a header with its value to default response headers
         * @param  {String} headerName Header name to be set
         * @param  {String|Number} value Header value
         * @returns void
         */
        addDefaultHeader(headerName: String, value: String | Number) : void;
        /**
         * Sets the default response headers object
         * @param  {HttpResponseHeaders} headers Object containing the headers to be set
         * @returns void
         */
        setDefaultHeaders(headers: HttpResponseHeaders) :void;
        /**
         * Removes a header from the default response headers object
         * @param  {String} headerName Heade name to be removed
         * @returns void
         */
        removeDefaultHeader(headerName: String) : void;
        /**
         * Sets the default filename to search inside public directory in case no route
         * is matched and no file is specified in URL.
         * @param  {string} name Name for default file to look up.
         * @returns void
         */
        setDefaultFilename(name: string) : void;
        /**
         * Sets the action to perform in case no route or file is matched in request.
         * @param  {RouterCallback} resource Function to call.
         * @returns void
         */
        setFallback(resource: RouterCallback) : void;
        /**
         * Sets the directory from which serve static files. A dot ('.') can be used to point to project root.
         * @param  {string} path Path to directory.
         * @returns void
         */
        setPublicDirectory(path: string) : void;
        /**
         * Removes an already set route. In case a method is passed, only removes the route from that method.
         * @param  {string} url Route to remove.
         * @param  {string} method? Method to remove.
         * @returns boolean True if delete was successfull.
         */
        removeRoute(url: string, method?: string) : boolean;
        /**
         * Creates a new route for given URL setting all the defined methods in 'actions' to that route.
         * @param  {string} url Route to add.
         * @param  {NewRouteActions} actions Object containing action to perform per method.
         * @returns void
         */
        newRoute(url: string, actions: NewRouteActions) : void;
        /**
         * Create an HTTP server and put to listen in specified port, passing the router as RequestListener.
         * @param  {number} port Port to listen to.
         * @returns http Node's HTTP server.
         */
        listen(port: number) : Server;
    }

    interface NewRouteActions {
        [dynamic:string]: RouterCallback;
    }

    interface RouterOptions {
        publicDirectory?: string;
        fallback?: Function;
        defaultFilename?: string;
        tempDirectory?: string;
        sizeLimit?: number;
        defaultHeaders?: HttpResponseHeaders;
    }

    type RouterCallback = (request: ParsedRequest, response: ServerResponse) => void;

    interface ParsedRequest {
        readonly __HTTP_Request__: IncomingMessage;
        readonly __HTTP_Response__: ServerResponse;
        body: BodyObject;
        query: object;
        url: string;
        headers: object;
        method: string;
        route: object;
        /**
         * Get a request parameter (body or query string) by name.
         * @param  {string} name Parameter name.
         */
        input: (name: string) => any;
        readonly answer: ResponseShorthands;
    }

    interface BodyObject {
        [dynamic:string]: InputFile | string | number | boolean | any[];
    }

    class InputFile {
        filename: string;
        file: string;
        mime: string;
        /**
         * @param  {string} path Full path and filename to save the file in.
         * @param  {string} encoding Encoding to write the file. Default: 'binary'.
         * @param  {function} callback Function to exectute when saving's done.
         */
        save: (path: string, callback: (err: NodeJS.ErrnoException) => void) => void;
        /**
         * @param  {string} path Full path and filename to save the file in.
         * @param  {string} encoding Encoding to write the file. Default: 'binary'.
         */
        saveSync: (path: string) => void;
    } 

    class ResponseShorthands {
        /**
         * Respond to request with a file (Content-Type set to file's mime type).
         * @param  {string} path Path to file.
         * @param  {AnswerOptions} opts Response options.
         */
        file: (path: string, opts?: AnswerOptions) => void;
        /**
         * Respond to request with json object (Content-Type set to application/json).
         * @param  {string | object} data JSON Object or stringified JSON object.
         * @param  {AnswerOptions} opts Response options.
         */
        json: (data: string | object, opts?: AnswerOptions) => void;  
        /**
         * Respond to request with html string (Content-Type set to text/html).
         * @param  {string} data HTML string.
         * @param  {AnswerOptions} opts Response options.
         */
        html: (data: string, opts?: AnswerOptions) => void;
        /**
         * Respond to request with text string (Content-Type set to text/plain).
         * @param  {string} data Text string.
         * @param  {AnswerOptions} opts Response options.
         */
        text: (data: string, opts?: AnswerOptions) => void;
        /**
         * Respond to request with no Content-Type set.
         * @param  {string} redirectUrl URL to set on Location header.
         * @param  {AnswerOptions} opts Response options.
         */
        redirect: (redirectUrl: any, opts?: AnswerOptions) => void;
        /**
         * Respond to request with no Content-Type set.
         * @param  {string | ReadStream} data Data to send.
         * @param  {AnswerOptions} opts Response options.
         */
        generic: (data: any, opts?: AnswerOptions) => void;
    }

    interface AnswerOptions {
        headers?: HttpResponseHeaders;
        statusCode?: number;
        statusText?: string;
        download?: boolean;
        filename?: string;
    }

    interface HttpRequestHeaders {
        "A-IM"?: string;
        "Accept"?: string;
        "Accept-Charset"?: string;
        "Accept-Encoding"?: string;
        "Accept-Language"?: string;
        "Accept-Datetime"?: string;
        "Access-Control-Request-Method"? : string;
        "Access-Control-Request-Headers"?: string;
        "Authorization"?: string;
        "Cache-Control"?: string;
        "Connection"?: string;
        "Content-Length"?: string | number;
        "Content-MD5"?: string;
        "Content-Type"?: string;
        "Cookie"?: string;
        "Date"?: string;
        "Expect"?: string;
        "Forwarded"?: string;
        "From"?: string;
        "Host"?: string;
        "HTTP2-Settings"?: string;
        "If-Match"?: string;
        "If-Modified-Since"?: string;
        "If-None-Match"?: string;
        "If-Range"?: string;
        "If-Unmodified-Since"?: string;
        "Max-Forwards"?: string;
        "Origin"?: string;
        "Pragma"?: string;
        "Proxy-Authorization"?: string;
        "Range"?: string;
        "Referer"?: string;
        "TE"?: string;
        "User-Agent"?: string;
        "Upgrade"?: string;
        "Via"?: string;
        "Warning"?: string
    }

    interface HttpResponseHeaders {
        "Access-Control-Allow-Origin"?: string; 
        "Access-Control-Allow-Credentials"?: string; 
        "Access-Control-Expose-Headers"?: string; 
        "Access-Control-Max-Age"?: string; 
        "Access-Control-Allow-Methods"?: string; 
        "Access-Control-Allow-Headers"?: string; 
        "Accept-Patch"?: string; 
        "Accept-Ranges"?: string; 
        "Age"?: string; 
        "Allow"?: string; 
        "Alt-Svc"?: string; 
        "Cache-Control"?: string; 
        "Connection"?: string; 
        "Content-Disposition"?: string; 
        "Content-Encoding"?: string; 
        "Content-Language"?: string; 
        "Content-Length"?: string | number; 
        "Content-Location"?: string; 
        "Content-MD5"?: string; 
        "Content-Range"?: string; 
        "Content-Type"?: string; 
        "Date"?: string; 
        "Delta-Base"?: string; 
        "ETag"?: string; 
        "Expires"?: string; 
        "IM"?: string; 
        "Last-Modified"?: string; 
        "Link"?: string; 
        "Location"?: string; 
        "P3P"?: string; 
        "Pragma"?: string; 
        "Proxy-Authenticate"?: string; 
        "Public-Key-Pins"?: string; 
        "Retry-After"?: string; 
        "Server"?: string; 
        "Set-Cookie"?: string; 
        "Strict-Transport-Security"?: string; 
        "Trailer"?: string; 
        "Transfer-Encoding"?: string; 
        "Tk"?: string; 
        "Upgrade"?: string; 
        "Vary"?: string; 
        "Via"?: string; 
        "Warning"?: string; 
        "WWW-Authenticate"?: string; 
        "X-Frame-Options"?: string
    }

    export = Router;
}

