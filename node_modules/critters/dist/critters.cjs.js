var path = require('path');
var prettyBytes = require('pretty-bytes');
var parse5 = require('parse5');
var select = require('css-select');
var treeAdapter = require('parse5-htmlparser2-tree-adapter');
var css = require('css');
var chalk = require('chalk');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var prettyBytes__default = /*#__PURE__*/_interopDefaultLegacy(prettyBytes);
var parse5__default = /*#__PURE__*/_interopDefaultLegacy(parse5);
var select__default = /*#__PURE__*/_interopDefaultLegacy(select);
var treeAdapter__default = /*#__PURE__*/_interopDefaultLegacy(treeAdapter);
var css__default = /*#__PURE__*/_interopDefaultLegacy(css);
var chalk__default = /*#__PURE__*/_interopDefaultLegacy(chalk);

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

const PARSE5_OPTS = {
  treeAdapter: treeAdapter__default['default']
};
/**
 * Parse HTML into a mutable, serializable DOM Document.
 * The DOM implementation is an htmlparser2 DOM enhanced with basic DOM mutation methods.
 * @param {String} html   HTML to parse into a Document instance
 */

function createDocument(html) {
  const document = parse5__default['default'].parse(html, PARSE5_OPTS);
  defineProperties(document, DocumentExtensions); // Extend Element.prototype with DOM manipulation methods.

  const scratch = document.createElement('div'); // Get a reference to the base Node class - used by createTextNode()

  document.$$Node = scratch.constructor;
  const elementProto = Object.getPrototypeOf(scratch);
  defineProperties(elementProto, ElementExtensions);
  elementProto.ownerDocument = document;
  return document;
}
/**
 * Serialize a Document to an HTML String
 * @param {Document} document   A Document, such as one created via `createDocument()`
 */

function serializeDocument(document) {
  return parse5__default['default'].serialize(document, PARSE5_OPTS);
}
/**
 * Methods and descriptors to mix into Element.prototype
 */

const ElementExtensions = {
  /** @extends htmlparser2.Element.prototype */
  nodeName: {
    get() {
      return this.tagName.toUpperCase();
    }

  },
  id: reflectedProperty('id'),
  className: reflectedProperty('class'),

  insertBefore(child, referenceNode) {
    if (!referenceNode) return this.appendChild(child);
    treeAdapter__default['default'].insertBefore(this, child, referenceNode);
    return child;
  },

  appendChild(child) {
    treeAdapter__default['default'].appendChild(this, child);
    return child;
  },

  removeChild(child) {
    treeAdapter__default['default'].detachNode(child);
  },

  remove() {
    treeAdapter__default['default'].detachNode(this);
  },

  textContent: {
    get() {
      return getText(this);
    },

    set(text) {
      this.children = [];
      treeAdapter__default['default'].insertText(this, text);
    }

  },

  setAttribute(name, value) {
    if (this.attribs == null) this.attribs = {};
    if (value == null) value = '';
    this.attribs[name] = value;
  },

  removeAttribute(name) {
    if (this.attribs != null) {
      delete this.attribs[name];
    }
  },

  getAttribute(name) {
    return this.attribs != null && this.attribs[name];
  },

  hasAttribute(name) {
    return this.attribs != null && this.attribs[name] != null;
  },

  getAttributeNode(name) {
    const value = this.getAttribute(name);
    if (value != null) return {
      specified: true,
      value
    };
  }

};
/**
 * Methods and descriptors to mix into the global document instance
 * @private
 */

const DocumentExtensions = {
  /** @extends htmlparser2.Document.prototype */
  // document is just an Element in htmlparser2, giving it a nodeType of ELEMENT_NODE.
  // TODO: verify if these are needed for css-select
  nodeType: {
    get() {
      return 9;
    }

  },
  contentType: {
    get() {
      return 'text/html';
    }

  },
  nodeName: {
    get() {
      return '#document';
    }

  },
  documentElement: {
    get() {
      // Find the first <html> element within the document
      return this.childNodes.filter(child => String(child.tagName).toLowerCase() === 'html');
    }

  },
  compatMode: {
    get() {
      const compatMode = {
        'no-quirks': 'CSS1Compat',
        quirks: 'BackCompat',
        'limited-quirks': 'CSS1Compat'
      };
      return compatMode[treeAdapter__default['default'].getDocumentMode(this)];
    }

  },
  body: {
    get() {
      return this.querySelector('body');
    }

  },

  createElement(name) {
    return treeAdapter__default['default'].createElement(name, null, []);
  },

  createTextNode(text) {
    // there is no dedicated createTextNode equivalent exposed in htmlparser2's DOM
    const Node = this.$$Node;
    return new Node({
      type: 'text',
      data: text,
      parent: null,
      prev: null,
      next: null
    });
  },

  querySelector(sel) {
    return select__default['default'].selectOne(sel, this.documentElement);
  },

  querySelectorAll(sel) {
    if (sel === ':root') {
      return this;
    }

    return select__default['default'](sel, this.documentElement);
  }

};
/**
 * Essentially `Object.defineProperties()`, except function values are assigned as value descriptors for convenience.
 * @private
 */

function defineProperties(obj, properties) {
  for (const i in properties) {
    const value = properties[i];
    Object.defineProperty(obj, i, typeof value === 'function' ? {
      value
    } : value);
  }
}
/**
 * Create a property descriptor defining a getter/setter pair alias for a named attribute.
 * @private
 */


function reflectedProperty(attributeName) {
  return {
    get() {
      return this.getAttribute(attributeName);
    },

    set(value) {
      this.setAttribute(attributeName, value);
    }

  };
}
/**
 * Helper to get the text content of a node
 * https://github.com/fb55/domutils/blob/master/src/stringify.ts#L21
 * @private
 */


function getText(node) {
  if (Array.isArray(node)) return node.map(getText).join('');
  if (treeAdapter__default['default'].isElementNode(node)) return node.name === 'br' ? '\n' : getText(node.children);
  if (treeAdapter__default['default'].isTextNode(node)) return node.data;
  return '';
}

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
/**
 * Parse a textual CSS Stylesheet into a Stylesheet instance.
 * Stylesheet is a mutable ReworkCSS AST with format similar to CSSOM.
 * @see https://github.com/reworkcss/css
 * @private
 * @param {String} stylesheet
 * @returns {css.Stylesheet} ast
 */

function parseStylesheet(stylesheet) {
  return css__default['default'].parse(stylesheet);
}
/**
 * Serialize a ReworkCSS Stylesheet to a String of CSS.
 * @private
 * @param {css.Stylesheet} ast          A Stylesheet to serialize, such as one returned from `parseStylesheet()`
 * @param {Object} options              Options to pass to `css.stringify()`
 * @param {Boolean} [options.compress]  Compress CSS output (removes comments, whitespace, etc)
 */

function serializeStylesheet(ast, options) {
  return css__default['default'].stringify(ast, options);
}
/**
 * Converts a walkStyleRules() iterator to mark nodes with `.$$remove=true` instead of actually removing them.
 * This means they can be removed in a second pass, allowing the first pass to be nondestructive (eg: to preserve mirrored sheets).
 * @private
 * @param {Function} iterator   Invoked on each node in the tree. Return `false` to remove that node.
 * @returns {(rule) => void} nonDestructiveIterator
 */

function markOnly(predicate) {
  return rule => {
    const sel = rule.selectors;

    if (predicate(rule) === false) {
      rule.$$remove = true;
    }

    rule.$$markedSelectors = rule.selectors;

    if (rule._other) {
      rule._other.$$markedSelectors = rule._other.selectors;
    }

    rule.selectors = sel;
  };
}
/**
 * Apply filtered selectors to a rule from a previous markOnly run.
 * @private
 * @param {css.Rule} rule The Rule to apply marked selectors to (if they exist).
*/

function applyMarkedSelectors(rule) {
  if (rule.$$markedSelectors) {
    rule.selectors = rule.$$markedSelectors;
  }

  if (rule._other) {
    applyMarkedSelectors(rule._other);
  }
}
/**
 * Recursively walk all rules in a stylesheet.
 * @private
 * @param {css.Rule} node       A Stylesheet or Rule to descend into.
 * @param {Function} iterator   Invoked on each node in the tree. Return `false` to remove that node.
 */

function walkStyleRules(node, iterator) {
  if (node.stylesheet) return walkStyleRules(node.stylesheet, iterator);
  node.rules = node.rules.filter(rule => {
    if (rule.rules) {
      walkStyleRules(rule, iterator);
    }

    rule._other = undefined;
    rule.filterSelectors = filterSelectors;
    return iterator(rule) !== false;
  });
}
/**
 * Recursively walk all rules in two identical stylesheets, filtering nodes into one or the other based on a predicate.
 * @private
 * @param {css.Rule} node       A Stylesheet or Rule to descend into.
 * @param {css.Rule} node2      A second tree identical to `node`
 * @param {Function} iterator   Invoked on each node in the tree. Return `false` to remove that node from the first tree, true to remove it from the second.
 */

function walkStyleRulesWithReverseMirror(node, node2, iterator) {
  if (node2 === null) return walkStyleRules(node, iterator);
  if (node.stylesheet) return walkStyleRulesWithReverseMirror(node.stylesheet, node2.stylesheet, iterator);
  [node.rules, node2.rules] = splitFilter(node.rules, node2.rules, (rule, index, rules, rules2) => {
    const rule2 = rules2[index];

    if (rule.rules) {
      walkStyleRulesWithReverseMirror(rule, rule2, iterator);
    }

    rule._other = rule2;
    rule.filterSelectors = filterSelectors;
    return iterator(rule) !== false;
  });
} // Like [].filter(), but applies the opposite filtering result to a second copy of the Array without a second pass.
// This is just a quicker version of generating the compliment of the set returned from a filter operation.

function splitFilter(a, b, predicate) {
  const aOut = [];
  const bOut = [];

  for (let index = 0; index < a.length; index++) {
    if (predicate(a[index], index, a, b)) {
      aOut.push(a[index]);
    } else {
      bOut.push(a[index]);
    }
  }

  return [aOut, bOut];
} // can be invoked on a style rule to subset its selectors (with reverse mirroring)


function filterSelectors(predicate) {
  if (this._other) {
    const [a, b] = splitFilter(this.selectors, this._other.selectors, predicate);
    this.selectors = a;
    this._other.selectors = b;
  } else {
    this.selectors = this.selectors.filter(predicate);
  }
}

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];
const defaultLogger = {
  trace(msg) {
    console.trace(msg);
  },

  debug(msg) {
    console.debug(msg);
  },

  warn(msg) {
    console.warn(chalk__default['default'].yellow(msg));
  },

  error(msg) {
    console.error(chalk__default['default'].bold.red(msg));
  },

  info(msg) {
    console.info(chalk__default['default'].bold.blue(msg));
  },

  silent() {}

};
function createLogger(logLevel) {
  const logLevelIdx = LOG_LEVELS.indexOf(logLevel);
  return LOG_LEVELS.reduce((logger, type, index) => {
    if (index >= logLevelIdx) {
      logger[type] = defaultLogger[type];
    } else {
      logger[type] = defaultLogger.silent;
    }

    return logger;
  }, {});
}

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
/**
 * The mechanism to use for lazy-loading stylesheets.
 * _[JS]_ indicates that a strategy requires JavaScript (falls back to `<noscript>`).
 *
 * - **default:** Move stylesheet links to the end of the document and insert preload meta tags in their place.
 * - **"body":** Move all external stylesheet links to the end of the document.
 * - **"media":** Load stylesheets asynchronously by adding `media="not x"` and removing once loaded. _[JS]_
 * - **"swap":** Convert stylesheet links to preloads that swap to `rel="stylesheet"` once loaded. _[JS]_
 * - **"js":** Inject an asynchronous CSS loader similar to [LoadCSS](https://github.com/filamentgroup/loadCSS) and use it to load stylesheets. _[JS]_
 * - **"js-lazy":** Like `"js"`, but the stylesheet is disabled until fully loaded.
 * @typedef {(default|'body'|'media'|'swap'|'js'|'js-lazy')} PreloadStrategy
 * @public
 */

/**
 * Controls which keyframes rules are inlined.
 *
 * - **"critical":** _(default)_ inline keyframes rules that are used by the critical CSS.
 * - **"all":** Inline all keyframes rules.
 * - **"none":** Remove all keyframes rules.
 * @typedef {('critical'|'all'|'none')} KeyframeStrategy
 * @private
 * @property {String} keyframes     Which {@link KeyframeStrategy keyframe strategy} to use (default: `critical`)_
 */

/**
 * Controls log level of the plugin. Specifies the level the logger should use. A logger will
 * not produce output for any log level beneath the specified level. Available levels and order
 * are:
 *
 * - **"info"** _(default)_
 * - **"warn"**
 * - **"error"**
 * - **"trace"**
 * - **"debug"**
 * - **"silent"**
 * @typedef {('info'|'warn'|'error'|'trace'|'debug'|'silent')} LogLevel
 * @public
 */

/**
 * Custom logger interface:
 * @typedef {object} Logger
 * @public
 * @property {function(String)} trace - Prints a trace message
 * @property {function(String)} debug - Prints a debug message
 * @property {function(String)} info - Prints an information message
 * @property {function(String)} warn - Prints a warning message
 * @property {function(String)} error - Prints an error message
 */

/**
 * All optional. Pass them to `new Critters({ ... })`.
 * @public
 * @typedef Options
 * @property {String} path     Base path location of the CSS files _(default: `''`)_
 * @property {String} publicPath     Public path of the CSS resources. This prefix is removed from the href _(default: `''`)_
 * @property {Boolean} external     Inline styles from external stylesheets _(default: `true`)_
 * @property {Number} inlineThreshold Inline external stylesheets smaller than a given size _(default: `0`)_
 * @property {Number} minimumExternalSize If the non-critical external stylesheet would be below this size, just inline it _(default: `0`)_
 * @property {Boolean} pruneSource  Remove inlined rules from the external stylesheet _(default: `false`)_
 * @property {Boolean} mergeStylesheets Merged inlined stylesheets into a single <style> tag _(default: `true`)_
 * @property {String[]} additionalStylesheets Glob for matching other stylesheets to be used while looking for critical CSS _(default: ``)_.
 * @property {String} preload       Which {@link PreloadStrategy preload strategy} to use
 * @property {Boolean} noscriptFallback Add `<noscript>` fallback to JS-based strategies
 * @property {Boolean} inlineFonts  Inline critical font-face rules _(default: `false`)_
 * @property {Boolean} preloadFonts Preloads critical fonts _(default: `true`)_
 * @property {Boolean} fonts        Shorthand for setting `inlineFonts`+`preloadFonts`
 *  - Values:
 *  - `true` to inline critical font-face rules and preload the fonts
 *  - `false` to don't inline any font-face rules and don't preload fonts
 * @property {String} keyframes     Controls which keyframes rules are inlined.
 *  - Values:
 *  - `"critical"`: _(default)_ inline keyframes rules used by the critical CSS
 *  - `"all"` inline all keyframes rules
 *  - `"none"` remove all keyframes rules
 * @property {Boolean} compress     Compress resulting critical CSS _(default: `true`)_
 * @property {String} logLevel      Controls {@link LogLevel log level} of the plugin _(default: `"info"`)_
 * @property {object} logger        Provide a custom logger interface {@link Logger logger}
 */

class Critters {
  /** @private */
  constructor(options) {
    this.options = Object.assign({
      logLevel: 'info',
      path: '',
      publicPath: '',
      reduceInlineStyles: true,
      pruneSource: false,
      additionalStylesheets: []
    }, options || {});
    this.urlFilter = this.options.filter;

    if (this.urlFilter instanceof RegExp) {
      this.urlFilter = this.urlFilter.test.bind(this.urlFilter);
    }

    this.logger = this.options.logger || createLogger(this.options.logLevel);
  }
  /**
   * Read the contents of a file from the specified filesystem or disk
   */


  readFile(filename) {
    const fs = this.fs;
    return new Promise((resolve, reject) => {
      const callback = (err, data) => {
        if (err) reject(err);else resolve(data);
      };

      if (fs && fs.readFile) {
        fs.readFile(filename, callback);
      } else {
        require('fs').readFile(filename, 'utf8', callback);
      }
    });
  }
  /**
   * Apply critical CSS processing to the html
   */


  async process(html) {
    const start = process.hrtime.bigint(); // Parse the generated HTML in a DOM we can mutate

    const document = createDocument(html);

    if (this.options.additionalStylesheets.length > 0) {
      this.embedAdditionalStylesheet(document);
    } // `external:false` skips processing of external sheets


    if (this.options.external !== false) {
      const externalSheets = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
      await Promise.all(externalSheets.map(link => this.embedLinkedStylesheet(link, document)));
    } // go through all the style tags in the document and reduce them to only critical CSS


    const styles = this.getAffectedStyleTags(document);
    await Promise.all(styles.map(style => this.processStyle(style, document)));

    if (this.options.mergeStylesheets !== false && styles.length !== 0) {
      await this.mergeStylesheets(document);
    } // serialize the document back to HTML and we're done


    const output = serializeDocument(document);
    const end = process.hrtime.bigint();
    this.logger.info('Time ' + parseFloat(end - start) / 1000000.0);
    return output;
  }
  /**
   * Get the style tags that need processing
   */


  getAffectedStyleTags(document) {
    const styles = [].slice.call(document.querySelectorAll('style')); // `inline:false` skips processing of inline stylesheets

    if (this.options.reduceInlineStyles === false) {
      return styles.filter(style => style.$$external);
    }

    return styles;
  }

  async mergeStylesheets(document) {
    const styles = this.getAffectedStyleTags(document);

    if (styles.length === 0) {
      this.logger.warn('Merging inline stylesheets into a single <style> tag skipped, no inline stylesheets to merge');
      return;
    }

    const first = styles[0];
    let sheet = first.textContent;

    for (let i = 1; i < styles.length; i++) {
      const node = styles[i];
      sheet += node.textContent;
      node.remove();
    }

    first.textContent = sheet;
  }
  /**
   * Given href, find the corresponding CSS asset
   */


  async getCssAsset(href) {
    const outputPath = this.options.path;
    const publicPath = this.options.publicPath; // CHECK - the output path
    // path on disk (with output.publicPath removed)

    let normalizedPath = href.replace(/^\//, '');
    const pathPrefix = (publicPath || '').replace(/(^\/|\/$)/g, '') + '/';

    if (normalizedPath.indexOf(pathPrefix) === 0) {
      normalizedPath = normalizedPath.substring(pathPrefix.length).replace(/^\//, '');
    }

    const filename = path__default['default'].resolve(outputPath, normalizedPath);
    let sheet;

    try {
      sheet = await this.readFile(filename);
    } catch (e) {
      this.logger.warn(`Unable to locate stylesheet: ${filename}`);
    }

    return sheet;
  }

  checkInlineThreshold(link, style, sheet) {
    if (this.options.inlineThreshold && sheet.length < this.options.inlineThreshold) {
      const href = style.$$name;
      style.$$reduce = false;
      this.logger.info(`\u001b[32mInlined all of ${href} (${sheet.length} was below the threshold of ${this.options.inlineThreshold})\u001b[39m`);
      link.remove();
      return true;
    }

    return false;
  }
  /**
   * Inline the stylesheets from options.additionalStylesheets (assuming it passes `options.filter`)
   */


  async embedAdditionalStylesheet(document) {
    const styleSheetsIncluded = [];
    const sources = await Promise.all(this.options.additionalStylesheets.map(cssFile => {
      if (styleSheetsIncluded.includes(cssFile)) {
        return;
      }

      styleSheetsIncluded.push(cssFile);
      const style = document.createElement('style');
      style.$$external = true;
      return this.getCssAsset(cssFile, style).then(sheet => [sheet, style]);
    }));
    sources.forEach(([sheet, style]) => {
      if (!sheet) return;
      style.textContent = sheet;
      document.head.appendChild(style);
    });
  }
  /**
   * Inline the target stylesheet referred to by a <link rel="stylesheet"> (assuming it passes `options.filter`)
   */


  async embedLinkedStylesheet(link, document) {
    const href = link.getAttribute('href');
    const media = link.getAttribute('media');
    const preloadMode = this.options.preload; // skip filtered resources, or network resources if no filter is provided

    if (this.urlFilter ? this.urlFilter(href) : !(href || '').match(/\.css$/)) {
      return Promise.resolve();
    } // the reduced critical CSS gets injected into a new <style> tag


    const style = document.createElement('style');
    style.$$external = true;
    const sheet = await this.getCssAsset(href, style);

    if (!sheet) {
      return;
    }

    style.textContent = sheet;
    style.$$name = href;
    style.$$links = [link];
    link.parentNode.insertBefore(style, link);

    if (this.checkInlineThreshold(link, style, sheet)) {
      return;
    } // CSS loader is only injected for the first sheet, then this becomes an empty string


    let cssLoaderPreamble = "function $loadcss(u,m,l){(l=document.createElement('link')).rel='stylesheet';l.href=u;document.head.appendChild(l)}";
    const lazy = preloadMode === 'js-lazy';

    if (lazy) {
      cssLoaderPreamble = cssLoaderPreamble.replace('l.href', "l.media='print';l.onload=function(){l.media=m};l.href");
    } // Allow disabling any mutation of the stylesheet link:


    if (preloadMode === false) return;
    let noscriptFallback = false;

    if (preloadMode === 'body') {
      document.body.appendChild(link);
    } else {
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'style');

      if (preloadMode === 'js' || preloadMode === 'js-lazy') {
        const script = document.createElement('script');
        const js = `${cssLoaderPreamble}$loadcss(${JSON.stringify(href)}${lazy ? ',' + JSON.stringify(media || 'all') : ''})`; // script.appendChild(document.createTextNode(js));

        script.textContent = js;
        link.parentNode.insertBefore(script, link.nextSibling);
        style.$$links.push(script);
        cssLoaderPreamble = '';
        noscriptFallback = true;
      } else if (preloadMode === 'media') {
        // @see https://github.com/filamentgroup/loadCSS/blob/af1106cfe0bf70147e22185afa7ead96c01dec48/src/loadCSS.js#L26
        link.setAttribute('rel', 'stylesheet');
        link.removeAttribute('as');
        link.setAttribute('media', 'print');
        link.setAttribute('onload', `this.media='${media || 'all'}'`);
        noscriptFallback = true;
      } else if (preloadMode === 'swap') {
        link.setAttribute('onload', "this.rel='stylesheet'");
        noscriptFallback = true;
      } else {
        const bodyLink = document.createElement('link');
        bodyLink.setAttribute('rel', 'stylesheet');
        if (media) bodyLink.setAttribute('media', media);
        bodyLink.setAttribute('href', href);
        document.body.appendChild(bodyLink);
        style.$$links.push(bodyLink);
      }
    }

    if (this.options.noscriptFallback !== false && noscriptFallback) {
      const noscript = document.createElement('noscript');
      const noscriptLink = document.createElement('link');
      noscriptLink.setAttribute('rel', 'stylesheet');
      noscriptLink.setAttribute('href', href);
      if (media) noscriptLink.setAttribute('media', media);
      noscript.appendChild(noscriptLink);
      link.parentNode.insertBefore(noscript, link.nextSibling);
      style.$$links.push(noscript);
    }
  }
  /**
   * Prune the source CSS files
   */


  pruneSource(style, before, sheetInverse) {
    // if external stylesheet would be below minimum size, just inline everything
    const minSize = this.options.minimumExternalSize;
    const name = style.$$name;

    if (minSize && sheetInverse.length < minSize) {
      this.logger.info(`\u001b[32mInlined all of ${name} (non-critical external stylesheet would have been ${sheetInverse.length}b, which was below the threshold of ${minSize})\u001b[39m`);
      style.textContent = before; // remove any associated external resources/loaders:

      if (style.$$links) {
        for (const link of style.$$links) {
          const parent = link.parentNode;
          if (parent) parent.removeChild(link);
        }
      }

      return true;
    }

    return false;
  }
  /**
   * Parse the stylesheet within a <style> element, then reduce it to contain only rules used by the document.
   */


  async processStyle(style, document) {
    if (style.$$reduce === false) return;
    const name = style.$$name ? style.$$name.replace(/^\//, '') : 'inline CSS';
    const options = this.options; // const document = style.ownerDocument;

    const head = document.querySelector('head');
    let keyframesMode = options.keyframes || 'critical'; // we also accept a boolean value for options.keyframes

    if (keyframesMode === true) keyframesMode = 'all';
    if (keyframesMode === false) keyframesMode = 'none';
    let sheet = style.textContent; // store a reference to the previous serialized stylesheet for reporting stats

    const before = sheet; // Skip empty stylesheets

    if (!sheet) return;
    const ast = parseStylesheet(sheet);
    const astInverse = options.pruneSource ? parseStylesheet(sheet) : null; // a string to search for font names (very loose)

    let criticalFonts = '';
    const failedSelectors = [];
    const criticalKeyframeNames = []; // Walk all CSS rules, marking unused rules with `.$$remove=true` for removal in the second pass.
    // This first pass is also used to collect font and keyframe usage used in the second pass.

    walkStyleRules(ast, markOnly(rule => {
      if (rule.type === 'rule') {
        // Filter the selector list down to only those match
        rule.filterSelectors(sel => {
          // Strip pseudo-elements and pseudo-classes, since we only care that their associated elements exist.
          // This means any selector for a pseudo-element or having a pseudo-class will be inlined if the rest of the selector matches.
          if (sel === ':root' || sel.match(/^::?(before|after)$/)) {
            return true;
          }

          sel = sel.replace(/(?<!\\)::?[a-z-]+(?![a-z-(])/gi, '').replace(/::?not\(\s*\)/g, '').trim();
          if (!sel) return false;

          try {
            return document.querySelector(sel) != null;
          } catch (e) {
            failedSelectors.push(sel + ' -> ' + e.message);
            return false;
          }
        }); // If there are no matched selectors, remove the rule:

        if (rule.selectors.length === 0) {
          return false;
        }

        if (rule.declarations) {
          for (let i = 0; i < rule.declarations.length; i++) {
            const decl = rule.declarations[i]; // detect used fonts

            if (decl.property && decl.property.match(/\bfont(-family)?\b/i)) {
              criticalFonts += ' ' + decl.value;
            } // detect used keyframes


            if (decl.property === 'animation' || decl.property === 'animation-name') {
              // @todo: parse animation declarations and extract only the name. for now we'll do a lazy match.
              const names = decl.value.split(/\s+/);

              for (let j = 0; j < names.length; j++) {
                const name = names[j].trim();
                if (name) criticalKeyframeNames.push(name);
              }
            }
          }
        }
      } // keep font rules, they're handled in the second pass:


      if (rule.type === 'font-face') return; // If there are no remaining rules, remove the whole rule:

      const rules = rule.rules && rule.rules.filter(rule => !rule.$$remove);
      return !rules || rules.length !== 0;
    }));

    if (failedSelectors.length !== 0) {
      this.logger.warn(`${failedSelectors.length} rules skipped due to selector errors:\n  ${failedSelectors.join('\n  ')}`);
    }

    const shouldPreloadFonts = options.fonts === true || options.preloadFonts === true;
    const shouldInlineFonts = options.fonts !== false && options.inlineFonts === true;
    const preloadedFonts = []; // Second pass, using data picked up from the first

    walkStyleRulesWithReverseMirror(ast, astInverse, rule => {
      // remove any rules marked in the first pass
      if (rule.$$remove === true) return false;
      applyMarkedSelectors(rule); // prune @keyframes rules

      if (rule.type === 'keyframes') {
        if (keyframesMode === 'none') return false;
        if (keyframesMode === 'all') return true;
        return criticalKeyframeNames.indexOf(rule.name) !== -1;
      } // prune @font-face rules


      if (rule.type === 'font-face') {
        let family, src;

        for (let i = 0; i < rule.declarations.length; i++) {
          const decl = rule.declarations[i];

          if (decl.property === 'src') {
            // @todo parse this properly and generate multiple preloads with type="font/woff2" etc
            src = (decl.value.match(/url\s*\(\s*(['"]?)(.+?)\1\s*\)/) || [])[2];
          } else if (decl.property === 'font-family') {
            family = decl.value;
          }
        }

        if (src && shouldPreloadFonts && preloadedFonts.indexOf(src) === -1) {
          preloadedFonts.push(src);
          const preload = document.createElement('link');
          preload.setAttribute('rel', 'preload');
          preload.setAttribute('as', 'font');
          preload.setAttribute('crossorigin', 'anonymous');
          preload.setAttribute('href', src.trim());
          head.appendChild(preload);
        } // if we're missing info, if the font is unused, or if critical font inlining is disabled, remove the rule:


        if (!family || !src || criticalFonts.indexOf(family) === -1 || !shouldInlineFonts) {
          return false;
        }
      }
    });
    sheet = serializeStylesheet(ast, {
      compress: this.options.compress !== false
    }).trim(); // If all rules were removed, get rid of the style element entirely

    if (sheet.trim().length === 0) {
      if (style.parentNode) {
        style.remove();
      }

      return;
    }

    let afterText = '';
    let styleInlinedCompletely = false;

    if (options.pruneSource) {
      const sheetInverse = serializeStylesheet(astInverse, {
        compress: this.options.compress !== false
      });
      styleInlinedCompletely = this.pruneSource(style, before, sheetInverse);

      if (styleInlinedCompletely) {
        const percent = sheetInverse.length / before.length * 100;
        afterText = `, reducing non-inlined size ${percent | 0}% to ${prettyBytes__default['default'](sheetInverse.length)}`;
      }
    } // replace the inline stylesheet with its critical'd counterpart


    if (!styleInlinedCompletely) {
      style.textContent = sheet;
    } // output stats


    const percent = sheet.length / before.length * 100 | 0;
    this.logger.info('\u001b[32mInlined ' + prettyBytes__default['default'](sheet.length) + ' (' + percent + '% of original ' + prettyBytes__default['default'](before.length) + ') of ' + name + afterText + '.\u001b[39m');
  }

}

module.exports = Critters;
