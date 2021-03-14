
const assert = window.chai.assert;
import Wrapper from "/src/Wrapper.js"

const container = document.querySelector(".container")

function resetContainer(html) {
    return new Promise(resolve => {
        container.addEventListener("load", () => {
            resolve(container)
        }, { once: true })
        container.srcdoc = html || "<html><head></head><body></body></html>"
    })
}

function deleteContainer(f){
    f.parentElement.removeChild(f)
}

const runners = {
    "Wrapper_JS": (container, code) => {
        
        container.contentWindow.eval(code)
    },
    "Wrapper_JSUrl": (container, jsurl) => {
        const url = new URL(jsurl)
        if (url.protocol != "javascript:") {
            throw Error("Invalid protocol, expected javascript:")
        }
        container.contentWindow.eval(decodeURIComponent(url.pathname))
    },
    "Wrapper_JSDataUrl": (container, dataUrl) => {
        const doc = container.contentDocument
        const el = doc.createElement("script")
        el.src = dataUrl
        doc.documentElement.appendChild(el)
    },
    "Wrapper_HTML": (container, html) => {
        container.srcdoc = html
    },
    "Wrapper_HTMLDataUrl": (container) => {
    }
}

function getRunner(c){
    return runners[c.__proto__.constructor.name]
}


function getConstructorName(obj){
    return obj.__proto__.constructor.name
}

function random() {
    return Math.floor(Math.random() * 10e6).toString(16)
}

async function runInContainer(code, wrapper=null, html = null){
    // I use a global reference because of the weird execution context I have to deal with 
    if (!("__callback__" in window)) {
        window.__callbacks__ = {}
    }

    if (wrapper === null ){
        wrapper = Wrapper.new()
    }

    const container = await resetContainer(html)
    const key = random()
    
    const execution = new Promise((resolve, reject) => {
        // store callback globally
        window.__callbacks__[key] = { resolve, reject }

        // call callback at the end of payload with the current stack value
        const checker = code.eval((key, result) => {
            top.__callbacks__[key] && top.__callbacks__[key].resolve(result)
        }, key)

        const wrapped = wrapper.wrap(checker)
        getRunner(wrapper)(container, wrapped)
    })

    const timeout = new Promise((resolve, reject) => {
        window.setTimeout(() => {
            reject(Error("payload was never called\n"))
        }, 500)
    })

    const result = await Promise.race([execution, timeout])
    delete window.__callbacks__[key]
    return result
}


export {
    runInContainer,
    getConstructorName,
    runners

}