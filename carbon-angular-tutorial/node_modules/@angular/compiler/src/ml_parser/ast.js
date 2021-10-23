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
        define("@angular/compiler/src/ml_parser/ast", ["require", "exports", "tslib", "@angular/compiler/src/ast_path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findNode = exports.RecursiveVisitor = exports.visitAll = exports.Comment = exports.Element = exports.Attribute = exports.ExpansionCase = exports.Expansion = exports.Text = exports.NodeWithI18n = void 0;
    var tslib_1 = require("tslib");
    var ast_path_1 = require("@angular/compiler/src/ast_path");
    var NodeWithI18n = /** @class */ (function () {
        function NodeWithI18n(sourceSpan, i18n) {
            this.sourceSpan = sourceSpan;
            this.i18n = i18n;
        }
        return NodeWithI18n;
    }());
    exports.NodeWithI18n = NodeWithI18n;
    var Text = /** @class */ (function (_super) {
        tslib_1.__extends(Text, _super);
        function Text(value, sourceSpan, tokens, i18n) {
            var _this = _super.call(this, sourceSpan, i18n) || this;
            _this.value = value;
            _this.tokens = tokens;
            return _this;
        }
        Text.prototype.visit = function (visitor, context) {
            return visitor.visitText(this, context);
        };
        return Text;
    }(NodeWithI18n));
    exports.Text = Text;
    var Expansion = /** @class */ (function (_super) {
        tslib_1.__extends(Expansion, _super);
        function Expansion(switchValue, type, cases, sourceSpan, switchValueSourceSpan, i18n) {
            var _this = _super.call(this, sourceSpan, i18n) || this;
            _this.switchValue = switchValue;
            _this.type = type;
            _this.cases = cases;
            _this.switchValueSourceSpan = switchValueSourceSpan;
            return _this;
        }
        Expansion.prototype.visit = function (visitor, context) {
            return visitor.visitExpansion(this, context);
        };
        return Expansion;
    }(NodeWithI18n));
    exports.Expansion = Expansion;
    var ExpansionCase = /** @class */ (function () {
        function ExpansionCase(value, expression, sourceSpan, valueSourceSpan, expSourceSpan) {
            this.value = value;
            this.expression = expression;
            this.sourceSpan = sourceSpan;
            this.valueSourceSpan = valueSourceSpan;
            this.expSourceSpan = expSourceSpan;
        }
        ExpansionCase.prototype.visit = function (visitor, context) {
            return visitor.visitExpansionCase(this, context);
        };
        return ExpansionCase;
    }());
    exports.ExpansionCase = ExpansionCase;
    var Attribute = /** @class */ (function (_super) {
        tslib_1.__extends(Attribute, _super);
        function Attribute(name, value, sourceSpan, keySpan, valueSpan, valueTokens, i18n) {
            var _this = _super.call(this, sourceSpan, i18n) || this;
            _this.name = name;
            _this.value = value;
            _this.keySpan = keySpan;
            _this.valueSpan = valueSpan;
            _this.valueTokens = valueTokens;
            return _this;
        }
        Attribute.prototype.visit = function (visitor, context) {
            return visitor.visitAttribute(this, context);
        };
        return Attribute;
    }(NodeWithI18n));
    exports.Attribute = Attribute;
    var Element = /** @class */ (function (_super) {
        tslib_1.__extends(Element, _super);
        function Element(name, attrs, children, sourceSpan, startSourceSpan, endSourceSpan, i18n) {
            if (endSourceSpan === void 0) { endSourceSpan = null; }
            var _this = _super.call(this, sourceSpan, i18n) || this;
            _this.name = name;
            _this.attrs = attrs;
            _this.children = children;
            _this.startSourceSpan = startSourceSpan;
            _this.endSourceSpan = endSourceSpan;
            return _this;
        }
        Element.prototype.visit = function (visitor, context) {
            return visitor.visitElement(this, context);
        };
        return Element;
    }(NodeWithI18n));
    exports.Element = Element;
    var Comment = /** @class */ (function () {
        function Comment(value, sourceSpan) {
            this.value = value;
            this.sourceSpan = sourceSpan;
        }
        Comment.prototype.visit = function (visitor, context) {
            return visitor.visitComment(this, context);
        };
        return Comment;
    }());
    exports.Comment = Comment;
    function visitAll(visitor, nodes, context) {
        if (context === void 0) { context = null; }
        var result = [];
        var visit = visitor.visit ?
            function (ast) { return visitor.visit(ast, context) || ast.visit(visitor, context); } :
            function (ast) { return ast.visit(visitor, context); };
        nodes.forEach(function (ast) {
            var astResult = visit(ast);
            if (astResult) {
                result.push(astResult);
            }
        });
        return result;
    }
    exports.visitAll = visitAll;
    var RecursiveVisitor = /** @class */ (function () {
        function RecursiveVisitor() {
        }
        RecursiveVisitor.prototype.visitElement = function (ast, context) {
            this.visitChildren(context, function (visit) {
                visit(ast.attrs);
                visit(ast.children);
            });
        };
        RecursiveVisitor.prototype.visitAttribute = function (ast, context) { };
        RecursiveVisitor.prototype.visitText = function (ast, context) { };
        RecursiveVisitor.prototype.visitComment = function (ast, context) { };
        RecursiveVisitor.prototype.visitExpansion = function (ast, context) {
            return this.visitChildren(context, function (visit) {
                visit(ast.cases);
            });
        };
        RecursiveVisitor.prototype.visitExpansionCase = function (ast, context) { };
        RecursiveVisitor.prototype.visitChildren = function (context, cb) {
            var results = [];
            var t = this;
            function visit(children) {
                if (children)
                    results.push(visitAll(t, children, context));
            }
            cb(visit);
            return Array.prototype.concat.apply([], results);
        };
        return RecursiveVisitor;
    }());
    exports.RecursiveVisitor = RecursiveVisitor;
    function spanOf(ast) {
        var start = ast.sourceSpan.start.offset;
        var end = ast.sourceSpan.end.offset;
        if (ast instanceof Element) {
            if (ast.endSourceSpan) {
                end = ast.endSourceSpan.end.offset;
            }
            else if (ast.children && ast.children.length) {
                end = spanOf(ast.children[ast.children.length - 1]).end;
            }
        }
        return { start: start, end: end };
    }
    function findNode(nodes, position) {
        var path = [];
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visit = function (ast, context) {
                var span = spanOf(ast);
                if (span.start <= position && position < span.end) {
                    path.push(ast);
                }
                else {
                    // Returning a value here will result in the children being skipped.
                    return true;
                }
            };
            return class_1;
        }(RecursiveVisitor));
        visitAll(visitor, nodes);
        return new ast_path_1.AstPath(path, position);
    }
    exports.findNode = findNode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL21sX3BhcnNlci9hc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDJEQUFvQztJQVlwQztRQUNFLHNCQUFtQixVQUEyQixFQUFTLElBQWU7WUFBbkQsZUFBVSxHQUFWLFVBQVUsQ0FBaUI7WUFBUyxTQUFJLEdBQUosSUFBSSxDQUFXO1FBQUcsQ0FBQztRQUU1RSxtQkFBQztJQUFELENBQUMsQUFIRCxJQUdDO0lBSHFCLG9DQUFZO0lBS2xDO1FBQTBCLGdDQUFZO1FBQ3BDLGNBQ1csS0FBYSxFQUFFLFVBQTJCLEVBQVMsTUFBK0IsRUFDekYsSUFBZTtZQUZuQixZQUdFLGtCQUFNLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FDeEI7WUFIVSxXQUFLLEdBQUwsS0FBSyxDQUFRO1lBQXNDLFlBQU0sR0FBTixNQUFNLENBQXlCOztRQUc3RixDQUFDO1FBQ1Esb0JBQUssR0FBZCxVQUFlLE9BQWdCLEVBQUUsT0FBWTtZQUMzQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDSCxXQUFDO0lBQUQsQ0FBQyxBQVRELENBQTBCLFlBQVksR0FTckM7SUFUWSxvQkFBSTtJQVdqQjtRQUErQixxQ0FBWTtRQUN6QyxtQkFDVyxXQUFtQixFQUFTLElBQVksRUFBUyxLQUFzQixFQUM5RSxVQUEyQixFQUFTLHFCQUFzQyxFQUFFLElBQWU7WUFGL0YsWUFHRSxrQkFBTSxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQ3hCO1lBSFUsaUJBQVcsR0FBWCxXQUFXLENBQVE7WUFBUyxVQUFJLEdBQUosSUFBSSxDQUFRO1lBQVMsV0FBSyxHQUFMLEtBQUssQ0FBaUI7WUFDMUMsMkJBQXFCLEdBQXJCLHFCQUFxQixDQUFpQjs7UUFF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QUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2FBQ3pEO1NBQ0Y7UUFDRCxPQUFPLEVBQUMsS0FBSyxPQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsU0FBZ0IsUUFBUSxDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUN0RCxJQUFNLElBQUksR0FBVyxFQUFFLENBQUM7UUFFeEIsSUFBTSxPQUFPLEdBQUc7WUFBa0IsbUNBQWdCO1lBQTlCOztZQVVwQixDQUFDO1lBVEMsdUJBQUssR0FBTCxVQUFNLEdBQVMsRUFBRSxPQUFZO2dCQUMzQixJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2hCO3FCQUFNO29CQUNMLG9FQUFvRTtvQkFDcEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUFWbUIsQ0FBYyxnQkFBZ0IsRUFVakQsQ0FBQztRQUVGLFFBQVEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekIsT0FBTyxJQUFJLGtCQUFPLENBQU8sSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFsQkQsNEJBa0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXN0UGF0aH0gZnJvbSAnLi4vYXN0X3BhdGgnO1xuaW1wb3J0IHtJMThuTWV0YX0gZnJvbSAnLi4vaTE4bi9pMThuX2FzdCc7XG5pbXBvcnQge1BhcnNlU291cmNlU3Bhbn0gZnJvbSAnLi4vcGFyc2VfdXRpbCc7XG5pbXBvcnQge0ludGVycG9sYXRlZEF0dHJpYnV0ZVRva2VuLCBJbnRlcnBvbGF0ZWRUZXh0VG9rZW59IGZyb20gJy4vdG9rZW5zJztcblxuaW50ZXJmYWNlIEJhc2VOb2RlIHtcbiAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xuICB2aXNpdCh2aXNpdG9yOiBWaXNpdG9yLCBjb250ZXh0OiBhbnkpOiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIE5vZGUgPSBBdHRyaWJ1dGV8Q29tbWVudHxFbGVtZW50fEV4cGFuc2lvbnxFeHBhbnNpb25DYXNlfFRleHQ7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOb2RlV2l0aEkxOG4gaW1wbGVtZW50cyBCYXNlTm9kZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIHB1YmxpYyBpMThuPzogSTE4bk1ldGEpIHt9XG4gIGFic3RyYWN0IHZpc2l0KHZpc2l0b3I6IFZpc2l0b3IsIGNvbnRleHQ6IGFueSk6IGFueTtcbn1cblxuZXhwb3J0IGNsYXNzIFRleHQgZXh0ZW5kcyBOb2RlV2l0aEkxOG4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyB2YWx1ZTogc3RyaW5nLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIHB1YmxpYyB0b2tlbnM6IEludGVycG9sYXRlZFRleHRUb2tlbltdLFxuICAgICAgaTE4bj86IEkxOG5NZXRhKSB7XG4gICAgc3VwZXIoc291cmNlU3BhbiwgaTE4bik7XG4gIH1cbiAgb3ZlcnJpZGUgdmlzaXQodmlzaXRvcjogVmlzaXRvciwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdmlzaXRvci52aXNpdFRleHQodGhpcywgY29udGV4dCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEV4cGFuc2lvbiBleHRlbmRzIE5vZGVXaXRoSTE4biB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHN3aXRjaFZhbHVlOiBzdHJpbmcsIHB1YmxpYyB0eXBlOiBzdHJpbmcsIHB1YmxpYyBjYXNlczogRXhwYW5zaW9uQ2FzZVtdLFxuICAgICAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuLCBwdWJsaWMgc3dpdGNoVmFsdWVTb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGkxOG4/OiBJMThuTWV0YSkge1xuICAgIHN1cGVyKHNvdXJjZVNwYW4sIGkxOG4pO1xuICB9XG4gIG92ZXJyaWRlIHZpc2l0KHZpc2l0b3I6IFZpc2l0b3IsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRFeHBhbnNpb24odGhpcywgY29udGV4dCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEV4cGFuc2lvbkNhc2UgaW1wbGVtZW50cyBCYXNlTm9kZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHZhbHVlOiBzdHJpbmcsIHB1YmxpYyBleHByZXNzaW9uOiBOb2RlW10sIHB1YmxpYyBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBwdWJsaWMgdmFsdWVTb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIHB1YmxpYyBleHBTb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pIHt9XG5cbiAgdmlzaXQodmlzaXRvcjogVmlzaXRvciwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdmlzaXRvci52aXNpdEV4cGFuc2lvbkNhc2UodGhpcywgY29udGV4dCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZSBleHRlbmRzIE5vZGVXaXRoSTE4biB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIG5hbWU6IHN0cmluZywgcHVibGljIHZhbHVlOiBzdHJpbmcsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICAgIHJlYWRvbmx5IGtleVNwYW46IFBhcnNlU291cmNlU3Bhbnx1bmRlZmluZWQsIHB1YmxpYyB2YWx1ZVNwYW46IFBhcnNlU291cmNlU3Bhbnx1bmRlZmluZWQsXG4gICAgICBwdWJsaWMgdmFsdWVUb2tlbnM6IEludGVycG9sYXRlZEF0dHJpYnV0ZVRva2VuW118dW5kZWZpbmVkLCBpMThuOiBJMThuTWV0YXx1bmRlZmluZWQpIHtcbiAgICBzdXBlcihzb3VyY2VTcGFuLCBpMThuKTtcbiAgfVxuICBvdmVycmlkZSB2aXNpdCh2aXNpdG9yOiBWaXNpdG9yLCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiB2aXNpdG9yLnZpc2l0QXR0cmlidXRlKHRoaXMsIGNvbnRleHQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFbGVtZW50IGV4dGVuZHMgTm9kZVdpdGhJMThuIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgbmFtZTogc3RyaW5nLCBwdWJsaWMgYXR0cnM6IEF0dHJpYnV0ZVtdLCBwdWJsaWMgY2hpbGRyZW46IE5vZGVbXSxcbiAgICAgIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbiwgcHVibGljIHN0YXJ0U291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgcHVibGljIGVuZFNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbnxudWxsID0gbnVsbCwgaTE4bj86IEkxOG5NZXRhKSB7XG4gICAgc3VwZXIoc291cmNlU3BhbiwgaTE4bik7XG4gIH1cbiAgb3ZlcnJpZGUgdmlzaXQodmlzaXRvcjogVmlzaXRvciwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdmlzaXRvci52aXNpdEVsZW1lbnQodGhpcywgY29udGV4dCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbW1lbnQgaW1wbGVtZW50cyBCYXNlTm9kZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB2YWx1ZTogc3RyaW5nfG51bGwsIHB1YmxpYyBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pIHt9XG4gIHZpc2l0KHZpc2l0b3I6IFZpc2l0b3IsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRDb21tZW50KHRoaXMsIGNvbnRleHQpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlzaXRvciB7XG4gIC8vIFJldHVybmluZyBhIHRydXRoeSB2YWx1ZSBmcm9tIGB2aXNpdCgpYCB3aWxsIHByZXZlbnQgYHZpc2l0QWxsKClgIGZyb20gdGhlIGNhbGwgdG8gdGhlIHR5cGVkXG4gIC8vIG1ldGhvZCBhbmQgcmVzdWx0IHJldHVybmVkIHdpbGwgYmVjb21lIHRoZSByZXN1bHQgaW5jbHVkZWQgaW4gYHZpc2l0QWxsKClgcyByZXN1bHQgYXJyYXkuXG4gIHZpc2l0Pyhub2RlOiBOb2RlLCBjb250ZXh0OiBhbnkpOiBhbnk7XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IEVsZW1lbnQsIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRBdHRyaWJ1dGUoYXR0cmlidXRlOiBBdHRyaWJ1dGUsIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRUZXh0KHRleHQ6IFRleHQsIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRDb21tZW50KGNvbW1lbnQ6IENvbW1lbnQsIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRFeHBhbnNpb24oZXhwYW5zaW9uOiBFeHBhbnNpb24sIGNvbnRleHQ6IGFueSk6IGFueTtcbiAgdmlzaXRFeHBhbnNpb25DYXNlKGV4cGFuc2lvbkNhc2U6IEV4cGFuc2lvbkNhc2UsIGNvbnRleHQ6IGFueSk6IGFueTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZpc2l0QWxsKHZpc2l0b3I6IFZpc2l0b3IsIG5vZGVzOiBOb2RlW10sIGNvbnRleHQ6IGFueSA9IG51bGwpOiBhbnlbXSB7XG4gIGNvbnN0IHJlc3VsdDogYW55W10gPSBbXTtcblxuICBjb25zdCB2aXNpdCA9IHZpc2l0b3IudmlzaXQgP1xuICAgICAgKGFzdDogTm9kZSkgPT4gdmlzaXRvci52aXNpdCEoYXN0LCBjb250ZXh0KSB8fCBhc3QudmlzaXQodmlzaXRvciwgY29udGV4dCkgOlxuICAgICAgKGFzdDogTm9kZSkgPT4gYXN0LnZpc2l0KHZpc2l0b3IsIGNvbnRleHQpO1xuICBub2Rlcy5mb3JFYWNoKGFzdCA9PiB7XG4gICAgY29uc3QgYXN0UmVzdWx0ID0gdmlzaXQoYXN0KTtcbiAgICBpZiAoYXN0UmVzdWx0KSB7XG4gICAgICByZXN1bHQucHVzaChhc3RSZXN1bHQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBjbGFzcyBSZWN1cnNpdmVWaXNpdG9yIGltcGxlbWVudHMgVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKCkge31cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICB2aXNpdChhc3QuYXR0cnMpO1xuICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICB9KTtcbiAgfVxuXG4gIHZpc2l0QXR0cmlidXRlKGFzdDogQXR0cmlidXRlLCBjb250ZXh0OiBhbnkpOiBhbnkge31cbiAgdmlzaXRUZXh0KGFzdDogVGV4dCwgY29udGV4dDogYW55KTogYW55IHt9XG4gIHZpc2l0Q29tbWVudChhc3Q6IENvbW1lbnQsIGNvbnRleHQ6IGFueSk6IGFueSB7fVxuXG4gIHZpc2l0RXhwYW5zaW9uKGFzdDogRXhwYW5zaW9uLCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgdmlzaXQoYXN0LmNhc2VzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uQ2FzZShhc3Q6IEV4cGFuc2lvbkNhc2UsIGNvbnRleHQ6IGFueSk6IGFueSB7fVxuXG4gIHByaXZhdGUgdmlzaXRDaGlsZHJlbjxUIGV4dGVuZHMgTm9kZT4oXG4gICAgICBjb250ZXh0OiBhbnksIGNiOiAodmlzaXQ6ICg8ViBleHRlbmRzIE5vZGU+KGNoaWxkcmVuOiBWW118dW5kZWZpbmVkKSA9PiB2b2lkKSkgPT4gdm9pZCkge1xuICAgIGxldCByZXN1bHRzOiBhbnlbXVtdID0gW107XG4gICAgbGV0IHQgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIHZpc2l0PFQgZXh0ZW5kcyBOb2RlPihjaGlsZHJlbjogVFtdfHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGNoaWxkcmVuKSByZXN1bHRzLnB1c2godmlzaXRBbGwodCwgY2hpbGRyZW4sIGNvbnRleHQpKTtcbiAgICB9XG4gICAgY2IodmlzaXQpO1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCByZXN1bHRzKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBIdG1sQXN0UGF0aCA9IEFzdFBhdGg8Tm9kZT47XG5cbmZ1bmN0aW9uIHNwYW5PZihhc3Q6IE5vZGUpIHtcbiAgY29uc3Qgc3RhcnQgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gIGxldCBlbmQgPSBhc3Quc291cmNlU3Bhbi5lbmQub2Zmc2V0O1xuICBpZiAoYXN0IGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgIGlmIChhc3QuZW5kU291cmNlU3Bhbikge1xuICAgICAgZW5kID0gYXN0LmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldDtcbiAgICB9IGVsc2UgaWYgKGFzdC5jaGlsZHJlbiAmJiBhc3QuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBlbmQgPSBzcGFuT2YoYXN0LmNoaWxkcmVuW2FzdC5jaGlsZHJlbi5sZW5ndGggLSAxXSkuZW5kO1xuICAgIH1cbiAgfVxuICByZXR1cm4ge3N0YXJ0LCBlbmR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZE5vZGUobm9kZXM6IE5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IEh0bWxBc3RQYXRoIHtcbiAgY29uc3QgcGF0aDogTm9kZVtdID0gW107XG5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogTm9kZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIGNvbnN0IHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgIGlmIChzcGFuLnN0YXJ0IDw9IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgc3Bhbi5lbmQpIHtcbiAgICAgICAgcGF0aC5wdXNoKGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgdmlzaXRBbGwodmlzaXRvciwgbm9kZXMpO1xuXG4gIHJldHVybiBuZXcgQXN0UGF0aDxOb2RlPihwYXRoLCBwb3NpdGlvbik7XG59XG4iXX0=