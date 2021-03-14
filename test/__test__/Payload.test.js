
const assert = window.chai.assert;
const expect = window.chai.expect;
import Payload from "/src/Payload.js"
import { getConstructorName, runInContainer } from "../testUtils.js"
import commonPayloads from "./commonPayloads.js"




describe('Payload', () => {
    const f = () => null
    const s = ""
    const ff = () => Payload.new()
    const chainingMethods = [
        { name: "addExfiltrator", args: [f] },
        { name: "asDOM", args: [] },
        { name: "eval", args: [f] },
        { name: "exfiltrate", args: [] },
        { name: "fetch", args: [] },
        { name: "fetchDOM", args: [] },
        { name: "fetchJSON", args: [] },
        { name: "fetchText", args: [] },
        { name: "findBetween", args: [s, s] },
        { name: "map", args: [ff] },
        { name: "guard", args: [] },
        { name: "injectStyle", args: [] },
        { name: "log", args: [] },
        { name: "parallel", args: [ff, ff] },
        { name: "passthru", args: [f] },
        { name: "postMessage", args: [] },
        { name: "querySelector", args: [s] },
        { name: "querySelectorAll", args: [s] },
        { name: "redirect", args: [s] },
        { name: "regExtract", args: [s] },
        { name: "setExfiltrator", args: [f] },
        { name: "startClickLogger", args: [] },
        { name: "startKeyLogger", args: [] },
        { name: "wait", args: [0] },
    ]

    function testForArgumentStyle(...tests) {
        const all = tests.length == 1 && tests[0] == "ALL"
        return {
            description: (payload, funcName, getArgs, after, testResult, wrapper = null, html = null) => {
                async function runTest(p) {
                    const result = await runInContainer(after ? after(p) : p, wrapper, html)
                    testResult(result)
                }


                for (const test of tests) {
                    if (all || test == "INLINE") {
                        it(`using inline arguments`, async () => {
                            await runTest(payload[funcName](...getArgs()))
                        })
                    }

                    if (all || test == "PIPE") {
                        it(`using pipe value as argument`, async () => {
                            await runTest(payload.eval(x => x, ...getArgs())[funcName]())
                        })
                    }

                    if (all || test == "FUNCTION") {
                        it(`using function as argument`, async () => {
                            await runTest(payload[funcName](getArgs))
                        })
                    }

                    if (all || test == "PAYLOAD") {
                        it(`using payload as argument`, async () => {

                            await runTest(payload[funcName](Payload.new().eval(getArgs)))
                        })
                    }
                }
            }
        }
    }



    describe(`Checking return value`, () => {

        const oldPayload = Payload.new()
        describe(`Payload.new()`, () => {
            it(`Check return value is typeof Payload`, () => {
                assert.strictEqual(getConstructorName(oldPayload), "Payload")
            })
        })
        for (const { name, args } of chainingMethods) {

            describe(`Payload.${name}()`, () => {
                const newPayload = oldPayload[name](...args)

                it(`Check return value is typeof Payload`, () => {
                    assert.strictEqual(getConstructorName(newPayload), "Payload")
                })

                it(`should be a new payload object`, () => {
                    assert.notStrictEqual(oldPayload, newPayload)
                })
            })
        }
    })

    describe(`Check execution`, () => {
        describe(`Payload.new()`, () => {
            it(`should return the current window by default`, async () => {
                const p = Payload.new()
                const result = await runInContainer(p.eval(x => x == window.document))
                assert.strictEqual(result, true)
            })
        })

        describe(`Payload.eval()`, () => {
            for (const [name, [code, expected]] of Object.entries(commonPayloads)) {
                it(`Checking ${name} payload`, async function () {
                    const result = await runInContainer(code)
                    assert.strictEqual(result, expected)
                })
            }
        })
        describe(`Payload.passthru()`, () => {
            it(`should not modify the pipe value`, async () => {
                const p = Payload.new().eval(x => 42).passthru(x => 43)
                const result = await runInContainer(p)
                expect(result).to.equal(42)
            })
        })

        describe(`Payload.fetchText()`, () => {
            testForArgumentStyle("ALL").description(
                Payload.new(),
                "fetchText",
                () => ["/test/testfiles/test.txt"],
                null,
                result => expect(result).to.equal("This is a test.")
            )
        })

        describe(`Payload.fetchJSON()`, () => {
            testForArgumentStyle("ALL").description(
                Payload.new(),
                "fetchJSON",
                () => ["/test/testfiles/test.json"],
                null,
                result => expect(result.test).to.equal("This is a test.")
            )
        })

        describe(`Payload.fetchDOM()`, () => {
            testForArgumentStyle("ALL").description(
                Payload.new(),
                "fetchDOM",
                () => ["/test/testfiles/test.html"],
                null,
                result => expect(result.querySelector("title").innerText).to.equal("This is a test.")
            )
        })

        describe(`Payload.asDOM()`, () => {
            it(`should fetch and read as text then parse as html`, async () => {
                const p = Payload.new().eval(x => "<title>This is a test.</title>").asDOM()
                const result = await runInContainer(p)
                assert.strictEqual(result.querySelector("title").innerText, "This is a test.")
            })
        })

        describe(`Payload.querySelector()`, () => {
            const html = "<h1>This is a test.</h1><h1>This is a second test.</h1>"
            const expected = "This is a test."

            describe(`using single arg, should select the first <h1>`, () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new(),
                    "querySelector",
                    () => ["h1"],
                    p => p.eval(r => r.innerText),
                    result => expect(result).to.equal(expected),
                    null,
                    html
                )
            })

            describe(`using double args, should select the first <h1> innerText`, () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new(),
                    "querySelector",
                    () => ["h1", "innerText"],
                    null,
                    result => expect(result).to.equal(expected),
                    null,
                    html
                )
            })
        })

        describe(`Payload.querySelectorAll()`, () => {
            const html = "<h1>This is a test.</h1><h1>This is a second test.</h1>"
            const expected = ["This is a test.", "This is a second test."]

            describe(`using single arg, should select all <h1>`, () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new(),
                    "querySelectorAll",
                    () => ["h1"],
                    p => p.eval(r => r.map(r=> r.innerText)),
                    result => expect(result).to.eql(expected),
                    null,
                    html
                )
            })

            describe(`using double args, should select all <h1> innerText`, () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new(),
                    "querySelectorAll",
                    () => ["h1", "innerText"],
                    null,
                    result => expect(result).to.eql(expected),
                    null,
                    html
                )
            })
        })

        describe(`Payload.regExtract()`, () => {
            describe("Without flag", () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new().eval(() => "Find 'token' with a regex"),
                    "regExtract",
                    () => ["'(.*?)'"],
                    null,
                    result => expect(result).to.equal("token")
                )
            })
            describe("With flags", () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new().eval(() => `Find _x_token_x_ with a regex`),
                    "regExtract",
                    () => ["_X_(.*?)_x_", "i"],
                    null,
                    result => expect(result).to.equal("token")
                )
            })
        })
        describe(`Payload.findBetween()`, () => {


            describe("Basic text", () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new().eval(() => "Find 'token' with a regex"),
                    "findBetween",
                    () => ["Find '", "' with"],
                    null,
                    result => expect(result).to.equal("token")
                )
            })

            describe("Regex like text", () => {
                testForArgumentStyle("INLINE", "FUNCTION", "PAYLOAD").description(
                    Payload.new().eval(() => "{}*[]token/||"),
                    "findBetween",
                    () => ["{}*[]", "/||"],
                    null,
                    result => expect(result).to.equal("token")
                )
            })
        })

        describe(`Payload.injectStyle()`, () => {
            testForArgumentStyle("ALL").description(
                Payload.new(),
                "injectStyle",
                () => ["body{background-color:rgb(255, 0, 0)}"],
                p => p.eval(x => getComputedStyle(document.body).backgroundColor),
                result => expect(result).to.equal("rgb(255, 0, 0)")
            )
        })


        describe(`Payload.wait()`, () => {
            testForArgumentStyle("ALL").description(
                Payload.new().eval(x => 42),
                "wait",
                () => [42],
                null,
                result => expect(result).to.equal(42)
            )
            it(`Should timeout`, async () => {

                const p = Payload.new().wait(200).eval(() => 42)
                const timeout = new Promise(resolve => {
                    window.setTimeout(() => {
                        resolve("timeout")
                    }, 100)
                })
                const result = await Promise.race([runInContainer(p), timeout])
                expect(result).to.eql("timeout")
            })
        })


        describe(`Payload.parallel()`, () => {
            it(`All payloads should execute and return an array of result`, async () => {
                const p = Payload.new().eval(x => 6).parallel(
                    Payload.new().eval(() => 42),
                    Payload.new().eval(x => x + 1),
                    x => x / 2
                )
                const result = await runInContainer(p)
                expect(result).to.eql([42, 7, 3])
            })
            it(`When a function fail, return the reason`, async () => {
                const p = Payload.new().eval(x => 6).parallel(
                    Payload.new().eval(x => { throw Error("test") }),
                )
                const result = await runInContainer(p)
                assert(result[0].constructor.name === "Error" && result[0].message == "test")
            })
            it(`Payload should be run simultaneously`, async function () {
                this.timeout(500)
                const p = Payload.new().parallel(
                    Payload.new().wait(100).eval(() => 0),
                    Payload.new().wait(100).eval(() => 1),
                    Payload.new().wait(100).eval(() => 2),
                    Payload.new().wait(100).eval(() => 3),
                    Payload.new().wait(100).eval(() => 4),
                    Payload.new().wait(100).eval(() => 5),
                    Payload.new().wait(100).eval(() => 6),
                    Payload.new().wait(100).eval(() => 7),
                    Payload.new().wait(100).eval(() => 8),
                    Payload.new().wait(100).eval(() => 9),
                )
                const result = await runInContainer(p)
                expect(result).to.eql(Array(10).fill().map((x, y) => y))
            })
        })
    })
})