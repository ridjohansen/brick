/* a global object for use in simplifying the process of adding demos to
 * individual demo pages */
var DemoHelpers;

(function(){
    var _DEMO_SECT_SELECTOR = "section.demo-wrap";
    var _BUTTON_SELECTOR = _DEMO_SECT_SELECTOR + 
                                " > .markup-wrap > .controls > button";

    function _DemoHelpers(){}

    /* DEMO_SECT_SELECTOR is a selector for finding demo sections */
    /* BUTTON_SELECTOR is a selector for finding control buttons in demo 
     * sections */
    Object.defineProperties(_DemoHelpers.prototype, {
        "DEMO_SECT_SELECTOR":{
            get: function(){
                return _DEMO_SECT_SELECTOR;
            }
        },
        "BUTTON_SELECTOR": {
            get: function(){
                return _BUTTON_SELECTOR;
            }
        }
    });

    /* assuming that the given button matches the _BUTTON_SELECTOR, this utility
     * function returns the demo section it belongs to */
    _DemoHelpers.prototype.controlButtonToDemoSect = function(button){
        return button.parentNode.parentNode.parentNode;
    }

    /* returns a random color in the "rgb(#, #, #)" format */
    _DemoHelpers.prototype.randomColor = function(alpha){
        var _randomVal = function(){
            return Math.floor(Math.random() * 256);
        }
        var type = (alpha) ? "rgba" : "rgb";
        var alphaStr = (alpha) ? ","+alpha : "";
        
        return type+"("+_randomVal()+","+_randomVal()+","+_randomVal()+alphaStr+")";
    };

    /* return true if the browser natively supports inputs of the given type */
    _DemoHelpers.prototype.hasNativeInputTypeSupport = function(type){
        var inputEl = document.createElement("input");
        inputEl.setAttribute("type", type);

        return (inputEl.type === type);
    };

    /* find the least amount of tabbing and dedent each line by that much */
    _DemoHelpers.prototype.dedentAll = function(source){
        var tabRegex = /\n(\s*?)(\S|\n)/g;
        var spacing = tabRegex.exec(source);
        if(spacing){
            var shortest = spacing[1].length;
            while(spacing){
                if(spacing[1].length < shortest){
                    shortest = spacing[1].length;
                }
                spacing = tabRegex.exec(source);
            }
            if(shortest > 0){
                var dedentRegex = new RegExp("\\n\\s{"+shortest+"}", "g");
                source = source.replace(dedentRegex, "\n");
            }
        }
        return source;
    };

    /* dedent html source and remove ignored attributes */
    _DemoHelpers.prototype.cleanHtmlSource = function(html, ignoreAttrs){
        // remove any attributes given in parameter, but only if they are
        // actually in a tag
        if(ignoreAttrs && ignoreAttrs.length){
            // no global flag, or we will over-skip through string
            var attrIgnoreRegex = new RegExp("(<[^>]*?\\s)(("+
                                             ignoreAttrs.join("|")+
                                             ")=\".*?\"\\s?)([^<]*?>)");
            var match = attrIgnoreRegex.exec(html);
            while(match){
                html = html.substr(0, match.index) + match[1] + match[4] + 
                       html.substr(match.index + match[0].length);
                match = attrIgnoreRegex.exec(html);
            }
            html = html.replace(/\s*>/g, ">");
        }
        // remove blank attribute values (TODO: more complex regex to catch more 
        //  edge cases involving content)
        html = html.replace(/="(|true|null)"/g, "");

        // remove comments
        html = html.replace(/<!--.*?-->/g, "");
        
        html = this.dedentAll(html);
        // trim spacing from start/end of markup
        html = html.replace(/^\s*\n/, "");
        html = html.replace(/\n\s*$/, "");
        return html;
    };

    /* given a form, return the encoded string used to represent the form's
     * input data*/
    _DemoHelpers.prototype.getFormString = function(formEl){
        // retrieves all _actual_ <input> elements (ie: not fake polyfills)
        var inputElems = formEl.elements;
        var vals = [];
        for (var i = 0; i < inputElems.length; i++) {
            var input = inputElems[i];
            if(!input.name) continue;
            if((input.type === "radio" || input.type === "checkbox") &&
                (!input.checked))
            {
                continue;
            }

            vals.push(encodeURIComponent(input.name) + "=" + 
                      encodeURIComponent(input.value));
        }
        return vals.join("&");
    };

    /* returns the given properties of the element as a newline delimited 
     * string of ".propertyName -> propertyValue" lines */
    _DemoHelpers.prototype.getPropertiesString = function(elem, propNames){
        var propKeys = [];
        for(var i = 0; i < propNames.length; i++){
            var propName = propNames[i];
            var val = elem[propName];
            if(typeof(val) === "string") val = '"'+val+'"';
            propKeys.push("." + propName + " -> " + val);
        }
        return propKeys.join("\n");
    };

    /* given a list of items, returns the item after the given item in the list
     * returns null if no such item exists */
    _DemoHelpers.prototype.nextItem = function(items, prevItem){
        if(items.length === 0) return null;
        var index = items.indexOf(prevItem);

        if(index === -1) return null;

        return items[(index+1) % items.length];
    };

    /* utility function for updating any element with a Google Prettify parsed
     * version of the given content */
    _DemoHelpers.prototype.updatePrettyprintEl = function(prettyprintEl, rawContent){
        prettyprintEl.textContent = rawContent;
        prettyprintEl.innerHTML = prettyPrintOne(prettyprintEl.innerHTML);
        xtag.addClass(prettyprintEl, "prettyprinted");
    };

    /* from a demo section wrapper, return the markup element with the given 
     * language class */
    _DemoHelpers.prototype.getMarkupEl = function(demoSect, lang){
        return demoSect.querySelector(".markup-wrap ."+lang);
    };

    /* from a demo section wrapper, return the demo figure itself */
    _DemoHelpers.prototype.getContextEl = function(demoSect){
        return demoSect.querySelector(".demo");
    };

    /* will register global listeners on each of the given event types to fire 
      "update-demo" events on the corresponding demo section whenever detected
      by any given demo section */
    _DemoHelpers.prototype.registerUpdateListeners = function(eventTypes){
        for(var i = 0; i < eventTypes.length; i++){
            var eventType = eventTypes[i];
            var selector = eventType+":delegate("+_DEMO_SECT_SELECTOR+")";
            xtag.addEvent(document, selector, function(e){
                var demoSect = this;
                xtag.fireEvent(demoSect, "update-demo");
            });
        }
    };

    /* EventCounter provides a simple wrapper for updating a counter of 
     * event keys */
    /* params:
          initKeys          a list of valid keys to use
          eventToKeyFn      (optional) a function that takes an event and
                            optional additional parameters to return the proper
                            key to use for the counter; returns null if no 
                            key should be used (ie: the parameters fail some
                            validation);
                            defaults to simply returning event type as the key
    */
    function EventCounter(initKeys, eventToKeyFn, toStrFn){
        var self = this;
        self.counters = {};
        initKeys.forEach(function(key){
            self.counters[key] = 0;
        });

        // function to use when translating/validating an event to a key
        self.eventToKeyFn = (eventToKeyFn) ? eventToKeyFn : 
                                             function(e){return e.type;}; 
    };

    // takes an event, but can also take additional optional parameters as long
    // as the eventToKeyFn uses them
    EventCounter.prototype.updateCounter = function(e){
        var key = this.eventToKeyFn.apply(this, arguments);
        if(key === null || !(key in this.counters)) return;
        
        this.counters[key]++;
    };

    /* use EventCounter by calling new DemoHelpers.EventCounter() */
    _DemoHelpers.prototype.EventCounter = EventCounter;

    /* call initializeDemos to set up the following:
    *  - form listeners to only alert demo form submissions instead of 
    *    refreshing the page
    *  - set up handlers for toggle buttons
    *  - fire an initial "update-demo" event on all demo sections
    *  - a general prettyprint call
    */
    _DemoHelpers.prototype.initializeDemos = function(){
        // prevent submission of any demo forms and alert values instead
        xtag.addEvent(document, "submit:delegate(" +
                                _DEMO_SECT_SELECTOR +
                                " .demo form)", function(e){
            alert('submitted: "'+DemoHelpers.getFormString(this)+'"');
            e.preventDefault();
            e.stopPropagation();
        });

        // listen for any button with data-toggle-prop and toggle through attributes
        // will fire an "update-demo" event on the demo section
        // 
        // button attributes:
        // data-toggle-prop = name of attribute to toggle
        // data-toggle-target-selector = a CSS selector to call on the demo-wrap's
        //                               querySelector indicating where to apply
        //                               the attribute
        // data-toggle-options = If given, should be a JSON for a list of options
        //                       to cycle through for the attribute's value
        //                       If not given, indicates that the attribute is a
        //                       boolean attribute to toggle on and off
        xtag.addEvent(document, "click:delegate(" +
                                _BUTTON_SELECTOR +
                                "[data-toggle-prop])", function(e){
            var button = this;
            var demoSect = DemoHelpers.controlButtonToDemoSect(button);
            var toggleAttr = button.getAttribute("data-toggle-prop");
            var toggleTargetSelector = button.getAttribute(
                                            "data-toggle-target"
                                       );
            if((!toggleAttr) || (!toggleTargetSelector)) return;

            var targetElem = demoSect.querySelector(toggleTargetSelector);
            if(!targetElem) return;

            var oldVal = targetElem[toggleAttr];
            var newVal;

            if(button.hasAttribute("data-toggle-options")){
                var toggleOptions = JSON.parse(
                                        button.getAttribute("data-toggle-options")
                                    );
                newVal = DemoHelpers.nextItem(toggleOptions, oldVal);
                if(newVal === null){
                    console.warn("invalid original option of ", oldVal, 
                                 " for attribute ", toggleAttr, " on ", targetElem);
                }
            }
            else{
                newVal = !oldVal;
            }
            targetElem[toggleAttr] = newVal;

            // account for any skip transitions
            xtag.requestFrame(function(){
                var statusEl = button.querySelector(".attr-status");
                if(statusEl){
                    var content = toggleAttr+'="'+targetElem[toggleAttr]+'"';
                    DemoHelpers.updatePrettyprintEl(statusEl, content);
                }
                xtag.fireEvent(demoSect, "update-demo");
            });
        });

        // fire initial update on all demo sections
        xtag.query(document, _DEMO_SECT_SELECTOR).forEach(function(demoSect){
            xtag.fireEvent(demoSect, "update-demo", {detail: {init: true}});
        });

        prettyPrint();
    };
    
    DemoHelpers = new _DemoHelpers();
})();