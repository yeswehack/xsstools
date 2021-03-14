


function readMatch(desc, symbols) {
    if (desc[0] != symbols[0]) {
        return [null, desc]
    }
    desc = Array.from(desc)
    let type = ""
    let c = desc.shift()
    let open = c == symbols[0]
    while (open && desc.length) {
        c = desc.shift()
        if (c == symbols[0]) {
            open += 1
        }
        if (c == symbols[1]) {
            open -= 1
        }
        if (open) {
            type += c
        }
    }
    if (open) {
        throw new Error("Invalid graph syntax")
    }
    return [type, desc.join("").trim()]
}

function parseLabel(desc) {
    return readMatch(desc, "()")
}

function parseType(desc) {
    return readMatch(desc, "{}")
}

function parseChildren(desc) {
    let children;

    [children, desc] = readMatch(desc, "[]")
    return [children && children.split(","), desc]
}

function parseStep(desc) {
    const step = {};
    if (desc.startsWith("$")) {
        const name = desc.slice(1)
        const html = `<a href='./${name}.html'>${name}</a>`
        return {
            readType: "",
            returnType: "",
            html

        }
    }

    [step["readType"], desc] = parseType(desc);
    [step["label"], desc] = parseLabel(desc);
    [step["children"], desc] = parseChildren(desc);
    if (step["children"]) {
        [step["async"], desc] = desc[0] == "*" ? [true, desc.slice(1, 0)] : [false, desc];
    }
    [step["returnType"], desc] = parseType(desc);
    if (desc) {
        throw new Error("Invalid graph syntax")
    }
    return step
}


function parseGraph(desc) {
    const steps = desc.split("->").map(s => parseStep(s.trim()))
    return steps
}

exports.defineTags = function (dictionary) {
    dictionary.defineTag("graph", {
        mustHaveValue: true,
        canHaveType: false,
        canHaveName: false,
        onTagged: (doclet, tag) => {
            doclet.graph = parseGraph(tag.value)
        }
    });
};

function renderParams(param) {
    let out = ""
    if (param.variable) {
        out += "..."
    }
    out += param.name
    if (param.optional) {
        out += `=${param.defaultvalue}`
    }
    return out
}

exports.handlers = {
    newDoclet: function (e) {
        if ("graph" in e.doclet) {
            const params = e.doclet.params ? e.doclet.params.map(p => renderParams(p)).join(", ") : ""
            const fullName = `${e.doclet.scope == "static" ? e.doclet.longname : e.doclet.name}(${params})`


            const graph = e.doclet.graph.map(step => {
                if (step.label == "$current") {
                    step.label = fullName
                }
                return step
            })
            const graphDef = `<script type="graph">${JSON.stringify(graph)}</script>`
            e.doclet.description += `${graphDef}`;
        }
    }
}
