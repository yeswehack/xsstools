
function initGraphs() {

    function createElement(tag, classes = [], text = "") {
        const el = document.createElement(tag);
        classes.forEach((c) => el.classList.add(c));
        el.innerText = text;
        return el;
    }

    function createStep(step, hasNext) {
        const classes = ["step"]
        if (step.returnType != null) {
            classes.push("next")
        }
        if (step.readType !== null) {
            classes.push("prev")
        }

        const stepEl = createElement("div", classes)
        if (step.returnType === null && hasNext) {
            stepEl.classList.add("dotted")
            stepEl.appendChild(createElement("div", ["skip"]))
        }

        if (step.readType) {
            stepEl.appendChild(createElement("span", ["take-value"], `${step.readType} →`))
        }

        if (step.children) {
            const groupEl = createElement("div", ["group"]);
            groupEl.appendChild(createElement("span", [], step.label))
            const classes = step.async ? ["inner", "async"] : ["inner"]
            const innerGroupEl = groupEl.appendChild(createElement("div", classes))
            for (const label of step.children) {
                innerGroupEl.appendChild(createElement("div", [], label));
            }
            stepEl.appendChild(groupEl);
        } else {
            if (step.html) {
                const div = document.createElement("div")
                div.innerHTML = step.html
                stepEl.appendChild(div)
            } else {
                stepEl.appendChild(createElement("div", [], step.label));
            }
        }

        if (step.returnType) {
            stepEl.appendChild(createElement("span", ["return-value"], `→ ${step.returnType}`))
        }

        return stepEl

    }

    function createGraph(graph) {
        const graphEl = createElement("div", ["graph"]);
        for (const [idx, step] of graph.entries()) {
        
            graphEl.appendChild(createStep(step, idx + 1 < graph.length));
        }

        return graphEl;
    }

    let newSize = 0
    for (const graphDef of document.querySelectorAll("script[type=graph]")) {
        const graph = JSON.parse(graphDef.innerText)
        const graphEl = createGraph(graph);
        graphDef.parentElement.replaceChild(graphEl, graphDef)
    }
    // Fix scroll to position links
    window.location.hash = window.location.hash + ""
}
