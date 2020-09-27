'use strict'
const { Parser } = require("htmlparser2")
const { DomHandler } = require("domhandler")
const domSerializer = require("dom-serializer").default
const css = require('css')

const HtmlStylify = function(parser){

    /* properties */
    
    /* private properties */
    let domParser = parser | null
    let _options = {
        normalizeHtml: false,
        replaceElement: 'div',
        removeScripts: true,
        uniqueSuffix: null
    }
    let _uniqueSuffix = null
    let _loadedRawHtml = ''
    let _htmlDocument = null
    let _htmlString = null
    let _domHandler = null
    let _cssAST = null
    let _cssProcessedElements = new Set()

    const _htmlParserOptions = [
        { decodeEntities: true }
    ]
    const _cssParserOptions = null

    /* binders */
    //const parseInput = _parseInput.bind(this)
    //const changeHtml = _changeHtml.bind(this)
    //const traverseDomNodes = _traverseDomNodes.bind(this)

    /* methods */
    /**
     * 
     * @param {string|HTMLDocument} input - A string representation of HTML document or an HTMLDocument element
     * @param {_options} options - An object containing options as properties. If omitted, default options will be used
     */
    this.process = function(input, options){
        _initOptions(options)
        _uniqueSuffix = _options.uniqueSuffix ? _options.uniqueSuffix : 'hs-' + Date.now()
        if(typeof input !== 'string'){
            throw Error('Passed input is not of type string!')
        }
        _loadedRawHtml = input
        _parseInput()
        return {
            html: _htmlDocument,
            htmlString: _htmlString,
            _cssAST: _cssAST,
            _cssProcessed: _cssProcessedElements
        }
    }

    /* private methods*/
    function _parseInput(){
        _domHandler = new DomHandler((error, dom) => {
            if (error) {
                console.log('domHandler error: ', error)
                return
            }
            _htmlDocument = dom
            _changeHtml()
        }, {withStartIndices: true, withEndIndices: true})

        domParser = new Parser(_domHandler, _htmlParserOptions)
        domParser.write(_loadedRawHtml)
        domParser.end()
    }

    function _parseCss(cssString){
        _cssAST = css.parse(cssString, _cssParserOptions)
        if(_cssAST.stylesheet.parsingErrors.length > 0) {
            console.log(_cssAST.stylesheet.parsingErrors)
            return
        }
        _addSplice()
        _processCssAST()
    }

    function _processCssAST(){
        _cssAST.stylesheet.rules.forEach(rule => {
            if(rule.type === 'rule'){
                //console.log(rule)
                rule.selectors = _processRules(rule.selectors)
            } else if (rule.type === 'media' || rule.type === 'keyframes'){
                rule.rules.forEach(r => {
                    if(r.type === 'rule'){
                        r.selectors = _processRules(r.selectors)
                    }
                })
            }
        })
    }

    function _processRules(selectors){
        let rules = []
        selectors.forEach(ruleSelector => {
            ruleSelector = _manageRuleSelector(ruleSelector)
            rules.push(ruleSelector)
        })
        return rules
    }

    function _manageRuleSelector(ruleSelector){
        ruleSelector = ruleSelector.split(' ')
        let selectorsArr = []
        ruleSelector.forEach(selector => {
            //selector == 'html' && console.log(selector)
            if(selector.indexOf('.') === -1 && selector.indexOf('#') === -1 && selector != '+' && selector != '>'){
                const attr = selector.indexOf('[') > -1 ? selector.indexOf('[') : selector.indexOf(':')
                if(attr > -1) {
                    selectorsArr.push(`.${selector.splice(attr, `-${_uniqueSuffix}`)}`)
                } else {
                    selectorsArr.push(`.${selector}-${_uniqueSuffix}`)
                }
                _cssProcessedElements.add(selector)
            } else {
                selectorsArr.push(selector)
            }
        })
        return selectorsArr.join(' ')
    }

    function _changeHtml(){
        _traverseDomNodes(_htmlDocument)
        _htmlString = domSerializer(_htmlDocument, _htmlParserOptions)
        _deleteSplice()
    }

    function _traverseDomNodes(DOMNodes){
        DOMNodes.forEach((e, ndx, nodes) => {
            //console.log(e.startIndex)
            //e && e.next && e.next.type === 'tag' && e.next.name === 'meta' && console.log('element', nodes[ndx])
            _manageDomElement(e, ndx, nodes)
            if(e && e.next && !e.next.processed){
                e.hasNExt = true
                //e.next.type === 'tag' && e.next.name === 'meta' && console.log('element', nodes[ndx])
                _manageDomElement(e.next, ndx, nodes, true)
                //console.log(e.next.childNodes)
                //e.next && e.next.childNodes && _traverseDomNodes(e.next.childNodes)
                //e.next && console.log(e.next)
                //element.next && !element.next.processed && _manageDomElement(element.next, ndx, nodes, true)
            }
            if(e && e.prev && !e.prev.processed){
                _manageDomElement(e.prev, ndx, nodes, false, true)
                //e.prev && e.prev.childNodes && _traverseDomNodes(e.prev.childNodes)
            }
            if(e && e.childNodes)
                _traverseDomNodes(e.childNodes)
        })
    }

    function _manageDomElement(element, ndx, nodes, isNextEl, isPrevEl){
        if(element && !element.processed){
            const addClass = `${element.name}-${_uniqueSuffix}`
            //console.log(element.type, element.name, element.attribs)
            if(element.type === 'style' && element.attribs.type === 'text/css'){
                //console.log(element)
                element.children.forEach(e => {
                    _parseCss(e.data)
                    e.data = css.stringify(_cssAST)
                })
            }
            //remove scripts
            if(_options.removeScripts){
                if(element.type === 'tag' && element.name === 'script'){
                    isNextEl ? nodes[ndx].next = null : nodes.splice(ndx, 1)
                }
            }
            //replace html, head, body and remove meta, title, comments
            if(_options.normalizeHtml){
                if(element && element.type === 'tag' && (element.name === 'html' || element.name === 'body')){
                    _addClass(element, addClass)
                    _cssProcessedElements.delete(element.name)
                    element.name = _options.replaceElement
                }
                if(element && element.type === 'tag' && element.name === 'head'){
                    element.attribs.style = element.attribs.style ? (element.attribs.style + ' display: none;') : 'display: none;'
                    element.name = 'span'
                }
                if(element && element.type === 'tag' && element.name === 'meta'){
                    //console.log('next:'+isNextEl+ndx, element.attribs)
                    //console.log('prev:'+isPrevEl+ndx, element.attribs)
                    //console.log(nodes)
                    //console.log(nodes[ndx])
                    //nodes ? nodes.splice(ndx, 1) : element = null
                    //element.remove = true
                    //isNextEl && console.log(element)
                    //debugger
                    element.attribs[ndx] = `${isNextEl} - ${isPrevEl}`
                    if(isNextEl) {
                        element = null
                        //nodes[ndx].next = null
                        nodes.splice(ndx, 1)
                    } else if (isPrevEl){
                        element = null
                        //nodes[ndx].prev = null
                        nodes.splice(ndx, 1)
                    } else {
                        nodes.splice(ndx, 1)
                    }
                    //isNextEl ? nodes[ndx].next = null : nodes.splice(ndx, 1)
                    //isNextEl && console.log('next', nodes[ndx])
                    //isPrevEl && console.log('prev', nodes[ndx])
                    //element && console.log(element.attribs)
                }
                if(element && element.type === 'tag' && element.name === 'title'){
                    //isNextEl ? nodes[ndx].next = null : nodes.splice(ndx, 1)
                }
                if(element && element.type === 'comment'){
                    isNextEl ? nodes[ndx].next = null : nodes.splice(ndx, 1)
                }
            }
            //add class to processed element
            if(element && _cssProcessedElements.has(element.name)){
                _addClass(element, addClass)
            }
            //if the element has not been deleted, mark as processed
            if(element){
                element.processed = true
            }
        }
    }

    function _addClass(element, className){
        if(element.attribs && element.attribs.class){
            if(element.attribs.class.indexOf(className) === -1)
                element.attribs.class += ` ${className}`
        } else {
            element.attribs.class = className
        }
    }

    function _initOptions(opt){
        if(opt && typeof opt === 'object'){
            Object.keys(opt).forEach(o => {
                _options[o] = opt[o]
            })
        }
    }

    function _addSplice(){
        if (String.prototype.splice === undefined) {
            /**
             * Splices text within a string.
             * @param {int} offset The position to insert the text at (before)
             * @param {string} text The text to insert
             * @param {int} [removeCount=0] An optional number of characters to overwrite
             * @returns {string} A modified string containing the spliced text.
             */
            String.prototype.splice = function(offset, text, removeCount=0) {
                let calculatedOffset = offset < 0 ? this.length + offset : offset;
                return this.substring(0, calculatedOffset) +
                text + this.substring(calculatedOffset + removeCount);
            };
        }
    }

    function _deleteSplice(){
        delete String.prototype.splice
    }

    /* executes */
}

module.exports = HtmlStylify