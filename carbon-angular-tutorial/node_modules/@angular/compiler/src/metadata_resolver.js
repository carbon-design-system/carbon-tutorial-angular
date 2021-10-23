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
        define("@angular/compiler/src/metadata_resolver", ["require", "exports", "tslib", "@angular/compiler/src/aot/static_symbol", "@angular/compiler/src/aot/util", "@angular/compiler/src/assertions", "@angular/compiler/src/compile_metadata", "@angular/compiler/src/core", "@angular/compiler/src/directive_resolver", "@angular/compiler/src/identifiers", "@angular/compiler/src/lifecycle_reflector", "@angular/compiler/src/parse_util", "@angular/compiler/src/selector", "@angular/compiler/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompileMetadataResolver = exports.getMissingNgModuleMetadataErrorData = exports.ERROR_COMPONENT_TYPE = void 0;
    var tslib_1 = require("tslib");
    var static_symbol_1 = require("@angular/compiler/src/aot/static_symbol");
    var util_1 = require("@angular/compiler/src/aot/util");
    var assertions_1 = require("@angular/compiler/src/assertions");
    var cpl = require("@angular/compiler/src/compile_metadata");
    var core_1 = require("@angular/compiler/src/core");
    var directive_resolver_1 = require("@angular/compiler/src/directive_resolver");
    var identifiers_1 = require("@angular/compiler/src/identifiers");
    var lifecycle_reflector_1 = require("@angular/compiler/src/lifecycle_reflector");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var selector_1 = require("@angular/compiler/src/selector");
    var util_2 = require("@angular/compiler/src/util");
    exports.ERROR_COMPONENT_TYPE = 'ngComponentType';
    var MISSING_NG_MODULE_METADATA_ERROR_DATA = 'ngMissingNgModuleMetadataErrorData';
    function getMissingNgModuleMetadataErrorData(error) {
        var _a;
        return (_a = error[MISSING_NG_MODULE_METADATA_ERROR_DATA]) !== null && _a !== void 0 ? _a : null;
    }
    exports.getMissingNgModuleMetadataErrorData = getMissingNgModuleMetadataErrorData;
    // Design notes:
    // - don't lazily create metadata:
    //   For some metadata, we need to do async work sometimes,
    //   so the user has to kick off this loading.
    //   But we want to report errors even when the async work is
    //   not required to check that the user would have been able
    //   to wait correctly.
    var CompileMetadataResolver = /** @class */ (function () {
        function CompileMetadataResolver(_config, _htmlParser, _ngModuleResolver, _directiveResolver, _pipeResolver, _summaryResolver, _schemaRegistry, _directiveNormalizer, _console, _staticSymbolCache, _reflector, _errorCollector) {
            this._config = _config;
            this._htmlParser = _htmlParser;
            this._ngModuleResolver = _ngModuleResolver;
            this._directiveResolver = _directiveResolver;
            this._pipeResolver = _pipeResolver;
            this._summaryResolver = _summaryResolver;
            this._schemaRegistry = _schemaRegistry;
            this._directiveNormalizer = _directiveNormalizer;
            this._console = _console;
            this._staticSymbolCache = _staticSymbolCache;
            this._reflector = _reflector;
            this._errorCollector = _errorCollector;
            this._nonNormalizedDirectiveCache = new Map();
            this._directiveCache = new Map();
            this._summaryCache = new Map();
            this._pipeCache = new Map();
            this._ngModuleCache = new Map();
            this._ngModuleOfTypes = new Map();
            this._shallowModuleCache = new Map();
        }
        CompileMetadataResolver.prototype.getReflector = function () {
            return this._reflector;
        };
        CompileMetadataResolver.prototype.clearCacheFor = function (type) {
            var dirMeta = this._directiveCache.get(type);
            this._directiveCache.delete(type);
            this._nonNormalizedDirectiveCache.delete(type);
            this._summaryCache.delete(type);
            this._pipeCache.delete(type);
            this._ngModuleOfTypes.delete(type);
            // Clear all of the NgModule as they contain transitive information!
            this._ngModuleCache.clear();
            if (dirMeta) {
                this._directiveNormalizer.clearCacheFor(dirMeta);
            }
        };
        CompileMetadataResolver.prototype.clearCache = function () {
            this._directiveCache.clear();
            this._nonNormalizedDirectiveCache.clear();
            this._summaryCache.clear();
            this._pipeCache.clear();
            this._ngModuleCache.clear();
            this._ngModuleOfTypes.clear();
            this._directiveNormalizer.clearCache();
        };
        CompileMetadataResolver.prototype._createProxyClass = function (baseType, name) {
            var delegate = null;
            var proxyClass = function () {
                if (!delegate) {
                    throw new Error("Illegal state: Class " + name + " for type " + util_2.stringify(baseType) + " is not compiled yet!");
                }
                return delegate.apply(this, arguments);
            };
            proxyClass.setDelegate = function (d) {
                delegate = d;
                proxyClass.prototype = d.prototype;
            };
            // Make stringify work correctly
            proxyClass.overriddenName = name;
            return proxyClass;
        };
        CompileMetadataResolver.prototype.getGeneratedClass = function (dirType, name) {
            if (dirType instanceof static_symbol_1.StaticSymbol) {
                return this._staticSymbolCache.get(util_1.ngfactoryFilePath(dirType.filePath), name);
            }
            else {
                return this._createProxyClass(dirType, name);
            }
        };
        CompileMetadataResolver.prototype.getComponentViewClass = function (dirType) {
            return this.getGeneratedClass(dirType, cpl.viewClassName(dirType, 0));
        };
        CompileMetadataResolver.prototype.getHostComponentViewClass = function (dirType) {
            return this.getGeneratedClass(dirType, cpl.hostViewClassName(dirType));
        };
        CompileMetadataResolver.prototype.getHostComponentType = function (dirType) {
            var name = parse_util_1.identifierName({ reference: dirType }) + "_Host";
            if (dirType instanceof static_symbol_1.StaticSymbol) {
                return this._staticSymbolCache.get(dirType.filePath, name);
            }
            return this._createProxyClass(dirType, name);
        };
        CompileMetadataResolver.prototype.getRendererType = function (dirType) {
            if (dirType instanceof static_symbol_1.StaticSymbol) {
                return this._staticSymbolCache.get(util_1.ngfactoryFilePath(dirType.filePath), cpl.rendererTypeName(dirType));
            }
            else {
                // returning an object as proxy,
                // that we fill later during runtime compilation.
                return {};
            }
        };
        CompileMetadataResolver.prototype.getComponentFactory = function (selector, dirType, inputs, outputs) {
            if (dirType instanceof static_symbol_1.StaticSymbol) {
                return this._staticSymbolCache.get(util_1.ngfactoryFilePath(dirType.filePath), cpl.componentFactoryName(dirType));
            }
            else {
                var hostView = this.getHostComponentViewClass(dirType);
                // Note: ngContentSelectors will be filled later once the template is
                // loaded.
                var createComponentFactory = this._reflector.resolveExternalReference(identifiers_1.Identifiers.createComponentFactory);
                return createComponentFactory(selector, dirType, hostView, inputs, outputs, []);
            }
        };
        CompileMetadataResolver.prototype.initComponentFactory = function (factory, ngContentSelectors) {
            var _a;
            if (!(factory instanceof static_symbol_1.StaticSymbol)) {
                (_a = factory.ngContentSelectors).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(ngContentSelectors)));
            }
        };
        CompileMetadataResolver.prototype._loadSummary = function (type, kind) {
            var typeSummary = this._summaryCache.get(type);
            if (!typeSummary) {
                var summary = this._summaryResolver.resolveSummary(type);
                typeSummary = summary ? summary.type : null;
                this._summaryCache.set(type, typeSummary || null);
            }
            return typeSummary && typeSummary.summaryKind === kind ? typeSummary : null;
        };
        CompileMetadataResolver.prototype.getHostComponentMetadata = function (compMeta, hostViewType) {
            var hostType = this.getHostComponentType(compMeta.type.reference);
            if (!hostViewType) {
                hostViewType = this.getHostComponentViewClass(hostType);
            }
            // Note: ! is ok here as this method should only be called with normalized directive
            // metadata, which always fills in the selector.
            var template = selector_1.CssSelector.parse(compMeta.selector)[0].getMatchingElementTemplate();
            var templateUrl = '';
            var htmlAst = this._htmlParser.parse(template, templateUrl);
            return cpl.CompileDirectiveMetadata.create({
                isHost: true,
                type: { reference: hostType, diDeps: [], lifecycleHooks: [] },
                template: new cpl.CompileTemplateMetadata({
                    encapsulation: core_1.ViewEncapsulation.None,
                    template: template,
                    templateUrl: templateUrl,
                    htmlAst: htmlAst,
                    styles: [],
                    styleUrls: [],
                    ngContentSelectors: [],
                    animations: [],
                    isInline: true,
                    externalStylesheets: [],
                    interpolation: null,
                    preserveWhitespaces: false,
                }),
                exportAs: null,
                changeDetection: core_1.ChangeDetectionStrategy.Default,
                inputs: [],
                outputs: [],
                host: {},
                isComponent: true,
                selector: '*',
                providers: [],
                viewProviders: [],
                queries: [],
                guards: {},
                viewQueries: [],
                componentViewType: hostViewType,
                rendererType: { id: '__Host__', encapsulation: core_1.ViewEncapsulation.None, styles: [], data: {} },
                entryComponents: [],
                componentFactory: null
            });
        };
        CompileMetadataResolver.prototype.loadDirectiveMetadata = function (ngModuleType, directiveType, isSync) {
            var _this = this;
            if (this._directiveCache.has(directiveType)) {
                return null;
            }
            directiveType = util_2.resolveForwardRef(directiveType);
            var _a = this.getNonNormalizedDirectiveMetadata(directiveType), annotation = _a.annotation, metadata = _a.metadata;
            var createDirectiveMetadata = function (templateMetadata) {
                var normalizedDirMeta = new cpl.CompileDirectiveMetadata({
                    isHost: false,
                    type: metadata.type,
                    isComponent: metadata.isComponent,
                    selector: metadata.selector,
                    exportAs: metadata.exportAs,
                    changeDetection: metadata.changeDetection,
                    inputs: metadata.inputs,
                    outputs: metadata.outputs,
                    hostListeners: metadata.hostListeners,
                    hostProperties: metadata.hostProperties,
                    hostAttributes: metadata.hostAttributes,
                    providers: metadata.providers,
                    viewProviders: metadata.viewProviders,
                    queries: metadata.queries,
                    guards: metadata.guards,
                    viewQueries: metadata.viewQueries,
                    entryComponents: metadata.entryComponents,
                    componentViewType: metadata.componentViewType,
                    rendererType: metadata.rendererType,
                    componentFactory: metadata.componentFactory,
                    template: templateMetadata
                });
                if (templateMetadata) {
                    _this.initComponentFactory(metadata.componentFactory, templateMetadata.ngContentSelectors);
                }
                _this._directiveCache.set(directiveType, normalizedDirMeta);
                _this._summaryCache.set(directiveType, normalizedDirMeta.toSummary());
                return null;
            };
            if (metadata.isComponent) {
                var template = metadata.template;
                var templateMeta = this._directiveNormalizer.normalizeTemplate({
                    ngModuleType: ngModuleType,
                    componentType: directiveType,
                    moduleUrl: this._reflector.componentModuleUrl(directiveType, annotation),
                    encapsulation: template.encapsulation,
                    template: template.template,
                    templateUrl: template.templateUrl,
                    styles: template.styles,
                    styleUrls: template.styleUrls,
                    animations: template.animations,
                    interpolation: template.interpolation,
                    preserveWhitespaces: template.preserveWhitespaces
                });
                if (util_2.isPromise(templateMeta) && isSync) {
                    this._reportError(componentStillLoadingError(directiveType), directiveType);
                    return null;
                }
                return util_2.SyncAsync.then(templateMeta, createDirectiveMetadata);
            }
            else {
                // directive
                createDirectiveMetadata(null);
                return null;
            }
        };
        CompileMetadataResolver.prototype.getNonNormalizedDirectiveMetadata = function (directiveType) {
            var _this = this;
            directiveType = util_2.resolveForwardRef(directiveType);
            if (!directiveType) {
                return null;
            }
            var cacheEntry = this._nonNormalizedDirectiveCache.get(directiveType);
            if (cacheEntry) {
                return cacheEntry;
            }
            var dirMeta = this._directiveResolver.resolve(directiveType, false);
            if (!dirMeta) {
                return null;
            }
            var nonNormalizedTemplateMetadata = undefined;
            if (core_1.createComponent.isTypeOf(dirMeta)) {
                // component
                var compMeta = dirMeta;
                assertions_1.assertArrayOfStrings('styles', compMeta.styles);
                assertions_1.assertArrayOfStrings('styleUrls', compMeta.styleUrls);
                assertions_1.assertInterpolationSymbols('interpolation', compMeta.interpolation);
                var animations = compMeta.animations;
                nonNormalizedTemplateMetadata = new cpl.CompileTemplateMetadata({
                    encapsulation: util_2.noUndefined(compMeta.encapsulation),
                    template: util_2.noUndefined(compMeta.template),
                    templateUrl: util_2.noUndefined(compMeta.templateUrl),
                    htmlAst: null,
                    styles: compMeta.styles || [],
                    styleUrls: compMeta.styleUrls || [],
                    animations: animations || [],
                    interpolation: util_2.noUndefined(compMeta.interpolation),
                    isInline: !!compMeta.template,
                    externalStylesheets: [],
                    ngContentSelectors: [],
                    preserveWhitespaces: util_2.noUndefined(dirMeta.preserveWhitespaces),
                });
            }
            var changeDetectionStrategy = null;
            var viewProviders = [];
            var entryComponentMetadata = [];
            var selector = dirMeta.selector;
            if (core_1.createComponent.isTypeOf(dirMeta)) {
                // Component
                var compMeta = dirMeta;
                changeDetectionStrategy = compMeta.changeDetection;
                if (compMeta.viewProviders) {
                    viewProviders = this._getProvidersMetadata(compMeta.viewProviders, entryComponentMetadata, "viewProviders for \"" + stringifyType(directiveType) + "\"", [], directiveType);
                }
                if (compMeta.entryComponents) {
                    entryComponentMetadata = flattenAndDedupeArray(compMeta.entryComponents)
                        .map(function (type) { return _this._getEntryComponentMetadata(type); })
                        .concat(entryComponentMetadata);
                }
                if (!selector) {
                    selector = this._schemaRegistry.getDefaultComponentElementName();
                }
            }
            else {
                // Directive
                if (!selector) {
                    selector = null;
                }
            }
            var providers = [];
            if (dirMeta.providers != null) {
                providers = this._getProvidersMetadata(dirMeta.providers, entryComponentMetadata, "providers for \"" + stringifyType(directiveType) + "\"", [], directiveType);
            }
            var queries = [];
            var viewQueries = [];
            if (dirMeta.queries != null) {
                queries = this._getQueriesMetadata(dirMeta.queries, false, directiveType);
                viewQueries = this._getQueriesMetadata(dirMeta.queries, true, directiveType);
            }
            var metadata = cpl.CompileDirectiveMetadata.create({
                isHost: false,
                selector: selector,
                exportAs: util_2.noUndefined(dirMeta.exportAs),
                isComponent: !!nonNormalizedTemplateMetadata,
                type: this._getTypeMetadata(directiveType),
                template: nonNormalizedTemplateMetadata,
                changeDetection: changeDetectionStrategy,
                inputs: dirMeta.inputs || [],
                outputs: dirMeta.outputs || [],
                host: dirMeta.host || {},
                providers: providers || [],
                viewProviders: viewProviders || [],
                queries: queries || [],
                guards: dirMeta.guards || {},
                viewQueries: viewQueries || [],
                entryComponents: entryComponentMetadata,
                componentViewType: nonNormalizedTemplateMetadata ? this.getComponentViewClass(directiveType) :
                    null,
                rendererType: nonNormalizedTemplateMetadata ? this.getRendererType(directiveType) : null,
                componentFactory: null
            });
            if (nonNormalizedTemplateMetadata) {
                metadata.componentFactory =
                    this.getComponentFactory(selector, directiveType, metadata.inputs, metadata.outputs);
            }
            cacheEntry = { metadata: metadata, annotation: dirMeta };
            this._nonNormalizedDirectiveCache.set(directiveType, cacheEntry);
            return cacheEntry;
        };
        /**
         * Gets the metadata for the given directive.
         * This assumes `loadNgModuleDirectiveAndPipeMetadata` has been called first.
         */
        CompileMetadataResolver.prototype.getDirectiveMetadata = function (directiveType) {
            var dirMeta = this._directiveCache.get(directiveType);
            if (!dirMeta) {
                this._reportError(parse_util_1.syntaxError("Illegal state: getDirectiveMetadata can only be called after loadNgModuleDirectiveAndPipeMetadata for a module that declares it. Directive " + stringifyType(directiveType) + "."), directiveType);
            }
            return dirMeta;
        };
        CompileMetadataResolver.prototype.getDirectiveSummary = function (dirType) {
            var dirSummary = this._loadSummary(dirType, cpl.CompileSummaryKind.Directive);
            if (!dirSummary) {
                this._reportError(parse_util_1.syntaxError("Illegal state: Could not load the summary for directive " + stringifyType(dirType) + "."), dirType);
            }
            return dirSummary;
        };
        CompileMetadataResolver.prototype.isDirective = function (type) {
            return !!this._loadSummary(type, cpl.CompileSummaryKind.Directive) ||
                this._directiveResolver.isDirective(type);
        };
        CompileMetadataResolver.prototype.isAbstractDirective = function (type) {
            var summary = this._loadSummary(type, cpl.CompileSummaryKind.Directive);
            if (summary && !summary.isComponent) {
                return !summary.selector;
            }
            var meta = this._directiveResolver.resolve(type, false);
            if (meta && !core_1.createComponent.isTypeOf(meta)) {
                return !meta.selector;
            }
            return false;
        };
        CompileMetadataResolver.prototype.isPipe = function (type) {
            return !!this._loadSummary(type, cpl.CompileSummaryKind.Pipe) ||
                this._pipeResolver.isPipe(type);
        };
        CompileMetadataResolver.prototype.isNgModule = function (type) {
            return !!this._loadSummary(type, cpl.CompileSummaryKind.NgModule) ||
                this._ngModuleResolver.isNgModule(type);
        };
        CompileMetadataResolver.prototype.getNgModuleSummary = function (moduleType, alreadyCollecting) {
            if (alreadyCollecting === void 0) { alreadyCollecting = null; }
            var moduleSummary = this._loadSummary(moduleType, cpl.CompileSummaryKind.NgModule);
            if (!moduleSummary) {
                var moduleMeta = this.getNgModuleMetadata(moduleType, false, alreadyCollecting);
                moduleSummary = moduleMeta ? moduleMeta.toSummary() : null;
                if (moduleSummary) {
                    this._summaryCache.set(moduleType, moduleSummary);
                }
            }
            return moduleSummary;
        };
        /**
         * Loads the declared directives and pipes of an NgModule.
         */
        CompileMetadataResolver.prototype.loadNgModuleDirectiveAndPipeMetadata = function (moduleType, isSync, throwIfNotFound) {
            var _this = this;
            if (throwIfNotFound === void 0) { throwIfNotFound = true; }
            var ngModule = this.getNgModuleMetadata(moduleType, throwIfNotFound);
            var loading = [];
            if (ngModule) {
                ngModule.declaredDirectives.forEach(function (id) {
                    var promise = _this.loadDirectiveMetadata(moduleType, id.reference, isSync);
                    if (promise) {
                        loading.push(promise);
                    }
                });
                ngModule.declaredPipes.forEach(function (id) { return _this._loadPipeMetadata(id.reference); });
            }
            return Promise.all(loading);
        };
        CompileMetadataResolver.prototype.getShallowModuleMetadata = function (moduleType) {
            var compileMeta = this._shallowModuleCache.get(moduleType);
            if (compileMeta) {
                return compileMeta;
            }
            var ngModuleMeta = directive_resolver_1.findLast(this._reflector.shallowAnnotations(moduleType), core_1.createNgModule.isTypeOf);
            compileMeta = {
                type: this._getTypeMetadata(moduleType),
                rawExports: ngModuleMeta.exports,
                rawImports: ngModuleMeta.imports,
                rawProviders: ngModuleMeta.providers,
            };
            this._shallowModuleCache.set(moduleType, compileMeta);
            return compileMeta;
        };
        CompileMetadataResolver.prototype.getNgModuleMetadata = function (moduleType, throwIfNotFound, alreadyCollecting) {
            var _this = this;
            if (throwIfNotFound === void 0) { throwIfNotFound = true; }
            if (alreadyCollecting === void 0) { alreadyCollecting = null; }
            moduleType = util_2.resolveForwardRef(moduleType);
            var compileMeta = this._ngModuleCache.get(moduleType);
            if (compileMeta) {
                return compileMeta;
            }
            var meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound);
            if (!meta) {
                return null;
            }
            var declaredDirectives = [];
            var exportedNonModuleIdentifiers = [];
            var declaredPipes = [];
            var importedModules = [];
            var exportedModules = [];
            var providers = [];
            var entryComponents = [];
            var bootstrapComponents = [];
            var schemas = [];
            if (meta.imports) {
                flattenAndDedupeArray(meta.imports).forEach(function (importedType) {
                    var importedModuleType = undefined;
                    if (isValidType(importedType)) {
                        importedModuleType = importedType;
                    }
                    else if (importedType && importedType.ngModule) {
                        var moduleWithProviders = importedType;
                        importedModuleType = moduleWithProviders.ngModule;
                        if (moduleWithProviders.providers) {
                            providers.push.apply(providers, tslib_1.__spreadArray([], tslib_1.__read(_this._getProvidersMetadata(moduleWithProviders.providers, entryComponents, "provider for the NgModule '" + stringifyType(importedModuleType) + "'", [], importedType))));
                        }
                    }
                    if (importedModuleType) {
                        if (_this._checkSelfImport(moduleType, importedModuleType))
                            return;
                        if (!alreadyCollecting)
                            alreadyCollecting = new Set();
                        if (alreadyCollecting.has(importedModuleType)) {
                            _this._reportError(parse_util_1.syntaxError(_this._getTypeDescriptor(importedModuleType) + " '" + stringifyType(importedType) + "' is imported recursively by the module '" + stringifyType(moduleType) + "'."), moduleType);
                            return;
                        }
                        alreadyCollecting.add(importedModuleType);
                        var importedModuleSummary = _this.getNgModuleSummary(importedModuleType, alreadyCollecting);
                        alreadyCollecting.delete(importedModuleType);
                        if (!importedModuleSummary) {
                            var err = parse_util_1.syntaxError("Unexpected " + _this._getTypeDescriptor(importedType) + " '" + stringifyType(importedType) + "' imported by the module '" + stringifyType(moduleType) + "'. Please add a @NgModule annotation.");
                            // If possible, record additional context for this error to enable more useful
                            // diagnostics on the compiler side.
                            if (importedType instanceof static_symbol_1.StaticSymbol) {
                                err[MISSING_NG_MODULE_METADATA_ERROR_DATA] = {
                                    fileName: importedType.filePath,
                                    className: importedType.name,
                                };
                            }
                            _this._reportError(err, moduleType);
                            return;
                        }
                        importedModules.push(importedModuleSummary);
                    }
                    else {
                        _this._reportError(parse_util_1.syntaxError("Unexpected value '" + stringifyType(importedType) + "' imported by the module '" + stringifyType(moduleType) + "'"), moduleType);
                        return;
                    }
                });
            }
            if (meta.exports) {
                flattenAndDedupeArray(meta.exports).forEach(function (exportedType) {
                    if (!isValidType(exportedType)) {
                        _this._reportError(parse_util_1.syntaxError("Unexpected value '" + stringifyType(exportedType) + "' exported by the module '" + stringifyType(moduleType) + "'"), moduleType);
                        return;
                    }
                    if (!alreadyCollecting)
                        alreadyCollecting = new Set();
                    if (alreadyCollecting.has(exportedType)) {
                        _this._reportError(parse_util_1.syntaxError(_this._getTypeDescriptor(exportedType) + " '" + util_2.stringify(exportedType) + "' is exported recursively by the module '" + stringifyType(moduleType) + "'"), moduleType);
                        return;
                    }
                    alreadyCollecting.add(exportedType);
                    var exportedModuleSummary = _this.getNgModuleSummary(exportedType, alreadyCollecting);
                    alreadyCollecting.delete(exportedType);
                    if (exportedModuleSummary) {
                        exportedModules.push(exportedModuleSummary);
                    }
                    else {
                        exportedNonModuleIdentifiers.push(_this._getIdentifierMetadata(exportedType));
                    }
                });
            }
            // Note: This will be modified later, so we rely on
            // getting a new instance every time!
            var transitiveModule = this._getTransitiveNgModuleMetadata(importedModules, exportedModules);
            if (meta.declarations) {
                flattenAndDedupeArray(meta.declarations).forEach(function (declaredType) {
                    if (!isValidType(declaredType)) {
                        _this._reportError(parse_util_1.syntaxError("Unexpected value '" + stringifyType(declaredType) + "' declared by the module '" + stringifyType(moduleType) + "'"), moduleType);
                        return;
                    }
                    var declaredIdentifier = _this._getIdentifierMetadata(declaredType);
                    if (_this.isDirective(declaredType)) {
                        if (_this.isAbstractDirective(declaredType)) {
                            _this._reportError(parse_util_1.syntaxError("Directive " + stringifyType(declaredType) + " has no selector, please add it!"), declaredType);
                        }
                        transitiveModule.addDirective(declaredIdentifier);
                        declaredDirectives.push(declaredIdentifier);
                        _this._addTypeToModule(declaredType, moduleType);
                    }
                    else if (_this.isPipe(declaredType)) {
                        transitiveModule.addPipe(declaredIdentifier);
                        transitiveModule.pipes.push(declaredIdentifier);
                        declaredPipes.push(declaredIdentifier);
                        _this._addTypeToModule(declaredType, moduleType);
                    }
                    else {
                        _this._reportError(parse_util_1.syntaxError("Unexpected " + _this._getTypeDescriptor(declaredType) + " '" + stringifyType(declaredType) + "' declared by the module '" + stringifyType(moduleType) + "'. Please add a @Pipe/@Directive/@Component annotation."), moduleType);
                        return;
                    }
                });
            }
            var exportedDirectives = [];
            var exportedPipes = [];
            exportedNonModuleIdentifiers.forEach(function (exportedId) {
                if (transitiveModule.directivesSet.has(exportedId.reference)) {
                    exportedDirectives.push(exportedId);
                    transitiveModule.addExportedDirective(exportedId);
                }
                else if (transitiveModule.pipesSet.has(exportedId.reference)) {
                    exportedPipes.push(exportedId);
                    transitiveModule.addExportedPipe(exportedId);
                }
                else {
                    _this._reportError(parse_util_1.syntaxError("Can't export " + _this._getTypeDescriptor(exportedId.reference) + " " + stringifyType(exportedId.reference) + " from " + stringifyType(moduleType) + " as it was neither declared nor imported!"), moduleType);
                    return;
                }
            });
            // The providers of the module have to go last
            // so that they overwrite any other provider we already added.
            if (meta.providers) {
                providers.push.apply(providers, tslib_1.__spreadArray([], tslib_1.__read(this._getProvidersMetadata(meta.providers, entryComponents, "provider for the NgModule '" + stringifyType(moduleType) + "'", [], moduleType))));
            }
            if (meta.entryComponents) {
                entryComponents.push.apply(entryComponents, tslib_1.__spreadArray([], tslib_1.__read(flattenAndDedupeArray(meta.entryComponents)
                    .map(function (type) { return _this._getEntryComponentMetadata(type); }))));
            }
            if (meta.bootstrap) {
                flattenAndDedupeArray(meta.bootstrap).forEach(function (type) {
                    if (!isValidType(type)) {
                        _this._reportError(parse_util_1.syntaxError("Unexpected value '" + stringifyType(type) + "' used in the bootstrap property of module '" + stringifyType(moduleType) + "'"), moduleType);
                        return;
                    }
                    bootstrapComponents.push(_this._getIdentifierMetadata(type));
                });
            }
            entryComponents.push.apply(entryComponents, tslib_1.__spreadArray([], tslib_1.__read(bootstrapComponents.map(function (type) { return _this._getEntryComponentMetadata(type.reference); }))));
            if (meta.schemas) {
                schemas.push.apply(schemas, tslib_1.__spreadArray([], tslib_1.__read(flattenAndDedupeArray(meta.schemas))));
            }
            compileMeta = new cpl.CompileNgModuleMetadata({
                type: this._getTypeMetadata(moduleType),
                providers: providers,
                entryComponents: entryComponents,
                bootstrapComponents: bootstrapComponents,
                schemas: schemas,
                declaredDirectives: declaredDirectives,
                exportedDirectives: exportedDirectives,
                declaredPipes: declaredPipes,
                exportedPipes: exportedPipes,
                importedModules: importedModules,
                exportedModules: exportedModules,
                transitiveModule: transitiveModule,
                id: meta.id || null,
            });
            entryComponents.forEach(function (id) { return transitiveModule.addEntryComponent(id); });
            providers.forEach(function (provider) { return transitiveModule.addProvider(provider, compileMeta.type); });
            transitiveModule.addModule(compileMeta.type);
            this._ngModuleCache.set(moduleType, compileMeta);
            return compileMeta;
        };
        CompileMetadataResolver.prototype._checkSelfImport = function (moduleType, importedModuleType) {
            if (moduleType === importedModuleType) {
                this._reportError(parse_util_1.syntaxError("'" + stringifyType(moduleType) + "' module can't import itself"), moduleType);
                return true;
            }
            return false;
        };
        CompileMetadataResolver.prototype._getTypeDescriptor = function (type) {
            if (isValidType(type)) {
                if (this.isDirective(type)) {
                    return 'directive';
                }
                if (this.isPipe(type)) {
                    return 'pipe';
                }
                if (this.isNgModule(type)) {
                    return 'module';
                }
            }
            if (type.provide) {
                return 'provider';
            }
            return 'value';
        };
        CompileMetadataResolver.prototype._addTypeToModule = function (type, moduleType) {
            var oldModule = this._ngModuleOfTypes.get(type);
            if (oldModule && oldModule !== moduleType) {
                this._reportError(parse_util_1.syntaxError("Type " + stringifyType(type) + " is part of the declarations of 2 modules: " + stringifyType(oldModule) + " and " + stringifyType(moduleType) + "! " +
                    ("Please consider moving " + stringifyType(type) + " to a higher module that imports " + stringifyType(oldModule) + " and " + stringifyType(moduleType) + ". ") +
                    ("You can also create a new NgModule that exports and includes " + stringifyType(type) + " then import that NgModule in " + stringifyType(oldModule) + " and " + stringifyType(moduleType) + ".")), moduleType);
                return;
            }
            this._ngModuleOfTypes.set(type, moduleType);
        };
        CompileMetadataResolver.prototype._getTransitiveNgModuleMetadata = function (importedModules, exportedModules) {
            // collect `providers` / `entryComponents` from all imported and all exported modules
            var result = new cpl.TransitiveCompileNgModuleMetadata();
            var modulesByToken = new Map();
            importedModules.concat(exportedModules).forEach(function (modSummary) {
                modSummary.modules.forEach(function (mod) { return result.addModule(mod); });
                modSummary.entryComponents.forEach(function (comp) { return result.addEntryComponent(comp); });
                var addedTokens = new Set();
                modSummary.providers.forEach(function (entry) {
                    var tokenRef = cpl.tokenReference(entry.provider.token);
                    var prevModules = modulesByToken.get(tokenRef);
                    if (!prevModules) {
                        prevModules = new Set();
                        modulesByToken.set(tokenRef, prevModules);
                    }
                    var moduleRef = entry.module.reference;
                    // Note: the providers of one module may still contain multiple providers
                    // per token (e.g. for multi providers), and we need to preserve these.
                    if (addedTokens.has(tokenRef) || !prevModules.has(moduleRef)) {
                        prevModules.add(moduleRef);
                        addedTokens.add(tokenRef);
                        result.addProvider(entry.provider, entry.module);
                    }
                });
            });
            exportedModules.forEach(function (modSummary) {
                modSummary.exportedDirectives.forEach(function (id) { return result.addExportedDirective(id); });
                modSummary.exportedPipes.forEach(function (id) { return result.addExportedPipe(id); });
            });
            importedModules.forEach(function (modSummary) {
                modSummary.exportedDirectives.forEach(function (id) { return result.addDirective(id); });
                modSummary.exportedPipes.forEach(function (id) { return result.addPipe(id); });
            });
            return result;
        };
        CompileMetadataResolver.prototype._getIdentifierMetadata = function (type) {
            type = util_2.resolveForwardRef(type);
            return { reference: type };
        };
        CompileMetadataResolver.prototype.isInjectable = function (type) {
            var annotations = this._reflector.tryAnnotations(type);
            return annotations.some(function (ann) { return core_1.createInjectable.isTypeOf(ann); });
        };
        CompileMetadataResolver.prototype.getInjectableSummary = function (type) {
            return {
                summaryKind: cpl.CompileSummaryKind.Injectable,
                type: this._getTypeMetadata(type, null, false)
            };
        };
        CompileMetadataResolver.prototype.getInjectableMetadata = function (type, dependencies, throwOnUnknownDeps) {
            if (dependencies === void 0) { dependencies = null; }
            if (throwOnUnknownDeps === void 0) { throwOnUnknownDeps = true; }
            var typeSummary = this._loadSummary(type, cpl.CompileSummaryKind.Injectable);
            var typeMetadata = typeSummary ?
                typeSummary.type :
                this._getTypeMetadata(type, dependencies, throwOnUnknownDeps);
            var annotations = this._reflector.annotations(type).filter(function (ann) { return core_1.createInjectable.isTypeOf(ann); });
            if (annotations.length === 0) {
                return null;
            }
            var meta = annotations[annotations.length - 1];
            return {
                symbol: type,
                type: typeMetadata,
                providedIn: meta.providedIn,
                useValue: meta.useValue,
                useClass: meta.useClass,
                useExisting: meta.useExisting,
                useFactory: meta.useFactory,
                deps: meta.deps,
            };
        };
        CompileMetadataResolver.prototype._getTypeMetadata = function (type, dependencies, throwOnUnknownDeps) {
            if (dependencies === void 0) { dependencies = null; }
            if (throwOnUnknownDeps === void 0) { throwOnUnknownDeps = true; }
            var identifier = this._getIdentifierMetadata(type);
            return {
                reference: identifier.reference,
                diDeps: this._getDependenciesMetadata(identifier.reference, dependencies, throwOnUnknownDeps),
                lifecycleHooks: lifecycle_reflector_1.getAllLifecycleHooks(this._reflector, identifier.reference),
            };
        };
        CompileMetadataResolver.prototype._getFactoryMetadata = function (factory, dependencies) {
            if (dependencies === void 0) { dependencies = null; }
            factory = util_2.resolveForwardRef(factory);
            return { reference: factory, diDeps: this._getDependenciesMetadata(factory, dependencies) };
        };
        /**
         * Gets the metadata for the given pipe.
         * This assumes `loadNgModuleDirectiveAndPipeMetadata` has been called first.
         */
        CompileMetadataResolver.prototype.getPipeMetadata = function (pipeType) {
            var pipeMeta = this._pipeCache.get(pipeType);
            if (!pipeMeta) {
                this._reportError(parse_util_1.syntaxError("Illegal state: getPipeMetadata can only be called after loadNgModuleDirectiveAndPipeMetadata for a module that declares it. Pipe " + stringifyType(pipeType) + "."), pipeType);
            }
            return pipeMeta || null;
        };
        CompileMetadataResolver.prototype.getPipeSummary = function (pipeType) {
            var pipeSummary = this._loadSummary(pipeType, cpl.CompileSummaryKind.Pipe);
            if (!pipeSummary) {
                this._reportError(parse_util_1.syntaxError("Illegal state: Could not load the summary for pipe " + stringifyType(pipeType) + "."), pipeType);
            }
            return pipeSummary;
        };
        CompileMetadataResolver.prototype.getOrLoadPipeMetadata = function (pipeType) {
            var pipeMeta = this._pipeCache.get(pipeType);
            if (!pipeMeta) {
                pipeMeta = this._loadPipeMetadata(pipeType);
            }
            return pipeMeta;
        };
        CompileMetadataResolver.prototype._loadPipeMetadata = function (pipeType) {
            pipeType = util_2.resolveForwardRef(pipeType);
            var pipeAnnotation = this._pipeResolver.resolve(pipeType);
            var pipeMeta = new cpl.CompilePipeMetadata({
                type: this._getTypeMetadata(pipeType),
                name: pipeAnnotation.name,
                pure: !!pipeAnnotation.pure
            });
            this._pipeCache.set(pipeType, pipeMeta);
            this._summaryCache.set(pipeType, pipeMeta.toSummary());
            return pipeMeta;
        };
        CompileMetadataResolver.prototype._getDependenciesMetadata = function (typeOrFunc, dependencies, throwOnUnknownDeps) {
            var _this = this;
            if (throwOnUnknownDeps === void 0) { throwOnUnknownDeps = true; }
            var hasUnknownDeps = false;
            var params = dependencies || this._reflector.parameters(typeOrFunc) || [];
            var dependenciesMetadata = params.map(function (param) {
                var isAttribute = false;
                var isHost = false;
                var isSelf = false;
                var isSkipSelf = false;
                var isOptional = false;
                var token = null;
                if (Array.isArray(param)) {
                    param.forEach(function (paramEntry) {
                        if (core_1.createHost.isTypeOf(paramEntry)) {
                            isHost = true;
                        }
                        else if (core_1.createSelf.isTypeOf(paramEntry)) {
                            isSelf = true;
                        }
                        else if (core_1.createSkipSelf.isTypeOf(paramEntry)) {
                            isSkipSelf = true;
                        }
                        else if (core_1.createOptional.isTypeOf(paramEntry)) {
                            isOptional = true;
                        }
                        else if (core_1.createAttribute.isTypeOf(paramEntry)) {
                            isAttribute = true;
                            token = paramEntry.attributeName;
                        }
                        else if (core_1.createInject.isTypeOf(paramEntry)) {
                            token = paramEntry.token;
                        }
                        else if (core_1.createInjectionToken.isTypeOf(paramEntry) ||
                            paramEntry instanceof static_symbol_1.StaticSymbol) {
                            token = paramEntry;
                        }
                        else if (isValidType(paramEntry) && token == null) {
                            token = paramEntry;
                        }
                    });
                }
                else {
                    token = param;
                }
                if (token == null) {
                    hasUnknownDeps = true;
                    return {};
                }
                return {
                    isAttribute: isAttribute,
                    isHost: isHost,
                    isSelf: isSelf,
                    isSkipSelf: isSkipSelf,
                    isOptional: isOptional,
                    token: _this._getTokenMetadata(token)
                };
            });
            if (hasUnknownDeps) {
                var depsTokens = dependenciesMetadata.map(function (dep) { return dep.token ? stringifyType(dep.token) : '?'; }).join(', ');
                var message = "Can't resolve all parameters for " + stringifyType(typeOrFunc) + ": (" + depsTokens + ").";
                if (throwOnUnknownDeps || this._config.strictInjectionParameters) {
                    this._reportError(parse_util_1.syntaxError(message), typeOrFunc);
                }
            }
            return dependenciesMetadata;
        };
        CompileMetadataResolver.prototype._getTokenMetadata = function (token) {
            token = util_2.resolveForwardRef(token);
            var compileToken;
            if (typeof token === 'string') {
                compileToken = { value: token };
            }
            else {
                compileToken = { identifier: { reference: token } };
            }
            return compileToken;
        };
        CompileMetadataResolver.prototype._getProvidersMetadata = function (providers, targetEntryComponents, debugInfo, compileProviders, type) {
            var _this = this;
            if (compileProviders === void 0) { compileProviders = []; }
            providers.forEach(function (provider, providerIdx) {
                if (Array.isArray(provider)) {
                    _this._getProvidersMetadata(provider, targetEntryComponents, debugInfo, compileProviders);
                }
                else {
                    provider = util_2.resolveForwardRef(provider);
                    var providerMeta = undefined;
                    if (provider && typeof provider === 'object' && provider.hasOwnProperty('provide')) {
                        _this._validateProvider(provider);
                        providerMeta = new cpl.ProviderMeta(provider.provide, provider);
                    }
                    else if (isValidType(provider)) {
                        providerMeta = new cpl.ProviderMeta(provider, { useClass: provider });
                    }
                    else if (provider === void 0) {
                        _this._reportError(parse_util_1.syntaxError("Encountered undefined provider! Usually this means you have a circular dependencies. This might be caused by using 'barrel' index.ts files."));
                        return;
                    }
                    else {
                        var providersInfo = providers
                            .reduce(function (soFar, seenProvider, seenProviderIdx) {
                            if (seenProviderIdx < providerIdx) {
                                soFar.push("" + stringifyType(seenProvider));
                            }
                            else if (seenProviderIdx == providerIdx) {
                                soFar.push("?" + stringifyType(seenProvider) + "?");
                            }
                            else if (seenProviderIdx == providerIdx + 1) {
                                soFar.push('...');
                            }
                            return soFar;
                        }, [])
                            .join(', ');
                        _this._reportError(parse_util_1.syntaxError("Invalid " + (debugInfo ?
                            debugInfo :
                            'provider') + " - only instances of Provider and Type are allowed, got: [" + providersInfo + "]"), type);
                        return;
                    }
                    if (providerMeta.token ===
                        _this._reflector.resolveExternalReference(identifiers_1.Identifiers.ANALYZE_FOR_ENTRY_COMPONENTS)) {
                        targetEntryComponents.push.apply(targetEntryComponents, tslib_1.__spreadArray([], tslib_1.__read(_this._getEntryComponentsFromProvider(providerMeta, type))));
                    }
                    else {
                        compileProviders.push(_this.getProviderMetadata(providerMeta));
                    }
                }
            });
            return compileProviders;
        };
        CompileMetadataResolver.prototype._validateProvider = function (provider) {
            if (provider.hasOwnProperty('useClass') && provider.useClass == null) {
                this._reportError(parse_util_1.syntaxError("Invalid provider for " + stringifyType(provider.provide) + ". useClass cannot be " + provider.useClass + ".\n           Usually it happens when:\n           1. There's a circular dependency (might be caused by using index.ts (barrel) files).\n           2. Class was used before it was declared. Use forwardRef in this case."));
            }
        };
        CompileMetadataResolver.prototype._getEntryComponentsFromProvider = function (provider, type) {
            var _this = this;
            var components = [];
            var collectedIdentifiers = [];
            if (provider.useFactory || provider.useExisting || provider.useClass) {
                this._reportError(parse_util_1.syntaxError("The ANALYZE_FOR_ENTRY_COMPONENTS token only supports useValue!"), type);
                return [];
            }
            if (!provider.multi) {
                this._reportError(parse_util_1.syntaxError("The ANALYZE_FOR_ENTRY_COMPONENTS token only supports 'multi = true'!"), type);
                return [];
            }
            extractIdentifiers(provider.useValue, collectedIdentifiers);
            collectedIdentifiers.forEach(function (identifier) {
                var entry = _this._getEntryComponentMetadata(identifier.reference, false);
                if (entry) {
                    components.push(entry);
                }
            });
            return components;
        };
        CompileMetadataResolver.prototype._getEntryComponentMetadata = function (dirType, throwIfNotFound) {
            if (throwIfNotFound === void 0) { throwIfNotFound = true; }
            var dirMeta = this.getNonNormalizedDirectiveMetadata(dirType);
            if (dirMeta && dirMeta.metadata.isComponent) {
                return { componentType: dirType, componentFactory: dirMeta.metadata.componentFactory };
            }
            var dirSummary = this._loadSummary(dirType, cpl.CompileSummaryKind.Directive);
            if (dirSummary && dirSummary.isComponent) {
                return { componentType: dirType, componentFactory: dirSummary.componentFactory };
            }
            if (throwIfNotFound) {
                throw parse_util_1.syntaxError(dirType.name + " cannot be used as an entry component.");
            }
            return null;
        };
        CompileMetadataResolver.prototype._getInjectableTypeMetadata = function (type, dependencies) {
            if (dependencies === void 0) { dependencies = null; }
            var typeSummary = this._loadSummary(type, cpl.CompileSummaryKind.Injectable);
            if (typeSummary) {
                return typeSummary.type;
            }
            return this._getTypeMetadata(type, dependencies);
        };
        CompileMetadataResolver.prototype.getProviderMetadata = function (provider) {
            var compileDeps = undefined;
            var compileTypeMetadata = null;
            var compileFactoryMetadata = null;
            var token = this._getTokenMetadata(provider.token);
            if (provider.useClass) {
                compileTypeMetadata =
                    this._getInjectableTypeMetadata(provider.useClass, provider.dependencies);
                compileDeps = compileTypeMetadata.diDeps;
                if (provider.token === provider.useClass) {
                    // use the compileTypeMetadata as it contains information about lifecycleHooks...
                    token = { identifier: compileTypeMetadata };
                }
            }
            else if (provider.useFactory) {
                compileFactoryMetadata = this._getFactoryMetadata(provider.useFactory, provider.dependencies);
                compileDeps = compileFactoryMetadata.diDeps;
            }
            return {
                token: token,
                useClass: compileTypeMetadata,
                useValue: provider.useValue,
                useFactory: compileFactoryMetadata,
                useExisting: provider.useExisting ? this._getTokenMetadata(provider.useExisting) : undefined,
                deps: compileDeps,
                multi: provider.multi
            };
        };
        CompileMetadataResolver.prototype._getQueriesMetadata = function (queries, isViewQuery, directiveType) {
            var _this = this;
            var res = [];
            Object.keys(queries).forEach(function (propertyName) {
                var query = queries[propertyName];
                if (query.isViewQuery === isViewQuery) {
                    res.push(_this._getQueryMetadata(query, propertyName, directiveType));
                }
            });
            return res;
        };
        CompileMetadataResolver.prototype._queryVarBindings = function (selector) {
            return selector.split(/\s*,\s*/);
        };
        CompileMetadataResolver.prototype._getQueryMetadata = function (q, propertyName, typeOrFunc) {
            var _this = this;
            var selectors;
            if (typeof q.selector === 'string') {
                selectors =
                    this._queryVarBindings(q.selector).map(function (varName) { return _this._getTokenMetadata(varName); });
            }
            else {
                if (!q.selector) {
                    this._reportError(parse_util_1.syntaxError("Can't construct a query for the property \"" + propertyName + "\" of \"" + stringifyType(typeOrFunc) + "\" since the query selector wasn't defined."), typeOrFunc);
                    selectors = [];
                }
                else {
                    selectors = [this._getTokenMetadata(q.selector)];
                }
            }
            return {
                selectors: selectors,
                first: q.first,
                descendants: q.descendants,
                emitDistinctChangesOnly: q.emitDistinctChangesOnly,
                propertyName: propertyName,
                read: q.read ? this._getTokenMetadata(q.read) : null,
                static: q.static
            };
        };
        CompileMetadataResolver.prototype._reportError = function (error, type, otherType) {
            if (this._errorCollector) {
                this._errorCollector(error, type);
                if (otherType) {
                    this._errorCollector(error, otherType);
                }
            }
            else {
                throw error;
            }
        };
        return CompileMetadataResolver;
    }());
    exports.CompileMetadataResolver = CompileMetadataResolver;
    function flattenArray(tree, out) {
        if (out === void 0) { out = []; }
        if (tree) {
            for (var i = 0; i < tree.length; i++) {
                var item = util_2.resolveForwardRef(tree[i]);
                if (Array.isArray(item)) {
                    flattenArray(item, out);
                }
                else {
                    out.push(item);
                }
            }
        }
        return out;
    }
    function dedupeArray(array) {
        if (array) {
            return Array.from(new Set(array));
        }
        return [];
    }
    function flattenAndDedupeArray(tree) {
        return dedupeArray(flattenArray(tree));
    }
    function isValidType(value) {
        return (value instanceof static_symbol_1.StaticSymbol) || (value instanceof core_1.Type);
    }
    function extractIdentifiers(value, targetIdentifiers) {
        util_2.visitValue(value, new _CompileValueConverter(), targetIdentifiers);
    }
    var _CompileValueConverter = /** @class */ (function (_super) {
        tslib_1.__extends(_CompileValueConverter, _super);
        function _CompileValueConverter() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        _CompileValueConverter.prototype.visitOther = function (value, targetIdentifiers) {
            targetIdentifiers.push({ reference: value });
        };
        return _CompileValueConverter;
    }(util_2.ValueTransformer));
    function stringifyType(type) {
        if (type instanceof static_symbol_1.StaticSymbol) {
            return type.name + " in " + type.filePath;
        }
        else {
            return util_2.stringify(type);
        }
    }
    /**
     * Indicates that a component is still being loaded in a synchronous compile.
     */
    function componentStillLoadingError(compType) {
        var error = Error("Can't compile synchronously as " + util_2.stringify(compType) + " is still being loaded!");
        error[exports.ERROR_COMPONENT_TYPE] = compType;
        return error;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGFfcmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvbWV0YWRhdGFfcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILHlFQUFvRTtJQUNwRSx1REFBNkM7SUFDN0MsK0RBQThFO0lBQzlFLDREQUEwQztJQUcxQyxtREFBZ1U7SUFFaFUsK0VBQWlFO0lBQ2pFLGlFQUEwQztJQUMxQyxpRkFBMkQ7SUFHM0QsK0RBQW9GO0lBR3BGLDJEQUF1QztJQUV2QyxtREFBOEg7SUFJakgsUUFBQSxvQkFBb0IsR0FBRyxpQkFBaUIsQ0FBQztJQUV0RCxJQUFNLHFDQUFxQyxHQUFHLG9DQUFvQyxDQUFDO0lBT25GLFNBQWdCLG1DQUFtQyxDQUFDLEtBQVU7O1FBRTVELE9BQU8sTUFBQSxLQUFLLENBQUMscUNBQXFDLENBQUMsbUNBQUksSUFBSSxDQUFDO0lBQzlELENBQUM7SUFIRCxrRkFHQztJQUVELGdCQUFnQjtJQUNoQixrQ0FBa0M7SUFDbEMsMkRBQTJEO0lBQzNELDhDQUE4QztJQUM5Qyw2REFBNkQ7SUFDN0QsNkRBQTZEO0lBQzdELHVCQUF1QjtJQUN2QjtRQVVFLGlDQUNZLE9BQXVCLEVBQVUsV0FBdUIsRUFDeEQsaUJBQW1DLEVBQVUsa0JBQXFDLEVBQ2xGLGFBQTJCLEVBQVUsZ0JBQXNDLEVBQzNFLGVBQXNDLEVBQ3RDLG9CQUF5QyxFQUFVLFFBQWlCLEVBQ3BFLGtCQUFxQyxFQUFVLFVBQTRCLEVBQzNFLGVBQWdDO1lBTmhDLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsZ0JBQVcsR0FBWCxXQUFXLENBQVk7WUFDeEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFrQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7WUFDbEYsa0JBQWEsR0FBYixhQUFhLENBQWM7WUFBVSxxQkFB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LENBQUM7UUFDN0MsQ0FBQztRQUNILDZCQUFDO0lBQUQsQ0FBQyxBQUpELENBQXFDLHVCQUFnQixHQUlwRDtJQUVELFNBQVMsYUFBYSxDQUFDLElBQVM7UUFDOUIsSUFBSSxJQUFJLFlBQVksNEJBQVksRUFBRTtZQUNoQyxPQUFVLElBQUksQ0FBQyxJQUFJLFlBQU8sSUFBSSxDQUFDLFFBQVUsQ0FBQztTQUMzQzthQUFNO1lBQ0wsT0FBTyxnQkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUywwQkFBMEIsQ0FBQyxRQUFjO1FBQ2hELElBQU0sS0FBSyxHQUNQLEtBQUssQ0FBQyxvQ0FBa0MsZ0JBQVMsQ0FBQyxRQUFRLENBQUMsNEJBQXlCLENBQUMsQ0FBQztRQUN6RixLQUFhLENBQUMsNEJBQW9CLENBQUMsR0FBRyxRQUFRLENBQUM7UUFDaEQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7U3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZX0gZnJvbSAnLi9hb3Qvc3RhdGljX3N5bWJvbCc7XG5pbXBvcnQge25nZmFjdG9yeUZpbGVQYXRofSBmcm9tICcuL2FvdC91dGlsJztcbmltcG9ydCB7YXNzZXJ0QXJyYXlPZlN0cmluZ3MsIGFzc2VydEludGVycG9sYXRpb25TeW1ib2xzfSBmcm9tICcuL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgY3BsIGZyb20gJy4vY29tcGlsZV9tZXRhZGF0YSc7XG5pbXBvcnQge0NvbXBpbGVSZWZsZWN0b3J9IGZyb20gJy4vY29tcGlsZV9yZWZsZWN0b3InO1xuaW1wb3J0IHtDb21waWxlckNvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBjcmVhdGVBdHRyaWJ1dGUsIGNyZWF0ZUNvbXBvbmVudCwgY3JlYXRlSG9zdCwgY3JlYXRlSW5qZWN0LCBjcmVhdGVJbmplY3RhYmxlLCBjcmVhdGVJbmplY3Rpb25Ub2tlbiwgY3JlYXRlTmdNb2R1bGUsIGNyZWF0ZU9wdGlvbmFsLCBjcmVhdGVTZWxmLCBjcmVhdGVTa2lwU2VsZiwgRGlyZWN0aXZlLCBJbmplY3RhYmxlLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBQcm92aWRlciwgUXVlcnksIFNjaGVtYU1ldGFkYXRhLCBUeXBlLCBWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7RGlyZWN0aXZlTm9ybWFsaXplcn0gZnJvbSAnLi9kaXJlY3RpdmVfbm9ybWFsaXplcic7XG5pbXBvcnQge0RpcmVjdGl2ZVJlc29sdmVyLCBmaW5kTGFzdH0gZnJvbSAnLi9kaXJlY3RpdmVfcmVzb2x2ZXInO1xuaW1wb3J0IHtJZGVudGlmaWVyc30gZnJvbSAnLi9pZGVudGlmaWVycyc7XG5pbXBvcnQge2dldEFsbExpZmVjeWNsZUhvb2tzfSBmcm9tICcuL2xpZmVjeWNsZV9yZWZsZWN0b3InO1xuaW1wb3J0IHtIdG1sUGFyc2VyfSBmcm9tICcuL21sX3BhcnNlci9odG1sX3BhcnNlcic7XG5pbXBvcnQge05nTW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vbmdfbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7Q29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSwgaWRlbnRpZmllck5hbWUsIHN5bnRheEVycm9yfSBmcm9tICcuL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtQaXBlUmVzb2x2ZXJ9IGZyb20gJy4vcGlwZV9yZXNvbHZlcic7XG5pbXBvcnQge0VsZW1lbnRTY2hlbWFSZWdpc3RyeX0gZnJvbSAnLi9zY2hlbWEvZWxlbWVudF9zY2hlbWFfcmVnaXN0cnknO1xuaW1wb3J0IHtDc3NTZWxlY3Rvcn0gZnJvbSAnLi9zZWxlY3Rvcic7XG5pbXBvcnQge1N1bW1hcnlSZXNvbHZlcn0gZnJvbSAnLi9zdW1tYXJ5X3Jlc29sdmVyJztcbmltcG9ydCB7Q29uc29sZSwgaXNQcm9taXNlLCBub1VuZGVmaW5lZCwgcmVzb2x2ZUZvcndhcmRSZWYsIHN0cmluZ2lmeSwgU3luY0FzeW5jLCBWYWx1ZVRyYW5zZm9ybWVyLCB2aXNpdFZhbHVlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgdHlwZSBFcnJvckNvbGxlY3RvciA9IChlcnJvcjogYW55LCB0eXBlPzogYW55KSA9PiB2b2lkO1xuXG5leHBvcnQgY29uc3QgRVJST1JfQ09NUE9ORU5UX1RZUEUgPSAnbmdDb21wb25lbnRUeXBlJztcblxuY29uc3QgTUlTU0lOR19OR19NT0RVTEVfTUVUQURBVEFfRVJST1JfREFUQSA9ICduZ01pc3NpbmdOZ01vZHVsZU1ldGFkYXRhRXJyb3JEYXRhJztcbmV4cG9ydCBpbnRlcmZhY2UgTWlzc2luZ05nTW9kdWxlTWV0YWRhdGFFcnJvckRhdGEge1xuICBmaWxlTmFtZTogc3RyaW5nO1xuICBjbGFzc05hbWU6IHN0cmluZztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWlzc2luZ05nTW9kdWxlTWV0YWRhdGFFcnJvckRhdGEoZXJyb3I6IGFueSk6IE1pc3NpbmdOZ01vZHVsZU1ldGFkYXRhRXJyb3JEYXRhfFxuICAgIG51bGwge1xuICByZXR1cm4gZXJyb3JbTUlTU0lOR19OR19NT0RVTEVfTUVUQURBVEFfRVJST1JfREFUQV0gPz8gbnVsbDtcbn1cblxuLy8gRGVzaWduIG5vdGVzOlxuLy8gLSBkb24ndCBsYXppbHkgY3JlYXRlIG1ldGFkYXRhOlxuLy8gICBGb3Igc29tZSBtZXRhZGF0YSwgd2UgbmVlZCB0byBkbyBhc3luYyB3b3JrIHNvbWV0aW1lcyxcbi8vICAgc28gdGhlIHVzZXIgaGFzIHRvIGtpY2sgb2ZmIHRoaXMgbG9hZGluZy5cbi8vICAgQnV0IHdlIHdhbnQgdG8gcmVwb3J0IGVycm9ycyBldmVuIHdoZW4gdGhlIGFzeW5jIHdvcmsgaXNcbi8vICAgbm90IHJlcXVpcmVkIHRvIGNoZWNrIHRoYXQgdGhlIHVzZXIgd291bGQgaGF2ZSBiZWVuIGFibGVcbi8vICAgdG8gd2FpdCBjb3JyZWN0bHkuXG5leHBvcnQgY2xhc3MgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIge1xuICBwcml2YXRlIF9ub25Ob3JtYWxpemVkRGlyZWN0aXZlQ2FjaGUgPVxuICAgICAgbmV3IE1hcDxUeXBlLCB7YW5ub3RhdGlvbjogRGlyZWN0aXZlLCBtZXRhZGF0YTogY3BsLkNvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YX0+KCk7XG4gIHByaXZhdGUgX2RpcmVjdGl2ZUNhY2hlID0gbmV3IE1hcDxUeXBlLCBjcGwuQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhPigpO1xuICBwcml2YXRlIF9zdW1tYXJ5Q2FjaGUgPSBuZXcgTWFwPFR5cGUsIGNwbC5Db21waWxlVHlwZVN1bW1hcnl8bnVsbD4oKTtcbiAgcHJpdmF0ZSBfcGlwZUNhY2hlID0gbmV3IE1hcDxUeXBlLCBjcGwuQ29tcGlsZVBpcGVNZXRhZGF0YT4oKTtcbiAgcHJpdmF0ZSBfbmdNb2R1bGVDYWNoZSA9IG5ldyBNYXA8VHlwZSwgY3BsLkNvbXBpbGVOZ01vZHVsZU1ldGFkYXRhPigpO1xuICBwcml2YXRlIF9uZ01vZHVsZU9mVHlwZXMgPSBuZXcgTWFwPFR5cGUsIFR5cGU+KCk7XG4gIHByaXZhdGUgX3NoYWxsb3dNb2R1bGVDYWNoZSA9IG5ldyBNYXA8VHlwZSwgY3BsLkNvbXBpbGVTaGFsbG93TW9kdWxlTWV0YWRhdGE+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIF9jb25maWc6IENvbXBpbGVyQ29uZmlnLCBwcml2YXRlIF9odG1sUGFyc2VyOiBIdG1sUGFyc2VyLFxuICAgICAgcHJpdmF0ZSBfbmdNb2R1bGVSZXNvbHZlcjogTmdNb2R1bGVSZXNvbHZlciwgcHJpdmF0ZSBfZGlyZWN0aXZlUmVzb2x2ZXI6IERpcmVjdGl2ZVJlc29sdmVyLFxuICAgICAgcHJpdmF0ZSBfcGlwZVJlc29sdmVyOiBQaXBlUmVzb2x2ZXIsIHByaXZhdGUgX3N1bW1hcnlSZXNvbHZlcjogU3VtbWFyeVJlc29sdmVyPGFueT4sXG4gICAgICBwcml2YXRlIF9zY2hlbWFSZWdpc3RyeTogRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBfZGlyZWN0aXZlTm9ybWFsaXplcjogRGlyZWN0aXZlTm9ybWFsaXplciwgcHJpdmF0ZSBfY29uc29sZTogQ29uc29sZSxcbiAgICAgIHByaXZhdGUgX3N0YXRpY1N5bWJvbENhY2hlOiBTdGF0aWNTeW1ib2xDYWNoZSwgcHJpdmF0ZSBfcmVmbGVjdG9yOiBDb21waWxlUmVmbGVjdG9yLFxuICAgICAgcHJpdmF0ZSBfZXJyb3JDb2xsZWN0b3I/OiBFcnJvckNvbGxlY3Rvcikge31cblxuICBnZXRSZWZsZWN0b3IoKTogQ29tcGlsZVJlZmxlY3RvciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZmxlY3RvcjtcbiAgfVxuXG4gIGNsZWFyQ2FjaGVGb3IodHlwZTogVHlwZSkge1xuICAgIGNvbnN0IGRpck1ldGEgPSB0aGlzLl9kaXJlY3RpdmVDYWNoZS5nZXQodHlwZSk7XG4gICAgdGhpcy5fZGlyZWN0aXZlQ2FjaGUuZGVsZXRlKHR5cGUpO1xuICAgIHRoaXMuX25vbk5vcm1hbGl6ZWREaXJlY3RpdmVDYWNoZS5kZWxldGUodHlwZSk7XG4gICAgdGhpcy5fc3VtbWFyeUNhY2hlLmRlbGV0ZSh0eXBlKTtcbiAgICB0aGlzLl9waXBlQ2FjaGUuZGVsZXRlKHR5cGUpO1xuICAgIHRoaXMuX25nTW9kdWxlT2ZUeXBlcy5kZWxldGUodHlwZSk7XG4gICAgLy8gQ2xlYXIgYWxsIG9mIHRoZSBOZ01vZHVsZSBhcyB0aGV5IGNvbnRhaW4gdHJhbnNpdGl2ZSBpbmZvcm1hdGlvbiFcbiAgICB0aGlzLl9uZ01vZHVsZUNhY2hlLmNsZWFyKCk7XG4gICAgaWYgKGRpck1ldGEpIHtcbiAgICAgIHRoaXMuX2RpcmVjdGl2ZU5vcm1hbGl6ZXIuY2xlYXJDYWNoZUZvcihkaXJNZXRhKTtcbiAgICB9XG4gIH1cblxuICBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIHRoaXMuX2RpcmVjdGl2ZUNhY2hlLmNsZWFyKCk7XG4gICAgdGhpcy5fbm9uTm9ybWFsaXplZERpcmVjdGl2ZUNhY2hlLmNsZWFyKCk7XG4gICAgdGhpcy5fc3VtbWFyeUNhY2hlLmNsZWFyKCk7XG4gICAgdGhpcy5fcGlwZUNhY2hlLmNsZWFyKCk7XG4gICAgdGhpcy5fbmdNb2R1bGVDYWNoZS5jbGVhcigpO1xuICAgIHRoaXMuX25nTW9kdWxlT2ZUeXBlcy5jbGVhcigpO1xuICAgIHRoaXMuX2RpcmVjdGl2ZU5vcm1hbGl6ZXIuY2xlYXJDYWNoZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlUHJveHlDbGFzcyhiYXNlVHlwZTogYW55LCBuYW1lOiBzdHJpbmcpOiBjcGwuUHJveHlDbGFzcyB7XG4gICAgbGV0IGRlbGVnYXRlOiBhbnkgPSBudWxsO1xuICAgIGNvbnN0IHByb3h5Q2xhc3M6IGNwbC5Qcm94eUNsYXNzID0gPGFueT5mdW5jdGlvbih0aGlzOiB1bmtub3duKSB7XG4gICAgICBpZiAoIWRlbGVnYXRlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbGxlZ2FsIHN0YXRlOiBDbGFzcyAke25hbWV9IGZvciB0eXBlICR7c3RyaW5naWZ5KGJhc2VUeXBlKX0gaXMgbm90IGNvbXBpbGVkIHlldCFgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWxlZ2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgcHJveHlDbGFzcy5zZXREZWxlZ2F0ZSA9IChkKSA9PiB7XG4gICAgICBkZWxlZ2F0ZSA9IGQ7XG4gICAgICAoPGFueT5wcm94eUNsYXNzKS5wcm90b3R5cGUgPSBkLnByb3RvdHlwZTtcbiAgICB9O1xuICAgIC8vIE1ha2Ugc3RyaW5naWZ5IHdvcmsgY29ycmVjdGx5XG4gICAgKDxhbnk+cHJveHlDbGFzcykub3ZlcnJpZGRlbk5hbWUgPSBuYW1lO1xuICAgIHJldHVybiBwcm94eUNsYXNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRHZW5lcmF0ZWRDbGFzcyhkaXJUeXBlOiBhbnksIG5hbWU6IHN0cmluZyk6IFN0YXRpY1N5bWJvbHxjcGwuUHJveHlDbGFzcyB7XG4gICAgaWYgKGRpclR5cGUgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zdGF0aWNTeW1ib2xDYWNoZS5nZXQobmdmYWN0b3J5RmlsZVBhdGgoZGlyVHlwZS5maWxlUGF0aCksIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fY3JlYXRlUHJveHlDbGFzcyhkaXJUeXBlLCBuYW1lKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBvbmVudFZpZXdDbGFzcyhkaXJUeXBlOiBhbnkpOiBTdGF0aWNTeW1ib2x8Y3BsLlByb3h5Q2xhc3Mge1xuICAgIHJldHVybiB0aGlzLmdldEdlbmVyYXRlZENsYXNzKGRpclR5cGUsIGNwbC52aWV3Q2xhc3NOYW1lKGRpclR5cGUsIDApKTtcbiAgfVxuXG4gIGdldEhvc3RDb21wb25lbnRWaWV3Q2xhc3MoZGlyVHlwZTogYW55KTogU3RhdGljU3ltYm9sfGNwbC5Qcm94eUNsYXNzIHtcbiAgICByZXR1cm4gdGhpcy5nZXRHZW5lcmF0ZWRDbGFzcyhkaXJUeXBlLCBjcGwuaG9zdFZpZXdDbGFzc05hbWUoZGlyVHlwZSkpO1xuICB9XG5cbiAgZ2V0SG9zdENvbXBvbmVudFR5cGUoZGlyVHlwZTogYW55KTogU3RhdGljU3ltYm9sfGNwbC5Qcm94eUNsYXNzIHtcbiAgICBjb25zdCBuYW1lID0gYCR7aWRlbnRpZmllck5hbWUoe3JlZmVyZW5jZTogZGlyVHlwZX0pfV9Ib3N0YDtcbiAgICBpZiAoZGlyVHlwZSBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3N0YXRpY1N5bWJvbENhY2hlLmdldChkaXJUeXBlLmZpbGVQYXRoLCBuYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlUHJveHlDbGFzcyhkaXJUeXBlLCBuYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVuZGVyZXJUeXBlKGRpclR5cGU6IGFueSk6IFN0YXRpY1N5bWJvbHxvYmplY3Qge1xuICAgIGlmIChkaXJUeXBlIGluc3RhbmNlb2YgU3RhdGljU3ltYm9sKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc3RhdGljU3ltYm9sQ2FjaGUuZ2V0KFxuICAgICAgICAgIG5nZmFjdG9yeUZpbGVQYXRoKGRpclR5cGUuZmlsZVBhdGgpLCBjcGwucmVuZGVyZXJUeXBlTmFtZShkaXJUeXBlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHJldHVybmluZyBhbiBvYmplY3QgYXMgcHJveHksXG4gICAgICAvLyB0aGF0IHdlIGZpbGwgbGF0ZXIgZHVyaW5nIHJ1bnRpbWUgY29tcGlsYXRpb24uXG4gICAgICByZXR1cm4gPGFueT57fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBvbmVudEZhY3RvcnkoXG4gICAgICBzZWxlY3Rvcjogc3RyaW5nLCBkaXJUeXBlOiBhbnksIGlucHV0czoge1trZXk6IHN0cmluZ106IHN0cmluZ318bnVsbCxcbiAgICAgIG91dHB1dHM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogU3RhdGljU3ltYm9sfG9iamVjdCB7XG4gICAgaWYgKGRpclR5cGUgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zdGF0aWNTeW1ib2xDYWNoZS5nZXQoXG4gICAgICAgICAgbmdmYWN0b3J5RmlsZVBhdGgoZGlyVHlwZS5maWxlUGF0aCksIGNwbC5jb21wb25lbnRGYWN0b3J5TmFtZShkaXJUeXBlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGhvc3RWaWV3ID0gdGhpcy5nZXRIb3N0Q29tcG9uZW50Vmlld0NsYXNzKGRpclR5cGUpO1xuICAgICAgLy8gTm90ZTogbmdDb250ZW50U2VsZWN0b3JzIHdpbGwgYmUgZmlsbGVkIGxhdGVyIG9uY2UgdGhlIHRlbXBsYXRlIGlzXG4gICAgICAvLyBsb2FkZWQuXG4gICAgICBjb25zdCBjcmVhdGVDb21wb25lbnRGYWN0b3J5ID1cbiAgICAgICAgICB0aGlzLl9yZWZsZWN0b3IucmVzb2x2ZUV4dGVybmFsUmVmZXJlbmNlKElkZW50aWZpZXJzLmNyZWF0ZUNvbXBvbmVudEZhY3RvcnkpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudEZhY3Rvcnkoc2VsZWN0b3IsIGRpclR5cGUsIDxhbnk+aG9zdFZpZXcsIGlucHV0cywgb3V0cHV0cywgW10pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaW5pdENvbXBvbmVudEZhY3RvcnkoZmFjdG9yeTogU3RhdGljU3ltYm9sfG9iamVjdCwgbmdDb250ZW50U2VsZWN0b3JzOiBzdHJpbmdbXSkge1xuICAgIGlmICghKGZhY3RvcnkgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpKSB7XG4gICAgICAoZmFjdG9yeSBhcyBhbnkpLm5nQ29udGVudFNlbGVjdG9ycy5wdXNoKC4uLm5nQ29udGVudFNlbGVjdG9ycyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZFN1bW1hcnkodHlwZTogYW55LCBraW5kOiBjcGwuQ29tcGlsZVN1bW1hcnlLaW5kKTogY3BsLkNvbXBpbGVUeXBlU3VtbWFyeXxudWxsIHtcbiAgICBsZXQgdHlwZVN1bW1hcnkgPSB0aGlzLl9zdW1tYXJ5Q2FjaGUuZ2V0KHR5cGUpO1xuICAgIGlmICghdHlwZVN1bW1hcnkpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLl9zdW1tYXJ5UmVzb2x2ZXIucmVzb2x2ZVN1bW1hcnkodHlwZSk7XG4gICAgICB0eXBlU3VtbWFyeSA9IHN1bW1hcnkgPyBzdW1tYXJ5LnR5cGUgOiBudWxsO1xuICAgICAgdGhpcy5fc3VtbWFyeUNhY2hlLnNldCh0eXBlLCB0eXBlU3VtbWFyeSB8fCBudWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVTdW1tYXJ5ICYmIHR5cGVTdW1tYXJ5LnN1bW1hcnlLaW5kID09PSBraW5kID8gdHlwZVN1bW1hcnkgOiBudWxsO1xuICB9XG5cbiAgZ2V0SG9zdENvbXBvbmVudE1ldGFkYXRhKFxuICAgICAgY29tcE1ldGE6IGNwbC5Db21waWxlRGlyZWN0aXZlTWV0YWRhdGEsXG4gICAgICBob3N0Vmlld1R5cGU/OiBTdGF0aWNTeW1ib2x8Y3BsLlByb3h5Q2xhc3MpOiBjcGwuQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhIHtcbiAgICBjb25zdCBob3N0VHlwZSA9IHRoaXMuZ2V0SG9zdENvbXBvbmVudFR5cGUoY29tcE1ldGEudHlwZS5yZWZlcmVuY2UpO1xuICAgIGlmICghaG9zdFZpZXdUeXBlKSB7XG4gICAgICBob3N0Vmlld1R5cGUgPSB0aGlzLmdldEhvc3RDb21wb25lbnRWaWV3Q2xhc3MoaG9zdFR5cGUpO1xuICAgIH1cbiAgICAvLyBOb3RlOiAhIGlzIG9rIGhlcmUgYXMgdGhpcyBtZXRob2Qgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIHdpdGggbm9ybWFsaXplZCBkaXJlY3RpdmVcbiAgICAvLyBtZXRhZGF0YSwgd2hpY2ggYWx3YXlzIGZpbGxzIGluIHRoZSBzZWxlY3Rvci5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGNvbXBNZXRhLnNlbGVjdG9yISlbMF0uZ2V0TWF0Y2hpbmdFbGVtZW50VGVtcGxhdGUoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVVybCA9ICcnO1xuICAgIGNvbnN0IGh0bWxBc3QgPSB0aGlzLl9odG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLCB0ZW1wbGF0ZVVybCk7XG4gICAgcmV0dXJuIGNwbC5Db21waWxlRGlyZWN0aXZlTWV0YWRhdGEuY3JlYXRlKHtcbiAgICAgIGlzSG9zdDogdHJ1ZSxcbiAgICAgIHR5cGU6IHtyZWZlcmVuY2U6IGhvc3RUeXBlLCBkaURlcHM6IFtdLCBsaWZlY3ljbGVIb29rczogW119LFxuICAgICAgdGVtcGxhdGU6IG5ldyBjcGwuQ29tcGlsZVRlbXBsYXRlTWV0YWRhdGEoe1xuICAgICAgICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgdGVtcGxhdGVVcmwsXG4gICAgICAgIGh0bWxBc3QsXG4gICAgICAgIHN0eWxlczogW10sXG4gICAgICAgIHN0eWxlVXJsczogW10sXG4gICAgICAgIG5nQ29udGVudFNlbGVjdG9yczogW10sXG4gICAgICAgIGFuaW1hdGlvbnM6IFtdLFxuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgICAgZXh0ZXJuYWxTdHlsZXNoZWV0czogW10sXG4gICAgICAgIGludGVycG9sYXRpb246IG51bGwsXG4gICAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICBleHBvcnRBczogbnVsbCxcbiAgICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuRGVmYXVsdCxcbiAgICAgIGlucHV0czogW10sXG4gICAgICBvdXRwdXRzOiBbXSxcbiAgICAgIGhvc3Q6IHt9LFxuICAgICAgaXNDb21wb25lbnQ6IHRydWUsXG4gICAgICBzZWxlY3RvcjogJyonLFxuICAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAgIHZpZXdQcm92aWRlcnM6IFtdLFxuICAgICAgcXVlcmllczogW10sXG4gICAgICBndWFyZHM6IHt9LFxuICAgICAgdmlld1F1ZXJpZXM6IFtdLFxuICAgICAgY29tcG9uZW50Vmlld1R5cGU6IGhvc3RWaWV3VHlwZSxcbiAgICAgIHJlbmRlcmVyVHlwZToge2lkOiAnX19Ib3N0X18nLCBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLCBzdHlsZXM6IFtdLCBkYXRhOiB7fX0gYXNcbiAgICAgICAgICBvYmplY3QsXG4gICAgICBlbnRyeUNvbXBvbmVudHM6IFtdLFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogbnVsbFxuICAgIH0pO1xuICB9XG5cbiAgbG9hZERpcmVjdGl2ZU1ldGFkYXRhKG5nTW9kdWxlVHlwZTogYW55LCBkaXJlY3RpdmVUeXBlOiBhbnksIGlzU3luYzogYm9vbGVhbik6IFN5bmNBc3luYzxudWxsPiB7XG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZUNhY2hlLmhhcyhkaXJlY3RpdmVUeXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGRpcmVjdGl2ZVR5cGUgPSByZXNvbHZlRm9yd2FyZFJlZihkaXJlY3RpdmVUeXBlKTtcbiAgICBjb25zdCB7YW5ub3RhdGlvbiwgbWV0YWRhdGF9ID0gdGhpcy5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlVHlwZSkhO1xuXG4gICAgY29uc3QgY3JlYXRlRGlyZWN0aXZlTWV0YWRhdGEgPSAodGVtcGxhdGVNZXRhZGF0YTogY3BsLkNvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhfG51bGwpID0+IHtcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWREaXJNZXRhID0gbmV3IGNwbC5Db21waWxlRGlyZWN0aXZlTWV0YWRhdGEoe1xuICAgICAgICBpc0hvc3Q6IGZhbHNlLFxuICAgICAgICB0eXBlOiBtZXRhZGF0YS50eXBlLFxuICAgICAgICBpc0NvbXBvbmVudDogbWV0YWRhdGEuaXNDb21wb25lbnQsXG4gICAgICAgIHNlbGVjdG9yOiBtZXRhZGF0YS5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IG1ldGFkYXRhLmV4cG9ydEFzLFxuICAgICAgICBjaGFuZ2VEZXRlY3Rpb246IG1ldGFkYXRhLmNoYW5nZURldGVjdGlvbixcbiAgICAgICAgaW5wdXRzOiBtZXRhZGF0YS5pbnB1dHMsXG4gICAgICAgIG91dHB1dHM6IG1ldGFkYXRhLm91dHB1dHMsXG4gICAgICAgIGhvc3RMaXN0ZW5lcnM6IG1ldGFkYXRhLmhvc3RMaXN0ZW5lcnMsXG4gICAgICAgIGhvc3RQcm9wZXJ0aWVzOiBtZXRhZGF0YS5ob3N0UHJvcGVydGllcyxcbiAgICAgICAgaG9zdEF0dHJpYnV0ZXM6IG1ldGFkYXRhLmhvc3RBdHRyaWJ1dGVzLFxuICAgICAgICBwcm92aWRlcnM6IG1ldGFkYXRhLnByb3ZpZGVycyxcbiAgICAgICAgdmlld1Byb3ZpZGVyczogbWV0YWRhdGEudmlld1Byb3ZpZGVycyxcbiAgICAgICAgcXVlcmllczogbWV0YWRhdGEucXVlcmllcyxcbiAgICAgICAgZ3VhcmRzOiBtZXRhZGF0YS5ndWFyZHMsXG4gICAgICAgIHZpZXdRdWVyaWVzOiBtZXRhZGF0YS52aWV3UXVlcmllcyxcbiAgICAgICAgZW50cnlDb21wb25lbnRzOiBtZXRhZGF0YS5lbnRyeUNvbXBvbmVudHMsXG4gICAgICAgIGNvbXBvbmVudFZpZXdUeXBlOiBtZXRhZGF0YS5jb21wb25lbnRWaWV3VHlwZSxcbiAgICAgICAgcmVuZGVyZXJUeXBlOiBtZXRhZGF0YS5yZW5kZXJlclR5cGUsXG4gICAgICAgIGNvbXBvbmVudEZhY3Rvcnk6IG1ldGFkYXRhLmNvbXBvbmVudEZhY3RvcnksXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZU1ldGFkYXRhXG4gICAgICB9KTtcbiAgICAgIGlmICh0ZW1wbGF0ZU1ldGFkYXRhKSB7XG4gICAgICAgIHRoaXMuaW5pdENvbXBvbmVudEZhY3RvcnkobWV0YWRhdGEuY29tcG9uZW50RmFjdG9yeSEsIHRlbXBsYXRlTWV0YWRhdGEubmdDb250ZW50U2VsZWN0b3JzKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2RpcmVjdGl2ZUNhY2hlLnNldChkaXJlY3RpdmVUeXBlLCBub3JtYWxpemVkRGlyTWV0YSk7XG4gICAgICB0aGlzLl9zdW1tYXJ5Q2FjaGUuc2V0KGRpcmVjdGl2ZVR5cGUsIG5vcm1hbGl6ZWREaXJNZXRhLnRvU3VtbWFyeSgpKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gbWV0YWRhdGEudGVtcGxhdGUgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlTWV0YSA9IHRoaXMuX2RpcmVjdGl2ZU5vcm1hbGl6ZXIubm9ybWFsaXplVGVtcGxhdGUoe1xuICAgICAgICBuZ01vZHVsZVR5cGUsXG4gICAgICAgIGNvbXBvbmVudFR5cGU6IGRpcmVjdGl2ZVR5cGUsXG4gICAgICAgIG1vZHVsZVVybDogdGhpcy5fcmVmbGVjdG9yLmNvbXBvbmVudE1vZHVsZVVybChkaXJlY3RpdmVUeXBlLCBhbm5vdGF0aW9uKSxcbiAgICAgICAgZW5jYXBzdWxhdGlvbjogdGVtcGxhdGUuZW5jYXBzdWxhdGlvbixcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLnRlbXBsYXRlLFxuICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGUudGVtcGxhdGVVcmwsXG4gICAgICAgIHN0eWxlczogdGVtcGxhdGUuc3R5bGVzLFxuICAgICAgICBzdHlsZVVybHM6IHRlbXBsYXRlLnN0eWxlVXJscyxcbiAgICAgICAgYW5pbWF0aW9uczogdGVtcGxhdGUuYW5pbWF0aW9ucyxcbiAgICAgICAgaW50ZXJwb2xhdGlvbjogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbixcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdGVtcGxhdGUucHJlc2VydmVXaGl0ZXNwYWNlc1xuICAgICAgfSk7XG4gICAgICBpZiAoaXNQcm9taXNlKHRlbXBsYXRlTWV0YSkgJiYgaXNTeW5jKSB7XG4gICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKGNvbXBvbmVudFN0aWxsTG9hZGluZ0Vycm9yKGRpcmVjdGl2ZVR5cGUpLCBkaXJlY3RpdmVUeXBlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gU3luY0FzeW5jLnRoZW4odGVtcGxhdGVNZXRhLCBjcmVhdGVEaXJlY3RpdmVNZXRhZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGRpcmVjdGl2ZVxuICAgICAgY3JlYXRlRGlyZWN0aXZlTWV0YWRhdGEobnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBnZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlVHlwZTogYW55KTpcbiAgICAgIHthbm5vdGF0aW9uOiBEaXJlY3RpdmUsIG1ldGFkYXRhOiBjcGwuQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhfXxudWxsIHtcbiAgICBkaXJlY3RpdmVUeXBlID0gcmVzb2x2ZUZvcndhcmRSZWYoZGlyZWN0aXZlVHlwZSk7XG4gICAgaWYgKCFkaXJlY3RpdmVUeXBlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbGV0IGNhY2hlRW50cnkgPSB0aGlzLl9ub25Ob3JtYWxpemVkRGlyZWN0aXZlQ2FjaGUuZ2V0KGRpcmVjdGl2ZVR5cGUpO1xuICAgIGlmIChjYWNoZUVudHJ5KSB7XG4gICAgICByZXR1cm4gY2FjaGVFbnRyeTtcbiAgICB9XG4gICAgY29uc3QgZGlyTWV0YSA9IHRoaXMuX2RpcmVjdGl2ZVJlc29sdmVyLnJlc29sdmUoZGlyZWN0aXZlVHlwZSwgZmFsc2UpO1xuICAgIGlmICghZGlyTWV0YSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGxldCBub25Ob3JtYWxpemVkVGVtcGxhdGVNZXRhZGF0YTogY3BsLkNvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhID0gdW5kZWZpbmVkITtcblxuICAgIGlmIChjcmVhdGVDb21wb25lbnQuaXNUeXBlT2YoZGlyTWV0YSkpIHtcbiAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgY29uc3QgY29tcE1ldGEgPSBkaXJNZXRhIGFzIENvbXBvbmVudDtcbiAgICAgIGFzc2VydEFycmF5T2ZTdHJpbmdzKCdzdHlsZXMnLCBjb21wTWV0YS5zdHlsZXMpO1xuICAgICAgYXNzZXJ0QXJyYXlPZlN0cmluZ3MoJ3N0eWxlVXJscycsIGNvbXBNZXRhLnN0eWxlVXJscyk7XG4gICAgICBhc3NlcnRJbnRlcnBvbGF0aW9uU3ltYm9scygnaW50ZXJwb2xhdGlvbicsIGNvbXBNZXRhLmludGVycG9sYXRpb24pO1xuXG4gICAgICBjb25zdCBhbmltYXRpb25zID0gY29tcE1ldGEuYW5pbWF0aW9ucztcblxuICAgICAgbm9uTm9ybWFsaXplZFRlbXBsYXRlTWV0YWRhdGEgPSBuZXcgY3BsLkNvbXBpbGVUZW1wbGF0ZU1ldGFkYXRhKHtcbiAgICAgICAgZW5jYXBzdWxhdGlvbjogbm9VbmRlZmluZWQoY29tcE1ldGEuZW5jYXBzdWxhdGlvbiksXG4gICAgICAgIHRlbXBsYXRlOiBub1VuZGVmaW5lZChjb21wTWV0YS50ZW1wbGF0ZSksXG4gICAgICAgIHRlbXBsYXRlVXJsOiBub1VuZGVmaW5lZChjb21wTWV0YS50ZW1wbGF0ZVVybCksXG4gICAgICAgIGh0bWxBc3Q6IG51bGwsXG4gICAgICAgIHN0eWxlczogY29tcE1ldGEuc3R5bGVzIHx8IFtdLFxuICAgICAgICBzdHlsZVVybHM6IGNvbXBNZXRhLnN0eWxlVXJscyB8fCBbXSxcbiAgICAgICAgYW5pbWF0aW9uczogYW5pbWF0aW9ucyB8fCBbXSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbjogbm9VbmRlZmluZWQoY29tcE1ldGEuaW50ZXJwb2xhdGlvbiksXG4gICAgICAgIGlzSW5saW5lOiAhIWNvbXBNZXRhLnRlbXBsYXRlLFxuICAgICAgICBleHRlcm5hbFN0eWxlc2hlZXRzOiBbXSxcbiAgICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiBbXSxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogbm9VbmRlZmluZWQoZGlyTWV0YS5wcmVzZXJ2ZVdoaXRlc3BhY2VzKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBjaGFuZ2VEZXRlY3Rpb25TdHJhdGVneTogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kgPSBudWxsITtcbiAgICBsZXQgdmlld1Byb3ZpZGVyczogY3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhW10gPSBbXTtcbiAgICBsZXQgZW50cnlDb21wb25lbnRNZXRhZGF0YTogY3BsLkNvbXBpbGVFbnRyeUNvbXBvbmVudE1ldGFkYXRhW10gPSBbXTtcbiAgICBsZXQgc2VsZWN0b3IgPSBkaXJNZXRhLnNlbGVjdG9yO1xuXG4gICAgaWYgKGNyZWF0ZUNvbXBvbmVudC5pc1R5cGVPZihkaXJNZXRhKSkge1xuICAgICAgLy8gQ29tcG9uZW50XG4gICAgICBjb25zdCBjb21wTWV0YSA9IGRpck1ldGEgYXMgQ29tcG9uZW50O1xuICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kgPSBjb21wTWV0YS5jaGFuZ2VEZXRlY3Rpb24hO1xuICAgICAgaWYgKGNvbXBNZXRhLnZpZXdQcm92aWRlcnMpIHtcbiAgICAgICAgdmlld1Byb3ZpZGVycyA9IHRoaXMuX2dldFByb3ZpZGVyc01ldGFkYXRhKFxuICAgICAgICAgICAgY29tcE1ldGEudmlld1Byb3ZpZGVycywgZW50cnlDb21wb25lbnRNZXRhZGF0YSxcbiAgICAgICAgICAgIGB2aWV3UHJvdmlkZXJzIGZvciBcIiR7c3RyaW5naWZ5VHlwZShkaXJlY3RpdmVUeXBlKX1cImAsIFtdLCBkaXJlY3RpdmVUeXBlKTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21wTWV0YS5lbnRyeUNvbXBvbmVudHMpIHtcbiAgICAgICAgZW50cnlDb21wb25lbnRNZXRhZGF0YSA9IGZsYXR0ZW5BbmREZWR1cGVBcnJheShjb21wTWV0YS5lbnRyeUNvbXBvbmVudHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgodHlwZSkgPT4gdGhpcy5fZ2V0RW50cnlDb21wb25lbnRNZXRhZGF0YSh0eXBlKSEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNvbmNhdChlbnRyeUNvbXBvbmVudE1ldGFkYXRhKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSB0aGlzLl9zY2hlbWFSZWdpc3RyeS5nZXREZWZhdWx0Q29tcG9uZW50RWxlbWVudE5hbWUoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGlyZWN0aXZlXG4gICAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gbnVsbCE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHByb3ZpZGVyczogY3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAoZGlyTWV0YS5wcm92aWRlcnMgIT0gbnVsbCkge1xuICAgICAgcHJvdmlkZXJzID0gdGhpcy5fZ2V0UHJvdmlkZXJzTWV0YWRhdGEoXG4gICAgICAgICAgZGlyTWV0YS5wcm92aWRlcnMsIGVudHJ5Q29tcG9uZW50TWV0YWRhdGEsXG4gICAgICAgICAgYHByb3ZpZGVycyBmb3IgXCIke3N0cmluZ2lmeVR5cGUoZGlyZWN0aXZlVHlwZSl9XCJgLCBbXSwgZGlyZWN0aXZlVHlwZSk7XG4gICAgfVxuICAgIGxldCBxdWVyaWVzOiBjcGwuQ29tcGlsZVF1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuICAgIGxldCB2aWV3UXVlcmllczogY3BsLkNvbXBpbGVRdWVyeU1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAoZGlyTWV0YS5xdWVyaWVzICE9IG51bGwpIHtcbiAgICAgIHF1ZXJpZXMgPSB0aGlzLl9nZXRRdWVyaWVzTWV0YWRhdGEoZGlyTWV0YS5xdWVyaWVzLCBmYWxzZSwgZGlyZWN0aXZlVHlwZSk7XG4gICAgICB2aWV3UXVlcmllcyA9IHRoaXMuX2dldFF1ZXJpZXNNZXRhZGF0YShkaXJNZXRhLnF1ZXJpZXMsIHRydWUsIGRpcmVjdGl2ZVR5cGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFkYXRhID0gY3BsLkNvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YS5jcmVhdGUoe1xuICAgICAgaXNIb3N0OiBmYWxzZSxcbiAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgIGV4cG9ydEFzOiBub1VuZGVmaW5lZChkaXJNZXRhLmV4cG9ydEFzKSxcbiAgICAgIGlzQ29tcG9uZW50OiAhIW5vbk5vcm1hbGl6ZWRUZW1wbGF0ZU1ldGFkYXRhLFxuICAgICAgdHlwZTogdGhpcy5fZ2V0VHlwZU1ldGFkYXRhKGRpcmVjdGl2ZVR5cGUpLFxuICAgICAgdGVtcGxhdGU6IG5vbk5vcm1hbGl6ZWRUZW1wbGF0ZU1ldGFkYXRhLFxuICAgICAgY2hhbmdlRGV0ZWN0aW9uOiBjaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgICAgIGlucHV0czogZGlyTWV0YS5pbnB1dHMgfHwgW10sXG4gICAgICBvdXRwdXRzOiBkaXJNZXRhLm91dHB1dHMgfHwgW10sXG4gICAgICBob3N0OiBkaXJNZXRhLmhvc3QgfHwge30sXG4gICAgICBwcm92aWRlcnM6IHByb3ZpZGVycyB8fCBbXSxcbiAgICAgIHZpZXdQcm92aWRlcnM6IHZpZXdQcm92aWRlcnMgfHwgW10sXG4gICAgICBxdWVyaWVzOiBxdWVyaWVzIHx8IFtdLFxuICAgICAgZ3VhcmRzOiBkaXJNZXRhLmd1YXJkcyB8fCB7fSxcbiAgICAgIHZpZXdRdWVyaWVzOiB2aWV3UXVlcmllcyB8fCBbXSxcbiAgICAgIGVudHJ5Q29tcG9uZW50czogZW50cnlDb21wb25lbnRNZXRhZGF0YSxcbiAgICAgIGNvbXBvbmVudFZpZXdUeXBlOiBub25Ob3JtYWxpemVkVGVtcGxhdGVNZXRhZGF0YSA/IHRoaXMuZ2V0Q29tcG9uZW50Vmlld0NsYXNzKGRpcmVjdGl2ZVR5cGUpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICByZW5kZXJlclR5cGU6IG5vbk5vcm1hbGl6ZWRUZW1wbGF0ZU1ldGFkYXRhID8gdGhpcy5nZXRSZW5kZXJlclR5cGUoZGlyZWN0aXZlVHlwZSkgOiBudWxsLFxuICAgICAgY29tcG9uZW50RmFjdG9yeTogbnVsbFxuICAgIH0pO1xuICAgIGlmIChub25Ob3JtYWxpemVkVGVtcGxhdGVNZXRhZGF0YSkge1xuICAgICAgbWV0YWRhdGEuY29tcG9uZW50RmFjdG9yeSA9XG4gICAgICAgICAgdGhpcy5nZXRDb21wb25lbnRGYWN0b3J5KHNlbGVjdG9yLCBkaXJlY3RpdmVUeXBlLCBtZXRhZGF0YS5pbnB1dHMsIG1ldGFkYXRhLm91dHB1dHMpO1xuICAgIH1cbiAgICBjYWNoZUVudHJ5ID0ge21ldGFkYXRhLCBhbm5vdGF0aW9uOiBkaXJNZXRhfTtcbiAgICB0aGlzLl9ub25Ob3JtYWxpemVkRGlyZWN0aXZlQ2FjaGUuc2V0KGRpcmVjdGl2ZVR5cGUsIGNhY2hlRW50cnkpO1xuICAgIHJldHVybiBjYWNoZUVudHJ5O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1ldGFkYXRhIGZvciB0aGUgZ2l2ZW4gZGlyZWN0aXZlLlxuICAgKiBUaGlzIGFzc3VtZXMgYGxvYWROZ01vZHVsZURpcmVjdGl2ZUFuZFBpcGVNZXRhZGF0YWAgaGFzIGJlZW4gY2FsbGVkIGZpcnN0LlxuICAgKi9cbiAgZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlVHlwZTogYW55KTogY3BsLkNvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSB7XG4gICAgY29uc3QgZGlyTWV0YSA9IHRoaXMuX2RpcmVjdGl2ZUNhY2hlLmdldChkaXJlY3RpdmVUeXBlKSE7XG4gICAgaWYgKCFkaXJNZXRhKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihcbiAgICAgICAgICBzeW50YXhFcnJvcihcbiAgICAgICAgICAgICAgYElsbGVnYWwgc3RhdGU6IGdldERpcmVjdGl2ZU1ldGFkYXRhIGNhbiBvbmx5IGJlIGNhbGxlZCBhZnRlciBsb2FkTmdNb2R1bGVEaXJlY3RpdmVBbmRQaXBlTWV0YWRhdGEgZm9yIGEgbW9kdWxlIHRoYXQgZGVjbGFyZXMgaXQuIERpcmVjdGl2ZSAke1xuICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShkaXJlY3RpdmVUeXBlKX0uYCksXG4gICAgICAgICAgZGlyZWN0aXZlVHlwZSk7XG4gICAgfVxuICAgIHJldHVybiBkaXJNZXRhO1xuICB9XG5cbiAgZ2V0RGlyZWN0aXZlU3VtbWFyeShkaXJUeXBlOiBhbnkpOiBjcGwuQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnkge1xuICAgIGNvbnN0IGRpclN1bW1hcnkgPVxuICAgICAgICA8Y3BsLkNvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5PnRoaXMuX2xvYWRTdW1tYXJ5KGRpclR5cGUsIGNwbC5Db21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKTtcbiAgICBpZiAoIWRpclN1bW1hcnkpIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgIHN5bnRheEVycm9yKFxuICAgICAgICAgICAgICBgSWxsZWdhbCBzdGF0ZTogQ291bGQgbm90IGxvYWQgdGhlIHN1bW1hcnkgZm9yIGRpcmVjdGl2ZSAke3N0cmluZ2lmeVR5cGUoZGlyVHlwZSl9LmApLFxuICAgICAgICAgIGRpclR5cGUpO1xuICAgIH1cbiAgICByZXR1cm4gZGlyU3VtbWFyeTtcbiAgfVxuXG4gIGlzRGlyZWN0aXZlKHR5cGU6IGFueSkge1xuICAgIHJldHVybiAhIXRoaXMuX2xvYWRTdW1tYXJ5KHR5cGUsIGNwbC5Db21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKSB8fFxuICAgICAgICB0aGlzLl9kaXJlY3RpdmVSZXNvbHZlci5pc0RpcmVjdGl2ZSh0eXBlKTtcbiAgfVxuXG4gIGlzQWJzdHJhY3REaXJlY3RpdmUodHlwZTogYW55KTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc3VtbWFyeSA9XG4gICAgICAgIHRoaXMuX2xvYWRTdW1tYXJ5KHR5cGUsIGNwbC5Db21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKSBhcyBjcGwuQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnk7XG4gICAgaWYgKHN1bW1hcnkgJiYgIXN1bW1hcnkuaXNDb21wb25lbnQpIHtcbiAgICAgIHJldHVybiAhc3VtbWFyeS5zZWxlY3RvcjtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fZGlyZWN0aXZlUmVzb2x2ZXIucmVzb2x2ZSh0eXBlLCBmYWxzZSk7XG4gICAgaWYgKG1ldGEgJiYgIWNyZWF0ZUNvbXBvbmVudC5pc1R5cGVPZihtZXRhKSkge1xuICAgICAgcmV0dXJuICFtZXRhLnNlbGVjdG9yO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzUGlwZSh0eXBlOiBhbnkpIHtcbiAgICByZXR1cm4gISF0aGlzLl9sb2FkU3VtbWFyeSh0eXBlLCBjcGwuQ29tcGlsZVN1bW1hcnlLaW5kLlBpcGUpIHx8XG4gICAgICAgIHRoaXMuX3BpcGVSZXNvbHZlci5pc1BpcGUodHlwZSk7XG4gIH1cblxuICBpc05nTW9kdWxlKHR5cGU6IGFueSkge1xuICAgIHJldHVybiAhIXRoaXMuX2xvYWRTdW1tYXJ5KHR5cGUsIGNwbC5Db21waWxlU3VtbWFyeUtpbmQuTmdNb2R1bGUpIHx8XG4gICAgICAgIHRoaXMuX25nTW9kdWxlUmVzb2x2ZXIuaXNOZ01vZHVsZSh0eXBlKTtcbiAgfVxuXG4gIGdldE5nTW9kdWxlU3VtbWFyeShtb2R1bGVUeXBlOiBhbnksIGFscmVhZHlDb2xsZWN0aW5nOiBTZXQ8YW55PnxudWxsID0gbnVsbCk6XG4gICAgICBjcGwuQ29tcGlsZU5nTW9kdWxlU3VtbWFyeXxudWxsIHtcbiAgICBsZXQgbW9kdWxlU3VtbWFyeTogY3BsLkNvbXBpbGVOZ01vZHVsZVN1bW1hcnl8bnVsbCA9XG4gICAgICAgIDxjcGwuQ29tcGlsZU5nTW9kdWxlU3VtbWFyeT50aGlzLl9sb2FkU3VtbWFyeShtb2R1bGVUeXBlLCBjcGwuQ29tcGlsZVN1bW1hcnlLaW5kLk5nTW9kdWxlKTtcbiAgICBpZiAoIW1vZHVsZVN1bW1hcnkpIHtcbiAgICAgIGNvbnN0IG1vZHVsZU1ldGEgPSB0aGlzLmdldE5nTW9kdWxlTWV0YWRhdGEobW9kdWxlVHlwZSwgZmFsc2UsIGFscmVhZHlDb2xsZWN0aW5nKTtcbiAgICAgIG1vZHVsZVN1bW1hcnkgPSBtb2R1bGVNZXRhID8gbW9kdWxlTWV0YS50b1N1bW1hcnkoKSA6IG51bGw7XG4gICAgICBpZiAobW9kdWxlU3VtbWFyeSkge1xuICAgICAgICB0aGlzLl9zdW1tYXJ5Q2FjaGUuc2V0KG1vZHVsZVR5cGUsIG1vZHVsZVN1bW1hcnkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlU3VtbWFyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgZGVjbGFyZWQgZGlyZWN0aXZlcyBhbmQgcGlwZXMgb2YgYW4gTmdNb2R1bGUuXG4gICAqL1xuICBsb2FkTmdNb2R1bGVEaXJlY3RpdmVBbmRQaXBlTWV0YWRhdGEobW9kdWxlVHlwZTogYW55LCBpc1N5bmM6IGJvb2xlYW4sIHRocm93SWZOb3RGb3VuZCA9IHRydWUpOlxuICAgICAgUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0TmdNb2R1bGVNZXRhZGF0YShtb2R1bGVUeXBlLCB0aHJvd0lmTm90Rm91bmQpO1xuICAgIGNvbnN0IGxvYWRpbmc6IFByb21pc2U8YW55PltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlKSB7XG4gICAgICBuZ01vZHVsZS5kZWNsYXJlZERpcmVjdGl2ZXMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IHRoaXMubG9hZERpcmVjdGl2ZU1ldGFkYXRhKG1vZHVsZVR5cGUsIGlkLnJlZmVyZW5jZSwgaXNTeW5jKTtcbiAgICAgICAgaWYgKHByb21pc2UpIHtcbiAgICAgICAgICBsb2FkaW5nLnB1c2gocHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgbmdNb2R1bGUuZGVjbGFyZWRQaXBlcy5mb3JFYWNoKChpZCkgPT4gdGhpcy5fbG9hZFBpcGVNZXRhZGF0YShpZC5yZWZlcmVuY2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKGxvYWRpbmcpO1xuICB9XG5cbiAgZ2V0U2hhbGxvd01vZHVsZU1ldGFkYXRhKG1vZHVsZVR5cGU6IGFueSk6IGNwbC5Db21waWxlU2hhbGxvd01vZHVsZU1ldGFkYXRhfG51bGwge1xuICAgIGxldCBjb21waWxlTWV0YSA9IHRoaXMuX3NoYWxsb3dNb2R1bGVDYWNoZS5nZXQobW9kdWxlVHlwZSk7XG4gICAgaWYgKGNvbXBpbGVNZXRhKSB7XG4gICAgICByZXR1cm4gY29tcGlsZU1ldGE7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGVNZXRhID1cbiAgICAgICAgZmluZExhc3QodGhpcy5fcmVmbGVjdG9yLnNoYWxsb3dBbm5vdGF0aW9ucyhtb2R1bGVUeXBlKSwgY3JlYXRlTmdNb2R1bGUuaXNUeXBlT2YpO1xuXG4gICAgY29tcGlsZU1ldGEgPSB7XG4gICAgICB0eXBlOiB0aGlzLl9nZXRUeXBlTWV0YWRhdGEobW9kdWxlVHlwZSksXG4gICAgICByYXdFeHBvcnRzOiBuZ01vZHVsZU1ldGEuZXhwb3J0cyxcbiAgICAgIHJhd0ltcG9ydHM6IG5nTW9kdWxlTWV0YS5pbXBvcnRzLFxuICAgICAgcmF3UHJvdmlkZXJzOiBuZ01vZHVsZU1ldGEucHJvdmlkZXJzLFxuICAgIH07XG5cbiAgICB0aGlzLl9zaGFsbG93TW9kdWxlQ2FjaGUuc2V0KG1vZHVsZVR5cGUsIGNvbXBpbGVNZXRhKTtcbiAgICByZXR1cm4gY29tcGlsZU1ldGE7XG4gIH1cblxuICBnZXROZ01vZHVsZU1ldGFkYXRhKFxuICAgICAgbW9kdWxlVHlwZTogYW55LCB0aHJvd0lmTm90Rm91bmQgPSB0cnVlLFxuICAgICAgYWxyZWFkeUNvbGxlY3Rpbmc6IFNldDxhbnk+fG51bGwgPSBudWxsKTogY3BsLkNvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfG51bGwge1xuICAgIG1vZHVsZVR5cGUgPSByZXNvbHZlRm9yd2FyZFJlZihtb2R1bGVUeXBlKTtcbiAgICBsZXQgY29tcGlsZU1ldGEgPSB0aGlzLl9uZ01vZHVsZUNhY2hlLmdldChtb2R1bGVUeXBlKTtcbiAgICBpZiAoY29tcGlsZU1ldGEpIHtcbiAgICAgIHJldHVybiBjb21waWxlTWV0YTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuX25nTW9kdWxlUmVzb2x2ZXIucmVzb2x2ZShtb2R1bGVUeXBlLCB0aHJvd0lmTm90Rm91bmQpO1xuICAgIGlmICghbWV0YSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xhcmVkRGlyZWN0aXZlczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdID0gW107XG4gICAgY29uc3QgZXhwb3J0ZWROb25Nb2R1bGVJZGVudGlmaWVyczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdID0gW107XG4gICAgY29uc3QgZGVjbGFyZWRQaXBlczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdID0gW107XG4gICAgY29uc3QgaW1wb3J0ZWRNb2R1bGVzOiBjcGwuQ29tcGlsZU5nTW9kdWxlU3VtbWFyeVtdID0gW107XG4gICAgY29uc3QgZXhwb3J0ZWRNb2R1bGVzOiBjcGwuQ29tcGlsZU5nTW9kdWxlU3VtbWFyeVtdID0gW107XG4gICAgY29uc3QgcHJvdmlkZXJzOiBjcGwuQ29tcGlsZVByb3ZpZGVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIGNvbnN0IGVudHJ5Q29tcG9uZW50czogY3BsLkNvbXBpbGVFbnRyeUNvbXBvbmVudE1ldGFkYXRhW10gPSBbXTtcbiAgICBjb25zdCBib290c3RyYXBDb21wb25lbnRzOiBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhW10gPSBbXTtcbiAgICBjb25zdCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdID0gW107XG5cbiAgICBpZiAobWV0YS5pbXBvcnRzKSB7XG4gICAgICBmbGF0dGVuQW5kRGVkdXBlQXJyYXkobWV0YS5pbXBvcnRzKS5mb3JFYWNoKChpbXBvcnRlZFR5cGUpID0+IHtcbiAgICAgICAgbGV0IGltcG9ydGVkTW9kdWxlVHlwZTogVHlwZSA9IHVuZGVmaW5lZCE7XG4gICAgICAgIGlmIChpc1ZhbGlkVHlwZShpbXBvcnRlZFR5cGUpKSB7XG4gICAgICAgICAgaW1wb3J0ZWRNb2R1bGVUeXBlID0gaW1wb3J0ZWRUeXBlO1xuICAgICAgICB9IGVsc2UgaWYgKGltcG9ydGVkVHlwZSAmJiBpbXBvcnRlZFR5cGUubmdNb2R1bGUpIHtcbiAgICAgICAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzID0gaW1wb3J0ZWRUeXBlO1xuICAgICAgICAgIGltcG9ydGVkTW9kdWxlVHlwZSA9IG1vZHVsZVdpdGhQcm92aWRlcnMubmdNb2R1bGU7XG4gICAgICAgICAgaWYgKG1vZHVsZVdpdGhQcm92aWRlcnMucHJvdmlkZXJzKSB7XG4gICAgICAgICAgICBwcm92aWRlcnMucHVzaCguLi50aGlzLl9nZXRQcm92aWRlcnNNZXRhZGF0YShcbiAgICAgICAgICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzLnByb3ZpZGVycywgZW50cnlDb21wb25lbnRzLFxuICAgICAgICAgICAgICAgIGBwcm92aWRlciBmb3IgdGhlIE5nTW9kdWxlICcke3N0cmluZ2lmeVR5cGUoaW1wb3J0ZWRNb2R1bGVUeXBlKX0nYCwgW10sXG4gICAgICAgICAgICAgICAgaW1wb3J0ZWRUeXBlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGltcG9ydGVkTW9kdWxlVHlwZSkge1xuICAgICAgICAgIGlmICh0aGlzLl9jaGVja1NlbGZJbXBvcnQobW9kdWxlVHlwZSwgaW1wb3J0ZWRNb2R1bGVUeXBlKSkgcmV0dXJuO1xuICAgICAgICAgIGlmICghYWxyZWFkeUNvbGxlY3RpbmcpIGFscmVhZHlDb2xsZWN0aW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgIGlmIChhbHJlYWR5Q29sbGVjdGluZy5oYXMoaW1wb3J0ZWRNb2R1bGVUeXBlKSkge1xuICAgICAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgICAgc3ludGF4RXJyb3IoYCR7dGhpcy5fZ2V0VHlwZURlc2NyaXB0b3IoaW1wb3J0ZWRNb2R1bGVUeXBlKX0gJyR7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUoaW1wb3J0ZWRUeXBlKX0nIGlzIGltcG9ydGVkIHJlY3Vyc2l2ZWx5IGJ5IHRoZSBtb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUobW9kdWxlVHlwZSl9Jy5gKSxcbiAgICAgICAgICAgICAgICBtb2R1bGVUeXBlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxyZWFkeUNvbGxlY3RpbmcuYWRkKGltcG9ydGVkTW9kdWxlVHlwZSk7XG4gICAgICAgICAgY29uc3QgaW1wb3J0ZWRNb2R1bGVTdW1tYXJ5ID1cbiAgICAgICAgICAgICAgdGhpcy5nZXROZ01vZHVsZVN1bW1hcnkoaW1wb3J0ZWRNb2R1bGVUeXBlLCBhbHJlYWR5Q29sbGVjdGluZyk7XG4gICAgICAgICAgYWxyZWFkeUNvbGxlY3RpbmcuZGVsZXRlKGltcG9ydGVkTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKCFpbXBvcnRlZE1vZHVsZVN1bW1hcnkpIHtcbiAgICAgICAgICAgIGNvbnN0IGVyciA9IHN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7dGhpcy5fZ2V0VHlwZURlc2NyaXB0b3IoaW1wb3J0ZWRUeXBlKX0gJyR7XG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShpbXBvcnRlZFR5cGUpfScgaW1wb3J0ZWQgYnkgdGhlIG1vZHVsZSAnJHtcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnlUeXBlKG1vZHVsZVR5cGUpfScuIFBsZWFzZSBhZGQgYSBATmdNb2R1bGUgYW5ub3RhdGlvbi5gKTtcbiAgICAgICAgICAgIC8vIElmIHBvc3NpYmxlLCByZWNvcmQgYWRkaXRpb25hbCBjb250ZXh0IGZvciB0aGlzIGVycm9yIHRvIGVuYWJsZSBtb3JlIHVzZWZ1bFxuICAgICAgICAgICAgLy8gZGlhZ25vc3RpY3Mgb24gdGhlIGNvbXBpbGVyIHNpZGUuXG4gICAgICAgICAgICBpZiAoaW1wb3J0ZWRUeXBlIGluc3RhbmNlb2YgU3RhdGljU3ltYm9sKSB7XG4gICAgICAgICAgICAgIChlcnIgYXMgYW55KVtNSVNTSU5HX05HX01PRFVMRV9NRVRBREFUQV9FUlJPUl9EQVRBXSA9IHtcbiAgICAgICAgICAgICAgICBmaWxlTmFtZTogaW1wb3J0ZWRUeXBlLmZpbGVQYXRoLFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogaW1wb3J0ZWRUeXBlLm5hbWUsXG4gICAgICAgICAgICAgIH0gYXMgTWlzc2luZ05nTW9kdWxlTWV0YWRhdGFFcnJvckRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9yZXBvcnRFcnJvcihlcnIsIG1vZHVsZVR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpbXBvcnRlZE1vZHVsZXMucHVzaChpbXBvcnRlZE1vZHVsZVN1bW1hcnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBzeW50YXhFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBVbmV4cGVjdGVkIHZhbHVlICcke3N0cmluZ2lmeVR5cGUoaW1wb3J0ZWRUeXBlKX0nIGltcG9ydGVkIGJ5IHRoZSBtb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0nYCksXG4gICAgICAgICAgICAgIG1vZHVsZVR5cGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuZXhwb3J0cykge1xuICAgICAgZmxhdHRlbkFuZERlZHVwZUFycmF5KG1ldGEuZXhwb3J0cykuZm9yRWFjaCgoZXhwb3J0ZWRUeXBlKSA9PiB7XG4gICAgICAgIGlmICghaXNWYWxpZFR5cGUoZXhwb3J0ZWRUeXBlKSkge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBzeW50YXhFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBVbmV4cGVjdGVkIHZhbHVlICcke3N0cmluZ2lmeVR5cGUoZXhwb3J0ZWRUeXBlKX0nIGV4cG9ydGVkIGJ5IHRoZSBtb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0nYCksXG4gICAgICAgICAgICAgIG1vZHVsZVR5cGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFscmVhZHlDb2xsZWN0aW5nKSBhbHJlYWR5Q29sbGVjdGluZyA9IG5ldyBTZXQoKTtcbiAgICAgICAgaWYgKGFscmVhZHlDb2xsZWN0aW5nLmhhcyhleHBvcnRlZFR5cGUpKSB7XG4gICAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgIHN5bnRheEVycm9yKGAke3RoaXMuX2dldFR5cGVEZXNjcmlwdG9yKGV4cG9ydGVkVHlwZSl9ICcke1xuICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5KGV4cG9ydGVkVHlwZSl9JyBpcyBleHBvcnRlZCByZWN1cnNpdmVseSBieSB0aGUgbW9kdWxlICcke1xuICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0nYCksXG4gICAgICAgICAgICAgIG1vZHVsZVR5cGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhbHJlYWR5Q29sbGVjdGluZy5hZGQoZXhwb3J0ZWRUeXBlKTtcbiAgICAgICAgY29uc3QgZXhwb3J0ZWRNb2R1bGVTdW1tYXJ5ID0gdGhpcy5nZXROZ01vZHVsZVN1bW1hcnkoZXhwb3J0ZWRUeXBlLCBhbHJlYWR5Q29sbGVjdGluZyk7XG4gICAgICAgIGFscmVhZHlDb2xsZWN0aW5nLmRlbGV0ZShleHBvcnRlZFR5cGUpO1xuICAgICAgICBpZiAoZXhwb3J0ZWRNb2R1bGVTdW1tYXJ5KSB7XG4gICAgICAgICAgZXhwb3J0ZWRNb2R1bGVzLnB1c2goZXhwb3J0ZWRNb2R1bGVTdW1tYXJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBleHBvcnRlZE5vbk1vZHVsZUlkZW50aWZpZXJzLnB1c2godGhpcy5fZ2V0SWRlbnRpZmllck1ldGFkYXRhKGV4cG9ydGVkVHlwZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBOb3RlOiBUaGlzIHdpbGwgYmUgbW9kaWZpZWQgbGF0ZXIsIHNvIHdlIHJlbHkgb25cbiAgICAvLyBnZXR0aW5nIGEgbmV3IGluc3RhbmNlIGV2ZXJ5IHRpbWUhXG4gICAgY29uc3QgdHJhbnNpdGl2ZU1vZHVsZSA9IHRoaXMuX2dldFRyYW5zaXRpdmVOZ01vZHVsZU1ldGFkYXRhKGltcG9ydGVkTW9kdWxlcywgZXhwb3J0ZWRNb2R1bGVzKTtcbiAgICBpZiAobWV0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGZsYXR0ZW5BbmREZWR1cGVBcnJheShtZXRhLmRlY2xhcmF0aW9ucykuZm9yRWFjaCgoZGVjbGFyZWRUeXBlKSA9PiB7XG4gICAgICAgIGlmICghaXNWYWxpZFR5cGUoZGVjbGFyZWRUeXBlKSkge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBzeW50YXhFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBVbmV4cGVjdGVkIHZhbHVlICcke3N0cmluZ2lmeVR5cGUoZGVjbGFyZWRUeXBlKX0nIGRlY2xhcmVkIGJ5IHRoZSBtb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0nYCksXG4gICAgICAgICAgICAgIG1vZHVsZVR5cGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWNsYXJlZElkZW50aWZpZXIgPSB0aGlzLl9nZXRJZGVudGlmaWVyTWV0YWRhdGEoZGVjbGFyZWRUeXBlKTtcbiAgICAgICAgaWYgKHRoaXMuaXNEaXJlY3RpdmUoZGVjbGFyZWRUeXBlKSkge1xuICAgICAgICAgIGlmICh0aGlzLmlzQWJzdHJhY3REaXJlY3RpdmUoZGVjbGFyZWRUeXBlKSkge1xuICAgICAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgICAgc3ludGF4RXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIGBEaXJlY3RpdmUgJHtzdHJpbmdpZnlUeXBlKGRlY2xhcmVkVHlwZSl9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKSxcbiAgICAgICAgICAgICAgICBkZWNsYXJlZFR5cGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0cmFuc2l0aXZlTW9kdWxlLmFkZERpcmVjdGl2ZShkZWNsYXJlZElkZW50aWZpZXIpO1xuICAgICAgICAgIGRlY2xhcmVkRGlyZWN0aXZlcy5wdXNoKGRlY2xhcmVkSWRlbnRpZmllcik7XG4gICAgICAgICAgdGhpcy5fYWRkVHlwZVRvTW9kdWxlKGRlY2xhcmVkVHlwZSwgbW9kdWxlVHlwZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1BpcGUoZGVjbGFyZWRUeXBlKSkge1xuICAgICAgICAgIHRyYW5zaXRpdmVNb2R1bGUuYWRkUGlwZShkZWNsYXJlZElkZW50aWZpZXIpO1xuICAgICAgICAgIHRyYW5zaXRpdmVNb2R1bGUucGlwZXMucHVzaChkZWNsYXJlZElkZW50aWZpZXIpO1xuICAgICAgICAgIGRlY2xhcmVkUGlwZXMucHVzaChkZWNsYXJlZElkZW50aWZpZXIpO1xuICAgICAgICAgIHRoaXMuX2FkZFR5cGVUb01vZHVsZShkZWNsYXJlZFR5cGUsIG1vZHVsZVR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBzeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3RoaXMuX2dldFR5cGVEZXNjcmlwdG9yKGRlY2xhcmVkVHlwZSl9ICcke1xuICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShkZWNsYXJlZFR5cGUpfScgZGVjbGFyZWQgYnkgdGhlIG1vZHVsZSAnJHtcbiAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUoXG4gICAgICAgICAgICAgICAgICAgICAgbW9kdWxlVHlwZSl9Jy4gUGxlYXNlIGFkZCBhIEBQaXBlL0BEaXJlY3RpdmUvQENvbXBvbmVudCBhbm5vdGF0aW9uLmApLFxuICAgICAgICAgICAgICBtb2R1bGVUeXBlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydGVkRGlyZWN0aXZlczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdID0gW107XG4gICAgY29uc3QgZXhwb3J0ZWRQaXBlczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdID0gW107XG4gICAgZXhwb3J0ZWROb25Nb2R1bGVJZGVudGlmaWVycy5mb3JFYWNoKChleHBvcnRlZElkKSA9PiB7XG4gICAgICBpZiAodHJhbnNpdGl2ZU1vZHVsZS5kaXJlY3RpdmVzU2V0LmhhcyhleHBvcnRlZElkLnJlZmVyZW5jZSkpIHtcbiAgICAgICAgZXhwb3J0ZWREaXJlY3RpdmVzLnB1c2goZXhwb3J0ZWRJZCk7XG4gICAgICAgIHRyYW5zaXRpdmVNb2R1bGUuYWRkRXhwb3J0ZWREaXJlY3RpdmUoZXhwb3J0ZWRJZCk7XG4gICAgICB9IGVsc2UgaWYgKHRyYW5zaXRpdmVNb2R1bGUucGlwZXNTZXQuaGFzKGV4cG9ydGVkSWQucmVmZXJlbmNlKSkge1xuICAgICAgICBleHBvcnRlZFBpcGVzLnB1c2goZXhwb3J0ZWRJZCk7XG4gICAgICAgIHRyYW5zaXRpdmVNb2R1bGUuYWRkRXhwb3J0ZWRQaXBlKGV4cG9ydGVkSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICBzeW50YXhFcnJvcihgQ2FuJ3QgZXhwb3J0ICR7dGhpcy5fZ2V0VHlwZURlc2NyaXB0b3IoZXhwb3J0ZWRJZC5yZWZlcmVuY2UpfSAke1xuICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUoZXhwb3J0ZWRJZC5yZWZlcmVuY2UpfSBmcm9tICR7XG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0gYXMgaXQgd2FzIG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkIWApLFxuICAgICAgICAgICAgbW9kdWxlVHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRoZSBwcm92aWRlcnMgb2YgdGhlIG1vZHVsZSBoYXZlIHRvIGdvIGxhc3RcbiAgICAvLyBzbyB0aGF0IHRoZXkgb3ZlcndyaXRlIGFueSBvdGhlciBwcm92aWRlciB3ZSBhbHJlYWR5IGFkZGVkLlxuICAgIGlmIChtZXRhLnByb3ZpZGVycykge1xuICAgICAgcHJvdmlkZXJzLnB1c2goLi4udGhpcy5fZ2V0UHJvdmlkZXJzTWV0YWRhdGEoXG4gICAgICAgICAgbWV0YS5wcm92aWRlcnMsIGVudHJ5Q29tcG9uZW50cyxcbiAgICAgICAgICBgcHJvdmlkZXIgZm9yIHRoZSBOZ01vZHVsZSAnJHtzdHJpbmdpZnlUeXBlKG1vZHVsZVR5cGUpfSdgLCBbXSwgbW9kdWxlVHlwZSkpO1xuICAgIH1cblxuICAgIGlmIChtZXRhLmVudHJ5Q29tcG9uZW50cykge1xuICAgICAgZW50cnlDb21wb25lbnRzLnB1c2goLi4uZmxhdHRlbkFuZERlZHVwZUFycmF5KG1ldGEuZW50cnlDb21wb25lbnRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAodHlwZSA9PiB0aGlzLl9nZXRFbnRyeUNvbXBvbmVudE1ldGFkYXRhKHR5cGUpISkpO1xuICAgIH1cblxuICAgIGlmIChtZXRhLmJvb3RzdHJhcCkge1xuICAgICAgZmxhdHRlbkFuZERlZHVwZUFycmF5KG1ldGEuYm9vdHN0cmFwKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICBpZiAoIWlzVmFsaWRUeXBlKHR5cGUpKSB7XG4gICAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgIHN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlICcke1xuICAgICAgICAgICAgICAgICAgc3RyaW5naWZ5VHlwZSh0eXBlKX0nIHVzZWQgaW4gdGhlIGJvb3RzdHJhcCBwcm9wZXJ0eSBvZiBtb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICBzdHJpbmdpZnlUeXBlKG1vZHVsZVR5cGUpfSdgKSxcbiAgICAgICAgICAgICAgbW9kdWxlVHlwZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGJvb3RzdHJhcENvbXBvbmVudHMucHVzaCh0aGlzLl9nZXRJZGVudGlmaWVyTWV0YWRhdGEodHlwZSkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZW50cnlDb21wb25lbnRzLnB1c2goXG4gICAgICAgIC4uLmJvb3RzdHJhcENvbXBvbmVudHMubWFwKHR5cGUgPT4gdGhpcy5fZ2V0RW50cnlDb21wb25lbnRNZXRhZGF0YSh0eXBlLnJlZmVyZW5jZSkhKSk7XG5cbiAgICBpZiAobWV0YS5zY2hlbWFzKSB7XG4gICAgICBzY2hlbWFzLnB1c2goLi4uZmxhdHRlbkFuZERlZHVwZUFycmF5KG1ldGEuc2NoZW1hcykpO1xuICAgIH1cblxuICAgIGNvbXBpbGVNZXRhID0gbmV3IGNwbC5Db21waWxlTmdNb2R1bGVNZXRhZGF0YSh7XG4gICAgICB0eXBlOiB0aGlzLl9nZXRUeXBlTWV0YWRhdGEobW9kdWxlVHlwZSksXG4gICAgICBwcm92aWRlcnMsXG4gICAgICBlbnRyeUNvbXBvbmVudHMsXG4gICAgICBib290c3RyYXBDb21wb25lbnRzLFxuICAgICAgc2NoZW1hcyxcbiAgICAgIGRlY2xhcmVkRGlyZWN0aXZlcyxcbiAgICAgIGV4cG9ydGVkRGlyZWN0aXZlcyxcbiAgICAgIGRlY2xhcmVkUGlwZXMsXG4gICAgICBleHBvcnRlZFBpcGVzLFxuICAgICAgaW1wb3J0ZWRNb2R1bGVzLFxuICAgICAgZXhwb3J0ZWRNb2R1bGVzLFxuICAgICAgdHJhbnNpdGl2ZU1vZHVsZSxcbiAgICAgIGlkOiBtZXRhLmlkIHx8IG51bGwsXG4gICAgfSk7XG5cbiAgICBlbnRyeUNvbXBvbmVudHMuZm9yRWFjaCgoaWQpID0+IHRyYW5zaXRpdmVNb2R1bGUuYWRkRW50cnlDb21wb25lbnQoaWQpKTtcbiAgICBwcm92aWRlcnMuZm9yRWFjaCgocHJvdmlkZXIpID0+IHRyYW5zaXRpdmVNb2R1bGUuYWRkUHJvdmlkZXIocHJvdmlkZXIsIGNvbXBpbGVNZXRhIS50eXBlKSk7XG4gICAgdHJhbnNpdGl2ZU1vZHVsZS5hZGRNb2R1bGUoY29tcGlsZU1ldGEudHlwZSk7XG4gICAgdGhpcy5fbmdNb2R1bGVDYWNoZS5zZXQobW9kdWxlVHlwZSwgY29tcGlsZU1ldGEpO1xuICAgIHJldHVybiBjb21waWxlTWV0YTtcbiAgfVxuXG4gIHByaXZhdGUgX2NoZWNrU2VsZkltcG9ydChtb2R1bGVUeXBlOiBUeXBlLCBpbXBvcnRlZE1vZHVsZVR5cGU6IFR5cGUpOiBib29sZWFuIHtcbiAgICBpZiAobW9kdWxlVHlwZSA9PT0gaW1wb3J0ZWRNb2R1bGVUeXBlKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihcbiAgICAgICAgICBzeW50YXhFcnJvcihgJyR7c3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0nIG1vZHVsZSBjYW4ndCBpbXBvcnQgaXRzZWxmYCksIG1vZHVsZVR5cGUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldFR5cGVEZXNjcmlwdG9yKHR5cGU6IFR5cGUpOiBzdHJpbmcge1xuICAgIGlmIChpc1ZhbGlkVHlwZSh0eXBlKSkge1xuICAgICAgaWYgKHRoaXMuaXNEaXJlY3RpdmUodHlwZSkpIHtcbiAgICAgICAgcmV0dXJuICdkaXJlY3RpdmUnO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5pc1BpcGUodHlwZSkpIHtcbiAgICAgICAgcmV0dXJuICdwaXBlJztcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaXNOZ01vZHVsZSh0eXBlKSkge1xuICAgICAgICByZXR1cm4gJ21vZHVsZSc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCh0eXBlIGFzIGFueSkucHJvdmlkZSkge1xuICAgICAgcmV0dXJuICdwcm92aWRlcic7XG4gICAgfVxuXG4gICAgcmV0dXJuICd2YWx1ZSc7XG4gIH1cblxuXG4gIHByaXZhdGUgX2FkZFR5cGVUb01vZHVsZSh0eXBlOiBUeXBlLCBtb2R1bGVUeXBlOiBUeXBlKSB7XG4gICAgY29uc3Qgb2xkTW9kdWxlID0gdGhpcy5fbmdNb2R1bGVPZlR5cGVzLmdldCh0eXBlKTtcbiAgICBpZiAob2xkTW9kdWxlICYmIG9sZE1vZHVsZSAhPT0gbW9kdWxlVHlwZSkge1xuICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgc3ludGF4RXJyb3IoXG4gICAgICAgICAgICAgIGBUeXBlICR7c3RyaW5naWZ5VHlwZSh0eXBlKX0gaXMgcGFydCBvZiB0aGUgZGVjbGFyYXRpb25zIG9mIDIgbW9kdWxlczogJHtcbiAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUob2xkTW9kdWxlKX0gYW5kICR7c3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0hIGAgK1xuICAgICAgICAgICAgICBgUGxlYXNlIGNvbnNpZGVyIG1vdmluZyAke3N0cmluZ2lmeVR5cGUodHlwZSl9IHRvIGEgaGlnaGVyIG1vZHVsZSB0aGF0IGltcG9ydHMgJHtcbiAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUob2xkTW9kdWxlKX0gYW5kICR7c3RyaW5naWZ5VHlwZShtb2R1bGVUeXBlKX0uIGAgK1xuICAgICAgICAgICAgICBgWW91IGNhbiBhbHNvIGNyZWF0ZSBhIG5ldyBOZ01vZHVsZSB0aGF0IGV4cG9ydHMgYW5kIGluY2x1ZGVzICR7XG4gICAgICAgICAgICAgICAgICBzdHJpbmdpZnlUeXBlKHR5cGUpfSB0aGVuIGltcG9ydCB0aGF0IE5nTW9kdWxlIGluICR7XG4gICAgICAgICAgICAgICAgICBzdHJpbmdpZnlUeXBlKG9sZE1vZHVsZSl9IGFuZCAke3N0cmluZ2lmeVR5cGUobW9kdWxlVHlwZSl9LmApLFxuICAgICAgICAgIG1vZHVsZVR5cGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9uZ01vZHVsZU9mVHlwZXMuc2V0KHR5cGUsIG1vZHVsZVR5cGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0VHJhbnNpdGl2ZU5nTW9kdWxlTWV0YWRhdGEoXG4gICAgICBpbXBvcnRlZE1vZHVsZXM6IGNwbC5Db21waWxlTmdNb2R1bGVTdW1tYXJ5W10sXG4gICAgICBleHBvcnRlZE1vZHVsZXM6IGNwbC5Db21waWxlTmdNb2R1bGVTdW1tYXJ5W10pOiBjcGwuVHJhbnNpdGl2ZUNvbXBpbGVOZ01vZHVsZU1ldGFkYXRhIHtcbiAgICAvLyBjb2xsZWN0IGBwcm92aWRlcnNgIC8gYGVudHJ5Q29tcG9uZW50c2AgZnJvbSBhbGwgaW1wb3J0ZWQgYW5kIGFsbCBleHBvcnRlZCBtb2R1bGVzXG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IGNwbC5UcmFuc2l0aXZlQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEoKTtcbiAgICBjb25zdCBtb2R1bGVzQnlUb2tlbiA9IG5ldyBNYXA8YW55LCBTZXQ8YW55Pj4oKTtcbiAgICBpbXBvcnRlZE1vZHVsZXMuY29uY2F0KGV4cG9ydGVkTW9kdWxlcykuZm9yRWFjaCgobW9kU3VtbWFyeSkgPT4ge1xuICAgICAgbW9kU3VtbWFyeS5tb2R1bGVzLmZvckVhY2goKG1vZCkgPT4gcmVzdWx0LmFkZE1vZHVsZShtb2QpKTtcbiAgICAgIG1vZFN1bW1hcnkuZW50cnlDb21wb25lbnRzLmZvckVhY2goKGNvbXApID0+IHJlc3VsdC5hZGRFbnRyeUNvbXBvbmVudChjb21wKSk7XG4gICAgICBjb25zdCBhZGRlZFRva2VucyA9IG5ldyBTZXQ8YW55PigpO1xuICAgICAgbW9kU3VtbWFyeS5wcm92aWRlcnMuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICAgICAgY29uc3QgdG9rZW5SZWYgPSBjcGwudG9rZW5SZWZlcmVuY2UoZW50cnkucHJvdmlkZXIudG9rZW4pO1xuICAgICAgICBsZXQgcHJldk1vZHVsZXMgPSBtb2R1bGVzQnlUb2tlbi5nZXQodG9rZW5SZWYpO1xuICAgICAgICBpZiAoIXByZXZNb2R1bGVzKSB7XG4gICAgICAgICAgcHJldk1vZHVsZXMgPSBuZXcgU2V0PGFueT4oKTtcbiAgICAgICAgICBtb2R1bGVzQnlUb2tlbi5zZXQodG9rZW5SZWYsIHByZXZNb2R1bGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtb2R1bGVSZWYgPSBlbnRyeS5tb2R1bGUucmVmZXJlbmNlO1xuICAgICAgICAvLyBOb3RlOiB0aGUgcHJvdmlkZXJzIG9mIG9uZSBtb2R1bGUgbWF5IHN0aWxsIGNvbnRhaW4gbXVsdGlwbGUgcHJvdmlkZXJzXG4gICAgICAgIC8vIHBlciB0b2tlbiAoZS5nLiBmb3IgbXVsdGkgcHJvdmlkZXJzKSwgYW5kIHdlIG5lZWQgdG8gcHJlc2VydmUgdGhlc2UuXG4gICAgICAgIGlmIChhZGRlZFRva2Vucy5oYXModG9rZW5SZWYpIHx8ICFwcmV2TW9kdWxlcy5oYXMobW9kdWxlUmVmKSkge1xuICAgICAgICAgIHByZXZNb2R1bGVzLmFkZChtb2R1bGVSZWYpO1xuICAgICAgICAgIGFkZGVkVG9rZW5zLmFkZCh0b2tlblJlZik7XG4gICAgICAgICAgcmVzdWx0LmFkZFByb3ZpZGVyKGVudHJ5LnByb3ZpZGVyLCBlbnRyeS5tb2R1bGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBleHBvcnRlZE1vZHVsZXMuZm9yRWFjaCgobW9kU3VtbWFyeSkgPT4ge1xuICAgICAgbW9kU3VtbWFyeS5leHBvcnRlZERpcmVjdGl2ZXMuZm9yRWFjaCgoaWQpID0+IHJlc3VsdC5hZGRFeHBvcnRlZERpcmVjdGl2ZShpZCkpO1xuICAgICAgbW9kU3VtbWFyeS5leHBvcnRlZFBpcGVzLmZvckVhY2goKGlkKSA9PiByZXN1bHQuYWRkRXhwb3J0ZWRQaXBlKGlkKSk7XG4gICAgfSk7XG4gICAgaW1wb3J0ZWRNb2R1bGVzLmZvckVhY2goKG1vZFN1bW1hcnkpID0+IHtcbiAgICAgIG1vZFN1bW1hcnkuZXhwb3J0ZWREaXJlY3RpdmVzLmZvckVhY2goKGlkKSA9PiByZXN1bHQuYWRkRGlyZWN0aXZlKGlkKSk7XG4gICAgICBtb2RTdW1tYXJ5LmV4cG9ydGVkUGlwZXMuZm9yRWFjaCgoaWQpID0+IHJlc3VsdC5hZGRQaXBlKGlkKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgX2dldElkZW50aWZpZXJNZXRhZGF0YSh0eXBlOiBUeXBlKTogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YSB7XG4gICAgdHlwZSA9IHJlc29sdmVGb3J3YXJkUmVmKHR5cGUpO1xuICAgIHJldHVybiB7cmVmZXJlbmNlOiB0eXBlfTtcbiAgfVxuXG4gIGlzSW5qZWN0YWJsZSh0eXBlOiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBhbm5vdGF0aW9ucyA9IHRoaXMuX3JlZmxlY3Rvci50cnlBbm5vdGF0aW9ucyh0eXBlKTtcbiAgICByZXR1cm4gYW5ub3RhdGlvbnMuc29tZShhbm4gPT4gY3JlYXRlSW5qZWN0YWJsZS5pc1R5cGVPZihhbm4pKTtcbiAgfVxuXG4gIGdldEluamVjdGFibGVTdW1tYXJ5KHR5cGU6IGFueSk6IGNwbC5Db21waWxlVHlwZVN1bW1hcnkge1xuICAgIHJldHVybiB7XG4gICAgICBzdW1tYXJ5S2luZDogY3BsLkNvbXBpbGVTdW1tYXJ5S2luZC5JbmplY3RhYmxlLFxuICAgICAgdHlwZTogdGhpcy5fZ2V0VHlwZU1ldGFkYXRhKHR5cGUsIG51bGwsIGZhbHNlKVxuICAgIH07XG4gIH1cblxuICBnZXRJbmplY3RhYmxlTWV0YWRhdGEoXG4gICAgICB0eXBlOiBhbnksIGRlcGVuZGVuY2llczogYW55W118bnVsbCA9IG51bGwsXG4gICAgICB0aHJvd09uVW5rbm93bkRlcHM6IGJvb2xlYW4gPSB0cnVlKTogY3BsLkNvbXBpbGVJbmplY3RhYmxlTWV0YWRhdGF8bnVsbCB7XG4gICAgY29uc3QgdHlwZVN1bW1hcnkgPSB0aGlzLl9sb2FkU3VtbWFyeSh0eXBlLCBjcGwuQ29tcGlsZVN1bW1hcnlLaW5kLkluamVjdGFibGUpO1xuICAgIGNvbnN0IHR5cGVNZXRhZGF0YSA9IHR5cGVTdW1tYXJ5ID9cbiAgICAgICAgdHlwZVN1bW1hcnkudHlwZSA6XG4gICAgICAgIHRoaXMuX2dldFR5cGVNZXRhZGF0YSh0eXBlLCBkZXBlbmRlbmNpZXMsIHRocm93T25Vbmtub3duRGVwcyk7XG5cbiAgICBjb25zdCBhbm5vdGF0aW9uczogSW5qZWN0YWJsZVtdID1cbiAgICAgICAgdGhpcy5fcmVmbGVjdG9yLmFubm90YXRpb25zKHR5cGUpLmZpbHRlcihhbm4gPT4gY3JlYXRlSW5qZWN0YWJsZS5pc1R5cGVPZihhbm4pKTtcblxuICAgIGlmIChhbm5vdGF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSBhbm5vdGF0aW9uc1thbm5vdGF0aW9ucy5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4ge1xuICAgICAgc3ltYm9sOiB0eXBlLFxuICAgICAgdHlwZTogdHlwZU1ldGFkYXRhLFxuICAgICAgcHJvdmlkZWRJbjogbWV0YS5wcm92aWRlZEluLFxuICAgICAgdXNlVmFsdWU6IG1ldGEudXNlVmFsdWUsXG4gICAgICB1c2VDbGFzczogbWV0YS51c2VDbGFzcyxcbiAgICAgIHVzZUV4aXN0aW5nOiBtZXRhLnVzZUV4aXN0aW5nLFxuICAgICAgdXNlRmFjdG9yeTogbWV0YS51c2VGYWN0b3J5LFxuICAgICAgZGVwczogbWV0YS5kZXBzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9nZXRUeXBlTWV0YWRhdGEodHlwZTogVHlwZSwgZGVwZW5kZW5jaWVzOiBhbnlbXXxudWxsID0gbnVsbCwgdGhyb3dPblVua25vd25EZXBzID0gdHJ1ZSk6XG4gICAgICBjcGwuQ29tcGlsZVR5cGVNZXRhZGF0YSB7XG4gICAgY29uc3QgaWRlbnRpZmllciA9IHRoaXMuX2dldElkZW50aWZpZXJNZXRhZGF0YSh0eXBlKTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVmZXJlbmNlOiBpZGVudGlmaWVyLnJlZmVyZW5jZSxcbiAgICAgIGRpRGVwczogdGhpcy5fZ2V0RGVwZW5kZW5jaWVzTWV0YWRhdGEoaWRlbnRpZmllci5yZWZlcmVuY2UsIGRlcGVuZGVuY2llcywgdGhyb3dPblVua25vd25EZXBzKSxcbiAgICAgIGxpZmVjeWNsZUhvb2tzOiBnZXRBbGxMaWZlY3ljbGVIb29rcyh0aGlzLl9yZWZsZWN0b3IsIGlkZW50aWZpZXIucmVmZXJlbmNlKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0RmFjdG9yeU1ldGFkYXRhKGZhY3Rvcnk6IEZ1bmN0aW9uLCBkZXBlbmRlbmNpZXM6IGFueVtdfG51bGwgPSBudWxsKTpcbiAgICAgIGNwbC5Db21waWxlRmFjdG9yeU1ldGFkYXRhIHtcbiAgICBmYWN0b3J5ID0gcmVzb2x2ZUZvcndhcmRSZWYoZmFjdG9yeSk7XG4gICAgcmV0dXJuIHtyZWZlcmVuY2U6IGZhY3RvcnksIGRpRGVwczogdGhpcy5fZ2V0RGVwZW5kZW5jaWVzTWV0YWRhdGEoZmFjdG9yeSwgZGVwZW5kZW5jaWVzKX07XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbWV0YWRhdGEgZm9yIHRoZSBnaXZlbiBwaXBlLlxuICAgKiBUaGlzIGFzc3VtZXMgYGxvYWROZ01vZHVsZURpcmVjdGl2ZUFuZFBpcGVNZXRhZGF0YWAgaGFzIGJlZW4gY2FsbGVkIGZpcnN0LlxuICAgKi9cbiAgZ2V0UGlwZU1ldGFkYXRhKHBpcGVUeXBlOiBhbnkpOiBjcGwuQ29tcGlsZVBpcGVNZXRhZGF0YXxudWxsIHtcbiAgICBjb25zdCBwaXBlTWV0YSA9IHRoaXMuX3BpcGVDYWNoZS5nZXQocGlwZVR5cGUpO1xuICAgIGlmICghcGlwZU1ldGEpIHtcbiAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgIHN5bnRheEVycm9yKFxuICAgICAgICAgICAgICBgSWxsZWdhbCBzdGF0ZTogZ2V0UGlwZU1ldGFkYXRhIGNhbiBvbmx5IGJlIGNhbGxlZCBhZnRlciBsb2FkTmdNb2R1bGVEaXJlY3RpdmVBbmRQaXBlTWV0YWRhdGEgZm9yIGEgbW9kdWxlIHRoYXQgZGVjbGFyZXMgaXQuIFBpcGUgJHtcbiAgICAgICAgICAgICAgICAgIHN0cmluZ2lmeVR5cGUocGlwZVR5cGUpfS5gKSxcbiAgICAgICAgICBwaXBlVHlwZSk7XG4gICAgfVxuICAgIHJldHVybiBwaXBlTWV0YSB8fCBudWxsO1xuICB9XG5cbiAgZ2V0UGlwZVN1bW1hcnkocGlwZVR5cGU6IGFueSk6IGNwbC5Db21waWxlUGlwZVN1bW1hcnkge1xuICAgIGNvbnN0IHBpcGVTdW1tYXJ5ID1cbiAgICAgICAgPGNwbC5Db21waWxlUGlwZVN1bW1hcnk+dGhpcy5fbG9hZFN1bW1hcnkocGlwZVR5cGUsIGNwbC5Db21waWxlU3VtbWFyeUtpbmQuUGlwZSk7XG4gICAgaWYgKCFwaXBlU3VtbWFyeSkge1xuICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgc3ludGF4RXJyb3IoXG4gICAgICAgICAgICAgIGBJbGxlZ2FsIHN0YXRlOiBDb3VsZCBub3QgbG9hZCB0aGUgc3VtbWFyeSBmb3IgcGlwZSAke3N0cmluZ2lmeVR5cGUocGlwZVR5cGUpfS5gKSxcbiAgICAgICAgICBwaXBlVHlwZSk7XG4gICAgfVxuICAgIHJldHVybiBwaXBlU3VtbWFyeTtcbiAgfVxuXG4gIGdldE9yTG9hZFBpcGVNZXRhZGF0YShwaXBlVHlwZTogYW55KTogY3BsLkNvbXBpbGVQaXBlTWV0YWRhdGEge1xuICAgIGxldCBwaXBlTWV0YSA9IHRoaXMuX3BpcGVDYWNoZS5nZXQocGlwZVR5cGUpO1xuICAgIGlmICghcGlwZU1ldGEpIHtcbiAgICAgIHBpcGVNZXRhID0gdGhpcy5fbG9hZFBpcGVNZXRhZGF0YShwaXBlVHlwZSk7XG4gICAgfVxuICAgIHJldHVybiBwaXBlTWV0YTtcbiAgfVxuXG4gIHByaXZhdGUgX2xvYWRQaXBlTWV0YWRhdGEocGlwZVR5cGU6IGFueSk6IGNwbC5Db21waWxlUGlwZU1ldGFkYXRhIHtcbiAgICBwaXBlVHlwZSA9IHJlc29sdmVGb3J3YXJkUmVmKHBpcGVUeXBlKTtcbiAgICBjb25zdCBwaXBlQW5ub3RhdGlvbiA9IHRoaXMuX3BpcGVSZXNvbHZlci5yZXNvbHZlKHBpcGVUeXBlKSE7XG5cbiAgICBjb25zdCBwaXBlTWV0YSA9IG5ldyBjcGwuQ29tcGlsZVBpcGVNZXRhZGF0YSh7XG4gICAgICB0eXBlOiB0aGlzLl9nZXRUeXBlTWV0YWRhdGEocGlwZVR5cGUpLFxuICAgICAgbmFtZTogcGlwZUFubm90YXRpb24ubmFtZSxcbiAgICAgIHB1cmU6ICEhcGlwZUFubm90YXRpb24ucHVyZVxuICAgIH0pO1xuICAgIHRoaXMuX3BpcGVDYWNoZS5zZXQocGlwZVR5cGUsIHBpcGVNZXRhKTtcbiAgICB0aGlzLl9zdW1tYXJ5Q2FjaGUuc2V0KHBpcGVUeXBlLCBwaXBlTWV0YS50b1N1bW1hcnkoKSk7XG4gICAgcmV0dXJuIHBpcGVNZXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0RGVwZW5kZW5jaWVzTWV0YWRhdGEoXG4gICAgICB0eXBlT3JGdW5jOiBUeXBlfEZ1bmN0aW9uLCBkZXBlbmRlbmNpZXM6IGFueVtdfG51bGwsXG4gICAgICB0aHJvd09uVW5rbm93bkRlcHMgPSB0cnVlKTogY3BsLkNvbXBpbGVEaURlcGVuZGVuY3lNZXRhZGF0YVtdIHtcbiAgICBsZXQgaGFzVW5rbm93bkRlcHMgPSBmYWxzZTtcbiAgICBjb25zdCBwYXJhbXMgPSBkZXBlbmRlbmNpZXMgfHwgdGhpcy5fcmVmbGVjdG9yLnBhcmFtZXRlcnModHlwZU9yRnVuYykgfHwgW107XG5cbiAgICBjb25zdCBkZXBlbmRlbmNpZXNNZXRhZGF0YTogY3BsLkNvbXBpbGVEaURlcGVuZGVuY3lNZXRhZGF0YVtdID0gcGFyYW1zLm1hcCgocGFyYW0pID0+IHtcbiAgICAgIGxldCBpc0F0dHJpYnV0ZSA9IGZhbHNlO1xuICAgICAgbGV0IGlzSG9zdCA9IGZhbHNlO1xuICAgICAgbGV0IGlzU2VsZiA9IGZhbHNlO1xuICAgICAgbGV0IGlzU2tpcFNlbGYgPSBmYWxzZTtcbiAgICAgIGxldCBpc09wdGlvbmFsID0gZmFsc2U7XG4gICAgICBsZXQgdG9rZW46IGFueSA9IG51bGw7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJhbSkpIHtcbiAgICAgICAgcGFyYW0uZm9yRWFjaCgocGFyYW1FbnRyeTogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKGNyZWF0ZUhvc3QuaXNUeXBlT2YocGFyYW1FbnRyeSkpIHtcbiAgICAgICAgICAgIGlzSG9zdCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjcmVhdGVTZWxmLmlzVHlwZU9mKHBhcmFtRW50cnkpKSB7XG4gICAgICAgICAgICBpc1NlbGYgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY3JlYXRlU2tpcFNlbGYuaXNUeXBlT2YocGFyYW1FbnRyeSkpIHtcbiAgICAgICAgICAgIGlzU2tpcFNlbGYgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY3JlYXRlT3B0aW9uYWwuaXNUeXBlT2YocGFyYW1FbnRyeSkpIHtcbiAgICAgICAgICAgIGlzT3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY3JlYXRlQXR0cmlidXRlLmlzVHlwZU9mKHBhcmFtRW50cnkpKSB7XG4gICAgICAgICAgICBpc0F0dHJpYnV0ZSA9IHRydWU7XG4gICAgICAgICAgICB0b2tlbiA9IChwYXJhbUVudHJ5IGFzIGFueSkuYXR0cmlidXRlTmFtZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNyZWF0ZUluamVjdC5pc1R5cGVPZihwYXJhbUVudHJ5KSkge1xuICAgICAgICAgICAgdG9rZW4gPSAocGFyYW1FbnRyeSBhcyBhbnkpLnRva2VuO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgIGNyZWF0ZUluamVjdGlvblRva2VuLmlzVHlwZU9mKHBhcmFtRW50cnkpIHx8XG4gICAgICAgICAgICAgIChwYXJhbUVudHJ5IGFzIGFueSkgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICAgICAgICAgIHRva2VuID0gcGFyYW1FbnRyeTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzVmFsaWRUeXBlKHBhcmFtRW50cnkpICYmIHRva2VuID09IG51bGwpIHtcbiAgICAgICAgICAgIHRva2VuID0gcGFyYW1FbnRyeTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9rZW4gPSBwYXJhbTtcbiAgICAgIH1cbiAgICAgIGlmICh0b2tlbiA9PSBudWxsKSB7XG4gICAgICAgIGhhc1Vua25vd25EZXBzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0F0dHJpYnV0ZSxcbiAgICAgICAgaXNIb3N0LFxuICAgICAgICBpc1NlbGYsXG4gICAgICAgIGlzU2tpcFNlbGYsXG4gICAgICAgIGlzT3B0aW9uYWwsXG4gICAgICAgIHRva2VuOiB0aGlzLl9nZXRUb2tlbk1ldGFkYXRhKHRva2VuKVxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGlmIChoYXNVbmtub3duRGVwcykge1xuICAgICAgY29uc3QgZGVwc1Rva2VucyA9XG4gICAgICAgICAgZGVwZW5kZW5jaWVzTWV0YWRhdGEubWFwKChkZXApID0+IGRlcC50b2tlbiA/IHN0cmluZ2lmeVR5cGUoZGVwLnRva2VuKSA6ICc/Jykuam9pbignLCAnKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgIGBDYW4ndCByZXNvbHZlIGFsbCBwYXJhbWV0ZXJzIGZvciAke3N0cmluZ2lmeVR5cGUodHlwZU9yRnVuYyl9OiAoJHtkZXBzVG9rZW5zfSkuYDtcbiAgICAgIGlmICh0aHJvd09uVW5rbm93bkRlcHMgfHwgdGhpcy5fY29uZmlnLnN0cmljdEluamVjdGlvblBhcmFtZXRlcnMpIHtcbiAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3Ioc3ludGF4RXJyb3IobWVzc2FnZSksIHR5cGVPckZ1bmMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbmNpZXNNZXRhZGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldFRva2VuTWV0YWRhdGEodG9rZW46IGFueSk6IGNwbC5Db21waWxlVG9rZW5NZXRhZGF0YSB7XG4gICAgdG9rZW4gPSByZXNvbHZlRm9yd2FyZFJlZih0b2tlbik7XG4gICAgbGV0IGNvbXBpbGVUb2tlbjogY3BsLkNvbXBpbGVUb2tlbk1ldGFkYXRhO1xuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb21waWxlVG9rZW4gPSB7dmFsdWU6IHRva2VufTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZVRva2VuID0ge2lkZW50aWZpZXI6IHtyZWZlcmVuY2U6IHRva2VufX07XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlVG9rZW47XG4gIH1cblxuICBwcml2YXRlIF9nZXRQcm92aWRlcnNNZXRhZGF0YShcbiAgICAgIHByb3ZpZGVyczogUHJvdmlkZXJbXSwgdGFyZ2V0RW50cnlDb21wb25lbnRzOiBjcGwuQ29tcGlsZUVudHJ5Q29tcG9uZW50TWV0YWRhdGFbXSxcbiAgICAgIGRlYnVnSW5mbz86IHN0cmluZywgY29tcGlsZVByb3ZpZGVyczogY3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhW10gPSBbXSxcbiAgICAgIHR5cGU/OiBhbnkpOiBjcGwuQ29tcGlsZVByb3ZpZGVyTWV0YWRhdGFbXSB7XG4gICAgcHJvdmlkZXJzLmZvckVhY2goKHByb3ZpZGVyOiBhbnksIHByb3ZpZGVySWR4OiBudW1iZXIpID0+IHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3ZpZGVyKSkge1xuICAgICAgICB0aGlzLl9nZXRQcm92aWRlcnNNZXRhZGF0YShwcm92aWRlciwgdGFyZ2V0RW50cnlDb21wb25lbnRzLCBkZWJ1Z0luZm8sIGNvbXBpbGVQcm92aWRlcnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJvdmlkZXIgPSByZXNvbHZlRm9yd2FyZFJlZihwcm92aWRlcik7XG4gICAgICAgIGxldCBwcm92aWRlck1ldGE6IGNwbC5Qcm92aWRlck1ldGEgPSB1bmRlZmluZWQhO1xuICAgICAgICBpZiAocHJvdmlkZXIgJiYgdHlwZW9mIHByb3ZpZGVyID09PSAnb2JqZWN0JyAmJiBwcm92aWRlci5oYXNPd25Qcm9wZXJ0eSgncHJvdmlkZScpKSB7XG4gICAgICAgICAgdGhpcy5fdmFsaWRhdGVQcm92aWRlcihwcm92aWRlcik7XG4gICAgICAgICAgcHJvdmlkZXJNZXRhID0gbmV3IGNwbC5Qcm92aWRlck1ldGEocHJvdmlkZXIucHJvdmlkZSwgcHJvdmlkZXIpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVmFsaWRUeXBlKHByb3ZpZGVyKSkge1xuICAgICAgICAgIHByb3ZpZGVyTWV0YSA9IG5ldyBjcGwuUHJvdmlkZXJNZXRhKHByb3ZpZGVyLCB7dXNlQ2xhc3M6IHByb3ZpZGVyfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKHN5bnRheEVycm9yKFxuICAgICAgICAgICAgICBgRW5jb3VudGVyZWQgdW5kZWZpbmVkIHByb3ZpZGVyISBVc3VhbGx5IHRoaXMgbWVhbnMgeW91IGhhdmUgYSBjaXJjdWxhciBkZXBlbmRlbmNpZXMuIFRoaXMgbWlnaHQgYmUgY2F1c2VkIGJ5IHVzaW5nICdiYXJyZWwnIGluZGV4LnRzIGZpbGVzLmApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgcHJvdmlkZXJzSW5mbyA9XG4gICAgICAgICAgICAgIHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgICAgLnJlZHVjZShcbiAgICAgICAgICAgICAgICAgICAgICAoc29GYXI6IHN0cmluZ1tdLCBzZWVuUHJvdmlkZXI6IGFueSwgc2VlblByb3ZpZGVySWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWVuUHJvdmlkZXJJZHggPCBwcm92aWRlcklkeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzb0Zhci5wdXNoKGAke3N0cmluZ2lmeVR5cGUoc2VlblByb3ZpZGVyKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VlblByb3ZpZGVySWR4ID09IHByb3ZpZGVySWR4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNvRmFyLnB1c2goYD8ke3N0cmluZ2lmeVR5cGUoc2VlblByb3ZpZGVyKX0/YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlZW5Qcm92aWRlcklkeCA9PSBwcm92aWRlcklkeCArIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc29GYXIucHVzaCgnLi4uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc29GYXI7XG4gICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICBbXSlcbiAgICAgICAgICAgICAgICAgIC5qb2luKCcsICcpO1xuICAgICAgICAgIHRoaXMuX3JlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBzeW50YXhFcnJvcihgSW52YWxpZCAke1xuICAgICAgICAgICAgICAgICAgZGVidWdJbmZvID9cbiAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z0luZm8gOlxuICAgICAgICAgICAgICAgICAgICAgICdwcm92aWRlcid9IC0gb25seSBpbnN0YW5jZXMgb2YgUHJvdmlkZXIgYW5kIFR5cGUgYXJlIGFsbG93ZWQsIGdvdDogWyR7XG4gICAgICAgICAgICAgICAgICBwcm92aWRlcnNJbmZvfV1gKSxcbiAgICAgICAgICAgICAgdHlwZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm92aWRlck1ldGEudG9rZW4gPT09XG4gICAgICAgICAgICB0aGlzLl9yZWZsZWN0b3IucmVzb2x2ZUV4dGVybmFsUmVmZXJlbmNlKElkZW50aWZpZXJzLkFOQUxZWkVfRk9SX0VOVFJZX0NPTVBPTkVOVFMpKSB7XG4gICAgICAgICAgdGFyZ2V0RW50cnlDb21wb25lbnRzLnB1c2goLi4udGhpcy5fZ2V0RW50cnlDb21wb25lbnRzRnJvbVByb3ZpZGVyKHByb3ZpZGVyTWV0YSwgdHlwZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbXBpbGVQcm92aWRlcnMucHVzaCh0aGlzLmdldFByb3ZpZGVyTWV0YWRhdGEocHJvdmlkZXJNZXRhKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY29tcGlsZVByb3ZpZGVycztcbiAgfVxuXG4gIHByaXZhdGUgX3ZhbGlkYXRlUHJvdmlkZXIocHJvdmlkZXI6IGFueSk6IHZvaWQge1xuICAgIGlmIChwcm92aWRlci5oYXNPd25Qcm9wZXJ0eSgndXNlQ2xhc3MnKSAmJiBwcm92aWRlci51c2VDbGFzcyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihzeW50YXhFcnJvcihgSW52YWxpZCBwcm92aWRlciBmb3IgJHtcbiAgICAgICAgICBzdHJpbmdpZnlUeXBlKHByb3ZpZGVyLnByb3ZpZGUpfS4gdXNlQ2xhc3MgY2Fubm90IGJlICR7cHJvdmlkZXIudXNlQ2xhc3N9LlxuICAgICAgICAgICBVc3VhbGx5IGl0IGhhcHBlbnMgd2hlbjpcbiAgICAgICAgICAgMS4gVGhlcmUncyBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgKG1pZ2h0IGJlIGNhdXNlZCBieSB1c2luZyBpbmRleC50cyAoYmFycmVsKSBmaWxlcykuXG4gICAgICAgICAgIDIuIENsYXNzIHdhcyB1c2VkIGJlZm9yZSBpdCB3YXMgZGVjbGFyZWQuIFVzZSBmb3J3YXJkUmVmIGluIHRoaXMgY2FzZS5gKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0RW50cnlDb21wb25lbnRzRnJvbVByb3ZpZGVyKHByb3ZpZGVyOiBjcGwuUHJvdmlkZXJNZXRhLCB0eXBlPzogYW55KTpcbiAgICAgIGNwbC5Db21waWxlRW50cnlDb21wb25lbnRNZXRhZGF0YVtdIHtcbiAgICBjb25zdCBjb21wb25lbnRzOiBjcGwuQ29tcGlsZUVudHJ5Q29tcG9uZW50TWV0YWRhdGFbXSA9IFtdO1xuICAgIGNvbnN0IGNvbGxlY3RlZElkZW50aWZpZXJzOiBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhW10gPSBbXTtcblxuICAgIGlmIChwcm92aWRlci51c2VGYWN0b3J5IHx8IHByb3ZpZGVyLnVzZUV4aXN0aW5nIHx8IHByb3ZpZGVyLnVzZUNsYXNzKSB7XG4gICAgICB0aGlzLl9yZXBvcnRFcnJvcihcbiAgICAgICAgICBzeW50YXhFcnJvcihgVGhlIEFOQUxZWkVfRk9SX0VOVFJZX0NPTVBPTkVOVFMgdG9rZW4gb25seSBzdXBwb3J0cyB1c2VWYWx1ZSFgKSwgdHlwZSk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgaWYgKCFwcm92aWRlci5tdWx0aSkge1xuICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgc3ludGF4RXJyb3IoYFRoZSBBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTIHRva2VuIG9ubHkgc3VwcG9ydHMgJ211bHRpID0gdHJ1ZSchYCksXG4gICAgICAgICAgdHlwZSk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgZXh0cmFjdElkZW50aWZpZXJzKHByb3ZpZGVyLnVzZVZhbHVlLCBjb2xsZWN0ZWRJZGVudGlmaWVycyk7XG4gICAgY29sbGVjdGVkSWRlbnRpZmllcnMuZm9yRWFjaCgoaWRlbnRpZmllcikgPT4ge1xuICAgICAgY29uc3QgZW50cnkgPSB0aGlzLl9nZXRFbnRyeUNvbXBvbmVudE1ldGFkYXRhKGlkZW50aWZpZXIucmVmZXJlbmNlLCBmYWxzZSk7XG4gICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgY29tcG9uZW50cy5wdXNoKGVudHJ5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY29tcG9uZW50cztcbiAgfVxuXG4gIHByaXZhdGUgX2dldEVudHJ5Q29tcG9uZW50TWV0YWRhdGEoZGlyVHlwZTogYW55LCB0aHJvd0lmTm90Rm91bmQgPSB0cnVlKTpcbiAgICAgIGNwbC5Db21waWxlRW50cnlDb21wb25lbnRNZXRhZGF0YXxudWxsIHtcbiAgICBjb25zdCBkaXJNZXRhID0gdGhpcy5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyVHlwZSk7XG4gICAgaWYgKGRpck1ldGEgJiYgZGlyTWV0YS5tZXRhZGF0YS5pc0NvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIHtjb21wb25lbnRUeXBlOiBkaXJUeXBlLCBjb21wb25lbnRGYWN0b3J5OiBkaXJNZXRhLm1ldGFkYXRhLmNvbXBvbmVudEZhY3RvcnkhfTtcbiAgICB9XG4gICAgY29uc3QgZGlyU3VtbWFyeSA9XG4gICAgICAgIDxjcGwuQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnk+dGhpcy5fbG9hZFN1bW1hcnkoZGlyVHlwZSwgY3BsLkNvbXBpbGVTdW1tYXJ5S2luZC5EaXJlY3RpdmUpO1xuICAgIGlmIChkaXJTdW1tYXJ5ICYmIGRpclN1bW1hcnkuaXNDb21wb25lbnQpIHtcbiAgICAgIHJldHVybiB7Y29tcG9uZW50VHlwZTogZGlyVHlwZSwgY29tcG9uZW50RmFjdG9yeTogZGlyU3VtbWFyeS5jb21wb25lbnRGYWN0b3J5IX07XG4gICAgfVxuICAgIGlmICh0aHJvd0lmTm90Rm91bmQpIHtcbiAgICAgIHRocm93IHN5bnRheEVycm9yKGAke2RpclR5cGUubmFtZX0gY2Fubm90IGJlIHVzZWQgYXMgYW4gZW50cnkgY29tcG9uZW50LmApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgX2dldEluamVjdGFibGVUeXBlTWV0YWRhdGEodHlwZTogVHlwZSwgZGVwZW5kZW5jaWVzOiBhbnlbXXxudWxsID0gbnVsbCk6XG4gICAgICBjcGwuQ29tcGlsZVR5cGVNZXRhZGF0YSB7XG4gICAgY29uc3QgdHlwZVN1bW1hcnkgPSB0aGlzLl9sb2FkU3VtbWFyeSh0eXBlLCBjcGwuQ29tcGlsZVN1bW1hcnlLaW5kLkluamVjdGFibGUpO1xuICAgIGlmICh0eXBlU3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHR5cGVTdW1tYXJ5LnR5cGU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9nZXRUeXBlTWV0YWRhdGEodHlwZSwgZGVwZW5kZW5jaWVzKTtcbiAgfVxuXG4gIGdldFByb3ZpZGVyTWV0YWRhdGEocHJvdmlkZXI6IGNwbC5Qcm92aWRlck1ldGEpOiBjcGwuQ29tcGlsZVByb3ZpZGVyTWV0YWRhdGEge1xuICAgIGxldCBjb21waWxlRGVwczogY3BsLkNvbXBpbGVEaURlcGVuZGVuY3lNZXRhZGF0YVtdID0gdW5kZWZpbmVkITtcbiAgICBsZXQgY29tcGlsZVR5cGVNZXRhZGF0YTogY3BsLkNvbXBpbGVUeXBlTWV0YWRhdGEgPSBudWxsITtcbiAgICBsZXQgY29tcGlsZUZhY3RvcnlNZXRhZGF0YTogY3BsLkNvbXBpbGVGYWN0b3J5TWV0YWRhdGEgPSBudWxsITtcbiAgICBsZXQgdG9rZW46IGNwbC5Db21waWxlVG9rZW5NZXRhZGF0YSA9IHRoaXMuX2dldFRva2VuTWV0YWRhdGEocHJvdmlkZXIudG9rZW4pO1xuXG4gICAgaWYgKHByb3ZpZGVyLnVzZUNsYXNzKSB7XG4gICAgICBjb21waWxlVHlwZU1ldGFkYXRhID1cbiAgICAgICAgICB0aGlzLl9nZXRJbmplY3RhYmxlVHlwZU1ldGFkYXRhKHByb3ZpZGVyLnVzZUNsYXNzLCBwcm92aWRlci5kZXBlbmRlbmNpZXMpO1xuICAgICAgY29tcGlsZURlcHMgPSBjb21waWxlVHlwZU1ldGFkYXRhLmRpRGVwcztcbiAgICAgIGlmIChwcm92aWRlci50b2tlbiA9PT0gcHJvdmlkZXIudXNlQ2xhc3MpIHtcbiAgICAgICAgLy8gdXNlIHRoZSBjb21waWxlVHlwZU1ldGFkYXRhIGFzIGl0IGNvbnRhaW5zIGluZm9ybWF0aW9uIGFib3V0IGxpZmVjeWNsZUhvb2tzLi4uXG4gICAgICAgIHRva2VuID0ge2lkZW50aWZpZXI6IGNvbXBpbGVUeXBlTWV0YWRhdGF9O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIudXNlRmFjdG9yeSkge1xuICAgICAgY29tcGlsZUZhY3RvcnlNZXRhZGF0YSA9IHRoaXMuX2dldEZhY3RvcnlNZXRhZGF0YShwcm92aWRlci51c2VGYWN0b3J5LCBwcm92aWRlci5kZXBlbmRlbmNpZXMpO1xuICAgICAgY29tcGlsZURlcHMgPSBjb21waWxlRmFjdG9yeU1ldGFkYXRhLmRpRGVwcztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9rZW46IHRva2VuLFxuICAgICAgdXNlQ2xhc3M6IGNvbXBpbGVUeXBlTWV0YWRhdGEsXG4gICAgICB1c2VWYWx1ZTogcHJvdmlkZXIudXNlVmFsdWUsXG4gICAgICB1c2VGYWN0b3J5OiBjb21waWxlRmFjdG9yeU1ldGFkYXRhLFxuICAgICAgdXNlRXhpc3Rpbmc6IHByb3ZpZGVyLnVzZUV4aXN0aW5nID8gdGhpcy5fZ2V0VG9rZW5NZXRhZGF0YShwcm92aWRlci51c2VFeGlzdGluZykgOiB1bmRlZmluZWQsXG4gICAgICBkZXBzOiBjb21waWxlRGVwcyxcbiAgICAgIG11bHRpOiBwcm92aWRlci5tdWx0aVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9nZXRRdWVyaWVzTWV0YWRhdGEoXG4gICAgICBxdWVyaWVzOiB7W2tleTogc3RyaW5nXTogUXVlcnl9LCBpc1ZpZXdRdWVyeTogYm9vbGVhbixcbiAgICAgIGRpcmVjdGl2ZVR5cGU6IFR5cGUpOiBjcGwuQ29tcGlsZVF1ZXJ5TWV0YWRhdGFbXSB7XG4gICAgY29uc3QgcmVzOiBjcGwuQ29tcGlsZVF1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuXG4gICAgT2JqZWN0LmtleXMocXVlcmllcykuZm9yRWFjaCgocHJvcGVydHlOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gcXVlcmllc1twcm9wZXJ0eU5hbWVdO1xuICAgICAgaWYgKHF1ZXJ5LmlzVmlld1F1ZXJ5ID09PSBpc1ZpZXdRdWVyeSkge1xuICAgICAgICByZXMucHVzaCh0aGlzLl9nZXRRdWVyeU1ldGFkYXRhKHF1ZXJ5LCBwcm9wZXJ0eU5hbWUsIGRpcmVjdGl2ZVR5cGUpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIF9xdWVyeVZhckJpbmRpbmdzKHNlbGVjdG9yOiBhbnkpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHNlbGVjdG9yLnNwbGl0KC9cXHMqLFxccyovKTtcbiAgfVxuXG4gIHByaXZhdGUgX2dldFF1ZXJ5TWV0YWRhdGEocTogUXVlcnksIHByb3BlcnR5TmFtZTogc3RyaW5nLCB0eXBlT3JGdW5jOiBUeXBlfEZ1bmN0aW9uKTpcbiAgICAgIGNwbC5Db21waWxlUXVlcnlNZXRhZGF0YSB7XG4gICAgbGV0IHNlbGVjdG9yczogY3BsLkNvbXBpbGVUb2tlbk1ldGFkYXRhW107XG4gICAgaWYgKHR5cGVvZiBxLnNlbGVjdG9yID09PSAnc3RyaW5nJykge1xuICAgICAgc2VsZWN0b3JzID1cbiAgICAgICAgICB0aGlzLl9xdWVyeVZhckJpbmRpbmdzKHEuc2VsZWN0b3IpLm1hcCh2YXJOYW1lID0+IHRoaXMuX2dldFRva2VuTWV0YWRhdGEodmFyTmFtZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXEuc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5fcmVwb3J0RXJyb3IoXG4gICAgICAgICAgICBzeW50YXhFcnJvcihgQ2FuJ3QgY29uc3RydWN0IGEgcXVlcnkgZm9yIHRoZSBwcm9wZXJ0eSBcIiR7cHJvcGVydHlOYW1lfVwiIG9mIFwiJHtcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnlUeXBlKHR5cGVPckZ1bmMpfVwiIHNpbmNlIHRoZSBxdWVyeSBzZWxlY3RvciB3YXNuJ3QgZGVmaW5lZC5gKSxcbiAgICAgICAgICAgIHR5cGVPckZ1bmMpO1xuICAgICAgICBzZWxlY3RvcnMgPSBbXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGVjdG9ycyA9IFt0aGlzLl9nZXRUb2tlbk1ldGFkYXRhKHEuc2VsZWN0b3IpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc2VsZWN0b3JzLFxuICAgICAgZmlyc3Q6IHEuZmlyc3QsXG4gICAgICBkZXNjZW5kYW50czogcS5kZXNjZW5kYW50cyxcbiAgICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5OiBxLmVtaXREaXN0aW5jdENoYW5nZXNPbmx5LFxuICAgICAgcHJvcGVydHlOYW1lLFxuICAgICAgcmVhZDogcS5yZWFkID8gdGhpcy5fZ2V0VG9rZW5NZXRhZGF0YShxLnJlYWQpIDogbnVsbCEsXG4gICAgICBzdGF0aWM6IHEuc3RhdGljXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlcG9ydEVycm9yKGVycm9yOiBhbnksIHR5cGU/OiBhbnksIG90aGVyVHlwZT86IGFueSkge1xuICAgIGlmICh0aGlzLl9lcnJvckNvbGxlY3Rvcikge1xuICAgICAgdGhpcy5fZXJyb3JDb2xsZWN0b3IoZXJyb3IsIHR5cGUpO1xuICAgICAgaWYgKG90aGVyVHlwZSkge1xuICAgICAgICB0aGlzLl9lcnJvckNvbGxlY3RvcihlcnJvciwgb3RoZXJUeXBlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW5BcnJheSh0cmVlOiBhbnlbXSwgb3V0OiBBcnJheTxhbnk+ID0gW10pOiBBcnJheTxhbnk+IHtcbiAgaWYgKHRyZWUpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSByZXNvbHZlRm9yd2FyZFJlZih0cmVlW2ldKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGZsYXR0ZW5BcnJheShpdGVtLCBvdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0LnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGRlZHVwZUFycmF5KGFycmF5OiBhbnlbXSk6IEFycmF5PGFueT4ge1xuICBpZiAoYXJyYXkpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShuZXcgU2V0KGFycmF5KSk7XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBmbGF0dGVuQW5kRGVkdXBlQXJyYXkodHJlZTogYW55W10pOiBBcnJheTxhbnk+IHtcbiAgcmV0dXJuIGRlZHVwZUFycmF5KGZsYXR0ZW5BcnJheSh0cmVlKSk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRUeXBlKHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuICh2YWx1ZSBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCkgfHwgKHZhbHVlIGluc3RhbmNlb2YgVHlwZSk7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RJZGVudGlmaWVycyh2YWx1ZTogYW55LCB0YXJnZXRJZGVudGlmaWVyczogQ29tcGlsZUlkZW50aWZpZXJNZXRhZGF0YVtdKSB7XG4gIHZpc2l0VmFsdWUodmFsdWUsIG5ldyBfQ29tcGlsZVZhbHVlQ29udmVydGVyKCksIHRhcmdldElkZW50aWZpZXJzKTtcbn1cblxuY2xhc3MgX0NvbXBpbGVWYWx1ZUNvbnZlcnRlciBleHRlbmRzIFZhbHVlVHJhbnNmb3JtZXIge1xuICBvdmVycmlkZSB2aXNpdE90aGVyKHZhbHVlOiBhbnksIHRhcmdldElkZW50aWZpZXJzOiBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhW10pOiBhbnkge1xuICAgIHRhcmdldElkZW50aWZpZXJzLnB1c2goe3JlZmVyZW5jZTogdmFsdWV9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdHJpbmdpZnlUeXBlKHR5cGU6IGFueSk6IHN0cmluZyB7XG4gIGlmICh0eXBlIGluc3RhbmNlb2YgU3RhdGljU3ltYm9sKSB7XG4gICAgcmV0dXJuIGAke3R5cGUubmFtZX0gaW4gJHt0eXBlLmZpbGVQYXRofWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cmluZ2lmeSh0eXBlKTtcbiAgfVxufVxuXG4vKipcbiAqIEluZGljYXRlcyB0aGF0IGEgY29tcG9uZW50IGlzIHN0aWxsIGJlaW5nIGxvYWRlZCBpbiBhIHN5bmNocm9ub3VzIGNvbXBpbGUuXG4gKi9cbmZ1bmN0aW9uIGNvbXBvbmVudFN0aWxsTG9hZGluZ0Vycm9yKGNvbXBUeXBlOiBUeXBlKSB7XG4gIGNvbnN0IGVycm9yID1cbiAgICAgIEVycm9yKGBDYW4ndCBjb21waWxlIHN5bmNocm9ub3VzbHkgYXMgJHtzdHJpbmdpZnkoY29tcFR5cGUpfSBpcyBzdGlsbCBiZWluZyBsb2FkZWQhYCk7XG4gIChlcnJvciBhcyBhbnkpW0VSUk9SX0NPTVBPTkVOVF9UWVBFXSA9IGNvbXBUeXBlO1xuICByZXR1cm4gZXJyb3I7XG59XG4iXX0=