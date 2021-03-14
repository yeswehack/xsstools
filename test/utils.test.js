import jsdom from "mocha-jsdom"
import assert from "assert";
import * as utils from "../src/utils.js"


const jsdomConfig = {
  html: `
<html>
  <head>
    <title>XSS Template</title>
  </head>
  <body>
    <h1>XSS Template</h1>
    <section id="console">
      <h2>Console</h2>
      <pre></pre>
    </section>
    <section id="frames">
      <h2>Frames</h2>
      <div></div>
    </section>
    </body>
</html>
`,
  url: "http://localhost"
}


describe('Utils', () => {
  describe('buildUrl()', () => {

    const tests = [
      [["http://bi.tk", { q: "test" }], "http://bi.tk?q=test"],
      [["http://bi.tk", { q: "test" }, "hash"], "http://bi.tk?q=test#hash"],
      [["http://bi.tk", { q: "test", toto: "a" }], "http://bi.tk?q=test&toto=a"],
      [["http://bi.tk?x=b", { q: "test", toto: "a" }], "http://bi.tk?x=b&q=test&toto=a"]
    ]

    for (const [args, result] of tests) {
      it(`should return ${result}`, () => {
        assert.strictEqual(utils.buildUrl(...args), result);
      });
    }
  });

  /*describe("createElement", () => {
    jsdom(jsdomConfig)

    it(`create `, () => {
      utils.openFrame("http://test.com")
      var div = document.createElement('div')
      assert.strictEqual(div.nodeName, 'DIV')
    })
  })
  */
});
