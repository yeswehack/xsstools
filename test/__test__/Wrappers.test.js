//import jsdom from "mocha-jsdom"
//import assert from "assert";
const assert = window.chai.assert;

import Wrapper from "/src/Wrapper.js"
import {loadUglify} from "/src/utils.js"
import { runInContainer, getConstructorName } from "../testUtils.js"
import commonPayloads from "./commonPayloads.js"



describe('Wrappers', () => {

    function test_codes(wrapper, skip) {
        describe(`Checking payload validity`, function () {
            for (const [name, [code, expected]] of Object.entries(commonPayloads)) {
                it(`Checking ${name} payload`, async function () {

                    if (skip) this.skip()
                    const result = await runInContainer(code, wrapper)
                    assert.strictEqual(result, expected)
                })
            }
        })
    }


    function test_wrapper(className, f, methods) {
        for (const { name, rtype, skip = false } of methods) {
            describe(`${className}.${name}()`, () => {
                it(`Check is result is typeof ${rtype}`, () => {
                    console.log(f, name)
                    assert.strictEqual(getConstructorName(f[name]()), rtype)
                })
                console.log("WRAP", f[name]().wrap)
                test_codes(f[name](), skip)
            })
        }
    }


    describe("Wrapper_JS", async () => {

       await loadUglify();
        const methods = [
            { name: "minify", rtype: "Wrapper_JS", },
            { name: "templateString", rtype: "Wrapper_JS", },
            { name: "evalB64", rtype: "Wrapper_JS", },
            { name: "evalStringForCharCode", rtype: "Wrapper_JS" },
            { name: "url", rtype: "Wrapper_JSUrl", },
            { name: "dataUrl64", rtype: "Wrapper_JSDataUrl", },
            { name: "dataUrl", rtype: "Wrapper_JSDataUrl", },
            { name: "script", rtype: "Wrapper_HTML", },
            { name: "appendScript", rtype: "Wrapper_JS", },
            { name: "svgLoad", rtype: "Wrapper_HTML", },
            { name: "imgError", rtype: "Wrapper_HTML", },
        ]
        test_wrapper("Wrapper_JS", Wrapper.new(), methods)
    })

    describe("Wrapper_JSUrl", () => {
        const methods = [
            { name: "iframe", rtype: "Wrapper_HTML", },
            { name: "object", rtype: "Wrapper_HTML", },
            { name: "embed", rtype: "Wrapper_HTML", skip: true },
            { name: "redirect", rtype: "Wrapper_JS", }
        ]

        test_wrapper("Wrapper_JSUrl", Wrapper.new().url(), methods)
    })

    describe("Wrapper_JSDataUrl", () => {
        const methods = [
            { name: "script", rtype: "Wrapper_HTML" },
            { name: "scriptImport", rtype: "Wrapper_HTML" }
        ]
        test_wrapper("Wrapper_JSDataUrl", Wrapper.new().dataUrl(), methods)
    })

    describe("Wrapper_HTMLDataUrl", () => {
        const methods = [
            { name: "iframe", rtype: "Wrapper_HTML", skip: true },
            { name: "windowOpen", rtype: "Wrapper_JS", skip: true }
        ]
        test_wrapper("Wrapper_HTMLDataUrl", Wrapper.new().script().dataUrl(), methods)
    })

    describe("Wrapper_HTML", () => {
        const methods = [
            { name: "iframe", rtype: "Wrapper_HTML", },
            { name: "write", rtype: "Wrapper_JS", },
            { name: "innerHTML", rtype: "Wrapper_JS" },
            { name: "dataUrl64", rtype: "Wrapper_HTMLDataUrl", skip: true },
            { name: "dataUrl", rtype: "Wrapper_HTMLDataUrl", skip: true },
        ]

        test_wrapper("Wrapper_HTML", Wrapper.new().imgError(), methods)
    })

});
