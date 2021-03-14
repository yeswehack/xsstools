
/* /!\  WIP /!\  */
const name = () => `eval(name)`
const hash = () => `eval(decodeURIComponent(location.hash.substr(1)))`
const param = (name) => `eval(new URLSearchParams(location.search).get("${name}"))`
const variable = (name) => `eval(${name})`