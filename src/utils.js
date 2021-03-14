/**
 * @module
 */
import Payload from "./Payload.js"

/**
 * Load uglify from unpkg.com, required by Wrapper_JS.minify()
 * @returns {Function} the minify function from uglifiyjs
 */
export async function loadUglify() {
    // Uglify is not really made to run in the browser
    // We need to load each file in the right order or it wont work

    if (window.minify) {
        // already loaded
        return
    }
    const loadScript = (src) => {
        return new Promise(resolve => {
            const script = document.createElement("script")
            script.async = false
            script.defer = true
            script.src = src
            script.onload = resolve
            document.body.appendChild(script)

        })
    }

    const files = [
        "minify.js",
        "utils.js",
        "ast.js",
        "parse.js",
        "transform.js",
        "scope.js",
        "output.js",
        "compress.js",
        "propmangle.js",
    ]


    await Promise.all(files.map(filename => loadScript(`https://unpkg.com/uglify-js@3.13.0/lib/${filename}`)))
    return window.minify
}

// poor man jquery
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));

/**
 * Create an html element with given attributes and children element
 * @param {String} tag Tag name for the element 
 * @param {Object} [attr=null] Attributes to add to the elements
 * @param {Array} [children=[]] Array of HTMLElement to add as children
 * @returns {HTMLElement} The created html element
 */
export function createElement(tag, attr = null, children = []) {
    const el = document.createElement(tag)
    if (attr !== null) {
        if ("style" in attr) {
            Object.assign(el.style, attr.style)
            delete attr.style
        }
        Object.assign(el, attr)
    }
    for (const child of children) {
        el.appendChild(child)
    }
    return el
}

export function isCallable(f) {
    return typeof f === "function" || f instanceof Payload
}

export function repr(s) {
    if (isCallable(s)) {
        return s.toString()
    }
    if (Array.isArray(s) && s.every(f => isCallable(f))) {
        return `[${s.map(f => f.toString()).join(",")}]`
    }
    // Escape / because </script> can break syntax if some cases
    return JSON.stringify(s).replace("/", "\\/")
}

/**
 * Create an url with get parameters
 *  
 * @param {String} url Base url
 * @param {Object} urlParams object representing parameters
 * @param {String} [hash] Hash to add  
 * @returns {String} The full url with parameters and hash
 */
export function buildUrl(url, urlParams={}, hash = null) {
    const searchParams = new URLSearchParams(urlParams).toString()
    const separator = (url.includes("?") ? "&" : "?")
    const fullHash = hash ? "#" + hash : ""
    return url + separator + searchParams + fullHash
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// sleep in ms
export const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

/** 
 * @alias SandboxAttributes
 * @typedef {Object} SandboxAttributes
 * @property {Boolean} [allow-downloads-without-user-activation=true],
 * @property {Boolean} [allow-downloads=true],
 * @property {Boolean} [allow-forms=true],
 * @property {Boolean} [allow-modals=true],
 * @property {Boolean} [allow-orientation-lock=true],
 * @property {Boolean} [allow-pointer-lock=true],
 * @property {Boolean} [allow-popups=true],
 * @property {Boolean} [allow-popups-to-escape-sandbox=true],
 * @property {Boolean} [allow-presentation=true],
 * @property {Boolean} [allow-same-origin=true],
 * @property {Boolean} [allow-scripts=true],
 * @property {Boolean} [allow-storage-access-by-user-activation=true],
 * @property {Boolean} [allow-top-navigation=true],
 * @property {Boolean} [allow-top-navigation-by-user-activation=true],
 */



/**
 * Create a new iframe element
 *
 * @param {string} url Url for the frame
 * @param {string} [name=null] name of the frame
 * @param {SandboxAttributes} sandbox reverse sandbox option
 * @returns {HTMLElement} The iframe created
 */
export function createFrame(url, name = null, sandbox = {}) {
    const allowAll = {
        "allow-downloads-without-user-activation": true,
        "allow-downloads": true,
        "allow-forms": true,
        "allow-modals": true,
        "allow-orientation-lock": true,
        "allow-pointer-lock": true,
        "allow-popups": true,
        "allow-popups-to-escape-sandbox": true,
        "allow-presentation": true,
        "allow-same-origin": true,
        "allow-scripts": true,
        "allow-storage-access-by-user-activation": true,
        "allow-top-navigation": true,
        "allow-top-navigation-by-user-activation": true,
    };
    const sandboxAttr = Object.entries({ ...allowAll, ...sandbox })
        .filter(([k, v]) => v)
        .map(([k, v]) => k)
        .join(" ");

    return createElement("iframe", {
        sandbox: sandboxAttr,
        name,
        src: url,
    });
}

/**
 * Return a random integer between min and max
 * @param {number} min lower bound
 * @param {number} max upper bound
 * @returns {number}
 */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
