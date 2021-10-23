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
        define("@angular/compiler/src/style_compiler", ["require", "exports", "@angular/compiler/src/compile_metadata", "@angular/compiler/src/core", "@angular/compiler/src/output/output_ast", "@angular/compiler/src/parse_util", "@angular/compiler/src/shadow_css"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StyleCompiler = exports.CompiledStylesheet = exports.StylesCompileDependency = exports.CONTENT_ATTR = exports.HOST_ATTR = void 0;
    var compile_metadata_1 = require("@angular/compiler/src/compile_metadata");
    var core_1 = require("@angular/compiler/src/core");
    var o = require("@angular/compiler/src/output/output_ast");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var shadow_css_1 = require("@angular/compiler/src/shadow_css");
    var COMPONENT_VARIABLE = '%COMP%';
    exports.HOST_ATTR = "_nghost-" + COMPONENT_VARIABLE;
    exports.CONTENT_ATTR = "_ngcontent-" + COMPONENT_VARIABLE;
    var StylesCompileDependency = /** @class */ (function () {
        function StylesCompileDependency(name, moduleUrl, setValue) {
            this.name = name;
            this.moduleUrl = moduleUrl;
            this.setValue = setValue;
        }
        return StylesCompileDependency;
    }());
    exports.StylesCompileDependency = StylesCompileDependency;
    var CompiledStylesheet = /** @class */ (function () {
        function CompiledStylesheet(outputCtx, stylesVar, dependencies, isShimmed, meta) {
            this.outputCtx = outputCtx;
            this.stylesVar = stylesVar;
            this.dependencies = dependencies;
            this.isShimmed = isShimmed;
            this.meta = meta;
        }
        return CompiledStylesheet;
    }());
    exports.CompiledStylesheet = CompiledStylesheet;
    var StyleCompiler = /** @class */ (function () {
        function StyleCompiler(_urlResolver) {
            this._urlResolver = _urlResolver;
            this._shadowCss = new shadow_css_1.ShadowCss();
        }
        StyleCompiler.prototype.compileComponent = function (outputCtx, comp) {
            var template = comp.template;
            return this._compileStyles(outputCtx, comp, new compile_metadata_1.CompileStylesheetMetadata({
                styles: template.styles,
                styleUrls: template.styleUrls,
                moduleUrl: parse_util_1.identifierModuleUrl(comp.type)
            }), this.needsStyleShim(comp), true);
        };
        StyleCompiler.prototype.compileStyles = function (outputCtx, comp, stylesheet, shim) {
            if (shim === void 0) { shim = this.needsStyleShim(comp); }
            return this._compileStyles(outputCtx, comp, stylesheet, shim, false);
        };
        StyleCompiler.prototype.needsStyleShim = function (comp) {
            return comp.template.encapsulation === core_1.ViewEncapsulation.Emulated;
        };
        StyleCompiler.prototype._compileStyles = function (outputCtx, comp, stylesheet, shim, isComponentStylesheet) {
            var _this = this;
            var styleExpressions = stylesheet.styles.map(function (plainStyle) { return o.literal(_this._shimIfNeeded(plainStyle, shim)); });
            var dependencies = [];
            stylesheet.styleUrls.forEach(function (styleUrl) {
                var exprIndex = styleExpressions.length;
                // Note: This placeholder will be filled later.
                styleExpressions.push(null);
                dependencies.push(new StylesCompileDependency(getStylesVarName(null), styleUrl, function (value) { return styleExpressions[exprIndex] = outputCtx.importExpr(value); }));
            });
            // styles variable contains plain strings and arrays of other styles arrays (recursive),
            // so we set its type to dynamic.
            var stylesVar = getStylesVarName(isComponentStylesheet ? comp : null);
            var stmt = o.variable(stylesVar)
                .set(o.literalArr(styleExpressions, new o.ArrayType(o.DYNAMIC_TYPE, [o.TypeModifier.Const])))
                .toDeclStmt(null, isComponentStylesheet ? [o.StmtModifier.Final] : [
                o.StmtModifier.Final, o.StmtModifier.Exported
            ]);
            outputCtx.statements.push(stmt);
            return new CompiledStylesheet(outputCtx, stylesVar, dependencies, shim, stylesheet);
        };
        StyleCompiler.prototype._shimIfNeeded = function (style, shim) {
            return shim ? this._shadowCss.shimCssText(style, exports.CONTENT_ATTR, exports.HOST_ATTR) : style;
        };
        return StyleCompiler;
    }());
    exports.StyleCompiler = StyleCompiler;
    function getStylesVarName(component) {
        var result = "styles";
        if (component) {
            result += "_" + parse_util_1.identifierName(component.type);
        }
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVfY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvc3R5bGVfY29tcGlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQXVGO0lBRXZGLG1EQUF5QztJQUN6QywyREFBeUM7SUFDekMsK0RBQWlFO0lBQ2pFLCtEQUF1QztJQUd2QyxJQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQztJQUN2QixRQUFBLFNBQVMsR0FBRyxhQUFXLGtCQUFvQixDQUFDO0lBQzVDLFFBQUEsWUFBWSxHQUFHLGdCQUFjLGtCQUFvQixDQUFDO0lBRS9EO1FBQ0UsaUNBQ1csSUFBWSxFQUFTLFNBQWlCLEVBQVMsUUFBOEI7WUFBN0UsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUFTLGNBQVMsR0FBVCxTQUFTLENBQVE7WUFBUyxhQUFRLEdBQVIsUUFBUSxDQUFzQjtRQUFHLENBQUM7UUFDOUYsOEJBQUM7SUFBRCxDQUFDLEFBSEQsSUFHQztJQUhZLDBEQUF1QjtJQUtwQztRQUNFLDRCQUNXLFNBQXdCLEVBQVMsU0FBaUIsRUFDbEQsWUFBdUMsRUFBUyxTQUFrQixFQUNsRSxJQUErQjtZQUYvQixjQUFTLEdBQVQsU0FBUyxDQUFlO1lBQVMsY0FBUyxHQUFULFNBQVMsQ0FBUTtZQUNsRCxpQkFBWSxHQUFaLFlBQVksQ0FBMkI7WUFBUyxjQUFTLEdBQVQsU0FBUyxDQUFTO1lBQ2xFLFNBQUksR0FBSixJQUFJLENBQTJCO1FBQUcsQ0FBQztRQUNoRCx5QkFBQztJQUFELENBQUMsQUFMRCxJQUtDO0lBTFksZ0RBQWtCO0lBTy9CO1FBR0UsdUJBQW9CLFlBQXlCO1lBQXpCLGlCQUFZLEdBQVosWUFBWSxDQUFhO1lBRnJDLGVBQVUsR0FBYyxJQUFJLHNCQUFTLEVBQUUsQ0FBQztRQUVBLENBQUM7UUFFakQsd0NBQWdCLEdBQWhCLFVB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QUMsQ0FBQztZQUNoQyxPQUFPLElBQUksa0JBQWtCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFTyxxQ0FBYSxHQUFyQixVQUFzQixLQUFhLEVBQUUsSUFBYTtZQUNoRCxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLG9CQUFZLEVBQUUsaUJBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDcEYsQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQTFEWSxzQ0FBYTtJQTREMUIsU0FBUyxnQkFBZ0IsQ0FBQyxTQUF3QztRQUNoRSxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDdEIsSUFBSSxTQUFTLEVBQUU7WUFDYixNQUFNLElBQUksTUFBSSwyQkFBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUcsQ0FBQztTQUNoRDtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsIENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGF9IGZyb20gJy4vY29tcGlsZV9tZXRhZGF0YSc7XG5pbXBvcnQge091dHB1dENvbnRleHR9IGZyb20gJy4vY29uc3RhbnRfcG9vbCc7XG5pbXBvcnQge1ZpZXdFbmNhcHN1bGF0aW9ufSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0ICogYXMgbyBmcm9tICcuL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7aWRlbnRpZmllck1vZHVsZVVybCwgaWRlbnRpZmllck5hbWV9IGZyb20gJy4vcGFyc2VfdXRpbCc7XG5pbXBvcnQge1NoYWRvd0Nzc30gZnJvbSAnLi9zaGFkb3dfY3NzJztcbmltcG9ydCB7VXJsUmVzb2x2ZXJ9IGZyb20gJy4vdXJsX3Jlc29sdmVyJztcblxuY29uc3QgQ09NUE9ORU5UX1ZBUklBQkxFID0gJyVDT01QJSc7XG5leHBvcnQgY29uc3QgSE9TVF9BVFRSID0gYF9uZ2hvc3QtJHtDT01QT05FTlRfVkFSSUFCTEV9YDtcbmV4cG9ydCBjb25zdCBDT05URU5UX0FUVFIgPSBgX25nY29udGVudC0ke0NPTVBPTkVOVF9WQVJJQUJMRX1gO1xuXG5leHBvcnQgY2xhc3MgU3R5bGVzQ29tcGlsZURlcGVuZGVuY3kge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcsIHB1YmxpYyBtb2R1bGVVcmw6IHN0cmluZywgcHVibGljIHNldFZhbHVlOiAodmFsdWU6IGFueSkgPT4gdm9pZCkge31cbn1cblxuZXhwb3J0IGNsYXNzIENvbXBpbGVkU3R5bGVzaGVldCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIG91dHB1dEN0eDogT3V0cHV0Q29udGV4dCwgcHVibGljIHN0eWxlc1Zhcjogc3RyaW5nLFxuICAgICAgcHVibGljIGRlcGVuZGVuY2llczogU3R5bGVzQ29tcGlsZURlcGVuZGVuY3lbXSwgcHVibGljIGlzU2hpbW1lZDogYm9vbGVhbixcbiAgICAgIHB1YmxpYyBtZXRhOiBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhKSB7fVxufVxuXG5leHBvcnQgY2xhc3MgU3R5bGVDb21waWxlciB7XG4gIHByaXZhdGUgX3NoYWRvd0NzczogU2hhZG93Q3NzID0gbmV3IFNoYWRvd0NzcygpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX3VybFJlc29sdmVyOiBVcmxSZXNvbHZlcikge31cblxuICBjb21waWxlQ29tcG9uZW50KG91dHB1dEN0eDogT3V0cHV0Q29udGV4dCwgY29tcDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhKTogQ29tcGlsZWRTdHlsZXNoZWV0IHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGNvbXAudGVtcGxhdGUgITtcbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZVN0eWxlcyhcbiAgICAgICAgb3V0cHV0Q3R4LCBjb21wLCBuZXcgQ29tcGlsZVN0eWxlc2hlZXRNZXRhZGF0YSh7XG4gICAgICAgICAgc3R5bGVzOiB0ZW1wbGF0ZS5zdHlsZXMsXG4gICAgICAgICAgc3R5bGVVcmxzOiB0ZW1wbGF0ZS5zdHlsZVVybHMsXG4gICAgICAgICAgbW9kdWxlVXJsOiBpZGVudGlmaWVyTW9kdWxlVXJsKGNvbXAudHlwZSlcbiAgICAgICAgfSksXG4gICAgICAgIHRoaXMubmVlZHNTdHlsZVNoaW0oY29tcCksIHRydWUpO1xuICB9XG5cbiAgY29tcGlsZVN0eWxlcyhcbiAgICAgIG91dHB1dEN0eDogT3V0cHV0Q29udGV4dCwgY29tcDogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICAgICAgc3R5bGVzaGVldDogQ29tcGlsZVN0eWxlc2hlZXRNZXRhZGF0YSxcbiAgICAgIHNoaW06IGJvb2xlYW4gPSB0aGlzLm5lZWRzU3R5bGVTaGltKGNvbXApKTogQ29tcGlsZWRTdHlsZXNoZWV0IHtcbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZVN0eWxlcyhvdXRwdXRDdHgsIGNvbXAsIHN0eWxlc2hlZXQsIHNoaW0sIGZhbHNlKTtcbiAgfVxuXG4gIG5lZWRzU3R5bGVTaGltKGNvbXA6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjb21wLnRlbXBsYXRlICEuZW5jYXBzdWxhdGlvbiA9PT0gVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9jb21waWxlU3R5bGVzKFxuICAgICAgb3V0cHV0Q3R4OiBPdXRwdXRDb250ZXh0LCBjb21wOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsXG4gICAgICBzdHlsZXNoZWV0OiBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhLCBzaGltOiBib29sZWFuLFxuICAgICAgaXNDb21wb25lbnRTdHlsZXNoZWV0OiBib29sZWFuKTogQ29tcGlsZWRTdHlsZXNoZWV0IHtcbiAgICBjb25zdCBzdHlsZUV4cHJlc3Npb25zOiBvLkV4cHJlc3Npb25bXSA9XG4gICAgICAgIHN0eWxlc2hlZXQuc3R5bGVzLm1hcChwbGFpblN0eWxlID0+IG8ubGl0ZXJhbCh0aGlzLl9zaGltSWZOZWVkZWQocGxhaW5TdHlsZSwgc2hpbSkpKTtcbiAgICBjb25zdCBkZXBlbmRlbmNpZXM6IFN0eWxlc0NvbXBpbGVEZXBlbmRlbmN5W10gPSBbXTtcbiAgICBzdHlsZXNoZWV0LnN0eWxlVXJscy5mb3JFYWNoKChzdHlsZVVybCkgPT4ge1xuICAgICAgY29uc3QgZXhwckluZGV4ID0gc3R5bGVFeHByZXNzaW9ucy5sZW5ndGg7XG4gICAgICAvLyBOb3RlOiBUaGlzIHBsYWNlaG9sZGVyIHdpbGwgYmUgZmlsbGVkIGxhdGVyLlxuICAgICAgc3R5bGVFeHByZXNzaW9ucy5wdXNoKG51bGwhKTtcbiAgICAgIGRlcGVuZGVuY2llcy5wdXNoKG5ldyBTdHlsZXNDb21waWxlRGVwZW5kZW5jeShcbiAgICAgICAgICBnZXRTdHlsZXNWYXJOYW1lKG51bGwpLCBzdHlsZVVybCxcbiAgICAgICAgICAodmFsdWUpID0+IHN0eWxlRXhwcmVzc2lvbnNbZXhwckluZGV4XSA9IG91dHB1dEN0eC5pbXBvcnRFeHByKHZhbHVlKSkpO1xuICAgIH0pO1xuICAgIC8vIHN0eWxlcyB2YXJpYWJsZSBjb250YWlucyBwbGFpbiBzdHJpbmdzIGFuZCBhcnJheXMgb2Ygb3RoZXIgc3R5bGVzIGFycmF5cyAocmVjdXJzaXZlKSxcbiAgICAvLyBzbyB3ZSBzZXQgaXRzIHR5cGUgdG8gZHluYW1pYy5cbiAgICBjb25zdCBzdHlsZXNWYXIgPSBnZXRTdHlsZXNWYXJOYW1lKGlzQ29tcG9uZW50U3R5bGVzaGVldCA/IGNvbXAgOiBudWxsKTtcbiAgICBjb25zdCBzdG10ID0gby52YXJpYWJsZShzdHlsZXNWYXIpXG4gICAgICAgICAgICAgICAgICAgICAuc2V0KG8ubGl0ZXJhbEFycihcbiAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZUV4cHJlc3Npb25zLCBuZXcgby5BcnJheVR5cGUoby5EWU5BTUlDX1RZUEUsIFtvLlR5cGVNb2RpZmllci5Db25zdF0pKSlcbiAgICAgICAgICAgICAgICAgICAgIC50b0RlY2xTdG10KG51bGwsIGlzQ29tcG9uZW50U3R5bGVzaGVldCA/IFtvLlN0bXRNb2RpZmllci5GaW5hbF0gOiBbXG4gICAgICAgICAgICAgICAgICAgICAgIG8uU3RtdE1vZGlmaWVyLkZpbmFsLCBvLlN0bXRNb2RpZmllci5FeHBvcnRlZFxuICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgb3V0cHV0Q3R4LnN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICByZXR1cm4gbmV3IENvbXBpbGVkU3R5bGVzaGVldChvdXRwdXRDdHgsIHN0eWxlc1ZhciwgZGVwZW5kZW5jaWVzLCBzaGltLCBzdHlsZXNoZWV0KTtcbiAgfVxuXG4gIHByaXZhdGUgX3NoaW1JZk5lZWRlZChzdHlsZTogc3RyaW5nLCBzaGltOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2hpbSA/IHRoaXMuX3NoYWRvd0Nzcy5zaGltQ3NzVGV4dChzdHlsZSwgQ09OVEVOVF9BVFRSLCBIT1NUX0FUVFIpIDogc3R5bGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3R5bGVzVmFyTmFtZShjb21wb25lbnQ6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YXxudWxsKTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IGBzdHlsZXNgO1xuICBpZiAoY29tcG9uZW50KSB7XG4gICAgcmVzdWx0ICs9IGBfJHtpZGVudGlmaWVyTmFtZShjb21wb25lbnQudHlwZSl9YDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19