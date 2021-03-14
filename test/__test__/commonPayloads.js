

import Payload from "/src/Payload.js"
export default {
    "basic function": [
        Payload.new().eval(function(){
            return 42
        }),
        42
    ],
    "basic async function": [
        Payload.new().eval(async function(){
            return 42
        }),
        42
    ],
    "basic async arrow function": [
        Payload.new().eval(async x => 42),
        42
    ],
    "string": [
        Payload.new().eval("return 42"),
        42
    ],
    "payload from": [
        Payload.new().eval(Payload.new().eval(x =>42)),
        42
    ],
    "multiline": [
        Payload.new().eval(() => {
            const x = 8;
            const y = 4;
            return x / y
        }),
        2
    ],
    "html markup": [
        Payload.new().eval(() => {
            const x = "test<script></script>";
            const y = '<textarea></iframe>()/**/<!--';
            return x + y
        }),
        "test<script></script><textarea></iframe>()/**/<!--"
    ],
    "arg bind": [
        Payload.new().eval((s, x) => {
            return s
        }, "<script></script>"),
        "<script></script>"
    ],
    "comment": [
        Payload.new().eval((s, x) => {
            // comment
            /*
            const test= "/*"
            */
            return 42
        }),
        42
    ]
}