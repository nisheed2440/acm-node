/**
 * This file contains utility functions to help build out the page using micro fronend architecture.
 */
const commonScripts = [
    'https://cdnjs.cloudflare.com/ajax/libs/pubsub-js/1.6.0/pubsub.min.js',
    'https://unpkg.com/react@16/umd/react.production.min.js',
    'https://unpkg.com/react-dom@16/umd/react-dom.production.min.js'
];

function createScript(dom, src, id, defer){
    const scriptTag = dom.window.document.createElement('script');
    if(typeof src === 'string'){
        scriptTag.src = src;
    } else {
        scriptTag.textContent = `var ${id} = ${JSON.stringify(src)};`;
    }
    if(id) {
        scriptTag.id = id;
    }
    if(defer) {
        scriptTag.setAttribute('async', true);
    }
    return scriptTag;
}

module.exports = {
    commonScripts,
    createScript
};