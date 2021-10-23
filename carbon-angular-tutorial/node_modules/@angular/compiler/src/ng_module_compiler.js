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
        define("@angular/compiler/src/ng_module_compiler", ["require", "exports", "@angular/compiler/src/identifiers", "@angular/compiler/src/output/output_ast", "@angular/compiler/src/parse_util", "@angular/compiler/src/provider_analyzer", "@angular/compiler/src/view_compiler/provider_compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgModuleCompiler = exports.NgModuleCompileResult = void 0;
    var identifiers_1 = require("@angular/compiler/src/identifiers");
    var o = require("@angular/compiler/src/output/output_ast");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var provider_analyzer_1 = require("@angular/compiler/src/provider_analyzer");
    var provider_compiler_1 = require("@angular/compiler/src/view_compiler/provider_compiler");
    var NgModuleCompileResult = /** @class */ (function () {
        function NgModuleCompileResult(ngModuleFactoryVar) {
            this.ngModuleFactoryVar = ngModuleFactoryVar;
        }
        return NgModuleCompileResult;
    }());
    exports.NgModuleCompileResult = NgModuleCompileResult;
    var LOG_VAR = o.variable('_l');
    var NgModuleCompiler = /** @class */ (function () {
        function NgModuleCompiler(reflector) {
            this.reflector = reflector;
        }
        NgModuleCompiler.prototype.compile = function (ctx, ngModuleMeta, extraProviders) {
            var sourceSpan = parse_util_1.typeSourceSpan('NgModule', ngModuleMeta.type);
            var entryComponentFactories = ngModuleMeta.transitiveModule.entryComponents;
            var bootstrapComponents = ngModuleMeta.bootstrapComponents;
            var providerParser = new provider_analyzer_1.NgModuleProviderAnalyzer(this.reflector, ngModuleMeta, extraProviders, sourceSpan);
            var providerDefs = [provider_compiler_1.componentFactoryResolverProviderDef(this.reflector, ctx, 0 /* None */, entryComponentFactories)]
                .concat(providerParser.parse().map(function (provider) { return provider_compiler_1.providerDef(ctx, provider); }))
                .map(function (_a) {
                var providerExpr = _a.providerExpr, depsExpr = _a.depsExpr, flags = _a.flags, tokenExpr = _a.tokenExpr;
                return o.importExpr(identifiers_1.Identifiers.moduleProviderDef).callFn([
                    o.literal(flags), tokenExpr, providerExpr, depsExpr
                ]);
            });
            var ngModuleDef = o.importExpr(identifiers_1.Identifiers.moduleDef).callFn([o.literalArr(providerDefs)]);
            var ngModuleDefFactory = o.fn([new o.FnParam(LOG_VAR.name)], [new o.ReturnStatement(ngModuleDef)], o.INFERRED_TYPE);
            var ngModuleFactoryVar = parse_util_1.identifierName(ngModuleMeta.type) + "NgFactory";
            this._createNgModuleFactory(ctx, ngModuleMeta.type.reference, o.importExpr(identifiers_1.Identifiers.createModuleFactory).callFn([
                ctx.importExpr(ngModuleMeta.type.reference),
                o.literalArr(bootstrapComponents.map(function (id) { return ctx.importExpr(id.reference); })),
                ngModuleDefFactory
            ]));
            if (ngModuleMeta.id) {
                var id = typeof ngModuleMeta.id === 'string' ? o.literal(ngModuleMeta.id) :
                    ctx.importExpr(ngModuleMeta.id);
                var registerFactoryStmt = o.importExpr(identifiers_1.Identifiers.RegisterModuleFactoryFn)
                    .callFn([id, o.variable(ngModuleFactoryVar)])
                    .toStmt();
                ctx.statements.push(registerFactoryStmt);
            }
            return new NgModuleCompileResult(ngModuleFactoryVar);
        };
        NgModuleCompiler.prototype.createStub = function (ctx, ngModuleReference) {
            this._createNgModuleFactory(ctx, ngModuleReference, o.NULL_EXPR);
        };
        NgModuleCompiler.prototype._createNgModuleFactory = function (ctx, reference, value) {
            var ngModuleFactoryVar = parse_util_1.identifierName({ reference: reference }) + "NgFactory";
            var ngModuleFactoryStmt = o.variable(ngModuleFactoryVar)
                .set(value)
                .toDeclStmt(o.importType(identifiers_1.Identifiers.NgModuleFactory, [o.expressionType(ctx.importExpr(reference))], [o.TypeModifier.Const]), [o.StmtModifier.Final, o.StmtModifier.Exported]);
            ctx.statements.push(ngModuleFactoryStmt);
        };
        return NgModuleCompiler;
    }());
    exports.NgModuleCompiler = NgModuleCompiler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlX2NvbXBpbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL25nX21vZHVsZV9jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFNSCxpRUFBMEM7SUFDMUMsMkRBQXlDO0lBQ3pDLCtEQUE0RDtJQUM1RCw2RUFBNkQ7SUFDN0QsMkZBQTJHO0lBRTNHO1FBQ0UsK0JBQW1CLGtCQUEwQjtZQUExQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFBRyxDQUFDO1FBQ25ELDRCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxzREFBcUI7SUFJbEMsSUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVqQztRQUNFLDBCQUFvQixTQUEyQjtZQUEzQixjQUFTLEdBQVQsU0FBUyxDQUFrQjtRQUFHLENBQUM7UUFDbkQsa0NBQU8sR0FBUCxVQUNJLEdBQWtCLEVBQUUsWUFBcUMsRUFDekQsY0FBeUM7WUFDM0MsSUFBTSxVQUFVLEdBQUcsMkJBQWMsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pFLElBQU0sdUJBQXVCLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztZQUM5RSxJQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQztZQUM3RCxJQUFNLGNBQWMsR0FDaEIsSUFBSSw0Q0FBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDM0YsSUFBTSxZQUFZLEdBQ2QsQ0FBQyx1REFBbUMsQ0FDL0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLGdCQUFrQix1QkFBdUIsQ0FBQyxDQUFDO2lCQUM5RCxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFDLFFBQVEsSUFBSyxPQUFBLCtCQUFXLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7aUJBQzVFLEdBQUcsQ0FBQyxVQUFDLEVBQTBDO29CQUF6QyxZQUFZLGtCQUFBLEVBQUUsUUFBUSxjQUFBLEVBQUUsS0FBSyxXQUFBLEVBQUUsU0FBUyxlQUFBO2dCQUM3QyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFDeEQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLFFBQVE7aUJBQ3BELENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRVgsSUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdGLElBQU0sa0JBQWtCLEdBQ3BCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFaEcsSUFBTSxrQkFBa0IsR0FBTSwyQkFBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBVyxDQUFDO1lBQzNFLElBQUksQ0FBQyxzQkFBc0IsQ0FDdkIsR0FBRyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDckYsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDM0MsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxDQUFDO2dCQUN6RSxrQkFBa0I7YUFDbkIsQ0FBQyxDQUFDLENBQUM7WUFFUixJQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUU7Z0JBQ25CLElBQU0sRUFBRSxHQUFHLE9BQU8sWUFBWSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRixJQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMseUJBQVcsQ0FBQyx1QkFBdUIsQ0FBQztxQkFDNUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO3FCQUM1QyxNQUFNLEVBQUUsQ0FBQztnQkFDMUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQzthQUMxQztZQUVELE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxxQ0FBVSxHQUFWLFVBQVcsR0FBa0IsRUFBRSxpQkFBc0I7WUFDbkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVPLGlEQUFzQixHQUE5QixVQUErQixHQUFrQixFQUFFLFNBQWMsRUFBRSxLQUFtQjtZQUNwRixJQUFNLGtCQUFrQixHQUFNLDJCQUFjLENBQUMsRUFBQyxTQUFTLEVBQUUsU0FBUyxFQUFDLENBQUMsY0FBVyxDQUFDO1lBQ2hGLElBQU0sbUJBQW1CLEdBQ3JCLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUM7aUJBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUM7aUJBQ1YsVUFBVSxDQUNQLENBQUMsQ0FBQyxVQUFVLENBQ1IseUJBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUUsQ0FBQyxFQUMzRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDM0IsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFFN0QsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBN0RELElBNkRDO0lBN0RZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlUHJvdmlkZXJNZXRhZGF0YX0gZnJvbSAnLi9jb21waWxlX21ldGFkYXRhJztcbmltcG9ydCB7Q29tcGlsZVJlZmxlY3Rvcn0gZnJvbSAnLi9jb21waWxlX3JlZmxlY3Rvcic7XG5pbXBvcnQge091dHB1dENvbnRleHR9IGZyb20gJy4vY29uc3RhbnRfcG9vbCc7XG5pbXBvcnQge05vZGVGbGFnc30gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7SWRlbnRpZmllcnN9IGZyb20gJy4vaWRlbnRpZmllcnMnO1xuaW1wb3J0ICogYXMgbyBmcm9tICcuL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7aWRlbnRpZmllck5hbWUsIHR5cGVTb3VyY2VTcGFufSBmcm9tICcuL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtOZ01vZHVsZVByb3ZpZGVyQW5hbHl6ZXJ9IGZyb20gJy4vcHJvdmlkZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtjb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJQcm92aWRlckRlZiwgZGVwRGVmLCBwcm92aWRlckRlZn0gZnJvbSAnLi92aWV3X2NvbXBpbGVyL3Byb3ZpZGVyX2NvbXBpbGVyJztcblxuZXhwb3J0IGNsYXNzIE5nTW9kdWxlQ29tcGlsZVJlc3VsdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBuZ01vZHVsZUZhY3RvcnlWYXI6IHN0cmluZykge31cbn1cblxuY29uc3QgTE9HX1ZBUiA9IG8udmFyaWFibGUoJ19sJyk7XG5cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZUNvbXBpbGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWZsZWN0b3I6IENvbXBpbGVSZWZsZWN0b3IpIHt9XG4gIGNvbXBpbGUoXG4gICAgICBjdHg6IE91dHB1dENvbnRleHQsIG5nTW9kdWxlTWV0YTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEsXG4gICAgICBleHRyYVByb3ZpZGVyczogQ29tcGlsZVByb3ZpZGVyTWV0YWRhdGFbXSk6IE5nTW9kdWxlQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3Qgc291cmNlU3BhbiA9IHR5cGVTb3VyY2VTcGFuKCdOZ01vZHVsZScsIG5nTW9kdWxlTWV0YS50eXBlKTtcbiAgICBjb25zdCBlbnRyeUNvbXBvbmVudEZhY3RvcmllcyA9IG5nTW9kdWxlTWV0YS50cmFuc2l0aXZlTW9kdWxlLmVudHJ5Q29tcG9uZW50cztcbiAgICBjb25zdCBib290c3RyYXBDb21wb25lbnRzID0gbmdNb2R1bGVNZXRhLmJvb3RzdHJhcENvbXBvbmVudHM7XG4gICAgY29uc3QgcHJvdmlkZXJQYXJzZXIgPVxuICAgICAgICBuZXcgTmdNb2R1bGVQcm92aWRlckFuYWx5emVyKHRoaXMucmVmbGVjdG9yLCBuZ01vZHVsZU1ldGEsIGV4dHJhUHJvdmlkZXJzLCBzb3VyY2VTcGFuKTtcbiAgICBjb25zdCBwcm92aWRlckRlZnMgPVxuICAgICAgICBbY29tcG9uZW50RmFjdG9yeVJlc29sdmVyUHJvdmlkZXJEZWYoXG4gICAgICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGN0eCwgTm9kZUZsYWdzLk5vbmUsIGVudHJ5Q29tcG9uZW50RmFjdG9yaWVzKV1cbiAgICAgICAgICAgIC5jb25jYXQocHJvdmlkZXJQYXJzZXIucGFyc2UoKS5tYXAoKHByb3ZpZGVyKSA9PiBwcm92aWRlckRlZihjdHgsIHByb3ZpZGVyKSkpXG4gICAgICAgICAgICAubWFwKCh7cHJvdmlkZXJFeHByLCBkZXBzRXhwciwgZmxhZ3MsIHRva2VuRXhwcn0pID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIG8uaW1wb3J0RXhwcihJZGVudGlmaWVycy5tb2R1bGVQcm92aWRlckRlZikuY2FsbEZuKFtcbiAgICAgICAgICAgICAgICBvLmxpdGVyYWwoZmxhZ3MpLCB0b2tlbkV4cHIsIHByb3ZpZGVyRXhwciwgZGVwc0V4cHJcbiAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICB9KTtcblxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gby5pbXBvcnRFeHByKElkZW50aWZpZXJzLm1vZHVsZURlZikuY2FsbEZuKFtvLmxpdGVyYWxBcnIocHJvdmlkZXJEZWZzKV0pO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmRmFjdG9yeSA9XG4gICAgICAgIG8uZm4oW25ldyBvLkZuUGFyYW0oTE9HX1ZBUi5uYW1lISldLCBbbmV3IG8uUmV0dXJuU3RhdGVtZW50KG5nTW9kdWxlRGVmKV0sIG8uSU5GRVJSRURfVFlQRSk7XG5cbiAgICBjb25zdCBuZ01vZHVsZUZhY3RvcnlWYXIgPSBgJHtpZGVudGlmaWVyTmFtZShuZ01vZHVsZU1ldGEudHlwZSl9TmdGYWN0b3J5YDtcbiAgICB0aGlzLl9jcmVhdGVOZ01vZHVsZUZhY3RvcnkoXG4gICAgICAgIGN0eCwgbmdNb2R1bGVNZXRhLnR5cGUucmVmZXJlbmNlLCBvLmltcG9ydEV4cHIoSWRlbnRpZmllcnMuY3JlYXRlTW9kdWxlRmFjdG9yeSkuY2FsbEZuKFtcbiAgICAgICAgICBjdHguaW1wb3J0RXhwcihuZ01vZHVsZU1ldGEudHlwZS5yZWZlcmVuY2UpLFxuICAgICAgICAgIG8ubGl0ZXJhbEFycihib290c3RyYXBDb21wb25lbnRzLm1hcChpZCA9PiBjdHguaW1wb3J0RXhwcihpZC5yZWZlcmVuY2UpKSksXG4gICAgICAgICAgbmdNb2R1bGVEZWZGYWN0b3J5XG4gICAgICAgIF0pKTtcblxuICAgIGlmIChuZ01vZHVsZU1ldGEuaWQpIHtcbiAgICAgIGNvbnN0IGlkID0gdHlwZW9mIG5nTW9kdWxlTWV0YS5pZCA9PT0gJ3N0cmluZycgPyBvLmxpdGVyYWwobmdNb2R1bGVNZXRhLmlkKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmltcG9ydEV4cHIobmdNb2R1bGVNZXRhLmlkKTtcbiAgICAgIGNvbnN0IHJlZ2lzdGVyRmFjdG9yeVN0bXQgPSBvLmltcG9ydEV4cHIoSWRlbnRpZmllcnMuUmVnaXN0ZXJNb2R1bGVGYWN0b3J5Rm4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYWxsRm4oW2lkLCBvLnZhcmlhYmxlKG5nTW9kdWxlRmFjdG9yeVZhcildKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdG10KCk7XG4gICAgICBjdHguc3RhdGVtZW50cy5wdXNoKHJlZ2lzdGVyRmFjdG9yeVN0bXQpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgTmdNb2R1bGVDb21waWxlUmVzdWx0KG5nTW9kdWxlRmFjdG9yeVZhcik7XG4gIH1cblxuICBjcmVhdGVTdHViKGN0eDogT3V0cHV0Q29udGV4dCwgbmdNb2R1bGVSZWZlcmVuY2U6IGFueSkge1xuICAgIHRoaXMuX2NyZWF0ZU5nTW9kdWxlRmFjdG9yeShjdHgsIG5nTW9kdWxlUmVmZXJlbmNlLCBvLk5VTExfRVhQUik7XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVOZ01vZHVsZUZhY3RvcnkoY3R4OiBPdXRwdXRDb250ZXh0LCByZWZlcmVuY2U6IGFueSwgdmFsdWU6IG8uRXhwcmVzc2lvbikge1xuICAgIGNvbnN0IG5nTW9kdWxlRmFjdG9yeVZhciA9IGAke2lkZW50aWZpZXJOYW1lKHtyZWZlcmVuY2U6IHJlZmVyZW5jZX0pfU5nRmFjdG9yeWA7XG4gICAgY29uc3QgbmdNb2R1bGVGYWN0b3J5U3RtdCA9XG4gICAgICAgIG8udmFyaWFibGUobmdNb2R1bGVGYWN0b3J5VmFyKVxuICAgICAgICAgICAgLnNldCh2YWx1ZSlcbiAgICAgICAgICAgIC50b0RlY2xTdG10KFxuICAgICAgICAgICAgICAgIG8uaW1wb3J0VHlwZShcbiAgICAgICAgICAgICAgICAgICAgSWRlbnRpZmllcnMuTmdNb2R1bGVGYWN0b3J5LCBbby5leHByZXNzaW9uVHlwZShjdHguaW1wb3J0RXhwcihyZWZlcmVuY2UpKSFdLFxuICAgICAgICAgICAgICAgICAgICBbby5UeXBlTW9kaWZpZXIuQ29uc3RdKSxcbiAgICAgICAgICAgICAgICBbby5TdG10TW9kaWZpZXIuRmluYWwsIG8uU3RtdE1vZGlmaWVyLkV4cG9ydGVkXSk7XG5cbiAgICBjdHguc3RhdGVtZW50cy5wdXNoKG5nTW9kdWxlRmFjdG9yeVN0bXQpO1xuICB9XG59XG4iXX0=