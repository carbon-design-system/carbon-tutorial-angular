(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/output/js_emitter", ["require", "exports", "tslib", "@angular/compiler/src/output/abstract_emitter", "@angular/compiler/src/output/abstract_js_emitter", "@angular/compiler/src/output/output_ast"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JavaScriptEmitter = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var abstract_emitter_1 = require("@angular/compiler/src/output/abstract_emitter");
    var abstract_js_emitter_1 = require("@angular/compiler/src/output/abstract_js_emitter");
    var o = require("@angular/compiler/src/output/output_ast");
    var JavaScriptEmitter = /** @class */ (function () {
        function JavaScriptEmitter() {
        }
        JavaScriptEmitter.prototype.emitStatements = function (genFilePath, stmts, preamble) {
            if (preamble === void 0) { preamble = ''; }
            var converter = new JsEmitterVisitor();
            var ctx = abstract_emitter_1.EmitterVisitorContext.createRoot();
            converter.visitAllStatements(stmts, ctx);
            var preambleLines = preamble ? preamble.split('\n') : [];
            converter.importsWithPrefixes.forEach(function (prefix, importedModuleName) {
                // Note: can't write the real word for import as it screws up system.js auto detection...
                preambleLines.push("var " + prefix + " = req" +
                    ("uire('" + importedModuleName + "');"));
            });
            var sm = ctx.toSourceMapGenerator(genFilePath, preambleLines.length).toJsComment();
            var lines = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(preambleLines)), [ctx.toSource(), sm]);
            if (sm) {
                // always add a newline at the end, as some tools have bugs without it.
                lines.push('');
            }
            return lines.join('\n');
        };
        return JavaScriptEmitter;
    }());
    exports.JavaScriptEmitter = JavaScriptEmitter;
    var JsEmitterVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(JsEmitterVisitor, _super);
        function JsEmitterVisitor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.importsWithPrefixes = new Map();
            return _this;
        }
        JsEmitterVisitor.prototype.visitExternalExpr = function (ast, ctx) {
            var _a = ast.value, name = _a.name, moduleName = _a.moduleName;
            if (moduleName) {
                var prefix = this.importsWithPrefixes.get(moduleName);
                if (prefix == null) {
                    prefix = "i" + this.importsWithPrefixes.size;
                    this.importsWithPrefixes.set(moduleName, prefix);
                }
                ctx.print(ast, prefix + ".");
            }
            ctx.print(ast, name);
            return null;
        };
        JsEmitterVisitor.prototype.visitDeclareVarStmt = function (stmt, ctx) {
            _super.prototype.visitDeclareVarStmt.call(this, stmt, ctx);
            if (stmt.hasModifier(o.StmtModifier.Exported)) {
                ctx.println(stmt, exportVar(stmt.name));
            }
            return null;
        };
        JsEmitterVisitor.prototype.visitDeclareFunctionStmt = function (stmt, ctx) {
            _super.prototype.visitDeclareFunctionStmt.call(this, stmt, ctx);
            if (stmt.hasModifier(o.StmtModifier.Exported)) {
                ctx.println(stmt, exportVar(stmt.name));
            }
            return null;
        };
        JsEmitterVisitor.prototype.visitDeclareClassStmt = function (stmt, ctx) {
            _super.prototype.visitDeclareClassStmt.call(this, stmt, ctx);
            if (stmt.hasModifier(o.StmtModifier.Exported)) {
                ctx.println(stmt, exportVar(stmt.name));
            }
            return null;
        };
        return JsEmitterVisitor;
    }(abstract_js_emitter_1.AbstractJsEmitterVisitor));
    function exportVar(varName) {
        return "Object.defineProperty(exports, '" + varName + "', { get: function() { return " + varName + "; }});";
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNfZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9vdXRwdXQvanNfZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsa0ZBQXdFO0lBQ3hFLHdGQUErRDtJQUMvRCwyREFBa0M7SUFFbEM7UUFBQTtRQXNCQSxDQUFDO1FBckJDLDBDQUFjLEdBQWQsVUFBZSxXQUFtQixFQUFFLEtBQW9CLEVBQUUsUUFBcUI7WUFBckIseUJBQUEsRUFBQSxhQUFxQjtZQUM3RSxJQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDekMsSUFBTSxHQUFHLEdBQUcsd0NBQXFCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDL0MsU0FBUyxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUV6QyxJQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMzRCxTQUFTLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFVBQUMsTUFBTSxFQUFFLGtCQUFrQjtnQkFDL0QseUZBQXlGO2dCQUN6RixhQUFhLENBQUMsSUFBSSxDQUNkLFNBQU8sTUFBTSxXQUFRO3FCQUNyQixXQUFTLGtCQUFrQixRQUFLLENBQUEsQ0FBQyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckYsSUFBTSxLQUFLLGtFQUFPLGFBQWEsS0FBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFDLENBQUM7WUFDckQsSUFBSSxFQUFFLEVBQUU7Z0JBQ04sdUVBQXVFO2dCQUN2RSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2hCO1lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUF0QkQsSUFzQkM7SUF0QlksOENBQWlCO0lBd0I5QjtRQUErQiw0Q0FBd0I7UUFBdkQ7WUFBQSxxRUFxQ0M7WUFwQ0MseUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7O1FBb0NsRCxDQUFDO1FBbENVLDRDQUFpQixHQUExQixVQUEyQixHQUFtQixFQUFFLEdBQTBCO1lBQ2xFLElBQUEsS0FBcUIsR0FBRyxDQUFDLEtBQUssRUFBN0IsSUFBSSxVQUFBLEVBQUUsVUFBVSxnQkFBYSxDQUFDO1lBQ3JDLElBQUksVUFBVSxFQUFFO2dCQUNkLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3RELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtvQkFDbEIsTUFBTSxHQUFHLE1BQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQU0sQ0FBQztvQkFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7aUJBQ2xEO2dCQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFLLE1BQU0sTUFBRyxDQUFDLENBQUM7YUFDOUI7WUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFLLENBQUMsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDUSw4Q0FBbUIsR0FBNUIsVUFBNkIsSUFBc0IsRUFBRSxHQUEwQjtZQUM3RSxpQkFBTSxtQkFBbUIsWUFBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzdDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN6QztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNRLG1EQUF3QixHQUFqQyxVQUFrQyxJQUEyQixFQUFFLEdBQTBCO1lBQ3ZGLGlCQUFNLHdCQUF3QixZQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDN0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ1EsZ0RBQXFCLEdBQTlCLFVBQStCLElBQWlCLEVBQUUsR0FBMEI7WUFDMUUsaUJBQU0scUJBQXFCLFlBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM3QyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDekM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFyQ0QsQ0FBK0IsOENBQXdCLEdBcUN0RDtJQUVELFNBQVMsU0FBUyxDQUFDLE9BQWU7UUFDaEMsT0FBTyxxQ0FBbUMsT0FBTyxzQ0FBaUMsT0FBTyxXQUFRLENBQUM7SUFDcEcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtFbWl0dGVyVmlzaXRvckNvbnRleHQsIE91dHB1dEVtaXR0ZXJ9IGZyb20gJy4vYWJzdHJhY3RfZW1pdHRlcic7XG5pbXBvcnQge0Fic3RyYWN0SnNFbWl0dGVyVmlzaXRvcn0gZnJvbSAnLi9hYnN0cmFjdF9qc19lbWl0dGVyJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnLi9vdXRwdXRfYXN0JztcblxuZXhwb3J0IGNsYXNzIEphdmFTY3JpcHRFbWl0dGVyIGltcGxlbWVudHMgT3V0cHV0RW1pdHRlciB7XG4gIGVtaXRTdGF0ZW1lbnRzKGdlbkZpbGVQYXRoOiBzdHJpbmcsIHN0bXRzOiBvLlN0YXRlbWVudFtdLCBwcmVhbWJsZTogc3RyaW5nID0gJycpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBKc0VtaXR0ZXJWaXNpdG9yKCk7XG4gICAgY29uc3QgY3R4ID0gRW1pdHRlclZpc2l0b3JDb250ZXh0LmNyZWF0ZVJvb3QoKTtcbiAgICBjb252ZXJ0ZXIudmlzaXRBbGxTdGF0ZW1lbnRzKHN0bXRzLCBjdHgpO1xuXG4gICAgY29uc3QgcHJlYW1ibGVMaW5lcyA9IHByZWFtYmxlID8gcHJlYW1ibGUuc3BsaXQoJ1xcbicpIDogW107XG4gICAgY29udmVydGVyLmltcG9ydHNXaXRoUHJlZml4ZXMuZm9yRWFjaCgocHJlZml4LCBpbXBvcnRlZE1vZHVsZU5hbWUpID0+IHtcbiAgICAgIC8vIE5vdGU6IGNhbid0IHdyaXRlIHRoZSByZWFsIHdvcmQgZm9yIGltcG9ydCBhcyBpdCBzY3Jld3MgdXAgc3lzdGVtLmpzIGF1dG8gZGV0ZWN0aW9uLi4uXG4gICAgICBwcmVhbWJsZUxpbmVzLnB1c2goXG4gICAgICAgICAgYHZhciAke3ByZWZpeH0gPSByZXFgICtcbiAgICAgICAgICBgdWlyZSgnJHtpbXBvcnRlZE1vZHVsZU5hbWV9Jyk7YCk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBzbSA9IGN0eC50b1NvdXJjZU1hcEdlbmVyYXRvcihnZW5GaWxlUGF0aCwgcHJlYW1ibGVMaW5lcy5sZW5ndGgpLnRvSnNDb21tZW50KCk7XG4gICAgY29uc3QgbGluZXMgPSBbLi4ucHJlYW1ibGVMaW5lcywgY3R4LnRvU291cmNlKCksIHNtXTtcbiAgICBpZiAoc20pIHtcbiAgICAgIC8vIGFsd2F5cyBhZGQgYSBuZXdsaW5lIGF0IHRoZSBlbmQsIGFzIHNvbWUgdG9vbHMgaGF2ZSBidWdzIHdpdGhvdXQgaXQuXG4gICAgICBsaW5lcy5wdXNoKCcnKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG59XG5cbmNsYXNzIEpzRW1pdHRlclZpc2l0b3IgZXh0ZW5kcyBBYnN0cmFjdEpzRW1pdHRlclZpc2l0b3Ige1xuICBpbXBvcnRzV2l0aFByZWZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBvdmVycmlkZSB2aXNpdEV4dGVybmFsRXhwcihhc3Q6IG8uRXh0ZXJuYWxFeHByLCBjdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dCk6IGFueSB7XG4gICAgY29uc3Qge25hbWUsIG1vZHVsZU5hbWV9ID0gYXN0LnZhbHVlO1xuICAgIGlmIChtb2R1bGVOYW1lKSB7XG4gICAgICBsZXQgcHJlZml4ID0gdGhpcy5pbXBvcnRzV2l0aFByZWZpeGVzLmdldChtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChwcmVmaXggPT0gbnVsbCkge1xuICAgICAgICBwcmVmaXggPSBgaSR7dGhpcy5pbXBvcnRzV2l0aFByZWZpeGVzLnNpemV9YDtcbiAgICAgICAgdGhpcy5pbXBvcnRzV2l0aFByZWZpeGVzLnNldChtb2R1bGVOYW1lLCBwcmVmaXgpO1xuICAgICAgfVxuICAgICAgY3R4LnByaW50KGFzdCwgYCR7cHJlZml4fS5gKTtcbiAgICB9XG4gICAgY3R4LnByaW50KGFzdCwgbmFtZSEpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIG92ZXJyaWRlIHZpc2l0RGVjbGFyZVZhclN0bXQoc3RtdDogby5EZWNsYXJlVmFyU3RtdCwgY3R4OiBFbWl0dGVyVmlzaXRvckNvbnRleHQpOiBhbnkge1xuICAgIHN1cGVyLnZpc2l0RGVjbGFyZVZhclN0bXQoc3RtdCwgY3R4KTtcbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihvLlN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIGN0eC5wcmludGxuKHN0bXQsIGV4cG9ydFZhcihzdG10Lm5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgb3ZlcnJpZGUgdmlzaXREZWNsYXJlRnVuY3Rpb25TdG10KHN0bXQ6IG8uRGVjbGFyZUZ1bmN0aW9uU3RtdCwgY3R4OiBFbWl0dGVyVmlzaXRvckNvbnRleHQpOiBhbnkge1xuICAgIHN1cGVyLnZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10LCBjdHgpO1xuICAgIGlmIChzdG10Lmhhc01vZGlmaWVyKG8uU3RtdE1vZGlmaWVyLkV4cG9ydGVkKSkge1xuICAgICAgY3R4LnByaW50bG4oc3RtdCwgZXhwb3J0VmFyKHN0bXQubmFtZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBvdmVycmlkZSB2aXNpdERlY2xhcmVDbGFzc1N0bXQoc3RtdDogby5DbGFzc1N0bXQsIGN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0KTogYW55IHtcbiAgICBzdXBlci52aXNpdERlY2xhcmVDbGFzc1N0bXQoc3RtdCwgY3R4KTtcbiAgICBpZiAoc3RtdC5oYXNNb2RpZmllcihvLlN0bXRNb2RpZmllci5FeHBvcnRlZCkpIHtcbiAgICAgIGN0eC5wcmludGxuKHN0bXQsIGV4cG9ydFZhcihzdG10Lm5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXhwb3J0VmFyKHZhck5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICcke3Zhck5hbWV9JywgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gJHt2YXJOYW1lfTsgfX0pO2A7XG59XG4iXX0=