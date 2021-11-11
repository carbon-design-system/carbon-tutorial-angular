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
        define("@angular/compiler/src/i18n/extractor", ["require", "exports", "tslib", "@angular/compiler/src/aot/compiler", "@angular/compiler/src/aot/compiler_factory", "@angular/compiler/src/aot/static_reflector", "@angular/compiler/src/aot/static_symbol", "@angular/compiler/src/aot/static_symbol_resolver", "@angular/compiler/src/aot/summary_resolver", "@angular/compiler/src/config", "@angular/compiler/src/core", "@angular/compiler/src/directive_normalizer", "@angular/compiler/src/directive_resolver", "@angular/compiler/src/metadata_resolver", "@angular/compiler/src/ml_parser/html_parser", "@angular/compiler/src/ml_parser/interpolation_config", "@angular/compiler/src/ng_module_resolver", "@angular/compiler/src/pipe_resolver", "@angular/compiler/src/schema/dom_element_schema_registry", "@angular/compiler/src/i18n/message_bundle"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Extractor = void 0;
    var tslib_1 = require("tslib");
    /**
     * Extract i18n messages from source code
     */
    var compiler_1 = require("@angular/compiler/src/aot/compiler");
    var compiler_factory_1 = require("@angular/compiler/src/aot/compiler_factory");
    var static_reflector_1 = require("@angular/compiler/src/aot/static_reflector");
    var static_symbol_1 = require("@angular/compiler/src/aot/static_symbol");
    var static_symbol_resolver_1 = require("@angular/compiler/src/aot/static_symbol_resolver");
    var summary_resolver_1 = require("@angular/compiler/src/aot/summary_resolver");
    var config_1 = require("@angular/compiler/src/config");
    var core_1 = require("@angular/compiler/src/core");
    var directive_normalizer_1 = require("@angular/compiler/src/directive_normalizer");
    var directive_resolver_1 = require("@angular/compiler/src/directive_resolver");
    var metadata_resolver_1 = require("@angular/compiler/src/metadata_resolver");
    var html_parser_1 = require("@angular/compiler/src/ml_parser/html_parser");
    var interpolation_config_1 = require("@angular/compiler/src/ml_parser/interpolation_config");
    var ng_module_resolver_1 = require("@angular/compiler/src/ng_module_resolver");
    var pipe_resolver_1 = require("@angular/compiler/src/pipe_resolver");
    var dom_element_schema_registry_1 = require("@angular/compiler/src/schema/dom_element_schema_registry");
    var message_bundle_1 = require("@angular/compiler/src/i18n/message_bundle");
    var Extractor = /** @class */ (function () {
        function Extractor(host, staticSymbolResolver, messageBundle, metadataResolver) {
            this.host = host;
            this.staticSymbolResolver = staticSymbolResolver;
            this.messageBundle = messageBundle;
            this.metadataResolver = metadataResolver;
        }
        Extractor.prototype.extract = function (rootFiles) {
            var _this = this;
            var _a = compiler_1.analyzeAndValidateNgModules(rootFiles, this.host, this.staticSymbolResolver, this.metadataResolver), files = _a.files, ngModules = _a.ngModules;
            return Promise
                .all(ngModules.map(function (ngModule) { return _this.metadataResolver.loadNgModuleDirectiveAndPipeMetadata(ngModule.type.reference, false); }))
                .then(function () {
                var errors = [];
                files.forEach(function (file) {
                    var compMetas = [];
                    file.directives.forEach(function (directiveType) {
                        var dirMeta = _this.metadataResolver.getDirectiveMetadata(directiveType);
                        if (dirMeta && dirMeta.isComponent) {
                            compMetas.push(dirMeta);
                        }
                    });
                    compMetas.forEach(function (compMeta) {
                        var html = compMeta.template.template;
                        // Template URL points to either an HTML or TS file depending on
                        // whether the file is used with `templateUrl:` or `template:`,
                        // respectively.
                        var templateUrl = compMeta.template.templateUrl;
                        var interpolationConfig = interpolation_config_1.InterpolationConfig.fromArray(compMeta.template.interpolation);
                        errors.push.apply(errors, tslib_1.__spreadArray([], tslib_1.__read(_this.messageBundle.updateFromTemplate(html, templateUrl, interpolationConfig))));
                    });
                });
                if (errors.length) {
                    throw new Error(errors.map(function (e) { return e.toString(); }).join('\n'));
                }
                return _this.messageBundle;
            });
        };
        Extractor.create = function (host, locale) {
            var htmlParser = new html_parser_1.HtmlParser();
            var urlResolver = compiler_factory_1.createAotUrlResolver(host);
            var symbolCache = new static_symbol_1.StaticSymbolCache();
            var summaryResolver = new summary_resolver_1.AotSummaryResolver(host, symbolCache);
            var staticSymbolResolver = new static_symbol_resolver_1.StaticSymbolResolver(host, symbolCache, summaryResolver);
            var staticReflector = new static_reflector_1.StaticReflector(summaryResolver, staticSymbolResolver);
            var config = new config_1.CompilerConfig({ defaultEncapsulation: core_1.ViewEncapsulation.Emulated, useJit: false });
            var normalizer = new directive_normalizer_1.DirectiveNormalizer({ get: function (url) { return host.loadResource(url); } }, urlResolver, htmlParser, config);
            var elementSchemaRegistry = new dom_element_schema_registry_1.DomElementSchemaRegistry();
            var resolver = new metadata_resolver_1.CompileMetadataResolver(config, htmlParser, new ng_module_resolver_1.NgModuleResolver(staticReflector), new directive_resolver_1.DirectiveResolver(staticReflector), new pipe_resolver_1.PipeResolver(staticReflector), summaryResolver, elementSchemaRegistry, normalizer, console, symbolCache, staticReflector);
            // TODO(vicb): implicit tags & attributes
            var messageBundle = new message_bundle_1.MessageBundle(htmlParser, [], {}, locale);
            var extractor = new Extractor(host, staticSymbolResolver, messageBundle, resolver);
            return { extractor: extractor, staticReflector: staticReflector };
        };
        return Extractor;
    }());
    exports.Extractor = Extractor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL2kxOG4vZXh0cmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSDs7T0FFRztJQUNILCtEQUE0RDtJQUM1RCwrRUFBNkQ7SUFDN0QsK0VBQXdEO0lBQ3hELHlFQUF1RDtJQUN2RCwyRkFBNkY7SUFDN0YsK0VBQW1GO0lBRW5GLHVEQUF5QztJQUN6QyxtREFBMEM7SUFDMUMsbUZBQTREO0lBQzVELCtFQUF3RDtJQUN4RCw2RUFBNkQ7SUFDN0QsMkVBQW9EO0lBQ3BELDZGQUFzRTtJQUN0RSwrRUFBdUQ7SUFFdkQscUVBQThDO0lBQzlDLHdHQUErRTtJQUUvRSw0RUFBK0M7SUFvQi9DO1FBQ0UsbUJBQ1csSUFBbUIsRUFBVSxvQkFBMEMsRUFDdEUsYUFBNEIsRUFBVSxnQkFBeUM7WUFEaEYsU0FBSSxHQUFKLElBQUksQ0FBZTtZQUFVLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7WUFDdEUsa0JBQWEsR0FBYixhQUFhLENBQWU7WUFBVSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1FBQUcsQ0FBQztRQUUvRiwyQkFBTyxHQUFQLFVBQVEsU0FBbUI7WUFBM0IsaUJBcUNDO1lBcENPLElBQUEsS0FBcUIsc0NBQTJCLENBQ2xELFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFEcEUsS0FBSyxXQUFBLEVBQUUsU0FBUyxlQUNvRCxDQUFDO1lBQzVFLE9BQU8sT0FBTztpQkFDVCxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDZCxVQUFBLFFBQVEsSUFBSSxPQUFBLEtBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQ0FBb0MsQ0FDbEUsUUFBUSxDQUFDLElBQUksQ0FB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LENBQUMsZUFBZSxDQUFDLEVBQ3pELElBQUksc0NBQWlCLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSw0QkFBWSxDQUFDLGVBQWUsQ0FBQyxFQUFFLGVBQWUsRUFDMUYscUJBQXFCLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFFOUUseUNBQXlDO1lBQ3pDLElBQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVwRSxJQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3JGLE9BQU8sRUFBQyxTQUFTLFdBQUEsRUFBRSxlQUFlLGlCQUFBLEVBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0gsZ0JBQUM7SUFBRCxDQUFDLEFBdkVELElBdUVDO0lBdkVZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cblxuLyoqXG4gKiBFeHRyYWN0IGkxOG4gbWVzc2FnZXMgZnJvbSBzb3VyY2UgY29kZVxuICovXG5pbXBvcnQge2FuYWx5emVBbmRWYWxpZGF0ZU5nTW9kdWxlc30gZnJvbSAnLi4vYW90L2NvbXBpbGVyJztcbmltcG9ydCB7Y3JlYXRlQW90VXJsUmVzb2x2ZXJ9IGZyb20gJy4uL2FvdC9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7U3RhdGljUmVmbGVjdG9yfSBmcm9tICcuLi9hb3Qvc3RhdGljX3JlZmxlY3Rvcic7XG5pbXBvcnQge1N0YXRpY1N5bWJvbENhY2hlfSBmcm9tICcuLi9hb3Qvc3RhdGljX3N5bWJvbCc7XG5pbXBvcnQge1N0YXRpY1N5bWJvbFJlc29sdmVyLCBTdGF0aWNTeW1ib2xSZXNvbHZlckhvc3R9IGZyb20gJy4uL2FvdC9zdGF0aWNfc3ltYm9sX3Jlc29sdmVyJztcbmltcG9ydCB7QW90U3VtbWFyeVJlc29sdmVyLCBBb3RTdW1tYXJ5UmVzb2x2ZXJIb3N0fSBmcm9tICcuLi9hb3Qvc3VtbWFyeV9yZXNvbHZlcic7XG5pbXBvcnQge0NvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YX0gZnJvbSAnLi4vY29tcGlsZV9tZXRhZGF0YSc7XG5pbXBvcnQge0NvbXBpbGVyQ29uZmlnfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnLi4vY29yZSc7XG5pbXBvcnQge0RpcmVjdGl2ZU5vcm1hbGl6ZXJ9IGZyb20gJy4uL2RpcmVjdGl2ZV9ub3JtYWxpemVyJztcbmltcG9ydCB7RGlyZWN0aXZlUmVzb2x2ZXJ9IGZyb20gJy4uL2RpcmVjdGl2ZV9yZXNvbHZlcic7XG5pbXBvcnQge0NvbXBpbGVNZXRhZGF0YVJlc29sdmVyfSBmcm9tICcuLi9tZXRhZGF0YV9yZXNvbHZlcic7XG5pbXBvcnQge0h0bWxQYXJzZXJ9IGZyb20gJy4uL21sX3BhcnNlci9odG1sX3BhcnNlcic7XG5pbXBvcnQge0ludGVycG9sYXRpb25Db25maWd9IGZyb20gJy4uL21sX3BhcnNlci9pbnRlcnBvbGF0aW9uX2NvbmZpZyc7XG5pbXBvcnQge05nTW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4uL25nX21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge1BhcnNlRXJyb3J9IGZyb20gJy4uL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtQaXBlUmVzb2x2ZXJ9IGZyb20gJy4uL3BpcGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtEb21FbGVtZW50U2NoZW1hUmVnaXN0cnl9IGZyb20gJy4uL3NjaGVtYS9kb21fZWxlbWVudF9zY2hlbWFfcmVnaXN0cnknO1xuXG5pbXBvcnQge01lc3NhZ2VCdW5kbGV9IGZyb20gJy4vbWVzc2FnZV9idW5kbGUnO1xuXG5cblxuLyoqXG4gKiBUaGUgaG9zdCBvZiB0aGUgRXh0cmFjdG9yIGRpc2Nvbm5lY3RzIHRoZSBpbXBsZW1lbnRhdGlvbiBmcm9tIFR5cGVTY3JpcHQgLyBvdGhlciBsYW5ndWFnZVxuICogc2VydmljZXMgYW5kIGZyb20gdW5kZXJseWluZyBmaWxlIHN5c3RlbXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFjdG9ySG9zdCBleHRlbmRzIFN0YXRpY1N5bWJvbFJlc29sdmVySG9zdCwgQW90U3VtbWFyeVJlc29sdmVySG9zdCB7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHBhdGggdGhhdCByZWZlcnMgdG8gYSByZXNvdXJjZSBpbnRvIGFuIGFic29sdXRlIGZpbGVQYXRoXG4gICAqIHRoYXQgY2FuIGJlIGxhdGVyIG9uIHVzZWQgZm9yIGxvYWRpbmcgdGhlIHJlc291cmNlIHZpYSBgbG9hZFJlc291cmNlLlxuICAgKi9cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZShwYXRoOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcbiAgLyoqXG4gICAqIExvYWRzIGEgcmVzb3VyY2UgKGUuZy4gaHRtbCAvIGNzcylcbiAgICovXG4gIGxvYWRSZXNvdXJjZShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz58c3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRXh0cmFjdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgaG9zdDogRXh0cmFjdG9ySG9zdCwgcHJpdmF0ZSBzdGF0aWNTeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIG1lc3NhZ2VCdW5kbGU6IE1lc3NhZ2VCdW5kbGUsIHByaXZhdGUgbWV0YWRhdGFSZXNvbHZlcjogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIpIHt9XG5cbiAgZXh0cmFjdChyb290RmlsZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxNZXNzYWdlQnVuZGxlPiB7XG4gICAgY29uc3Qge2ZpbGVzLCBuZ01vZHVsZXN9ID0gYW5hbHl6ZUFuZFZhbGlkYXRlTmdNb2R1bGVzKFxuICAgICAgICByb290RmlsZXMsIHRoaXMuaG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlciwgdGhpcy5tZXRhZGF0YVJlc29sdmVyKTtcbiAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAuYWxsKG5nTW9kdWxlcy5tYXAoXG4gICAgICAgICAgICBuZ01vZHVsZSA9PiB0aGlzLm1ldGFkYXRhUmVzb2x2ZXIubG9hZE5nTW9kdWxlRGlyZWN0aXZlQW5kUGlwZU1ldGFkYXRhKFxuICAgICAgICAgICAgICAgIG5nTW9kdWxlLnR5cGUucmVmZXJlbmNlLCBmYWxzZSkpKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3QgZXJyb3JzOiBQYXJzZUVycm9yW10gPSBbXTtcblxuICAgICAgICAgIGZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wTWV0YXM6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YVtdID0gW107XG4gICAgICAgICAgICBmaWxlLmRpcmVjdGl2ZXMuZm9yRWFjaChkaXJlY3RpdmVUeXBlID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgZGlyTWV0YSA9IHRoaXMubWV0YWRhdGFSZXNvbHZlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmVUeXBlKTtcbiAgICAgICAgICAgICAgaWYgKGRpck1ldGEgJiYgZGlyTWV0YS5pc0NvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIGNvbXBNZXRhcy5wdXNoKGRpck1ldGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbXBNZXRhcy5mb3JFYWNoKGNvbXBNZXRhID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgaHRtbCA9IGNvbXBNZXRhLnRlbXBsYXRlICEudGVtcGxhdGUgITtcbiAgICAgICAgICAgICAgLy8gVGVtcGxhdGUgVVJMIHBvaW50cyB0byBlaXRoZXIgYW4gSFRNTCBvciBUUyBmaWxlIGRlcGVuZGluZyBvblxuICAgICAgICAgICAgICAvLyB3aGV0aGVyIHRoZSBmaWxlIGlzIHVzZWQgd2l0aCBgdGVtcGxhdGVVcmw6YCBvciBgdGVtcGxhdGU6YCxcbiAgICAgICAgICAgICAgLy8gcmVzcGVjdGl2ZWx5LlxuICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IGNvbXBNZXRhLnRlbXBsYXRlICEudGVtcGxhdGVVcmwhO1xuICAgICAgICAgICAgICBjb25zdCBpbnRlcnBvbGF0aW9uQ29uZmlnID1cbiAgICAgICAgICAgICAgICAgIEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KGNvbXBNZXRhLnRlbXBsYXRlICEuaW50ZXJwb2xhdGlvbik7XG4gICAgICAgICAgICAgIGVycm9ycy5wdXNoKC4uLnRoaXMubWVzc2FnZUJ1bmRsZS51cGRhdGVGcm9tVGVtcGxhdGUoXG4gICAgICAgICAgICAgICAgICBodG1sLCB0ZW1wbGF0ZVVybCwgaW50ZXJwb2xhdGlvbkNvbmZpZykhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvcnMubWFwKGUgPT4gZS50b1N0cmluZygpKS5qb2luKCdcXG4nKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZUJ1bmRsZTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlKGhvc3Q6IEV4dHJhY3Rvckhvc3QsIGxvY2FsZTogc3RyaW5nfG51bGwpOlxuICAgICAge2V4dHJhY3RvcjogRXh0cmFjdG9yLCBzdGF0aWNSZWZsZWN0b3I6IFN0YXRpY1JlZmxlY3Rvcn0ge1xuICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSHRtbFBhcnNlcigpO1xuXG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVBb3RVcmxSZXNvbHZlcihob3N0KTtcbiAgICBjb25zdCBzeW1ib2xDYWNoZSA9IG5ldyBTdGF0aWNTeW1ib2xDYWNoZSgpO1xuICAgIGNvbnN0IHN1bW1hcnlSZXNvbHZlciA9IG5ldyBBb3RTdW1tYXJ5UmVzb2x2ZXIoaG9zdCwgc3ltYm9sQ2FjaGUpO1xuICAgIGNvbnN0IHN0YXRpY1N5bWJvbFJlc29sdmVyID0gbmV3IFN0YXRpY1N5bWJvbFJlc29sdmVyKGhvc3QsIHN5bWJvbENhY2hlLCBzdW1tYXJ5UmVzb2x2ZXIpO1xuICAgIGNvbnN0IHN0YXRpY1JlZmxlY3RvciA9IG5ldyBTdGF0aWNSZWZsZWN0b3Ioc3VtbWFyeVJlc29sdmVyLCBzdGF0aWNTeW1ib2xSZXNvbHZlcik7XG5cbiAgICBjb25zdCBjb25maWcgPVxuICAgICAgICBuZXcgQ29tcGlsZXJDb25maWcoe2RlZmF1bHRFbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCwgdXNlSml0OiBmYWxzZX0pO1xuXG4gICAgY29uc3Qgbm9ybWFsaXplciA9IG5ldyBEaXJlY3RpdmVOb3JtYWxpemVyKFxuICAgICAgICB7Z2V0OiAodXJsOiBzdHJpbmcpID0+IGhvc3QubG9hZFJlc291cmNlKHVybCl9LCB1cmxSZXNvbHZlciwgaHRtbFBhcnNlciwgY29uZmlnKTtcbiAgICBjb25zdCBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgcmVzb2x2ZXIgPSBuZXcgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIoXG4gICAgICAgIGNvbmZpZywgaHRtbFBhcnNlciwgbmV3IE5nTW9kdWxlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKSxcbiAgICAgICAgbmV3IERpcmVjdGl2ZVJlc29sdmVyKHN0YXRpY1JlZmxlY3RvciksIG5ldyBQaXBlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKSwgc3VtbWFyeVJlc29sdmVyLFxuICAgICAgICBlbGVtZW50U2NoZW1hUmVnaXN0cnksIG5vcm1hbGl6ZXIsIGNvbnNvbGUsIHN5bWJvbENhY2hlLCBzdGF0aWNSZWZsZWN0b3IpO1xuXG4gICAgLy8gVE9ETyh2aWNiKTogaW1wbGljaXQgdGFncyAmIGF0dHJpYnV0ZXNcbiAgICBjb25zdCBtZXNzYWdlQnVuZGxlID0gbmV3IE1lc3NhZ2VCdW5kbGUoaHRtbFBhcnNlciwgW10sIHt9LCBsb2NhbGUpO1xuXG4gICAgY29uc3QgZXh0cmFjdG9yID0gbmV3IEV4dHJhY3Rvcihob3N0LCBzdGF0aWNTeW1ib2xSZXNvbHZlciwgbWVzc2FnZUJ1bmRsZSwgcmVzb2x2ZXIpO1xuICAgIHJldHVybiB7ZXh0cmFjdG9yLCBzdGF0aWNSZWZsZWN0b3J9O1xuICB9XG59XG4iXX0=