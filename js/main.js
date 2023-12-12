function $ (x) {
    return document.getElementById(x);
}

function copyLink(event) {
    const eventElement = event.currentTarget;
    const popupElement = eventElement.firstElementChild;
    navigator.clipboard.writeText(eventElement.dataset.link);
    popupElement.style.animation = "in-and-out 2s linear";
    setTimeout(function() {
        popupElement.style.animation = "";
    }, 2000);
}

function openNewTab(event) {
    const eventElement = event.currentTarget;
    window.open(eventElement.dataset.link, target="_blank");
}

function goHome() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function readJson(jsonPath) {
    const response = await fetch(jsonPath, { cache: "no-cache" });
    return response.json();
}

// Regex
const img_url_re = /^!\[(.+)\]\(\.\.\/(images\/.+)\)/;
const name_re = /^## ([a-zA-Z\s\(\)'-]+)/;
const pub_re = /^Publication: (.+)/;
const abs_re = /^Abstract: (.+)/;
const url_re = /\[(.+)\]\((.+)\)/;
const line_re = /[\r\n]/


// Main
var publishIdx = 0;
var publishFileIdx = 0;
var publishList = [];
const PUBLISH_SLACK = 10;
const ROOT_JS_PATH = "js/";
const ROOT_CONTENT_PATH = "projects/";
const SOURCE_PATH = "https://github.com/mahyarkoy/koysite/blob/main/projects/";
var publishedSet = new Set();
publishContent();

async function publishFileList(fileList) {
    // Read and draw count files from publishList (upto length of publishList)
    for (let i=0; i < fileList.length; i++) {
        try {
            await publishFile(fileList[i])
        } catch (err) {
            console.log("Could not publish " + fileList[i] + "\nReceived error: " + err.message);
            throw err;
        }
    }
}

async function publishContent() {
    const config = await readJson(ROOT_JS_PATH + "config.json");
    // console.log(config);
    if (publishList.length == 0) {
        const filePaths = config.paths;
        publishList.push(...filePaths);
    }

    // Read and draw count files from publishList (upto length of publishList)
    await publishFileList(publishList.slice(publishIdx, publishIdx + PUBLISH_SLACK))
    publishIdx = Math.min(publishIdx + PUBLISH_SLACK, publishList.length)
}

async function publishFile(fileName) {
    const path = ROOT_CONTENT_PATH + fileName + ".md";
    const cache_str = "no-cache";
    if (publishedSet.has(fileName)) {
        cache_str = "force-cache";
    } else {
        publishedSet.add(fileName);
    }
    const response = await fetch(path, { cache: cache_str } ); //don't catch errors here
    const content = await response.text()
    
    //Parse content
    let collect = new Map();
    let pubs = new Array();
    const lines = content.split(line_re);
    lines.forEach((line) => {
        if (reMatch = line.match(pub_re)) {
            pubs.push(reMatch[1]);
        }
        else if (reMatch = line.match(img_url_re)) {
            collect.set("img_url", reMatch[2]);
            collect.set("img_alt", reMatch[1]);
        } else if (reMatch = line.match(name_re)) {
            collect.set("name", reMatch[1].trim());
        } else if (reMatch = line.match(abs_re)) {
            collect.set("abs", reMatch[1].trim());
        }
    })

    //Draw content on DOM
    let mainContainer = spawnElement({type: "div", classes: ["main-container", "flex-container", "add-border"]});

    // Add image
    let imageContainer = spawnElement({type: "div", classes: ["img-container"]});
    spawnElement({type: 'img', parent: imageContainer, attributes: {
        "src": collect.get("img_url"), 
        "alt": collect.get("img_alt"), 
        "width": "100%",
        "loading": "lazy"
    }})
    mainContainer.appendChild(imageContainer);

    // Add text
    let textContainer = spawnElement({type: "div", classes: ["text-container"]});

    let subtextContainer = spawnElement({type: "div", classes: ["subtext-container", "text-name"]});
    spawnElement({
        type: "div", 
        parent: subtextContainer, 
        innerHTML:collect.get("name"),
        classes: ["text-title"]
    })
    textContainer.appendChild(subtextContainer);

    if (collect.has("abs")) {
        spawnElement({
            type: "div", 
            parent: textContainer, 
            innerHTML:collect.get("abs"),
            classes: ["text-info"]
        });
    }

    pubs.forEach((link) => {
        spawnElement({
            type: "div",
            parent: textContainer,
            //innerHTML:"&#128196;"+link,
            innerHTML:"<img src='./images/paper.svg' width='22px'/>"+link,
            classes: ["text-info"]
        })
    })

    // Add buttons
    let buttonContainer = spawnElement({type: "div", classes: ["button-container"]});
    let shareButton = spawnElement({type: "div", classes: ["share-button"], attributes: {
        "data-link": SOURCE_PATH + fileName + ".md",
        "title": "Copy Link"
    }, events: {"click": copyLink}});
    spawnElement({type: "div", parent: shareButton, classes: ["popup"], innerHTML: "Link copied!"});
    spawnElement({type: "img", parent: shareButton, attributes: {
        "src": "images/share-icon.svg",
        "alt": "Copy link",
        "style": "width: 18px; height: 18px;"
    }});
    buttonContainer.appendChild(shareButton);

    let sourceButton = spawnElement({type: "div", classes: ["share-button"], attributes: {
        "data-link": SOURCE_PATH + fileName + ".md",
        "title": "Open Source"
    }, events: {"click": openNewTab}});
    spawnElement({type: "div", parent: sourceButton, classes: ["popup"], innerHTML: "Link copied!"});
    spawnElement({type: "img", parent: sourceButton, attributes: {
        "src": "images/new-arrow.svg",
        "alt": "Open source",
        "style": "width: 18px; height: 18px;"
    }});
    buttonContainer.appendChild(sourceButton);

    // Stich together
    textContainer.appendChild(buttonContainer);
    mainContainer.appendChild(textContainer);
    document.body.appendChild(mainContainer);
}

function spawnElement(kwargsInput) {
    let kwargs = {type: null, parent: null, classes: null, attributes: null, innerHTML: null, events: null};
    for (key in kwargsInput) {
        kwargs[key] = kwargsInput[key];
    }
    
    let element = document.createElement(kwargs.type);
    if (kwargs.classes !== null) {
        element.classList.add(...kwargs.classes);
    }
    if (kwargs.attributes !== null) {
        for (const key in kwargs.attributes) {
            element.setAttribute(key, kwargs.attributes[key]);
        }
    }
    if (kwargs.events !== null) {
        for (const key in kwargs.events) {
            element.addEventListener(key, kwargs.events[key]);
        }
    }
    if (kwargs.innerHTML !== null) {
        element.innerHTML = kwargs.innerHTML;
    }
    if (kwargs.parent !== null) {
        kwargs.parent.appendChild(element);
    }
    return element;
}