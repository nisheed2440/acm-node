/**
 * This file contains the code to resolve a component based on the template provided by AEM.
 * This would also contain/reference functions to inline critical styles and concatinate JS to reduce server round trips.
 */
const JSON5 = require('json5');
const jsdom  = require("jsdom");
const minify = require('html-minifier').minify;
const rp = require('request-promise');
const requireFromString = require('require-from-string');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { JSDOM } = jsdom;
const {commonScripts, createScript} = require('./utilities');

function createInlineScriptDataObject(dom, data, varName) {
    const scriptEl = dom.window.document.createElement('script');
    if(varName) {
        scriptEl.textContent = `var ${varName} = ${JSON.stringify(data)}`;
    } else {
        scriptEl.textContent = data;
    }
    dom.window.document.body.append(scriptEl);
}

async function componentResolver(inputTemplate) {
    const dom = new JSDOM(inputTemplate);
    let componentScriptPromises = [];
    let componentStylesPromises = [];
    let scriptsDataObject = {};
    let scriptsURLObject = {};
    let outputScriptString = '';
    let outputStylesString = '';

    dom.window.document.body.querySelectorAll('[data-component]').forEach((el) => {
        const componentType = el.getAttribute('data-component');
        const componentId = el.getAttribute('id');
        const componentData = JSON5.parse(el.getAttribute('data-json')) || {};
        scriptsDataObject[componentId] = componentData['cms-content'] || {};
        el.removeAttribute('data-json');
        componentScriptPromises.push(rp(`http://localhost:9000/javascripts/${componentType}Component.js`)
            .then((body) => {
                return {body, componentId};
            })
            .catch((err) => {
                return {err, componentId};
            }));
    });

    const propsPromises = await Promise.all(componentScriptPromises).then((scripts) => {
        let componentPropsPromises = [];
        scripts.forEach((componentScript) => {
            
            if(componentScript.err) {
                return;
            }
            
            const componentReact = requireFromString(componentScript.body);
            const componentId = componentScript.componentId;
            outputScriptString += `${componentScript.body};`;
            
            if(componentReact.getInitialProps) {
                componentPropsPromises.push(componentReact.getInitialProps().then((state) => {
                    scriptsDataObject[componentId] = state;
                    const el = dom.window.document.getElementById(componentId);
                    el.innerHTML = ReactDOMServer.renderToString(React.createElement(componentReact,{data:  scriptsDataObject[componentId]}, null));
                }));
            } else {
                const el = dom.window.document.getElementById(componentId);
                el.innerHTML = ReactDOMServer.renderToString(React.createElement(componentReact,{data:  scriptsDataObject[componentId]}, null));
            }
        });
        return componentPropsPromises;
    });

    await Promise.all(propsPromises);

    commonScripts.forEach((src) => {
        dom.window.document.body.appendChild(createScript(dom, src, null));
    });
    createInlineScriptDataObject(dom, scriptsDataObject, 'ReactData');
    createInlineScriptDataObject(dom, outputScriptString);
    
    return dom.serialize();
}

module.exports = componentResolver;