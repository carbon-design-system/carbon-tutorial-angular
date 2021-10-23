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
        define("@angular/compiler/src/directive_normalizer", ["require", "exports", "tslib", "@angular/compiler/src/compile_metadata", "@angular/compiler/src/config", "@angular/compiler/src/core", "@angular/compiler/src/ml_parser/ast", "@angular/compiler/src/ml_parser/interpolation_config", "@angular/compiler/src/parse_util", "@angular/compiler/src/style_url_resolver", "@angular/compiler/src/template_parser/template_preparser", "@angular/compiler/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DirectiveNormalizer = void 0;
    var tslib_1 = require("tslib");
    var compile_metadata_1 = require("@angular/compiler/src/compile_metadata");
    var config_1 = require("@angular/compiler/src/config");
    var core_1 = require("@angular/compiler/src/core");
    var html = require("@angular/compiler/src/ml_parser/ast");
    var interpolation_config_1 = require("@angular/compiler/src/ml_parser/interpolation_config");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var style_url_resolver_1 = require("@angular/compiler/src/style_url_resolver");
    var template_preparser_1 = require("@angular/compiler/src/template_parser/template_preparser");
    var util_1 = require("@angular/compiler/src/util");
    var DirectiveNormalizer = /** @class */ (function () {
        function DirectiveNormalizer(_resourceLoader, _urlResolver, _htmlParser, _config) {
            this._resourceLoader = _resourceLoader;
            this._urlResolver = _urlResolver;
            this._htmlParser = _htmlParser;
            this._config = _config;
            this._resourceLoaderCache = new Map();
        }
        DirectiveNormalizer.prototype.clearCache = function () {
            this._resourceLoaderCache.clear();
        };
        DirectiveNormalizer.prototype.clearCacheFor = function (normalizedDirective) {
            var _this = this;
            if (!normalizedDirective.isComponent) {
                return;
            }
            var template = normalizedDirective.template;
            this._resourceLoaderCache.delete(template.templateUrl);
            template.externalStylesheets.forEach(function (stylesheet) {
                _this._resourceLoaderCache.delete(stylesheet.moduleUrl);
            });
        };
        DirectiveNormalizer.prototype._fetch = function (url) {
            var result = this._resourceLoaderCache.get(url);
            if (!result) {
                result = this._resourceLoader.get(url);
                this._resourceLoaderCache.set(url, result);
            }
            return result;
        };
        DirectiveNormalizer.prototype.normalizeTemplate = function (prenormData) {
            var _this = this;
            if (util_1.isDefined(prenormData.template)) {
                if (util_1.isDefined(prenormData.templateUrl)) {
                    throw parse_util_1.syntaxError("'" + util_1.stringify(prenormData
                        .componentType) + "' component cannot define both template and templateUrl");
                }
                if (typeof prenormData.template !== 'string') {
                    throw parse_util_1.syntaxError("The template specified for component " + util_1.stringify(prenormData.componentType) + " is not a string");
                }
            }
            else if (util_1.isDefined(prenormData.templateUrl)) {
                if (typeof prenormData.templateUrl !== 'string') {
                    throw parse_util_1.syntaxError("The templateUrl specified for component " + util_1.stringify(prenormData.componentType) + " is not a string");
                }
            }
            else {
                throw parse_util_1.syntaxError("No template specified for component " + util_1.stringify(prenormData.componentType));
            }
            if (util_1.isDefined(prenormData.preserveWhitespaces) &&
                typeof prenormData.preserveWhitespaces !== 'boolean') {
                throw parse_util_1.syntaxError("The preserveWhitespaces option for component " + util_1.stringify(prenormData.componentType) + " must be a boolean");
            }
            return util_1.SyncAsync.then(this._preParseTemplate(prenormData), function (preparsedTemplate) { return _this._normalizeTemplateMetadata(prenormData, preparsedTemplate); });
        };
        DirectiveNormalizer.prototype._preParseTemplate = function (prenomData) {
            var _this = this;
            var template;
            var templateUrl;
            if (prenomData.template != null) {
                template = prenomData.template;
                templateUrl = prenomData.moduleUrl;
            }
            else {
                templateUrl = this._urlResolver.resolve(prenomData.moduleUrl, prenomData.templateUrl);
                template = this._fetch(templateUrl);
            }
            return util_1.SyncAsync.then(template, function (template) { return _this._preparseLoadedTemplate(prenomData, template, templateUrl); });
        };
        DirectiveNormalizer.prototype._preparseLoadedTemplate = function (prenormData, template, templateAbsUrl) {
            var isInline = !!prenormData.template;
            var interpolationConfig = interpolation_config_1.InterpolationConfig.fromArray(prenormData.interpolation);
            var templateUrl = compile_metadata_1.templateSourceUrl({ reference: prenormData.ngModuleType }, { type: { reference: prenormData.componentType } }, { isInline: isInline, templateUrl: templateAbsUrl });
            var rootNodesAndErrors = this._htmlParser.parse(template, templateUrl, { tokenizeExpansionForms: true, interpolationConfig: interpolationConfig });
            if (rootNodesAndErrors.errors.length > 0) {
                var errorString = rootNodesAndErrors.errors.join('\n');
                throw parse_util_1.syntaxError("Template parse errors:\n" + errorString);
            }
            var templateMetadataStyles = this._normalizeStylesheet(new compile_metadata_1.CompileStylesheetMetadata({ styles: prenormData.styles, moduleUrl: prenormData.moduleUrl }));
            var visitor = new TemplatePreparseVisitor();
            html.visitAll(visitor, rootNodesAndErrors.rootNodes);
            var templateStyles = this._normalizeStylesheet(new compile_metadata_1.CompileStylesheetMetadata({ styles: visitor.styles, styleUrls: visitor.styleUrls, moduleUrl: templateAbsUrl }));
            var styles = templateMetadataStyles.styles.concat(templateStyles.styles);
            var inlineStyleUrls = templateMetadataStyles.styleUrls.concat(templateStyles.styleUrls);
            var styleUrls = this
                ._normalizeStylesheet(new compile_metadata_1.CompileStylesheetMetadata({ styleUrls: prenormData.styleUrls, moduleUrl: prenormData.moduleUrl }))
                .styleUrls;
            return {
                template: template,
                templateUrl: templateAbsUrl,
                isInline: isInline,
                htmlAst: rootNodesAndErrors,
                styles: styles,
                inlineStyleUrls: inlineStyleUrls,
                styleUrls: styleUrls,
                ngContentSelectors: visitor.ngContentSelectors,
            };
        };
        DirectiveNormalizer.prototype._normalizeTemplateMetadata = function (prenormData, preparsedTemplate) {
            var _this = this;
            return util_1.SyncAsync.then(this._loadMissingExternalStylesheets(preparsedTemplate.styleUrls.concat(preparsedTemplate.inlineStyleUrls)), function (externalStylesheets) { return _this._normalizeLoadedTemplateMetadata(prenormData, preparsedTemplate, externalStylesheets); });
        };
        DirectiveNormalizer.prototype._normalizeLoadedTemplateMetadata = function (prenormData, preparsedTemplate, stylesheets) {
            // Algorithm:
            // - produce exactly 1 entry per original styleUrl in
            // CompileTemplateMetadata.externalStylesheets with all styles inlined
            // - inline all styles that are referenced by the template into CompileTemplateMetadata.styles.
            // Reason: be able to determine how many stylesheets there are even without loading
            // the template nor the stylesheets, so we can create a stub for TypeScript always synchronously
            // (as resource loading may be async)
            var _this = this;
            var styles = tslib_1.__spreadArray([], tslib_1.__read(preparsedTemplate.styles));
            this._inlineStyles(preparsedTemplate.inlineStyleUrls, stylesheets, styles);
            var styleUrls = preparsedTemplate.styleUrls;
            var externalStylesheets = styleUrls.map(function (styleUrl) {
                var stylesheet = stylesheets.get(styleUrl);
                var styles = tslib_1.__spreadArray([], tslib_1.__read(stylesheet.styles));
                _this._inlineStyles(stylesheet.styleUrls, stylesheets, styles);
                return new compile_metadata_1.CompileStylesheetMetadata({ moduleUrl: styleUrl, styles: styles });
            });
            var encapsulation = prenormData.encapsulation;
            if (encapsulation == null) {
                encapsulation = this._config.defaultEncapsulation;
            }
            if (encapsulation === core_1.ViewEncapsulation.Emulated && styles.length === 0 &&
                styleUrls.length === 0) {
                encapsulation = core_1.ViewEncapsulation.None;
            }
            return new compile_metadata_1.CompileTemplateMetadata({
                encapsulation: encapsulation,
                template: preparsedTemplate.template,
                templateUrl: preparsedTemplate.templateUrl,
                htmlAst: preparsedTemplate.htmlAst,
                styles: styles,
                styleUrls: styleUrls,
                ngContentSelectors: preparsedTemplate.ngContentSelectors,
                animations: prenormData.animations,
                interpolation: prenormData.interpolation,
                isInline: preparsedTemplate.isInline,
                externalStylesheets: externalStylesheets,
                preserveWhitespaces: config_1.preserveWhitespacesDefault(prenormData.preserveWhitespaces, this._config.preserveWhitespaces),
            });
        };
        DirectiveNormalizer.prototype._inlineStyles = function (styleUrls, stylesheets, targetStyles) {
            var _this = this;
            styleUrls.forEach(function (styleUrl) {
                var stylesheet = stylesheets.get(styleUrl);
                stylesheet.styles.forEach(function (style) { return targetStyles.push(style); });
                _this._inlineStyles(stylesheet.styleUrls, stylesheets, targetStyles);
            });
        };
        DirectiveNormalizer.prototype._loadMissingExternalStylesheets = function (styleUrls, loadedStylesheets) {
            var _this = this;
            if (loadedStylesheets === void 0) { loadedStylesheets = new Map(); }
            return util_1.SyncAsync.then(util_1.SyncAsync.all(styleUrls.filter(function (styleUrl) { return !loadedStylesheets.has(styleUrl); })
                .map(function (styleUrl) { return util_1.SyncAsync.then(_this._fetch(styleUrl), function (loadedStyle) {
                var stylesheet = _this._normalizeStylesheet(new compile_metadata_1.CompileStylesheetMetadata({ styles: [loadedStyle], moduleUrl: styleUrl }));
                loadedStylesheets.set(styleUrl, stylesheet);
                return _this._loadMissingExternalStylesheets(stylesheet.styleUrls, loadedStylesheets);
            }); })), function (_) { return loadedStylesheets; });
        };
        DirectiveNormalizer.prototype._normalizeStylesheet = function (stylesheet) {
            var _this = this;
            var moduleUrl = stylesheet.moduleUrl;
            var allStyleUrls = stylesheet.styleUrls.filter(style_url_resolver_1.isStyleUrlResolvable)
                .map(function (url) { return _this._urlResolver.resolve(moduleUrl, url); });
            var allStyles = stylesheet.styles.map(function (style) {
                var styleWithImports = style_url_resolver_1.extractStyleUrls(_this._urlResolver, moduleUrl, style);
                allStyleUrls.push.apply(allStyleUrls, tslib_1.__spreadArray([], tslib_1.__read(styleWithImports.styleUrls)));
                return styleWithImports.style;
            });
            return new compile_metadata_1.CompileStylesheetMetadata({ styles: allStyles, styleUrls: allStyleUrls, moduleUrl: moduleUrl });
        };
        return DirectiveNormalizer;
    }());
    exports.DirectiveNormalizer = DirectiveNormalizer;
    var TemplatePreparseVisitor = /** @class */ (function () {
        function TemplatePreparseVisitor() {
            this.ngContentSelectors = [];
            this.styles = [];
            this.styleUrls = [];
            this.ngNonBindableStackCount = 0;
        }
        TemplatePreparseVisitor.prototype.visitElement = function (ast, context) {
            var preparsedElement = template_preparser_1.preparseElement(ast);
            switch (preparsedElement.type) {
                case template_preparser_1.PreparsedElementType.NG_CONTENT:
                    if (this.ngNonBindableStackCount === 0) {
                        this.ngContentSelectors.push(preparsedElement.selectAttr);
                    }
                    break;
                case template_preparser_1.PreparsedElementType.STYLE:
                    var textContent_1 = '';
                    ast.children.forEach(function (child) {
                        if (child instanceof html.Text) {
                            textContent_1 += child.value;
                        }
                    });
                    this.styles.push(textContent_1);
                    break;
                case template_preparser_1.PreparsedElementType.STYLESHEET:
                    this.styleUrls.push(preparsedElement.hrefAttr);
                    break;
                default:
                    break;
            }
            if (preparsedElement.nonBindable) {
                this.ngNonBindableStackCount++;
            }
            html.visitAll(this, ast.children);
            if (preparsedElement.nonBindable) {
                this.ngNonBindableStackCount--;
            }
            return null;
        };
        TemplatePreparseVisitor.prototype.visitExpansion = function (ast, context) {
            html.visitAll(this, ast.cases);
        };
        TemplatePreparseVisitor.prototype.visitExpansionCase = function (ast, context) {
            html.visitAll(this, ast.expression);
        };
        TemplatePreparseVisitor.prototype.visitComment = function (ast, context) {
            return null;
        };
        TemplatePreparseVisitor.prototype.visitAttribute = function (ast, context) {
            return null;
        };
        TemplatePreparseVisitor.prototype.visitText = function (ast, context) {
            return null;
        };
        return TemplatePreparseVisitor;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlX25vcm1hbGl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvZGlyZWN0aXZlX25vcm1hbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDJFQUFtSTtJQUNuSSx1REFBb0U7SUFDcEUsbURBQXlDO0lBQ3pDLDBEQUF3QztJQUV4Qyw2RkFBcUU7SUFFckUsK0RBQXlDO0lBRXpDLCtFQUE0RTtJQUM1RSwrRkFBMkY7SUFFM0YsbURBQXVEO0lBZ0J2RDtRQUdFLDZCQUNZLGVBQStCLEVBQVUsWUFBeUIsRUFDbEUsV0FBdUIsRUFBVSxPQUF1QjtZQUR4RCxvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBYTtZQUNsRSxnQkFBVyxHQUFYLFdBQVcsQ0FBWTtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBSjVELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBSUcsQ0FBQztRQUV4RSx3Q0FBVSxHQUFWO1lBQ0UsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLENBQUM7UUFFRCwyQ0FBYSxHQUFiLFVBQWMsbUJBQTZDO1lBQTNELGlCQVNDO1lBUkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRTtnQkFDcEMsT0FBTzthQUNSO1lBQ0QsSUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsUUFBVSxDQUFDO1lBQ2hELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVksQ0FBQyxDQUFDO1lBQ3hELFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBQyxVQUFVO2dCQUM5QyxLQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFVLENBQUMsQ0FB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QUFjLEdBQWQsVUFBZSxHQUFtQixFQUFFLE9BQVk7WUFDOUMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0QsMkNBQVMsR0FBVCxVQUFVLEdBQWMsRUFBRSxPQUFZO1lBQ3BDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQXhERCxJQXdEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSwgQ29tcGlsZVN0eWxlc2hlZXRNZXRhZGF0YSwgQ29tcGlsZVRlbXBsYXRlTWV0YWRhdGEsIHRlbXBsYXRlU291cmNlVXJsfSBmcm9tICcuL2NvbXBpbGVfbWV0YWRhdGEnO1xuaW1wb3J0IHtDb21waWxlckNvbmZpZywgcHJlc2VydmVXaGl0ZXNwYWNlc0RlZmF1bHR9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Vmlld0VuY2Fwc3VsYXRpb259IGZyb20gJy4vY29yZSc7XG5pbXBvcnQgKiBhcyBodG1sIGZyb20gJy4vbWxfcGFyc2VyL2FzdCc7XG5pbXBvcnQge0h0bWxQYXJzZXJ9IGZyb20gJy4vbWxfcGFyc2VyL2h0bWxfcGFyc2VyJztcbmltcG9ydCB7SW50ZXJwb2xhdGlvbkNvbmZpZ30gZnJvbSAnLi9tbF9wYXJzZXIvaW50ZXJwb2xhdGlvbl9jb25maWcnO1xuaW1wb3J0IHtQYXJzZVRyZWVSZXN1bHQgYXMgSHRtbFBhcnNlVHJlZVJlc3VsdH0gZnJvbSAnLi9tbF9wYXJzZXIvcGFyc2VyJztcbmltcG9ydCB7c3ludGF4RXJyb3J9IGZyb20gJy4vcGFyc2VfdXRpbCc7XG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL3Jlc291cmNlX2xvYWRlcic7XG5pbXBvcnQge2V4dHJhY3RTdHlsZVVybHMsIGlzU3R5bGVVcmxSZXNvbHZhYmxlfSBmcm9tICcuL3N0eWxlX3VybF9yZXNvbHZlcic7XG5pbXBvcnQge1ByZXBhcnNlZEVsZW1lbnRUeXBlLCBwcmVwYXJzZUVsZW1lbnR9IGZyb20gJy4vdGVtcGxhdGVfcGFyc2VyL3RlbXBsYXRlX3ByZXBhcnNlcic7XG5pbXBvcnQge1VybFJlc29sdmVyfSBmcm9tICcuL3VybF9yZXNvbHZlcic7XG5pbXBvcnQge2lzRGVmaW5lZCwgc3RyaW5naWZ5LCBTeW5jQXN5bmN9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlbm9ybWFsaXplZFRlbXBsYXRlTWV0YWRhdGEge1xuICBuZ01vZHVsZVR5cGU6IGFueTtcbiAgY29tcG9uZW50VHlwZTogYW55O1xuICBtb2R1bGVVcmw6IHN0cmluZztcbiAgdGVtcGxhdGU6IHN0cmluZ3xudWxsO1xuICB0ZW1wbGF0ZVVybDogc3RyaW5nfG51bGw7XG4gIHN0eWxlczogc3RyaW5nW107XG4gIHN0eWxlVXJsczogc3RyaW5nW107XG4gIGludGVycG9sYXRpb246IFtzdHJpbmcsIHN0cmluZ118bnVsbDtcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb258bnVsbDtcbiAgYW5pbWF0aW9uczogYW55W107XG4gIHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW58bnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIERpcmVjdGl2ZU5vcm1hbGl6ZXIge1xuICBwcml2YXRlIF9yZXNvdXJjZUxvYWRlckNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFN5bmNBc3luYzxzdHJpbmc+PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBfcmVzb3VyY2VMb2FkZXI6IFJlc291cmNlTG9hZGVyLCBwcml2YXRlIF91cmxSZXNvbHZlcjogVXJsUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIF9odG1sUGFyc2VyOiBIdG1sUGFyc2VyLCBwcml2YXRlIF9jb25maWc6IENvbXBpbGVyQ29uZmlnKSB7fVxuXG4gIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgdGhpcy5fcmVzb3VyY2VMb2FkZXJDYWNoZS5jbGVhcigpO1xuICB9XG5cbiAgY2xlYXJDYWNoZUZvcihub3JtYWxpemVkRGlyZWN0aXZlOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAoIW5vcm1hbGl6ZWREaXJlY3RpdmUuaXNDb21wb25lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGUgPSBub3JtYWxpemVkRGlyZWN0aXZlLnRlbXBsYXRlICE7XG4gICAgdGhpcy5fcmVzb3VyY2VMb2FkZXJDYWNoZS5kZWxldGUodGVtcGxhdGUudGVtcGxhdGVVcmwhKTtcbiAgICB0ZW1wbGF0ZS5leHRlcm5hbFN0eWxlc2hlZXRzLmZvckVhY2goKHN0eWxlc2hlZXQpID0+IHtcbiAgICAgIHRoaXMuX3Jlc291cmNlTG9hZGVyQ2FjaGUuZGVsZXRlKHN0eWxlc2hlZXQubW9kdWxlVXJsISk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9mZXRjaCh1cmw6IHN0cmluZyk6IFN5bmNBc3luYzxzdHJpbmc+IHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5fcmVzb3VyY2VMb2FkZXJDYWNoZS5nZXQodXJsKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5fcmVzb3VyY2VMb2FkZXIuZ2V0KHVybCk7XG4gICAgICB0aGlzLl9yZXNvdXJjZUxvYWRlckNhY2hlLnNldCh1cmwsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBub3JtYWxpemVUZW1wbGF0ZShwcmVub3JtRGF0YTogUHJlbm9ybWFsaXplZFRlbXBsYXRlTWV0YWRhdGEpOlxuICAgICAgU3luY0FzeW5jPENvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhPiB7XG4gICAgaWYgKGlzRGVmaW5lZChwcmVub3JtRGF0YS50ZW1wbGF0ZSkpIHtcbiAgICAgIGlmIChpc0RlZmluZWQocHJlbm9ybURhdGEudGVtcGxhdGVVcmwpKSB7XG4gICAgICAgIHRocm93IHN5bnRheEVycm9yKGAnJHtcbiAgICAgICAgICAgIHN0cmluZ2lmeShwcmVub3JtRGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuY29tcG9uZW50VHlwZSl9JyBjb21wb25lbnQgY2Fubm90IGRlZmluZSBib3RoIHRlbXBsYXRlIGFuZCB0ZW1wbGF0ZVVybGApO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwcmVub3JtRGF0YS50ZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYFRoZSB0ZW1wbGF0ZSBzcGVjaWZpZWQgZm9yIGNvbXBvbmVudCAke1xuICAgICAgICAgICAgc3RyaW5naWZ5KHByZW5vcm1EYXRhLmNvbXBvbmVudFR5cGUpfSBpcyBub3QgYSBzdHJpbmdgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZChwcmVub3JtRGF0YS50ZW1wbGF0ZVVybCkpIHtcbiAgICAgIGlmICh0eXBlb2YgcHJlbm9ybURhdGEudGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IHN5bnRheEVycm9yKGBUaGUgdGVtcGxhdGVVcmwgc3BlY2lmaWVkIGZvciBjb21wb25lbnQgJHtcbiAgICAgICAgICAgIHN0cmluZ2lmeShwcmVub3JtRGF0YS5jb21wb25lbnRUeXBlKX0gaXMgbm90IGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IHN5bnRheEVycm9yKFxuICAgICAgICAgIGBObyB0ZW1wbGF0ZSBzcGVjaWZpZWQgZm9yIGNvbXBvbmVudCAke3N0cmluZ2lmeShwcmVub3JtRGF0YS5jb21wb25lbnRUeXBlKX1gKTtcbiAgICB9XG5cbiAgICBpZiAoaXNEZWZpbmVkKHByZW5vcm1EYXRhLnByZXNlcnZlV2hpdGVzcGFjZXMpICYmXG4gICAgICAgIHR5cGVvZiBwcmVub3JtRGF0YS5wcmVzZXJ2ZVdoaXRlc3BhY2VzICE9PSAnYm9vbGVhbicpIHtcbiAgICAgIHRocm93IHN5bnRheEVycm9yKGBUaGUgcHJlc2VydmVXaGl0ZXNwYWNlcyBvcHRpb24gZm9yIGNvbXBvbmVudCAke1xuICAgICAgICAgIHN0cmluZ2lmeShwcmVub3JtRGF0YS5jb21wb25lbnRUeXBlKX0gbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gU3luY0FzeW5jLnRoZW4oXG4gICAgICAgIHRoaXMuX3ByZVBhcnNlVGVtcGxhdGUocHJlbm9ybURhdGEpLFxuICAgICAgICAocHJlcGFyc2VkVGVtcGxhdGUpID0+IHRoaXMuX25vcm1hbGl6ZVRlbXBsYXRlTWV0YWRhdGEocHJlbm9ybURhdGEsIHByZXBhcnNlZFRlbXBsYXRlKSk7XG4gIH1cblxuICBwcml2YXRlIF9wcmVQYXJzZVRlbXBsYXRlKHByZW5vbURhdGE6IFByZW5vcm1hbGl6ZWRUZW1wbGF0ZU1ldGFkYXRhKTpcbiAgICAgIFN5bmNBc3luYzxQcmVwYXJzZWRUZW1wbGF0ZT4ge1xuICAgIGxldCB0ZW1wbGF0ZTogU3luY0FzeW5jPHN0cmluZz47XG4gICAgbGV0IHRlbXBsYXRlVXJsOiBzdHJpbmc7XG4gICAgaWYgKHByZW5vbURhdGEudGVtcGxhdGUgIT0gbnVsbCkge1xuICAgICAgdGVtcGxhdGUgPSBwcmVub21EYXRhLnRlbXBsYXRlO1xuICAgICAgdGVtcGxhdGVVcmwgPSBwcmVub21EYXRhLm1vZHVsZVVybDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGVVcmwgPSB0aGlzLl91cmxSZXNvbHZlci5yZXNvbHZlKHByZW5vbURhdGEubW9kdWxlVXJsLCBwcmVub21EYXRhLnRlbXBsYXRlVXJsISk7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuX2ZldGNoKHRlbXBsYXRlVXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIFN5bmNBc3luYy50aGVuKFxuICAgICAgICB0ZW1wbGF0ZSwgKHRlbXBsYXRlKSA9PiB0aGlzLl9wcmVwYXJzZUxvYWRlZFRlbXBsYXRlKHByZW5vbURhdGEsIHRlbXBsYXRlLCB0ZW1wbGF0ZVVybCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcHJlcGFyc2VMb2FkZWRUZW1wbGF0ZShcbiAgICAgIHByZW5vcm1EYXRhOiBQcmVub3JtYWxpemVkVGVtcGxhdGVNZXRhZGF0YSwgdGVtcGxhdGU6IHN0cmluZyxcbiAgICAgIHRlbXBsYXRlQWJzVXJsOiBzdHJpbmcpOiBQcmVwYXJzZWRUZW1wbGF0ZSB7XG4gICAgY29uc3QgaXNJbmxpbmUgPSAhIXByZW5vcm1EYXRhLnRlbXBsYXRlO1xuICAgIGNvbnN0IGludGVycG9sYXRpb25Db25maWcgPSBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheShwcmVub3JtRGF0YS5pbnRlcnBvbGF0aW9uISk7XG4gICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0ZW1wbGF0ZVNvdXJjZVVybChcbiAgICAgICAge3JlZmVyZW5jZTogcHJlbm9ybURhdGEubmdNb2R1bGVUeXBlfSwge3R5cGU6IHtyZWZlcmVuY2U6IHByZW5vcm1EYXRhLmNvbXBvbmVudFR5cGV9fSxcbiAgICAgICAge2lzSW5saW5lLCB0ZW1wbGF0ZVVybDogdGVtcGxhdGVBYnNVcmx9KTtcbiAgICBjb25zdCByb290Tm9kZXNBbmRFcnJvcnMgPSB0aGlzLl9odG1sUGFyc2VyLnBhcnNlKFxuICAgICAgICB0ZW1wbGF0ZSwgdGVtcGxhdGVVcmwsIHt0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlLCBpbnRlcnBvbGF0aW9uQ29uZmlnfSk7XG4gICAgaWYgKHJvb3ROb2Rlc0FuZEVycm9ycy5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZXJyb3JTdHJpbmcgPSByb290Tm9kZXNBbmRFcnJvcnMuZXJyb3JzLmpvaW4oJ1xcbicpO1xuICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYFRlbXBsYXRlIHBhcnNlIGVycm9yczpcXG4ke2Vycm9yU3RyaW5nfWApO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlTWV0YWRhdGFTdHlsZXMgPSB0aGlzLl9ub3JtYWxpemVTdHlsZXNoZWV0KG5ldyBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhKFxuICAgICAgICB7c3R5bGVzOiBwcmVub3JtRGF0YS5zdHlsZXMsIG1vZHVsZVVybDogcHJlbm9ybURhdGEubW9kdWxlVXJsfSkpO1xuXG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVByZXBhcnNlVmlzaXRvcigpO1xuICAgIGh0bWwudmlzaXRBbGwodmlzaXRvciwgcm9vdE5vZGVzQW5kRXJyb3JzLnJvb3ROb2Rlcyk7XG4gICAgY29uc3QgdGVtcGxhdGVTdHlsZXMgPSB0aGlzLl9ub3JtYWxpemVTdHlsZXNoZWV0KG5ldyBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhKFxuICAgICAgICB7c3R5bGVzOiB2aXNpdG9yLnN0eWxlcywgc3R5bGVVcmxzOiB2aXNpdG9yLnN0eWxlVXJscywgbW9kdWxlVXJsOiB0ZW1wbGF0ZUFic1VybH0pKTtcblxuICAgIGNvbnN0IHN0eWxlcyA9IHRlbXBsYXRlTWV0YWRhdGFTdHlsZXMuc3R5bGVzLmNvbmNhdCh0ZW1wbGF0ZVN0eWxlcy5zdHlsZXMpO1xuXG4gICAgY29uc3QgaW5saW5lU3R5bGVVcmxzID0gdGVtcGxhdGVNZXRhZGF0YVN0eWxlcy5zdHlsZVVybHMuY29uY2F0KHRlbXBsYXRlU3R5bGVzLnN0eWxlVXJscyk7XG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAuX25vcm1hbGl6ZVN0eWxlc2hlZXQobmV3IENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGEoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7c3R5bGVVcmxzOiBwcmVub3JtRGF0YS5zdHlsZVVybHMsIG1vZHVsZVVybDogcHJlbm9ybURhdGEubW9kdWxlVXJsfSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZVVybHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlQWJzVXJsLFxuICAgICAgaXNJbmxpbmUsXG4gICAgICBodG1sQXN0OiByb290Tm9kZXNBbmRFcnJvcnMsXG4gICAgICBzdHlsZXMsXG4gICAgICBpbmxpbmVTdHlsZVVybHMsXG4gICAgICBzdHlsZVVybHMsXG4gICAgICBuZ0NvbnRlbnRTZWxlY3RvcnM6IHZpc2l0b3IubmdDb250ZW50U2VsZWN0b3JzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9ub3JtYWxpemVUZW1wbGF0ZU1ldGFkYXRhKFxuICAgICAgcHJlbm9ybURhdGE6IFByZW5vcm1hbGl6ZWRUZW1wbGF0ZU1ldGFkYXRhLFxuICAgICAgcHJlcGFyc2VkVGVtcGxhdGU6IFByZXBhcnNlZFRlbXBsYXRlKTogU3luY0FzeW5jPENvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhPiB7XG4gICAgcmV0dXJuIFN5bmNBc3luYy50aGVuKFxuICAgICAgICB0aGlzLl9sb2FkTWlzc2luZ0V4dGVybmFsU3R5bGVzaGVldHMoXG4gICAgICAgICAgICBwcmVwYXJzZWRUZW1wbGF0ZS5zdHlsZVVybHMuY29uY2F0KHByZXBhcnNlZFRlbXBsYXRlLmlubGluZVN0eWxlVXJscykpLFxuICAgICAgICAoZXh0ZXJuYWxTdHlsZXNoZWV0cykgPT4gdGhpcy5fbm9ybWFsaXplTG9hZGVkVGVtcGxhdGVNZXRhZGF0YShcbiAgICAgICAgICAgIHByZW5vcm1EYXRhLCBwcmVwYXJzZWRUZW1wbGF0ZSwgZXh0ZXJuYWxTdHlsZXNoZWV0cykpO1xuICB9XG5cbiAgcHJpdmF0ZSBfbm9ybWFsaXplTG9hZGVkVGVtcGxhdGVNZXRhZGF0YShcbiAgICAgIHByZW5vcm1EYXRhOiBQcmVub3JtYWxpemVkVGVtcGxhdGVNZXRhZGF0YSwgcHJlcGFyc2VkVGVtcGxhdGU6IFByZXBhcnNlZFRlbXBsYXRlLFxuICAgICAgc3R5bGVzaGVldHM6IE1hcDxzdHJpbmcsIENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGE+KTogQ29tcGlsZVRlbXBsYXRlTWV0YWRhdGEge1xuICAgIC8vIEFsZ29yaXRobTpcbiAgICAvLyAtIHByb2R1Y2UgZXhhY3RseSAxIGVudHJ5IHBlciBvcmlnaW5hbCBzdHlsZVVybCBpblxuICAgIC8vIENvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhLmV4dGVybmFsU3R5bGVzaGVldHMgd2l0aCBhbGwgc3R5bGVzIGlubGluZWRcbiAgICAvLyAtIGlubGluZSBhbGwgc3R5bGVzIHRoYXQgYXJlIHJlZmVyZW5jZWQgYnkgdGhlIHRlbXBsYXRlIGludG8gQ29tcGlsZVRlbXBsYXRlTWV0YWRhdGEuc3R5bGVzLlxuICAgIC8vIFJlYXNvbjogYmUgYWJsZSB0byBkZXRlcm1pbmUgaG93IG1hbnkgc3R5bGVzaGVldHMgdGhlcmUgYXJlIGV2ZW4gd2l0aG91dCBsb2FkaW5nXG4gICAgLy8gdGhlIHRlbXBsYXRlIG5vciB0aGUgc3R5bGVzaGVldHMsIHNvIHdlIGNhbiBjcmVhdGUgYSBzdHViIGZvciBUeXBlU2NyaXB0IGFsd2F5cyBzeW5jaHJvbm91c2x5XG4gICAgLy8gKGFzIHJlc291cmNlIGxvYWRpbmcgbWF5IGJlIGFzeW5jKVxuXG4gICAgY29uc3Qgc3R5bGVzID0gWy4uLnByZXBhcnNlZFRlbXBsYXRlLnN0eWxlc107XG4gICAgdGhpcy5faW5saW5lU3R5bGVzKHByZXBhcnNlZFRlbXBsYXRlLmlubGluZVN0eWxlVXJscywgc3R5bGVzaGVldHMsIHN0eWxlcyk7XG4gICAgY29uc3Qgc3R5bGVVcmxzID0gcHJlcGFyc2VkVGVtcGxhdGUuc3R5bGVVcmxzO1xuXG4gICAgY29uc3QgZXh0ZXJuYWxTdHlsZXNoZWV0cyA9IHN0eWxlVXJscy5tYXAoc3R5bGVVcmwgPT4ge1xuICAgICAgY29uc3Qgc3R5bGVzaGVldCA9IHN0eWxlc2hlZXRzLmdldChzdHlsZVVybCkhO1xuICAgICAgY29uc3Qgc3R5bGVzID0gWy4uLnN0eWxlc2hlZXQuc3R5bGVzXTtcbiAgICAgIHRoaXMuX2lubGluZVN0eWxlcyhzdHlsZXNoZWV0LnN0eWxlVXJscywgc3R5bGVzaGVldHMsIHN0eWxlcyk7XG4gICAgICByZXR1cm4gbmV3IENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGEoe21vZHVsZVVybDogc3R5bGVVcmwsIHN0eWxlczogc3R5bGVzfSk7XG4gICAgfSk7XG5cbiAgICBsZXQgZW5jYXBzdWxhdGlvbiA9IHByZW5vcm1EYXRhLmVuY2Fwc3VsYXRpb247XG4gICAgaWYgKGVuY2Fwc3VsYXRpb24gPT0gbnVsbCkge1xuICAgICAgZW5jYXBzdWxhdGlvbiA9IHRoaXMuX2NvbmZpZy5kZWZhdWx0RW5jYXBzdWxhdGlvbjtcbiAgICB9XG4gICAgaWYgKGVuY2Fwc3VsYXRpb24gPT09IFZpZXdFbmNhcHN1bGF0aW9uLkVtdWxhdGVkICYmIHN0eWxlcy5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgc3R5bGVVcmxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZW5jYXBzdWxhdGlvbiA9IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmU7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQ29tcGlsZVRlbXBsYXRlTWV0YWRhdGEoe1xuICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgIHRlbXBsYXRlOiBwcmVwYXJzZWRUZW1wbGF0ZS50ZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlVXJsOiBwcmVwYXJzZWRUZW1wbGF0ZS50ZW1wbGF0ZVVybCxcbiAgICAgIGh0bWxBc3Q6IHByZXBhcnNlZFRlbXBsYXRlLmh0bWxBc3QsXG4gICAgICBzdHlsZXMsXG4gICAgICBzdHlsZVVybHMsXG4gICAgICBuZ0NvbnRlbnRTZWxlY3RvcnM6IHByZXBhcnNlZFRlbXBsYXRlLm5nQ29udGVudFNlbGVjdG9ycyxcbiAgICAgIGFuaW1hdGlvbnM6IHByZW5vcm1EYXRhLmFuaW1hdGlvbnMsXG4gICAgICBpbnRlcnBvbGF0aW9uOiBwcmVub3JtRGF0YS5pbnRlcnBvbGF0aW9uLFxuICAgICAgaXNJbmxpbmU6IHByZXBhcnNlZFRlbXBsYXRlLmlzSW5saW5lLFxuICAgICAgZXh0ZXJuYWxTdHlsZXNoZWV0cyxcbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXM6IHByZXNlcnZlV2hpdGVzcGFjZXNEZWZhdWx0KFxuICAgICAgICAgIHByZW5vcm1EYXRhLnByZXNlcnZlV2hpdGVzcGFjZXMsIHRoaXMuX2NvbmZpZy5wcmVzZXJ2ZVdoaXRlc3BhY2VzKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2lubGluZVN0eWxlcyhcbiAgICAgIHN0eWxlVXJsczogc3RyaW5nW10sIHN0eWxlc2hlZXRzOiBNYXA8c3RyaW5nLCBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhPixcbiAgICAgIHRhcmdldFN0eWxlczogc3RyaW5nW10pIHtcbiAgICBzdHlsZVVybHMuZm9yRWFjaChzdHlsZVVybCA9PiB7XG4gICAgICBjb25zdCBzdHlsZXNoZWV0ID0gc3R5bGVzaGVldHMuZ2V0KHN0eWxlVXJsKSE7XG4gICAgICBzdHlsZXNoZWV0LnN0eWxlcy5mb3JFYWNoKHN0eWxlID0+IHRhcmdldFN0eWxlcy5wdXNoKHN0eWxlKSk7XG4gICAgICB0aGlzLl9pbmxpbmVTdHlsZXMoc3R5bGVzaGVldC5zdHlsZVVybHMsIHN0eWxlc2hlZXRzLCB0YXJnZXRTdHlsZXMpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZE1pc3NpbmdFeHRlcm5hbFN0eWxlc2hlZXRzKFxuICAgICAgc3R5bGVVcmxzOiBzdHJpbmdbXSxcbiAgICAgIGxvYWRlZFN0eWxlc2hlZXRzOlxuICAgICAgICAgIE1hcDxzdHJpbmcsIENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGE+ID0gbmV3IE1hcDxzdHJpbmcsIENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGE+KCkpOlxuICAgICAgU3luY0FzeW5jPE1hcDxzdHJpbmcsIENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGE+PiB7XG4gICAgcmV0dXJuIFN5bmNBc3luYy50aGVuKFxuICAgICAgICBTeW5jQXN5bmMuYWxsKHN0eWxlVXJscy5maWx0ZXIoKHN0eWxlVXJsKSA9PiAhbG9hZGVkU3R5bGVzaGVldHMuaGFzKHN0eWxlVXJsKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlVXJsID0+IFN5bmNBc3luYy50aGVuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2ZldGNoKHN0eWxlVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobG9hZGVkU3R5bGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlc2hlZXQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX25vcm1hbGl6ZVN0eWxlc2hlZXQobmV3IENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGEoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtzdHlsZXM6IFtsb2FkZWRTdHlsZV0sIG1vZHVsZVVybDogc3R5bGVVcmx9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWRTdHlsZXNoZWV0cy5zZXQoc3R5bGVVcmwsIHN0eWxlc2hlZXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvYWRNaXNzaW5nRXh0ZXJuYWxTdHlsZXNoZWV0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZXNoZWV0LnN0eWxlVXJscywgbG9hZGVkU3R5bGVzaGVldHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSksXG4gICAgICAgIChfKSA9PiBsb2FkZWRTdHlsZXNoZWV0cyk7XG4gIH1cblxuICBwcml2YXRlIF9ub3JtYWxpemVTdHlsZXNoZWV0KHN0eWxlc2hlZXQ6IENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGEpOiBDb21waWxlU3R5bGVzaGVldE1ldGFkYXRhIHtcbiAgICBjb25zdCBtb2R1bGVVcmwgPSBzdHlsZXNoZWV0Lm1vZHVsZVVybCE7XG4gICAgY29uc3QgYWxsU3R5bGVVcmxzID0gc3R5bGVzaGVldC5zdHlsZVVybHMuZmlsdGVyKGlzU3R5bGVVcmxSZXNvbHZhYmxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHVybCA9PiB0aGlzLl91cmxSZXNvbHZlci5yZXNvbHZlKG1vZHVsZVVybCwgdXJsKSk7XG5cbiAgICBjb25zdCBhbGxTdHlsZXMgPSBzdHlsZXNoZWV0LnN0eWxlcy5tYXAoc3R5bGUgPT4ge1xuICAgICAgY29uc3Qgc3R5bGVXaXRoSW1wb3J0cyA9IGV4dHJhY3RTdHlsZVVybHModGhpcy5fdXJsUmVzb2x2ZXIsIG1vZHVsZVVybCwgc3R5bGUpO1xuICAgICAgYWxsU3R5bGVVcmxzLnB1c2goLi4uc3R5bGVXaXRoSW1wb3J0cy5zdHlsZVVybHMpO1xuICAgICAgcmV0dXJuIHN0eWxlV2l0aEltcG9ydHMuc3R5bGU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IENvbXBpbGVTdHlsZXNoZWV0TWV0YWRhdGEoXG4gICAgICAgIHtzdHlsZXM6IGFsbFN0eWxlcywgc3R5bGVVcmxzOiBhbGxTdHlsZVVybHMsIG1vZHVsZVVybDogbW9kdWxlVXJsfSk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFByZXBhcnNlZFRlbXBsYXRlIHtcbiAgdGVtcGxhdGU6IHN0cmluZztcbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcbiAgaXNJbmxpbmU6IGJvb2xlYW47XG4gIGh0bWxBc3Q6IEh0bWxQYXJzZVRyZWVSZXN1bHQ7XG4gIHN0eWxlczogc3RyaW5nW107XG4gIGlubGluZVN0eWxlVXJsczogc3RyaW5nW107XG4gIHN0eWxlVXJsczogc3RyaW5nW107XG4gIG5nQ29udGVudFNlbGVjdG9yczogc3RyaW5nW107XG59XG5cbmNsYXNzIFRlbXBsYXRlUHJlcGFyc2VWaXNpdG9yIGltcGxlbWVudHMgaHRtbC5WaXNpdG9yIHtcbiAgbmdDb250ZW50U2VsZWN0b3JzOiBzdHJpbmdbXSA9IFtdO1xuICBzdHlsZXM6IHN0cmluZ1tdID0gW107XG4gIHN0eWxlVXJsczogc3RyaW5nW10gPSBbXTtcbiAgbmdOb25CaW5kYWJsZVN0YWNrQ291bnQ6IG51bWJlciA9IDA7XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogaHRtbC5FbGVtZW50LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IHByZXBhcnNlZEVsZW1lbnQgPSBwcmVwYXJzZUVsZW1lbnQoYXN0KTtcbiAgICBzd2l0Y2ggKHByZXBhcnNlZEVsZW1lbnQudHlwZSkge1xuICAgICAgY2FzZSBQcmVwYXJzZWRFbGVtZW50VHlwZS5OR19DT05URU5UOlxuICAgICAgICBpZiAodGhpcy5uZ05vbkJpbmRhYmxlU3RhY2tDb3VudCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMubmdDb250ZW50U2VsZWN0b3JzLnB1c2gocHJlcGFyc2VkRWxlbWVudC5zZWxlY3RBdHRyKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUHJlcGFyc2VkRWxlbWVudFR5cGUuU1RZTEU6XG4gICAgICAgIGxldCB0ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICBhc3QuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgaHRtbC5UZXh0KSB7XG4gICAgICAgICAgICB0ZXh0Q29udGVudCArPSBjaGlsZC52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0eWxlcy5wdXNoKHRleHRDb250ZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFByZXBhcnNlZEVsZW1lbnRUeXBlLlNUWUxFU0hFRVQ6XG4gICAgICAgIHRoaXMuc3R5bGVVcmxzLnB1c2gocHJlcGFyc2VkRWxlbWVudC5ocmVmQXR0cik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChwcmVwYXJzZWRFbGVtZW50Lm5vbkJpbmRhYmxlKSB7XG4gICAgICB0aGlzLm5nTm9uQmluZGFibGVTdGFja0NvdW50Kys7XG4gICAgfVxuICAgIGh0bWwudmlzaXRBbGwodGhpcywgYXN0LmNoaWxkcmVuKTtcbiAgICBpZiAocHJlcGFyc2VkRWxlbWVudC5ub25CaW5kYWJsZSkge1xuICAgICAgdGhpcy5uZ05vbkJpbmRhYmxlU3RhY2tDb3VudC0tO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGFzdDogaHRtbC5FeHBhbnNpb24sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgaHRtbC52aXNpdEFsbCh0aGlzLCBhc3QuY2FzZXMpO1xuICB9XG5cbiAgdmlzaXRFeHBhbnNpb25DYXNlKGFzdDogaHRtbC5FeHBhbnNpb25DYXNlLCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGh0bWwudmlzaXRBbGwodGhpcywgYXN0LmV4cHJlc3Npb24pO1xuICB9XG5cbiAgdmlzaXRDb21tZW50KGFzdDogaHRtbC5Db21tZW50LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZpc2l0QXR0cmlidXRlKGFzdDogaHRtbC5BdHRyaWJ1dGUsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdmlzaXRUZXh0KGFzdDogaHRtbC5UZXh0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=