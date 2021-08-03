import omitDeep from 'omit-deep';
import rename from 'deep-rename-keys';
import { parseSync } from 'xml-reader';

var parseInput = function parseInput(input) {
  var parsed = parseSync("<root>".concat(input, "</root>"), {
    parentNodes: false
  });
  var isValid = parsed.children && parsed.children.length > 0 && parsed.children.every(function (node) {
    return node.name === 'svg';
  });

  if (isValid) {
    return parsed.children.length === 1 ? parsed.children[0] : parsed.children;
  } else {
    throw Error('nothing to parse');
  }
};
var removeAttrs = function removeAttrs(obj) {
  return omitDeep(obj, ['parent']);
};
var camelize = function camelize(node) {
  return rename(node, function (key) {
    if (!notCamelcase(key)) {
      return toCamelCase(key);
    }

    return key;
  });
};
var toCamelCase = function toCamelCase(prop) {
  return prop.replace(/[-|:]([a-z])/gi, function (all, letter) {
    return letter.toUpperCase();
  });
};

var notCamelcase = function notCamelcase(prop) {
  return /^(data|aria)(-\w+)/.test(prop);
};

var escapeText = function escapeText(text) {
  if (text) {
    var str = String(text);
    return /[&<>]/.test(str) ? "<![CDATA[".concat(str.replace(/]]>/, ']]]]><![CDATA[>'), "]]>") : str;
  }

  return '';
};
var escapeAttr = function escapeAttr(attr) {
  return String(attr).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

var svgsonSync = function svgsonSync(input) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$transformNode = _ref.transformNode,
      transformNode = _ref$transformNode === void 0 ? function (node) {
    return node;
  } : _ref$transformNode,
      _ref$camelcase = _ref.camelcase,
      camelcase = _ref$camelcase === void 0 ? false : _ref$camelcase;

  var applyFilters = function applyFilters(input) {
    var n;
    n = removeAttrs(input);
    n = transformNode(n);

    if (camelcase) {
      n = camelize(n);
    }

    return n;
  };

  return applyFilters(parseInput(input));
};
function svgson() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new Promise(function (resolve, reject) {
    try {
      var res = svgsonSync.apply(void 0, args);
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
}

var stringify = function stringify(_ast) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$transformAttr = _ref.transformAttr,
      transformAttr = _ref$transformAttr === void 0 ? function (key, value, escape) {
    return "".concat(key, "=\"").concat(escape(value), "\"");
  } : _ref$transformAttr,
      _ref$transformNode = _ref.transformNode,
      transformNode = _ref$transformNode === void 0 ? function (node) {
    return node;
  } : _ref$transformNode,
      _ref$selfClose = _ref.selfClose,
      selfClose = _ref$selfClose === void 0 ? true : _ref$selfClose;

  if (Array.isArray(_ast)) {
    return _ast.map(function (ast) {
      return stringify(ast, {
        transformAttr: transformAttr,
        selfClose: selfClose,
        transformNode: transformNode
      });
    }).join('');
  }

  var ast = transformNode(_ast);

  if (ast.type === 'text') {
    return escapeText(ast.value);
  }

  var attributes = '';

  for (var attr in ast.attributes) {
    var attrStr = transformAttr(attr, ast.attributes[attr], escapeAttr, ast.name);
    attributes += attrStr ? " ".concat(attrStr) : '';
  }

  return ast.children && ast.children.length > 0 || !selfClose ? "<".concat(ast.name).concat(attributes, ">").concat(stringify(ast.children, {
    transformAttr: transformAttr,
    transformNode: transformNode,
    selfClose: selfClose
  }), "</").concat(ast.name, ">") : "<".concat(ast.name).concat(attributes, "/>");
};

export default svgson;
export { svgson as parse, svgsonSync as parseSync, stringify };
