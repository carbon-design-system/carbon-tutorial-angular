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
        define("@angular/compiler/src/ml_parser/icu_ast_expander", ["require", "exports", "tslib", "@angular/compiler/src/parse_util", "@angular/compiler/src/ml_parser/ast"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExpansionError = exports.ExpansionResult = exports.expandNodes = void 0;
    var tslib_1 = require("tslib");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var html = require("@angular/compiler/src/ml_parser/ast");
    // http://cldr.unicode.org/index/cldr-spec/plural-rules
    var PLURAL_CASES = ['zero', 'one', 'two', 'few', 'many', 'other'];
    /**
     * Expands special forms into elements.
     *
     * For example,
     *
     * ```
     * { messages.length, plural,
     *   =0 {zero}
     *   =1 {one}
     *   other {more than one}
     * }
     * ```
     *
     * will be expanded into
     *
     * ```
     * <ng-container [ngPlural]="messages.length">
     *   <ng-template ngPluralCase="=0">zero</ng-template>
     *   <ng-template ngPluralCase="=1">one</ng-template>
     *   <ng-template ngPluralCase="other">more than one</ng-template>
     * </ng-container>
     * ```
     */
    function expandNodes(nodes) {
        var expander = new _Expander();
        return new ExpansionResult(html.visitAll(expander, nodes), expander.isExpanded, expander.errors);
    }
    exports.expandNodes = expandNodes;
    var ExpansionResult = /** @class */ (function () {
        function ExpansionResult(nodes, expanded, errors) {
            this.nodes = nodes;
            this.expanded = expanded;
            this.errors = errors;
        }
        return ExpansionResult;
    }());
    exports.ExpansionResult = ExpansionResult;
    var ExpansionError = /** @class */ (function (_super) {
        tslib_1.__extends(ExpansionError, _super);
        function ExpansionError(span, errorMsg) {
            return _super.call(this, span, errorMsg) || this;
        }
        return ExpansionError;
    }(parse_util_1.ParseError));
    exports.ExpansionError = ExpansionError;
    /**
     * Expand expansion forms (plural, select) to directives
     *
     * @internal
     */
    var _Expander = /** @class */ (function () {
        function _Expander() {
            this.isExpanded = false;
            this.errors = [];
        }
        _Expander.prototype.visitElement = function (element, context) {
            return new html.Element(element.name, element.attrs, html.visitAll(this, element.children), element.sourceSpan, element.startSourceSpan, element.endSourceSpan);
        };
        _Expander.prototype.visitAttribute = function (attribute, context) {
            return attribute;
        };
        _Expander.prototype.visitText = function (text, context) {
            return text;
        };
        _Expander.prototype.visitComment = function (comment, context) {
            return comment;
        };
        _Expander.prototype.visitExpansion = function (icu, context) {
            this.isExpanded = true;
            return icu.type === 'plural' ? _expandPluralForm(icu, this.errors) :
                _expandDefaultForm(icu, this.errors);
        };
        _Expander.prototype.visitExpansionCase = function (icuCase, context) {
            throw new Error('Should not be reached');
        };
        return _Expander;
    }());
    // Plural forms are expanded to `NgPlural` and `NgPluralCase`s
    function _expandPluralForm(ast, errors) {
        var children = ast.cases.map(function (c) {
            if (PLURAL_CASES.indexOf(c.value) === -1 && !c.value.match(/^=\d+$/)) {
                errors.push(new ExpansionError(c.valueSourceSpan, "Plural cases should be \"=<number>\" or one of " + PLURAL_CASES.join(', ')));
            }
            var expansionResult = expandNodes(c.expression);
            errors.push.apply(errors, tslib_1.__spreadArray([], tslib_1.__read(expansionResult.errors)));
            return new html.Element("ng-template", [new html.Attribute('ngPluralCase', "" + c.value, c.valueSourceSpan, undefined /* keySpan */, undefined /* valueSpan */, undefined /* valueTokens */, undefined /* i18n */)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
        });
        var switchAttr = new html.Attribute('[ngPlural]', ast.switchValue, ast.switchValueSourceSpan, undefined /* keySpan */, undefined /* valueSpan */, undefined /* valueTokens */, undefined /* i18n */);
        return new html.Element('ng-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
    }
    // ICU messages (excluding plural form) are expanded to `NgSwitch`  and `NgSwitchCase`s
    function _expandDefaultForm(ast, errors) {
        var children = ast.cases.map(function (c) {
            var expansionResult = expandNodes(c.expression);
            errors.push.apply(errors, tslib_1.__spreadArray([], tslib_1.__read(expansionResult.errors)));
            if (c.value === 'other') {
                // other is the default case when no values match
                return new html.Element("ng-template", [new html.Attribute('ngSwitchDefault', '', c.valueSourceSpan, undefined /* keySpan */, undefined /* valueSpan */, undefined /* valueTokens */, undefined /* i18n */)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
            }
            return new html.Element("ng-template", [new html.Attribute('ngSwitchCase', "" + c.value, c.valueSourceSpan, undefined /* keySpan */, undefined /* valueSpan */, undefined /* valueTokens */, undefined /* i18n */)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
        });
        var switchAttr = new html.Attribute('[ngSwitch]', ast.switchValue, ast.switchValueSourceSpan, undefined /* keySpan */, undefined /* valueSpan */, undefined /* valueTokens */, undefined /* i18n */);
        return new html.Element('ng-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWN1X2FzdF9leHBhbmRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9tbF9wYXJzZXIvaWN1X2FzdF9leHBhbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0RBQTBEO0lBRTFELDBEQUE4QjtJQUU5Qix1REFBdUQ7SUFDdkQsSUFBTSxZQUFZLEdBQWEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTlFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bc0JHO0lBQ0gsU0FBZ0IsV0FBVyxDQUFDLEtBQWtCO1FBQzVDLElBQU0sUUFBUSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRyxDQUFDO0lBSEQsa0NBR0M7SUFFRDtRQUNFLHlCQUFtQixLQUFrQixFQUFTLFFBQWlCLEVBQVMsTUFBb0I7WUFBekUsVUFBSyxHQUFMLEtBQUssQ0FBYTtZQUFTLGFBQVEsR0FBUixRQUFRLENBQVM7WUFBUyxXQUFNLEdBQU4sTUFBTSxDQUFjO1FBQUcsQ0FBQztRQUNsRyxzQkFBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRlksMENBQWU7SUFJNUI7UUFBb0MsMENBQVU7UUFDNUMsd0JBQVksSUFBcUIsRUFBRSxRQUFnQjttQkFDakQsa0JBQU0sSUFBSSxFQUFFLFFBQVEsQ0FBQztRQUN2QixDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBb0MsdUJBQVUsR0FJN0M7SUFKWSx3Q0FBYztJQU0zQjs7OztPQUlHO0lB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QUUsS0FBRyxDQUFDLENBQUMsS0FBTyxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFDeEUsU0FBUyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQ2xGLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztRQUNILElBQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FDakMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQ2pGLFNBQVMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRixPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FDbkIsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BhcnNlRXJyb3IsIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnLi4vcGFyc2VfdXRpbCc7XG5cbmltcG9ydCAqIGFzIGh0bWwgZnJvbSAnLi9hc3QnO1xuXG4vLyBodHRwOi8vY2xkci51bmljb2RlLm9yZy9pbmRleC9jbGRyLXNwZWMvcGx1cmFsLXJ1bGVzXG5jb25zdCBQTFVSQUxfQ0FTRVM6IHN0cmluZ1tdID0gWyd6ZXJvJywgJ29uZScsICd0d28nLCAnZmV3JywgJ21hbnknLCAnb3RoZXInXTtcblxuLyoqXG4gKiBFeHBhbmRzIHNwZWNpYWwgZm9ybXMgaW50byBlbGVtZW50cy5cbiAqXG4gKiBGb3IgZXhhbXBsZSxcbiAqXG4gKiBgYGBcbiAqIHsgbWVzc2FnZXMubGVuZ3RoLCBwbHVyYWwsXG4gKiAgID0wIHt6ZXJvfVxuICogICA9MSB7b25lfVxuICogICBvdGhlciB7bW9yZSB0aGFuIG9uZX1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIHdpbGwgYmUgZXhwYW5kZWQgaW50b1xuICpcbiAqIGBgYFxuICogPG5nLWNvbnRhaW5lciBbbmdQbHVyYWxdPVwibWVzc2FnZXMubGVuZ3RoXCI+XG4gKiAgIDxuZy10ZW1wbGF0ZSBuZ1BsdXJhbENhc2U9XCI9MFwiPnplcm88L25nLXRlbXBsYXRlPlxuICogICA8bmctdGVtcGxhdGUgbmdQbHVyYWxDYXNlPVwiPTFcIj5vbmU8L25nLXRlbXBsYXRlPlxuICogICA8bmctdGVtcGxhdGUgbmdQbHVyYWxDYXNlPVwib3RoZXJcIj5tb3JlIHRoYW4gb25lPC9uZy10ZW1wbGF0ZT5cbiAqIDwvbmctY29udGFpbmVyPlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHBhbmROb2Rlcyhub2RlczogaHRtbC5Ob2RlW10pOiBFeHBhbnNpb25SZXN1bHQge1xuICBjb25zdCBleHBhbmRlciA9IG5ldyBfRXhwYW5kZXIoKTtcbiAgcmV0dXJuIG5ldyBFeHBhbnNpb25SZXN1bHQoaHRtbC52aXNpdEFsbChleHBhbmRlciwgbm9kZXMpLCBleHBhbmRlci5pc0V4cGFuZGVkLCBleHBhbmRlci5lcnJvcnMpO1xufVxuXG5leHBvcnQgY2xhc3MgRXhwYW5zaW9uUmVzdWx0IHtcbiAgY29uc3RydWN0b3IocHVibGljIG5vZGVzOiBodG1sLk5vZGVbXSwgcHVibGljIGV4cGFuZGVkOiBib29sZWFuLCBwdWJsaWMgZXJyb3JzOiBQYXJzZUVycm9yW10pIHt9XG59XG5cbmV4cG9ydCBjbGFzcyBFeHBhbnNpb25FcnJvciBleHRlbmRzIFBhcnNlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihzcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGVycm9yTXNnOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzcGFuLCBlcnJvck1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBhbmQgZXhwYW5zaW9uIGZvcm1zIChwbHVyYWwsIHNlbGVjdCkgdG8gZGlyZWN0aXZlc1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jbGFzcyBfRXhwYW5kZXIgaW1wbGVtZW50cyBodG1sLlZpc2l0b3Ige1xuICBpc0V4cGFuZGVkOiBib29sZWFuID0gZmFsc2U7XG4gIGVycm9yczogUGFyc2VFcnJvcltdID0gW107XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IGh0bWwuRWxlbWVudCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbmV3IGh0bWwuRWxlbWVudChcbiAgICAgICAgZWxlbWVudC5uYW1lLCBlbGVtZW50LmF0dHJzLCBodG1sLnZpc2l0QWxsKHRoaXMsIGVsZW1lbnQuY2hpbGRyZW4pLCBlbGVtZW50LnNvdXJjZVNwYW4sXG4gICAgICAgIGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuLCBlbGVtZW50LmVuZFNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRBdHRyaWJ1dGUoYXR0cmlidXRlOiBodG1sLkF0dHJpYnV0ZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gYXR0cmlidXRlO1xuICB9XG5cbiAgdmlzaXRUZXh0KHRleHQ6IGh0bWwuVGV4dCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuXG4gIHZpc2l0Q29tbWVudChjb21tZW50OiBodG1sLkNvbW1lbnQsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGNvbW1lbnQ7XG4gIH1cblxuICB2aXNpdEV4cGFuc2lvbihpY3U6IGh0bWwuRXhwYW5zaW9uLCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHRoaXMuaXNFeHBhbmRlZCA9IHRydWU7XG4gICAgcmV0dXJuIGljdS50eXBlID09PSAncGx1cmFsJyA/IF9leHBhbmRQbHVyYWxGb3JtKGljdSwgdGhpcy5lcnJvcnMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2V4cGFuZERlZmF1bHRGb3JtKGljdSwgdGhpcy5lcnJvcnMpO1xuICB9XG5cbiAgdmlzaXRFeHBhbnNpb25DYXNlKGljdUNhc2U6IGh0bWwuRXhwYW5zaW9uQ2FzZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nob3VsZCBub3QgYmUgcmVhY2hlZCcpO1xuICB9XG59XG5cbi8vIFBsdXJhbCBmb3JtcyBhcmUgZXhwYW5kZWQgdG8gYE5nUGx1cmFsYCBhbmQgYE5nUGx1cmFsQ2FzZWBzXG5mdW5jdGlvbiBfZXhwYW5kUGx1cmFsRm9ybShhc3Q6IGh0bWwuRXhwYW5zaW9uLCBlcnJvcnM6IFBhcnNlRXJyb3JbXSk6IGh0bWwuRWxlbWVudCB7XG4gIGNvbnN0IGNoaWxkcmVuID0gYXN0LmNhc2VzLm1hcChjID0+IHtcbiAgICBpZiAoUExVUkFMX0NBU0VTLmluZGV4T2YoYy52YWx1ZSkgPT09IC0xICYmICFjLnZhbHVlLm1hdGNoKC9ePVxcZCskLykpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBFeHBhbnNpb25FcnJvcihcbiAgICAgICAgICBjLnZhbHVlU291cmNlU3BhbixcbiAgICAgICAgICBgUGx1cmFsIGNhc2VzIHNob3VsZCBiZSBcIj08bnVtYmVyPlwiIG9yIG9uZSBvZiAke1BMVVJBTF9DQVNFUy5qb2luKCcsICcpfWApKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBhbnNpb25SZXN1bHQgPSBleHBhbmROb2RlcyhjLmV4cHJlc3Npb24pO1xuICAgIGVycm9ycy5wdXNoKC4uLmV4cGFuc2lvblJlc3VsdC5lcnJvcnMpO1xuXG4gICAgcmV0dXJuIG5ldyBodG1sLkVsZW1lbnQoXG4gICAgICAgIGBuZy10ZW1wbGF0ZWAsXG4gICAgICAgIFtuZXcgaHRtbC5BdHRyaWJ1dGUoXG4gICAgICAgICAgICAnbmdQbHVyYWxDYXNlJywgYCR7Yy52YWx1ZX1gLCBjLnZhbHVlU291cmNlU3BhbiwgdW5kZWZpbmVkIC8qIGtleVNwYW4gKi8sXG4gICAgICAgICAgICB1bmRlZmluZWQgLyogdmFsdWVTcGFuICovLCB1bmRlZmluZWQgLyogdmFsdWVUb2tlbnMgKi8sIHVuZGVmaW5lZCAvKiBpMThuICovKV0sXG4gICAgICAgIGV4cGFuc2lvblJlc3VsdC5ub2RlcywgYy5zb3VyY2VTcGFuLCBjLnNvdXJjZVNwYW4sIGMuc291cmNlU3Bhbik7XG4gIH0pO1xuICBjb25zdCBzd2l0Y2hBdHRyID0gbmV3IGh0bWwuQXR0cmlidXRlKFxuICAgICAgJ1tuZ1BsdXJhbF0nLCBhc3Quc3dpdGNoVmFsdWUsIGFzdC5zd2l0Y2hWYWx1ZVNvdXJjZVNwYW4sIHVuZGVmaW5lZCAvKiBrZXlTcGFuICovLFxuICAgICAgdW5kZWZpbmVkIC8qIHZhbHVlU3BhbiAqLywgdW5kZWZpbmVkIC8qIHZhbHVlVG9rZW5zICovLCB1bmRlZmluZWQgLyogaTE4biAqLyk7XG4gIHJldHVybiBuZXcgaHRtbC5FbGVtZW50KFxuICAgICAgJ25nLWNvbnRhaW5lcicsIFtzd2l0Y2hBdHRyXSwgY2hpbGRyZW4sIGFzdC5zb3VyY2VTcGFuLCBhc3Quc291cmNlU3BhbiwgYXN0LnNvdXJjZVNwYW4pO1xufVxuXG4vLyBJQ1UgbWVzc2FnZXMgKGV4Y2x1ZGluZyBwbHVyYWwgZm9ybSkgYXJlIGV4cGFuZGVkIHRvIGBOZ1N3aXRjaGAgIGFuZCBgTmdTd2l0Y2hDYXNlYHNcbmZ1bmN0aW9uIF9leHBhbmREZWZhdWx0Rm9ybShhc3Q6IGh0bWwuRXhwYW5zaW9uLCBlcnJvcnM6IFBhcnNlRXJyb3JbXSk6IGh0bWwuRWxlbWVudCB7XG4gIGNvbnN0IGNoaWxkcmVuID0gYXN0LmNhc2VzLm1hcChjID0+IHtcbiAgICBjb25zdCBleHBhbnNpb25SZXN1bHQgPSBleHBhbmROb2RlcyhjLmV4cHJlc3Npb24pO1xuICAgIGVycm9ycy5wdXNoKC4uLmV4cGFuc2lvblJlc3VsdC5lcnJvcnMpO1xuXG4gICAgaWYgKGMudmFsdWUgPT09ICdvdGhlcicpIHtcbiAgICAgIC8vIG90aGVyIGlzIHRoZSBkZWZhdWx0IGNhc2Ugd2hlbiBubyB2YWx1ZXMgbWF0Y2hcbiAgICAgIHJldHVybiBuZXcgaHRtbC5FbGVtZW50KFxuICAgICAgICAgIGBuZy10ZW1wbGF0ZWAsXG4gICAgICAgICAgW25ldyBodG1sLkF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgJ25nU3dpdGNoRGVmYXVsdCcsICcnLCBjLnZhbHVlU291cmNlU3BhbiwgdW5kZWZpbmVkIC8qIGtleVNwYW4gKi8sXG4gICAgICAgICAgICAgIHVuZGVmaW5lZCAvKiB2YWx1ZVNwYW4gKi8sIHVuZGVmaW5lZCAvKiB2YWx1ZVRva2VucyAqLywgdW5kZWZpbmVkIC8qIGkxOG4gKi8pXSxcbiAgICAgICAgICBleHBhbnNpb25SZXN1bHQubm9kZXMsIGMuc291cmNlU3BhbiwgYy5zb3VyY2VTcGFuLCBjLnNvdXJjZVNwYW4pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgaHRtbC5FbGVtZW50KFxuICAgICAgICBgbmctdGVtcGxhdGVgLFxuICAgICAgICBbbmV3IGh0bWwuQXR0cmlidXRlKFxuICAgICAgICAgICAgJ25nU3dpdGNoQ2FzZScsIGAke2MudmFsdWV9YCwgYy52YWx1ZVNvdXJjZVNwYW4sIHVuZGVmaW5lZCAvKiBrZXlTcGFuICovLFxuICAgICAgICAgICAgdW5kZWZpbmVkIC8qIHZhbHVlU3BhbiAqLywgdW5kZWZpbmVkIC8qIHZhbHVlVG9rZW5zICovLCB1bmRlZmluZWQgLyogaTE4biAqLyldLFxuICAgICAgICBleHBhbnNpb25SZXN1bHQubm9kZXMsIGMuc291cmNlU3BhbiwgYy5zb3VyY2VTcGFuLCBjLnNvdXJjZVNwYW4pO1xuICB9KTtcbiAgY29uc3Qgc3dpdGNoQXR0ciA9IG5ldyBodG1sLkF0dHJpYnV0ZShcbiAgICAgICdbbmdTd2l0Y2hdJywgYXN0LnN3aXRjaFZhbHVlLCBhc3Quc3dpdGNoVmFsdWVTb3VyY2VTcGFuLCB1bmRlZmluZWQgLyoga2V5U3BhbiAqLyxcbiAgICAgIHVuZGVmaW5lZCAvKiB2YWx1ZVNwYW4gKi8sIHVuZGVmaW5lZCAvKiB2YWx1ZVRva2VucyAqLywgdW5kZWZpbmVkIC8qIGkxOG4gKi8pO1xuICByZXR1cm4gbmV3IGh0bWwuRWxlbWVudChcbiAgICAgICduZy1jb250YWluZXInLCBbc3dpdGNoQXR0cl0sIGNoaWxkcmVuLCBhc3Quc291cmNlU3BhbiwgYXN0LnNvdXJjZVNwYW4sIGFzdC5zb3VyY2VTcGFuKTtcbn1cbiJdfQ==