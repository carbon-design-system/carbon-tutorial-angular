/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/i18n/i18n_parser", ["require", "exports", "tslib", "@angular/compiler/src/expression_parser/lexer", "@angular/compiler/src/expression_parser/parser", "@angular/compiler/src/ml_parser/ast", "@angular/compiler/src/ml_parser/html_tags", "@angular/compiler/src/parse_util", "@angular/compiler/src/i18n/i18n_ast", "@angular/compiler/src/i18n/serializers/placeholder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createI18nMessageFactory = void 0;
    var tslib_1 = require("tslib");
    var lexer_1 = require("@angular/compiler/src/expression_parser/lexer");
    var parser_1 = require("@angular/compiler/src/expression_parser/parser");
    var html = require("@angular/compiler/src/ml_parser/ast");
    var html_tags_1 = require("@angular/compiler/src/ml_parser/html_tags");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var i18n = require("@angular/compiler/src/i18n/i18n_ast");
    var placeholder_1 = require("@angular/compiler/src/i18n/serializers/placeholder");
    var _expParser = new parser_1.Parser(new lexer_1.Lexer());
    /**
     * Returns a function converting html nodes to an i18n Message given an interpolationConfig
     */
    function createI18nMessageFactory(interpolationConfig) {
        var visitor = new _I18nVisitor(_expParser, interpolationConfig);
        return function (nodes, meaning, description, customId, visitNodeFn) {
            return visitor.toI18nMessage(nodes, meaning, description, customId, visitNodeFn);
        };
    }
    exports.createI18nMessageFactory = createI18nMessageFactory;
    function noopVisitNodeFn(_html, i18n) {
        return i18n;
    }
    var _I18nVisitor = /** @class */ (function () {
        function _I18nVisitor(_expressionParser, _interpolationConfig) {
            this._expressionParser = _expressionParser;
            this._interpolationConfig = _interpolationConfig;
        }
        _I18nVisitor.prototype.toI18nMessage = function (nodes, meaning, description, customId, visitNodeFn) {
            if (meaning === void 0) { meaning = ''; }
            if (description === void 0) { description = ''; }
            if (customId === void 0) { customId = ''; }
            var context = {
                isIcu: nodes.length == 1 && nodes[0] instanceof html.Expansion,
                icuDepth: 0,
                placeholderRegistry: new placeholder_1.PlaceholderRegistry(),
                placeholderToContent: {},
                placeholderToMessage: {},
                visitNodeFn: visitNodeFn || noopVisitNodeFn,
            };
            var i18nodes = html.visitAll(this, nodes, context);
            return new i18n.Message(i18nodes, context.placeholderToContent, context.placeholderToMessage, meaning, description, customId);
        };
        _I18nVisitor.prototype.visitElement = function (el, context) {
            var _a;
            var children = html.visitAll(this, el.children, context);
            var attrs = {};
            el.attrs.forEach(function (attr) {
                // Do not visit the attributes, translatable ones are top-level ASTs
                attrs[attr.name] = attr.value;
            });
            var isVoid = html_tags_1.getHtmlTagDefinition(el.name).isVoid;
            var startPhName = context.placeholderRegistry.getStartTagPlaceholderName(el.name, attrs, isVoid);
            context.placeholderToContent[startPhName] = {
                text: el.startSourceSpan.toString(),
                sourceSpan: el.startSourceSpan,
            };
            var closePhName = '';
            if (!isVoid) {
                closePhName = context.placeholderRegistry.getCloseTagPlaceholderName(el.name);
                context.placeholderToContent[closePhName] = {
                    text: "</" + el.name + ">",
                    sourceSpan: (_a = el.endSourceSpan) !== null && _a !== void 0 ? _a : el.sourceSpan,
                };
            }
            var node = new i18n.TagPlaceholder(el.name, attrs, startPhName, closePhName, children, isVoid, el.sourceSpan, el.startSourceSpan, el.endSourceSpan);
            return context.visitNodeFn(el, node);
        };
        _I18nVisitor.prototype.visitAttribute = function (attribute, context) {
            var node = attribute.valueTokens === undefined || attribute.valueTokens.length === 1 ?
                new i18n.Text(attribute.value, attribute.valueSpan || attribute.sourceSpan) :
                this._visitTextWithInterpolation(attribute.valueTokens, attribute.valueSpan || attribute.sourceSpan, context, attribute.i18n);
            return context.visitNodeFn(attribute, node);
        };
        _I18nVisitor.prototype.visitText = function (text, context) {
            var node = text.tokens.length === 1 ?
                new i18n.Text(text.value, text.sourceSpan) :
                this._visitTextWithInterpolation(text.tokens, text.sourceSpan, context, text.i18n);
            return context.visitNodeFn(text, node);
        };
        _I18nVisitor.prototype.visitComment = function (comment, context) {
            return null;
        };
        _I18nVisitor.prototype.visitExpansion = function (icu, context) {
            var _this = this;
            context.icuDepth++;
            var i18nIcuCases = {};
            var i18nIcu = new i18n.Icu(icu.switchValue, icu.type, i18nIcuCases, icu.sourceSpan);
            icu.cases.forEach(function (caze) {
                i18nIcuCases[caze.value] = new i18n.Container(caze.expression.map(function (node) { return node.visit(_this, context); }), caze.expSourceSpan);
            });
            context.icuDepth--;
            if (context.isIcu || context.icuDepth > 0) {
                // Returns an ICU node when:
                // - the message (vs a part of the message) is an ICU message, or
                // - the ICU message is nested.
                var expPh = context.placeholderRegistry.getUniquePlaceholder("VAR_" + icu.type);
                i18nIcu.expressionPlaceholder = expPh;
                context.placeholderToContent[expPh] = {
                    text: icu.switchValue,
                    sourceSpan: icu.switchValueSourceSpan,
                };
                return context.visitNodeFn(icu, i18nIcu);
            }
            // Else returns a placeholder
            // ICU placeholders should not be replaced with their original content but with the their
            // translations.
            // TODO(vicb): add a html.Node -> i18n.Message cache to avoid having to re-create the msg
            var phName = context.placeholderRegistry.getPlaceholderName('ICU', icu.sourceSpan.toString());
            context.placeholderToMessage[phName] = this.toI18nMessage([icu], '', '', '', undefined);
            var node = new i18n.IcuPlaceholder(i18nIcu, phName, icu.sourceSpan);
            return context.visitNodeFn(icu, node);
        };
        _I18nVisitor.prototype.visitExpansionCase = function (_icuCase, _context) {
            throw new Error('Unreachable code');
        };
        /**
         * Convert, text and interpolated tokens up into text and placeholder pieces.
         *
         * @param tokens The text and interpolated tokens.
         * @param sourceSpan The span of the whole of the `text` string.
         * @param context The current context of the visitor, used to compute and store placeholders.
         * @param previousI18n Any i18n metadata associated with this `text` from a previous pass.
         */
        _I18nVisitor.prototype._visitTextWithInterpolation = function (tokens, sourceSpan, context, previousI18n) {
            var e_1, _a;
            // Return a sequence of `Text` and `Placeholder` nodes grouped in a `Container`.
            var nodes = [];
            // We will only create a container if there are actually interpolations,
            // so this flag tracks that.
            var hasInterpolation = false;
            try {
                for (var tokens_1 = tslib_1.__values(tokens), tokens_1_1 = tokens_1.next(); !tokens_1_1.done; tokens_1_1 = tokens_1.next()) {
                    var token = tokens_1_1.value;
                    switch (token.type) {
                        case 8 /* INTERPOLATION */:
                        case 17 /* ATTR_VALUE_INTERPOLATION */:
                            hasInterpolation = true;
                            var expression = token.parts[1];
                            var baseName = extractPlaceholderName(expression) || 'INTERPOLATION';
                            var phName = context.placeholderRegistry.getPlaceholderName(baseName, expression);
                            context.placeholderToContent[phName] = {
                                text: token.parts.join(''),
                                sourceSpan: token.sourceSpan
                            };
                            nodes.push(new i18n.Placeholder(expression, phName, token.sourceSpan));
                            break;
                        default:
                            if (token.parts[0].length > 0) {
                                // This token is text or an encoded entity.
                                // If it is following on from a previous text node then merge it into that node
                                // Otherwise, if it is following an interpolation, then add a new node.
                                var previous = nodes[nodes.length - 1];
                                if (previous instanceof i18n.Text) {
                                    previous.value += token.parts[0];
                                    previous.sourceSpan = new parse_util_1.ParseSourceSpan(previous.sourceSpan.start, token.sourceSpan.end, previous.sourceSpan.fullStart, previous.sourceSpan.details);
                                }
                                else {
                                    nodes.push(new i18n.Text(token.parts[0], token.sourceSpan));
                                }
                            }
                            break;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (tokens_1_1 && !tokens_1_1.done && (_a = tokens_1.return)) _a.call(tokens_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (hasInterpolation) {
                // Whitespace removal may have invalidated the interpolation source-spans.
                reusePreviousSourceSpans(nodes, previousI18n);
                return new i18n.Container(nodes, sourceSpan);
            }
            else {
                return nodes[0];
            }
        };
        return _I18nVisitor;
    }());
    /**
     * Re-use the source-spans from `previousI18n` metadata for the `nodes`.
     *
     * Whitespace removal can invalidate the source-spans of interpolation nodes, so we
     * reuse the source-span stored from a previous pass before the whitespace was removed.
     *
     * @param nodes The `Text` and `Placeholder` nodes to be processed.
     * @param previousI18n Any i18n metadata for these `nodes` stored from a previous pass.
     */
    function reusePreviousSourceSpans(nodes, previousI18n) {
        if (previousI18n instanceof i18n.Message) {
            // The `previousI18n` is an i18n `Message`, so we are processing an `Attribute` with i18n
            // metadata. The `Message` should consist only of a single `Container` that contains the
            // parts (`Text` and `Placeholder`) to process.
            assertSingleContainerMessage(previousI18n);
            previousI18n = previousI18n.nodes[0];
        }
        if (previousI18n instanceof i18n.Container) {
            // The `previousI18n` is a `Container`, which means that this is a second i18n extraction pass
            // after whitespace has been removed from the AST nodes.
            assertEquivalentNodes(previousI18n.children, nodes);
            // Reuse the source-spans from the first pass.
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].sourceSpan = previousI18n.children[i].sourceSpan;
            }
        }
    }
    /**
     * Asserts that the `message` contains exactly one `Container` node.
     */
    function assertSingleContainerMessage(message) {
        var nodes = message.nodes;
        if (nodes.length !== 1 || !(nodes[0] instanceof i18n.Container)) {
            throw new Error('Unexpected previous i18n message - expected it to consist of only a single `Container` node.');
        }
    }
    /**
     * Asserts that the `previousNodes` and `node` collections have the same number of elements and
     * corresponding elements have the same node type.
     */
    function assertEquivalentNodes(previousNodes, nodes) {
        if (previousNodes.length !== nodes.length) {
            throw new Error('The number of i18n message children changed between first and second pass.');
        }
        if (previousNodes.some(function (node, i) { return nodes[i].constructor !== node.constructor; })) {
            throw new Error('The types of the i18n message children changed between first and second pass.');
        }
    }
    var _CUSTOM_PH_EXP = /\/\/[\s\S]*i18n[\s\S]*\([\s\S]*ph[\s\S]*=[\s\S]*("|')([\s\S]*?)\1[\s\S]*\)/g;
    function extractPlaceholderName(input) {
        return input.split(_CUSTOM_PH_EXP)[2];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bl9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvaTE4bi9pMThuX3BhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsdUVBQW9FO0lBQ3BFLHlFQUF1RTtJQUN2RSwwREFBeUM7SUFDekMsdUVBQTREO0lBRzVELCtEQUE4QztJQUU5QywwREFBbUM7SUFDbkMsa0ZBQThEO0lBRTlELElBQU0sVUFBVSxHQUFHLElBQUksZUFBZ0IsQ0FBQyxJQUFJLGFBQWUsRUFBRSxDQUFDLENBQUM7SUFTL0Q7O09BRUc7SUFDSCxTQUFnQix3QkFBd0IsQ0FBQyxtQkFBd0M7UUFFL0UsSUFBTSxPQUFPLEdBQUcsSUFBSSxZQUFZLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDbEUsT0FBTyxVQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxXQUFXO1lBQy9DLE9BQUEsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDO1FBQXpFLENBQXlFLENBQUM7SUFDdkYsQ0FBQztJQUxELDREQUtDO0lBV0QsU0FBUyxlQUFlLENBQUMsS0FBZ0IsRUFBRSxJQUFlO1FBQ3hELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEO1FBQ0Usc0JBQ1ksaUJBQW1DLEVBQ25DLG9CQUF5QztZQUR6QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQWtCO1lBQ25DLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUI7UUFBRyxDQUFDO1FBRWxELG9DQUFhLEdBQXBCLFVBQ0ksS0FBa0IsRUFBRSxPQUFZLEVBQUUsV0FBZ0IsRUFBRSxRQUFhLEVBQ2pFLFdBQWtDO1lBRGQsd0JBQUEsRUFBQSxZQUFZO1lBQUUsNEJBQUEs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QUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUMvRCxNQUFNLElBQUksS0FBSyxDQUNYLDhGQUE4RixDQUFDLENBQUM7U0FDckc7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxhQUEwQixFQUFFLEtBQWtCO1FBQzNFLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEVBQTRFLENBQUMsQ0FBQztTQUMvRjtRQUNELElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUksRUFBRSxDQUFDLElBQUssT0FBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQXpDLENBQXlDLENBQUMsRUFBRTtZQUM5RSxNQUFNLElBQUksS0FBSyxDQUNYLCtFQUErRSxDQUFDLENBQUM7U0FDdEY7SUFDSCxDQUFDO0lBRUQsSUFBTSxjQUFjLEdBQ2hCLDZFQUE2RSxDQUFDO0lBRWxGLFNBQVMsc0JBQXNCLENBQUMsS0FBYTtRQUMzQyxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xleGVyIGFzIEV4cHJlc3Npb25MZXhlcn0gZnJvbSAnLi4vZXhwcmVzc2lvbl9wYXJzZXIvbGV4ZXInO1xuaW1wb3J0IHtQYXJzZXIgYXMgRXhwcmVzc2lvblBhcnNlcn0gZnJvbSAnLi4vZXhwcmVzc2lvbl9wYXJzZXIvcGFyc2VyJztcbmltcG9ydCAqIGFzIGh0bWwgZnJvbSAnLi4vbWxfcGFyc2VyL2FzdCc7XG5pbXBvcnQge2dldEh0bWxUYWdEZWZpbml0aW9ufSBmcm9tICcuLi9tbF9wYXJzZXIvaHRtbF90YWdzJztcbmltcG9ydCB7SW50ZXJwb2xhdGlvbkNvbmZpZ30gZnJvbSAnLi4vbWxfcGFyc2VyL2ludGVycG9sYXRpb25fY29uZmlnJztcbmltcG9ydCB7SW50ZXJwb2xhdGVkQXR0cmlidXRlVG9rZW4sIEludGVycG9sYXRlZFRleHRUb2tlbiwgVG9rZW5UeXBlfSBmcm9tICcuLi9tbF9wYXJzZXIvdG9rZW5zJztcbmltcG9ydCB7UGFyc2VTb3VyY2VTcGFufSBmcm9tICcuLi9wYXJzZV91dGlsJztcblxuaW1wb3J0ICogYXMgaTE4biBmcm9tICcuL2kxOG5fYXN0JztcbmltcG9ydCB7UGxhY2Vob2xkZXJSZWdpc3RyeX0gZnJvbSAnLi9zZXJpYWxpemVycy9wbGFjZWhvbGRlcic7XG5cbmNvbnN0IF9leHBQYXJzZXIgPSBuZXcgRXhwcmVzc2lvblBhcnNlcihuZXcgRXhwcmVzc2lvbkxleGVyKCkpO1xuXG5leHBvcnQgdHlwZSBWaXNpdE5vZGVGbiA9IChodG1sOiBodG1sLk5vZGUsIGkxOG46IGkxOG4uTm9kZSkgPT4gaTE4bi5Ob2RlO1xuXG5leHBvcnQgaW50ZXJmYWNlIEkxOG5NZXNzYWdlRmFjdG9yeSB7XG4gIChub2RlczogaHRtbC5Ob2RlW10sIG1lYW5pbmc6IHN0cmluZ3x1bmRlZmluZWQsIGRlc2NyaXB0aW9uOiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgY3VzdG9tSWQ6IHN0cmluZ3x1bmRlZmluZWQsIHZpc2l0Tm9kZUZuPzogVmlzaXROb2RlRm4pOiBpMThuLk1lc3NhZ2U7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGZ1bmN0aW9uIGNvbnZlcnRpbmcgaHRtbCBub2RlcyB0byBhbiBpMThuIE1lc3NhZ2UgZ2l2ZW4gYW4gaW50ZXJwb2xhdGlvbkNvbmZpZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSTE4bk1lc3NhZ2VGYWN0b3J5KGludGVycG9sYXRpb25Db25maWc6IEludGVycG9sYXRpb25Db25maWcpOlxuICAgIEkxOG5NZXNzYWdlRmFjdG9yeSB7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgX0kxOG5WaXNpdG9yKF9leHBQYXJzZXIsIGludGVycG9sYXRpb25Db25maWcpO1xuICByZXR1cm4gKG5vZGVzLCBtZWFuaW5nLCBkZXNjcmlwdGlvbiwgY3VzdG9tSWQsIHZpc2l0Tm9kZUZuKSA9PlxuICAgICAgICAgICAgIHZpc2l0b3IudG9JMThuTWVzc2FnZShub2RlcywgbWVhbmluZywgZGVzY3JpcHRpb24sIGN1c3RvbUlkLCB2aXNpdE5vZGVGbik7XG59XG5cbmludGVyZmFjZSBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0IHtcbiAgaXNJY3U6IGJvb2xlYW47XG4gIGljdURlcHRoOiBudW1iZXI7XG4gIHBsYWNlaG9sZGVyUmVnaXN0cnk6IFBsYWNlaG9sZGVyUmVnaXN0cnk7XG4gIHBsYWNlaG9sZGVyVG9Db250ZW50OiB7W3BoTmFtZTogc3RyaW5nXTogaTE4bi5NZXNzYWdlUGxhY2Vob2xkZXJ9O1xuICBwbGFjZWhvbGRlclRvTWVzc2FnZToge1twaE5hbWU6IHN0cmluZ106IGkxOG4uTWVzc2FnZX07XG4gIHZpc2l0Tm9kZUZuOiBWaXNpdE5vZGVGbjtcbn1cblxuZnVuY3Rpb24gbm9vcFZpc2l0Tm9kZUZuKF9odG1sOiBodG1sLk5vZGUsIGkxOG46IGkxOG4uTm9kZSk6IGkxOG4uTm9kZSB7XG4gIHJldHVybiBpMThuO1xufVxuXG5jbGFzcyBfSTE4blZpc2l0b3IgaW1wbGVtZW50cyBodG1sLlZpc2l0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgX2V4cHJlc3Npb25QYXJzZXI6IEV4cHJlc3Npb25QYXJzZXIsXG4gICAgICBwcml2YXRlIF9pbnRlcnBvbGF0aW9uQ29uZmlnOiBJbnRlcnBvbGF0aW9uQ29uZmlnKSB7fVxuXG4gIHB1YmxpYyB0b0kxOG5NZXNzYWdlKFxuICAgICAgbm9kZXM6IGh0bWwuTm9kZVtdLCBtZWFuaW5nID0gJycsIGRlc2NyaXB0aW9uID0gJycsIGN1c3RvbUlkID0gJycsXG4gICAgICB2aXNpdE5vZGVGbjogVmlzaXROb2RlRm58dW5kZWZpbmVkKTogaTE4bi5NZXNzYWdlIHtcbiAgICBjb25zdCBjb250ZXh0OiBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0ID0ge1xuICAgICAgaXNJY3U6IG5vZGVzLmxlbmd0aCA9PSAxICYmIG5vZGVzWzBdIGluc3RhbmNlb2YgaHRtbC5FeHBhbnNpb24sXG4gICAgICBpY3VEZXB0aDogMCxcbiAgICAgIHBsYWNlaG9sZGVyUmVnaXN0cnk6IG5ldyBQbGFjZWhvbGRlclJlZ2lzdHJ5KCksXG4gICAgICBwbGFjZWhvbGRlclRvQ29udGVudDoge30sXG4gICAgICBwbGFjZWhvbGRlclRvTWVzc2FnZToge30sXG4gICAgICB2aXNpdE5vZGVGbjogdmlzaXROb2RlRm4gfHwgbm9vcFZpc2l0Tm9kZUZuLFxuICAgIH07XG5cbiAgICBjb25zdCBpMThub2RlczogaTE4bi5Ob2RlW10gPSBodG1sLnZpc2l0QWxsKHRoaXMsIG5vZGVzLCBjb250ZXh0KTtcblxuICAgIHJldHVybiBuZXcgaTE4bi5NZXNzYWdlKFxuICAgICAgICBpMThub2RlcywgY29udGV4dC5wbGFjZWhvbGRlclRvQ29udGVudCwgY29udGV4dC5wbGFjZWhvbGRlclRvTWVzc2FnZSwgbWVhbmluZywgZGVzY3JpcHRpb24sXG4gICAgICAgIGN1c3RvbUlkKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudChlbDogaHRtbC5FbGVtZW50LCBjb250ZXh0OiBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0KTogaTE4bi5Ob2RlIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IGh0bWwudmlzaXRBbGwodGhpcywgZWwuY2hpbGRyZW4sIGNvbnRleHQpO1xuICAgIGNvbnN0IGF0dHJzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICBlbC5hdHRycy5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgLy8gRG8gbm90IHZpc2l0IHRoZSBhdHRyaWJ1dGVzLCB0cmFuc2xhdGFibGUgb25lcyBhcmUgdG9wLWxldmVsIEFTVHNcbiAgICAgIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaXNWb2lkOiBib29sZWFuID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWwubmFtZSkuaXNWb2lkO1xuICAgIGNvbnN0IHN0YXJ0UGhOYW1lID1cbiAgICAgICAgY29udGV4dC5wbGFjZWhvbGRlclJlZ2lzdHJ5LmdldFN0YXJ0VGFnUGxhY2Vob2xkZXJOYW1lKGVsLm5hbWUsIGF0dHJzLCBpc1ZvaWQpO1xuICAgIGNvbnRleHQucGxhY2Vob2xkZXJUb0NvbnRlbnRbc3RhcnRQaE5hbWVdID0ge1xuICAgICAgdGV4dDogZWwuc3RhcnRTb3VyY2VTcGFuLnRvU3RyaW5nKCksXG4gICAgICBzb3VyY2VTcGFuOiBlbC5zdGFydFNvdXJjZVNwYW4sXG4gICAgfTtcblxuICAgIGxldCBjbG9zZVBoTmFtZSA9ICcnO1xuXG4gICAgaWYgKCFpc1ZvaWQpIHtcbiAgICAgIGNsb3NlUGhOYW1lID0gY29udGV4dC5wbGFjZWhvbGRlclJlZ2lzdHJ5LmdldENsb3NlVGFnUGxhY2Vob2xkZXJOYW1lKGVsLm5hbWUpO1xuICAgICAgY29udGV4dC5wbGFjZWhvbGRlclRvQ29udGVudFtjbG9zZVBoTmFtZV0gPSB7XG4gICAgICAgIHRleHQ6IGA8LyR7ZWwubmFtZX0+YCxcbiAgICAgICAgc291cmNlU3BhbjogZWwuZW5kU291cmNlU3BhbiA/PyBlbC5zb3VyY2VTcGFuLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlID0gbmV3IGkxOG4uVGFnUGxhY2Vob2xkZXIoXG4gICAgICAgIGVsLm5hbWUsIGF0dHJzLCBzdGFydFBoTmFtZSwgY2xvc2VQaE5hbWUsIGNoaWxkcmVuLCBpc1ZvaWQsIGVsLnNvdXJjZVNwYW4sXG4gICAgICAgIGVsLnN0YXJ0U291cmNlU3BhbiwgZWwuZW5kU291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGNvbnRleHQudmlzaXROb2RlRm4oZWwsIG5vZGUpO1xuICB9XG5cbiAgdmlzaXRBdHRyaWJ1dGUoYXR0cmlidXRlOiBodG1sLkF0dHJpYnV0ZSwgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IGF0dHJpYnV0ZS52YWx1ZVRva2VucyA9PT0gdW5kZWZpbmVkIHx8IGF0dHJpYnV0ZS52YWx1ZVRva2Vucy5sZW5ndGggPT09IDEgP1xuICAgICAgICBuZXcgaTE4bi5UZXh0KGF0dHJpYnV0ZS52YWx1ZSwgYXR0cmlidXRlLnZhbHVlU3BhbiB8fCBhdHRyaWJ1dGUuc291cmNlU3BhbikgOlxuICAgICAgICB0aGlzLl92aXNpdFRleHRXaXRoSW50ZXJwb2xhdGlvbihcbiAgICAgICAgICAgIGF0dHJpYnV0ZS52YWx1ZVRva2VucywgYXR0cmlidXRlLnZhbHVlU3BhbiB8fCBhdHRyaWJ1dGUuc291cmNlU3BhbiwgY29udGV4dCxcbiAgICAgICAgICAgIGF0dHJpYnV0ZS5pMThuKTtcbiAgICByZXR1cm4gY29udGV4dC52aXNpdE5vZGVGbihhdHRyaWJ1dGUsIG5vZGUpO1xuICB9XG5cbiAgdmlzaXRUZXh0KHRleHQ6IGh0bWwuVGV4dCwgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRleHQudG9rZW5zLmxlbmd0aCA9PT0gMSA/XG4gICAgICAgIG5ldyBpMThuLlRleHQodGV4dC52YWx1ZSwgdGV4dC5zb3VyY2VTcGFuKSA6XG4gICAgICAgIHRoaXMuX3Zpc2l0VGV4dFdpdGhJbnRlcnBvbGF0aW9uKHRleHQudG9rZW5zLCB0ZXh0LnNvdXJjZVNwYW4sIGNvbnRleHQsIHRleHQuaTE4bik7XG4gICAgcmV0dXJuIGNvbnRleHQudmlzaXROb2RlRm4odGV4dCwgbm9kZSk7XG4gIH1cblxuICB2aXNpdENvbW1lbnQoY29tbWVudDogaHRtbC5Db21tZW50LCBjb250ZXh0OiBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0KTogaTE4bi5Ob2RlfG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmlzaXRFeHBhbnNpb24oaWN1OiBodG1sLkV4cGFuc2lvbiwgY29udGV4dDogSTE4bk1lc3NhZ2VWaXNpdG9yQ29udGV4dCk6IGkxOG4uTm9kZSB7XG4gICAgY29udGV4dC5pY3VEZXB0aCsrO1xuICAgIGNvbnN0IGkxOG5JY3VDYXNlczoge1trOiBzdHJpbmddOiBpMThuLk5vZGV9ID0ge307XG4gICAgY29uc3QgaTE4bkljdSA9IG5ldyBpMThuLkljdShpY3Uuc3dpdGNoVmFsdWUsIGljdS50eXBlLCBpMThuSWN1Q2FzZXMsIGljdS5zb3VyY2VTcGFuKTtcbiAgICBpY3UuY2FzZXMuZm9yRWFjaCgoY2F6ZSk6IHZvaWQgPT4ge1xuICAgICAgaTE4bkljdUNhc2VzW2NhemUudmFsdWVdID0gbmV3IGkxOG4uQ29udGFpbmVyKFxuICAgICAgICAgIGNhemUuZXhwcmVzc2lvbi5tYXAoKG5vZGUpID0+IG5vZGUudmlzaXQodGhpcywgY29udGV4dCkpLCBjYXplLmV4cFNvdXJjZVNwYW4pO1xuICAgIH0pO1xuICAgIGNvbnRleHQuaWN1RGVwdGgtLTtcblxuICAgIGlmIChjb250ZXh0LmlzSWN1IHx8IGNvbnRleHQuaWN1RGVwdGggPiAwKSB7XG4gICAgICAvLyBSZXR1cm5zIGFuIElDVSBub2RlIHdoZW46XG4gICAgICAvLyAtIHRoZSBtZXNzYWdlICh2cyBhIHBhcnQgb2YgdGhlIG1lc3NhZ2UpIGlzIGFuIElDVSBtZXNzYWdlLCBvclxuICAgICAgLy8gLSB0aGUgSUNVIG1lc3NhZ2UgaXMgbmVzdGVkLlxuICAgICAgY29uc3QgZXhwUGggPSBjb250ZXh0LnBsYWNlaG9sZGVyUmVnaXN0cnkuZ2V0VW5pcXVlUGxhY2Vob2xkZXIoYFZBUl8ke2ljdS50eXBlfWApO1xuICAgICAgaTE4bkljdS5leHByZXNzaW9uUGxhY2Vob2xkZXIgPSBleHBQaDtcbiAgICAgIGNvbnRleHQucGxhY2Vob2xkZXJUb0NvbnRlbnRbZXhwUGhdID0ge1xuICAgICAgICB0ZXh0OiBpY3Uuc3dpdGNoVmFsdWUsXG4gICAgICAgIHNvdXJjZVNwYW46IGljdS5zd2l0Y2hWYWx1ZVNvdXJjZVNwYW4sXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGNvbnRleHQudmlzaXROb2RlRm4oaWN1LCBpMThuSWN1KTtcbiAgICB9XG5cbiAgICAvLyBFbHNlIHJldHVybnMgYSBwbGFjZWhvbGRlclxuICAgIC8vIElDVSBwbGFjZWhvbGRlcnMgc2hvdWxkIG5vdCBiZSByZXBsYWNlZCB3aXRoIHRoZWlyIG9yaWdpbmFsIGNvbnRlbnQgYnV0IHdpdGggdGhlIHRoZWlyXG4gICAgLy8gdHJhbnNsYXRpb25zLlxuICAgIC8vIFRPRE8odmljYik6IGFkZCBhIGh0bWwuTm9kZSAtPiBpMThuLk1lc3NhZ2UgY2FjaGUgdG8gYXZvaWQgaGF2aW5nIHRvIHJlLWNyZWF0ZSB0aGUgbXNnXG4gICAgY29uc3QgcGhOYW1lID0gY29udGV4dC5wbGFjZWhvbGRlclJlZ2lzdHJ5LmdldFBsYWNlaG9sZGVyTmFtZSgnSUNVJywgaWN1LnNvdXJjZVNwYW4udG9TdHJpbmcoKSk7XG4gICAgY29udGV4dC5wbGFjZWhvbGRlclRvTWVzc2FnZVtwaE5hbWVdID0gdGhpcy50b0kxOG5NZXNzYWdlKFtpY3VdLCAnJywgJycsICcnLCB1bmRlZmluZWQpO1xuICAgIGNvbnN0IG5vZGUgPSBuZXcgaTE4bi5JY3VQbGFjZWhvbGRlcihpMThuSWN1LCBwaE5hbWUsIGljdS5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gY29udGV4dC52aXNpdE5vZGVGbihpY3UsIG5vZGUpO1xuICB9XG5cbiAgdmlzaXRFeHBhbnNpb25DYXNlKF9pY3VDYXNlOiBodG1sLkV4cGFuc2lvbkNhc2UsIF9jb250ZXh0OiBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0KTogaTE4bi5Ob2RlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VucmVhY2hhYmxlIGNvZGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0LCB0ZXh0IGFuZCBpbnRlcnBvbGF0ZWQgdG9rZW5zIHVwIGludG8gdGV4dCBhbmQgcGxhY2Vob2xkZXIgcGllY2VzLlxuICAgKlxuICAgKiBAcGFyYW0gdG9rZW5zIFRoZSB0ZXh0IGFuZCBpbnRlcnBvbGF0ZWQgdG9rZW5zLlxuICAgKiBAcGFyYW0gc291cmNlU3BhbiBUaGUgc3BhbiBvZiB0aGUgd2hvbGUgb2YgdGhlIGB0ZXh0YCBzdHJpbmcuXG4gICAqIEBwYXJhbSBjb250ZXh0IFRoZSBjdXJyZW50IGNvbnRleHQgb2YgdGhlIHZpc2l0b3IsIHVzZWQgdG8gY29tcHV0ZSBhbmQgc3RvcmUgcGxhY2Vob2xkZXJzLlxuICAgKiBAcGFyYW0gcHJldmlvdXNJMThuIEFueSBpMThuIG1ldGFkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGB0ZXh0YCBmcm9tIGEgcHJldmlvdXMgcGFzcy5cbiAgICovXG4gIHByaXZhdGUgX3Zpc2l0VGV4dFdpdGhJbnRlcnBvbGF0aW9uKFxuICAgICAgdG9rZW5zOiAoSW50ZXJwb2xhdGVkVGV4dFRva2VufEludGVycG9sYXRlZEF0dHJpYnV0ZVRva2VuKVtdLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBjb250ZXh0OiBJMThuTWVzc2FnZVZpc2l0b3JDb250ZXh0LCBwcmV2aW91c0kxOG46IGkxOG4uSTE4bk1ldGF8dW5kZWZpbmVkKTogaTE4bi5Ob2RlIHtcbiAgICAvLyBSZXR1cm4gYSBzZXF1ZW5jZSBvZiBgVGV4dGAgYW5kIGBQbGFjZWhvbGRlcmAgbm9kZXMgZ3JvdXBlZCBpbiBhIGBDb250YWluZXJgLlxuICAgIGNvbnN0IG5vZGVzOiBpMThuLk5vZGVbXSA9IFtdO1xuICAgIC8vIFdlIHdpbGwgb25seSBjcmVhdGUgYSBjb250YWluZXIgaWYgdGhlcmUgYXJlIGFjdHVhbGx5IGludGVycG9sYXRpb25zLFxuICAgIC8vIHNvIHRoaXMgZmxhZyB0cmFja3MgdGhhdC5cbiAgICBsZXQgaGFzSW50ZXJwb2xhdGlvbiA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICBzd2l0Y2ggKHRva2VuLnR5cGUpIHtcbiAgICAgICAgY2FzZSBUb2tlblR5cGUuSU5URVJQT0xBVElPTjpcbiAgICAgICAgY2FzZSBUb2tlblR5cGUuQVRUUl9WQUxVRV9JTlRFUlBPTEFUSU9OOlxuICAgICAgICAgIGhhc0ludGVycG9sYXRpb24gPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b2tlbi5wYXJ0c1sxXTtcbiAgICAgICAgICBjb25zdCBiYXNlTmFtZSA9IGV4dHJhY3RQbGFjZWhvbGRlck5hbWUoZXhwcmVzc2lvbikgfHwgJ0lOVEVSUE9MQVRJT04nO1xuICAgICAgICAgIGNvbnN0IHBoTmFtZSA9IGNvbnRleHQucGxhY2Vob2xkZXJSZWdpc3RyeS5nZXRQbGFjZWhvbGRlck5hbWUoYmFzZU5hbWUsIGV4cHJlc3Npb24pO1xuICAgICAgICAgIGNvbnRleHQucGxhY2Vob2xkZXJUb0NvbnRlbnRbcGhOYW1lXSA9IHtcbiAgICAgICAgICAgIHRleHQ6IHRva2VuLnBhcnRzLmpvaW4oJycpLFxuICAgICAgICAgICAgc291cmNlU3BhbjogdG9rZW4uc291cmNlU3BhblxuICAgICAgICAgIH07XG4gICAgICAgICAgbm9kZXMucHVzaChuZXcgaTE4bi5QbGFjZWhvbGRlcihleHByZXNzaW9uLCBwaE5hbWUsIHRva2VuLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAodG9rZW4ucGFydHNbMF0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gVGhpcyB0b2tlbiBpcyB0ZXh0IG9yIGFuIGVuY29kZWQgZW50aXR5LlxuICAgICAgICAgICAgLy8gSWYgaXQgaXMgZm9sbG93aW5nIG9uIGZyb20gYSBwcmV2aW91cyB0ZXh0IG5vZGUgdGhlbiBtZXJnZSBpdCBpbnRvIHRoYXQgbm9kZVxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCBpZiBpdCBpcyBmb2xsb3dpbmcgYW4gaW50ZXJwb2xhdGlvbiwgdGhlbiBhZGQgYSBuZXcgbm9kZS5cbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzID0gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAocHJldmlvdXMgaW5zdGFuY2VvZiBpMThuLlRleHQpIHtcbiAgICAgICAgICAgICAgcHJldmlvdXMudmFsdWUgKz0gdG9rZW4ucGFydHNbMF07XG4gICAgICAgICAgICAgIHByZXZpb3VzLnNvdXJjZVNwYW4gPSBuZXcgUGFyc2VTb3VyY2VTcGFuKFxuICAgICAgICAgICAgICAgICAgcHJldmlvdXMuc291cmNlU3Bhbi5zdGFydCwgdG9rZW4uc291cmNlU3Bhbi5lbmQsIHByZXZpb3VzLnNvdXJjZVNwYW4uZnVsbFN0YXJ0LFxuICAgICAgICAgICAgICAgICAgcHJldmlvdXMuc291cmNlU3Bhbi5kZXRhaWxzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5vZGVzLnB1c2gobmV3IGkxOG4uVGV4dCh0b2tlbi5wYXJ0c1swXSwgdG9rZW4uc291cmNlU3BhbikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzSW50ZXJwb2xhdGlvbikge1xuICAgICAgLy8gV2hpdGVzcGFjZSByZW1vdmFsIG1heSBoYXZlIGludmFsaWRhdGVkIHRoZSBpbnRlcnBvbGF0aW9uIHNvdXJjZS1zcGFucy5cbiAgICAgIHJldXNlUHJldmlvdXNTb3VyY2VTcGFucyhub2RlcywgcHJldmlvdXNJMThuKTtcbiAgICAgIHJldHVybiBuZXcgaTE4bi5Db250YWluZXIobm9kZXMsIHNvdXJjZVNwYW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbm9kZXNbMF07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmUtdXNlIHRoZSBzb3VyY2Utc3BhbnMgZnJvbSBgcHJldmlvdXNJMThuYCBtZXRhZGF0YSBmb3IgdGhlIGBub2Rlc2AuXG4gKlxuICogV2hpdGVzcGFjZSByZW1vdmFsIGNhbiBpbnZhbGlkYXRlIHRoZSBzb3VyY2Utc3BhbnMgb2YgaW50ZXJwb2xhdGlvbiBub2Rlcywgc28gd2VcbiAqIHJldXNlIHRoZSBzb3VyY2Utc3BhbiBzdG9yZWQgZnJvbSBhIHByZXZpb3VzIHBhc3MgYmVmb3JlIHRoZSB3aGl0ZXNwYWNlIHdhcyByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSBub2RlcyBUaGUgYFRleHRgIGFuZCBgUGxhY2Vob2xkZXJgIG5vZGVzIHRvIGJlIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSBwcmV2aW91c0kxOG4gQW55IGkxOG4gbWV0YWRhdGEgZm9yIHRoZXNlIGBub2Rlc2Agc3RvcmVkIGZyb20gYSBwcmV2aW91cyBwYXNzLlxuICovXG5mdW5jdGlvbiByZXVzZVByZXZpb3VzU291cmNlU3BhbnMobm9kZXM6IGkxOG4uTm9kZVtdLCBwcmV2aW91c0kxOG46IGkxOG4uSTE4bk1ldGF8dW5kZWZpbmVkKTogdm9pZCB7XG4gIGlmIChwcmV2aW91c0kxOG4gaW5zdGFuY2VvZiBpMThuLk1lc3NhZ2UpIHtcbiAgICAvLyBUaGUgYHByZXZpb3VzSTE4bmAgaXMgYW4gaTE4biBgTWVzc2FnZWAsIHNvIHdlIGFyZSBwcm9jZXNzaW5nIGFuIGBBdHRyaWJ1dGVgIHdpdGggaTE4blxuICAgIC8vIG1ldGFkYXRhLiBUaGUgYE1lc3NhZ2VgIHNob3VsZCBjb25zaXN0IG9ubHkgb2YgYSBzaW5nbGUgYENvbnRhaW5lcmAgdGhhdCBjb250YWlucyB0aGVcbiAgICAvLyBwYXJ0cyAoYFRleHRgIGFuZCBgUGxhY2Vob2xkZXJgKSB0byBwcm9jZXNzLlxuICAgIGFzc2VydFNpbmdsZUNvbnRhaW5lck1lc3NhZ2UocHJldmlvdXNJMThuKTtcbiAgICBwcmV2aW91c0kxOG4gPSBwcmV2aW91c0kxOG4ubm9kZXNbMF07XG4gIH1cblxuICBpZiAocHJldmlvdXNJMThuIGluc3RhbmNlb2YgaTE4bi5Db250YWluZXIpIHtcbiAgICAvLyBUaGUgYHByZXZpb3VzSTE4bmAgaXMgYSBgQ29udGFpbmVyYCwgd2hpY2ggbWVhbnMgdGhhdCB0aGlzIGlzIGEgc2Vjb25kIGkxOG4gZXh0cmFjdGlvbiBwYXNzXG4gICAgLy8gYWZ0ZXIgd2hpdGVzcGFjZSBoYXMgYmVlbiByZW1vdmVkIGZyb20gdGhlIEFTVCBub2Rlcy5cbiAgICBhc3NlcnRFcXVpdmFsZW50Tm9kZXMocHJldmlvdXNJMThuLmNoaWxkcmVuLCBub2Rlcyk7XG5cbiAgICAvLyBSZXVzZSB0aGUgc291cmNlLXNwYW5zIGZyb20gdGhlIGZpcnN0IHBhc3MuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbm9kZXNbaV0uc291cmNlU3BhbiA9IHByZXZpb3VzSTE4bi5jaGlsZHJlbltpXS5zb3VyY2VTcGFuO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEFzc2VydHMgdGhhdCB0aGUgYG1lc3NhZ2VgIGNvbnRhaW5zIGV4YWN0bHkgb25lIGBDb250YWluZXJgIG5vZGUuXG4gKi9cbmZ1bmN0aW9uIGFzc2VydFNpbmdsZUNvbnRhaW5lck1lc3NhZ2UobWVzc2FnZTogaTE4bi5NZXNzYWdlKTogdm9pZCB7XG4gIGNvbnN0IG5vZGVzID0gbWVzc2FnZS5ub2RlcztcbiAgaWYgKG5vZGVzLmxlbmd0aCAhPT0gMSB8fCAhKG5vZGVzWzBdIGluc3RhbmNlb2YgaTE4bi5Db250YWluZXIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVW5leHBlY3RlZCBwcmV2aW91cyBpMThuIG1lc3NhZ2UgLSBleHBlY3RlZCBpdCB0byBjb25zaXN0IG9mIG9ubHkgYSBzaW5nbGUgYENvbnRhaW5lcmAgbm9kZS4nKTtcbiAgfVxufVxuXG4vKipcbiAqIEFzc2VydHMgdGhhdCB0aGUgYHByZXZpb3VzTm9kZXNgIGFuZCBgbm9kZWAgY29sbGVjdGlvbnMgaGF2ZSB0aGUgc2FtZSBudW1iZXIgb2YgZWxlbWVudHMgYW5kXG4gKiBjb3JyZXNwb25kaW5nIGVsZW1lbnRzIGhhdmUgdGhlIHNhbWUgbm9kZSB0eXBlLlxuICovXG5mdW5jdGlvbiBhc3NlcnRFcXVpdmFsZW50Tm9kZXMocHJldmlvdXNOb2RlczogaTE4bi5Ob2RlW10sIG5vZGVzOiBpMThuLk5vZGVbXSk6IHZvaWQge1xuICBpZiAocHJldmlvdXNOb2Rlcy5sZW5ndGggIT09IG5vZGVzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIG51bWJlciBvZiBpMThuIG1lc3NhZ2UgY2hpbGRyZW4gY2hhbmdlZCBiZXR3ZWVuIGZpcnN0IGFuZCBzZWNvbmQgcGFzcy4nKTtcbiAgfVxuICBpZiAocHJldmlvdXNOb2Rlcy5zb21lKChub2RlLCBpKSA9PiBub2Rlc1tpXS5jb25zdHJ1Y3RvciAhPT0gbm9kZS5jb25zdHJ1Y3RvcikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgdHlwZXMgb2YgdGhlIGkxOG4gbWVzc2FnZSBjaGlsZHJlbiBjaGFuZ2VkIGJldHdlZW4gZmlyc3QgYW5kIHNlY29uZCBwYXNzLicpO1xuICB9XG59XG5cbmNvbnN0IF9DVVNUT01fUEhfRVhQID1cbiAgICAvXFwvXFwvW1xcc1xcU10qaTE4bltcXHNcXFNdKlxcKFtcXHNcXFNdKnBoW1xcc1xcU10qPVtcXHNcXFNdKihcInwnKShbXFxzXFxTXSo/KVxcMVtcXHNcXFNdKlxcKS9nO1xuXG5mdW5jdGlvbiBleHRyYWN0UGxhY2Vob2xkZXJOYW1lKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gaW5wdXQuc3BsaXQoX0NVU1RPTV9QSF9FWFApWzJdO1xufVxuIl19