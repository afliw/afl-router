declare module "afl-router" {
    import http = require("http");

    class Router {
        
        /**
         * Creates a new instance of Router
         * @constructor
         * @param  {RouterOptions} options? Initial router configuration options.
         * @returns Router
         */
        constructor(options?: RouterOptions) : Router;
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
        route() : http.RequestListener;
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
        listen(port: number) : http.Server;
    }

    interface NewRouteActions {
        [dynamic:string]: RouterCallback;
    }

    interface RouterOptions {
        publicDirectory?: string;
        fallback?: Function;
        defaultFilename?: string;
    }

    type RouterCallback = (request: ParsedRequest, response: http.ServerResponse) => void;

    interface ParsedRequest {
        readonly __HTTP_Request__: http.IncomingMessage;
        readonly __HTTP_Response__: http.ServerResponse;
        body: BodyObject;
        query: object;
        url: string;
        headers: object;
        method: string;
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
        save: (path: string, encoding: string, callback: (err: NodeJS.ErrnoException) => void) => void;
        /**
         * @param  {string} path Full path and filename to save the file in.
         * @param  {string} encoding Encoding to write the file. Default: 'binary'.
         */
        saveSync: (path: string, encoding: string) => void;
        /**
         * Destroy the file to free memory.
         */
        destroy: () => void;
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
         * @param  {any} data Data to send.
         * @param  {AnswerOptions} opts Response options.
         */
        generic: (data: any, opts?: AnswerOptions) => void;
    }

    interface AnswerOptions {
        headers?: http.OutgoingHttpHeaders;
        statusCode?: number;
        statusText?: string;
    }

    export = Router;
}

