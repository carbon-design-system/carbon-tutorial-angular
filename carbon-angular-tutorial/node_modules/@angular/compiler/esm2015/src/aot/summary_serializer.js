/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompileNgModuleMetadata, CompileSummaryKind } from '../compile_metadata';
import * as o from '../output/output_ast';
import { ValueTransformer, visitValue } from '../util';
import { StaticSymbol } from './static_symbol';
import { unwrapResolvedMetadata } from './static_symbol_resolver';
import { isLoweredSymbol, ngfactoryFilePath, summaryForJitFileName, summaryForJitName } from './util';
export function serializeSummaries(srcFileName, forJitCtx, summaryResolver, symbolResolver, symbols, types, createExternalSymbolReexports = false) {
    const toJsonSerializer = new ToJsonSerializer(symbolResolver, summaryResolver, srcFileName);
    // for symbols, we use everything except for the class metadata itself
    // (we keep the statics though), as the class metadata is contained in the
    // CompileTypeSummary.
    symbols.forEach((resolvedSymbol) => toJsonSerializer.addSummary({ symbol: resolvedSymbol.symbol, metadata: resolvedSymbol.metadata }));
    // Add type summaries.
    types.forEach(({ summary, metadata }) => {
        toJsonSerializer.addSummary({ symbol: summary.type.reference, metadata: undefined, type: summary });
    });
    const { json, exportAs } = toJsonSerializer.serialize(createExternalSymbolReexports);
    if (forJitCtx) {
        const forJitSerializer = new ForJitSerializer(forJitCtx, symbolResolver, summaryResolver);
        types.forEach(({ summary, metadata }) => {
            forJitSerializer.addSourceType(summary, metadata);
        });
        toJsonSerializer.unprocessedSymbolSummariesBySymbol.forEach((summary) => {
            if (summaryResolver.isLibraryFile(summary.symbol.filePath) && summary.type) {
                forJitSerializer.addLibType(summary.type);
            }
        });
        forJitSerializer.serialize(exportAs);
    }
    return { json, exportAs };
}
export function deserializeSummaries(symbolCache, summaryResolver, libraryFileName, json) {
    const deserializer = new FromJsonDeserializer(symbolCache, summaryResolver);
    return deserializer.deserialize(libraryFileName, json);
}
export function createForJitStub(outputCtx, reference) {
    return createSummaryForJitFunction(outputCtx, reference, o.NULL_EXPR);
}
function createSummaryForJitFunction(outputCtx, reference, value) {
    const fnName = summaryForJitName(reference.name);
    outputCtx.statements.push(o.fn([], [new o.ReturnStatement(value)], new o.ArrayType(o.DYNAMIC_TYPE)).toDeclStmt(fnName, [
        o.StmtModifier.Final, o.StmtModifier.Exported
    ]));
}
class ToJsonSerializer extends ValueTransformer {
    constructor(symbolResolver, summaryResolver, srcFileName) {
        super();
        this.symbolResolver = symbolResolver;
        this.summaryResolver = summaryResolver;
        this.srcFileName = srcFileName;
        // Note: This only contains symbols without members.
        this.symbols = [];
        this.indexBySymbol = new Map();
        this.reexportedBy = new Map();
        // This now contains a `__symbol: number` in the place of
        // StaticSymbols, but otherwise has the same shape as the original objects.
        this.processedSummaryBySymbol = new Map();
        this.processedSummaries = [];
        this.unprocessedSymbolSummariesBySymbol = new Map();
        this.moduleName = symbolResolver.getKnownModuleName(srcFileName);
    }
    addSummary(summary) {
        let unprocessedSummary = this.unprocessedSymbolSummariesBySymbol.get(summary.symbol);
        let processedSummary = this.processedSummaryBySymbol.get(summary.symbol);
        if (!unprocessedSummary) {
            unprocessedSummary = { symbol: summary.symbol, metadata: undefined };
            this.unprocessedSymbolSummariesBySymbol.set(summary.symbol, unprocessedSummary);
            processedSummary = { symbol: this.processValue(summary.symbol, 0 /* None */) };
            this.processedSummaries.push(processedSummary);
            this.processedSummaryBySymbol.set(summary.symbol, processedSummary);
        }
        if (!unprocessedSummary.metadata && summary.metadata) {
            let metadata = summary.metadata || {};
            if (metadata.__symbolic === 'class') {
                // For classes, we keep everything except their class decorators.
                // We need to keep e.g. the ctor args, method names, method decorators
                // so that the class can be extended in another compilation unit.
                // We don't keep the class decorators as
                // 1) they refer to data
                //   that should not cause a rebuild of downstream compilation units
                //   (e.g. inline templates of @Component, or @NgModule.declarations)
                // 2) their data is already captured in TypeSummaries, e.g. DirectiveSummary.
                const clone = {};
                Object.keys(metadata).forEach((propName) => {
                    if (propName !== 'decorators') {
                        clone[propName] = metadata[propName];
                    }
                });
                metadata = clone;
            }
            else if (isCall(metadata)) {
                if (!isFunctionCall(metadata) && !isMethodCallOnVariable(metadata)) {
                    // Don't store complex calls as we won't be able to simplify them anyways later on.
                    metadata = {
                        __symbolic: 'error',
                        message: 'Complex function calls are not supported.',
                    };
                }
            }
            // Note: We need to keep storing ctor calls for e.g.
            // `export const x = new InjectionToken(...)`
            unprocessedSummary.metadata = metadata;
            processedSummary.metadata = this.processValue(metadata, 1 /* ResolveValue */);
            if (metadata instanceof StaticSymbol &&
                this.summaryResolver.isLibraryFile(metadata.filePath)) {
                const declarationSymbol = this.symbols[this.indexBySymbol.get(metadata)];
                if (!isLoweredSymbol(declarationSymbol.name)) {
                    // Note: symbols that were introduced during codegen in the user file can have a reexport
                    // if a user used `export *`. However, we can't rely on this as tsickle will change
                    // `export *` into named exports, using only the information from the typechecker.
                    // As we introduce the new symbols after typecheck, Tsickle does not know about them,
                    // and omits them when expanding `export *`.
                    // So we have to keep reexporting these symbols manually via .ngfactory files.
                    this.reexportedBy.set(declarationSymbol, summary.symbol);
                }
            }
        }
        if (!unprocessedSummary.type && summary.type) {
            unprocessedSummary.type = summary.type;
            // Note: We don't add the summaries of all referenced symbols as for the ResolvedSymbols,
            // as the type summaries already contain the transitive data that they require
            // (in a minimal way).
            processedSummary.type = this.processValue(summary.type, 0 /* None */);
            // except for reexported directives / pipes, so we need to store
            // their summaries explicitly.
            if (summary.type.summaryKind === CompileSummaryKind.NgModule) {
                const ngModuleSummary = summary.type;
                ngModuleSummary.exportedDirectives.concat(ngModuleSummary.exportedPipes).forEach((id) => {
                    const symbol = id.reference;
                    if (this.summaryResolver.isLibraryFile(symbol.filePath) &&
                        !this.unprocessedSymbolSummariesBySymbol.has(symbol)) {
                        const summary = this.summaryResolver.resolveSummary(symbol);
                        if (summary) {
                            this.addSummary(summary);
                        }
                    }
                });
            }
        }
    }
    /**
     * @param createExternalSymbolReexports Whether external static symbols should be re-exported.
     * This can be enabled if external symbols should be re-exported by the current module in
     * order to avoid dynamically generated module dependencies which can break strict dependency
     * enforcements (as in Google3). Read more here: https://github.com/angular/angular/issues/25644
     */
    serialize(createExternalSymbolReexports) {
        const exportAs = [];
        const json = JSON.stringify({
            moduleName: this.moduleName,
            summaries: this.processedSummaries,
            symbols: this.symbols.map((symbol, index) => {
                symbol.assertNoMembers();
                let importAs = undefined;
                if (this.summaryResolver.isLibraryFile(symbol.filePath)) {
                    const reexportSymbol = this.reexportedBy.get(symbol);
                    if (reexportSymbol) {
                        // In case the given external static symbol is already manually exported by the
                        // user, we just proxy the external static symbol reference to the manual export.
                        // This ensures that the AOT compiler imports the external symbol through the
                        // user export and does not introduce another dependency which is not needed.
                        importAs = this.indexBySymbol.get(reexportSymbol);
                    }
                    else if (createExternalSymbolReexports) {
                        // In this case, the given external static symbol is *not* manually exported by
                        // the user, and we manually create a re-export in the factory file so that we
                        // don't introduce another module dependency. This is useful when running within
                        // Bazel so that the AOT compiler does not introduce any module dependencies
                        // which can break the strict dependency enforcement. (e.g. as in Google3)
                        // Read more about this here: https://github.com/angular/angular/issues/25644
                        const summary = this.unprocessedSymbolSummariesBySymbol.get(symbol);
                        if (!summary || !summary.metadata || summary.metadata.__symbolic !== 'interface') {
                            importAs = `${symbol.name}_${index}`;
                            exportAs.push({ symbol, exportAs: importAs });
                        }
                    }
                }
                return {
                    __symbol: index,
                    name: symbol.name,
                    filePath: this.summaryResolver.toSummaryFileName(symbol.filePath, this.srcFileName),
                    importAs: importAs
                };
            })
        });
        return { json, exportAs };
    }
    processValue(value, flags) {
        return visitValue(value, this, flags);
    }
    visitOther(value, context) {
        if (value instanceof StaticSymbol) {
            let baseSymbol = this.symbolResolver.getStaticSymbol(value.filePath, value.name);
            const index = this.visitStaticSymbol(baseSymbol, context);
            return { __symbol: index, members: value.members };
        }
    }
    /**
     * Strip line and character numbers from ngsummaries.
     * Emitting them causes white spaces changes to retrigger upstream
     * recompilations in bazel.
     * TODO: find out a way to have line and character numbers in errors without
     * excessive recompilation in bazel.
     */
    visitStringMap(map, context) {
        if (map['__symbolic'] === 'resolved') {
            return visitValue(map['symbol'], this, context);
        }
        if (map['__symbolic'] === 'error') {
            delete map['line'];
            delete map['character'];
        }
        return super.visitStringMap(map, context);
    }
    /**
     * Returns null if the options.resolveValue is true, and the summary for the symbol
     * resolved to a type or could not be resolved.
     */
    visitStaticSymbol(baseSymbol, flags) {
        let index = this.indexBySymbol.get(baseSymbol);
        let summary = null;
        if (flags & 1 /* ResolveValue */ &&
            this.summaryResolver.isLibraryFile(baseSymbol.filePath)) {
            if (this.unprocessedSymbolSummariesBySymbol.has(baseSymbol)) {
                // the summary for this symbol was already added
                // -> nothing to do.
                return index;
            }
            summary = this.loadSummary(baseSymbol);
            if (summary && summary.metadata instanceof StaticSymbol) {
                // The summary is a reexport
                index = this.visitStaticSymbol(summary.metadata, flags);
                // reset the summary as it is just a reexport, so we don't want to store it.
                summary = null;
            }
        }
        else if (index != null) {
            // Note: == on purpose to compare with undefined!
            // No summary and the symbol is already added -> nothing to do.
            return index;
        }
        // Note: == on purpose to compare with undefined!
        if (index == null) {
            index = this.symbols.length;
            this.symbols.push(baseSymbol);
        }
        this.indexBySymbol.set(baseSymbol, index);
        if (summary) {
            this.addSummary(summary);
        }
        return index;
    }
    loadSummary(symbol) {
        let summary = this.summaryResolver.resolveSummary(symbol);
        if (!summary) {
            // some symbols might originate from a plain typescript library
            // that just exported .d.ts and .metadata.json files, i.e. where no summary
            // files were created.
            const resolvedSymbol = this.symbolResolver.resolveSymbol(symbol);
            if (resolvedSymbol) {
                summary = { symbol: resolvedSymbol.symbol, metadata: resolvedSymbol.metadata };
            }
        }
        return summary;
    }
}
class ForJitSerializer {
    constructor(outputCtx, symbolResolver, summaryResolver) {
        this.outputCtx = outputCtx;
        this.symbolResolver = symbolResolver;
        this.summaryResolver = summaryResolver;
        this.data = [];
    }
    addSourceType(summary, metadata) {
        this.data.push({ summary, metadata, isLibrary: false });
    }
    addLibType(summary) {
        this.data.push({ summary, metadata: null, isLibrary: true });
    }
    serialize(exportAsArr) {
        const exportAsBySymbol = new Map();
        for (const { symbol, exportAs } of exportAsArr) {
            exportAsBySymbol.set(symbol, exportAs);
        }
        const ngModuleSymbols = new Set();
        for (const { summary, metadata, isLibrary } of this.data) {
            if (summary.summaryKind === CompileSummaryKind.NgModule) {
                // collect the symbols that refer to NgModule classes.
                // Note: we can't just rely on `summary.type.summaryKind` to determine this as
                // we don't add the summaries of all referenced symbols when we serialize type summaries.
                // See serializeSummaries for details.
                ngModuleSymbols.add(summary.type.reference);
                const modSummary = summary;
                for (const mod of modSummary.modules) {
                    ngModuleSymbols.add(mod.reference);
                }
            }
            if (!isLibrary) {
                const fnName = summaryForJitName(summary.type.reference.name);
                createSummaryForJitFunction(this.outputCtx, summary.type.reference, this.serializeSummaryWithDeps(summary, metadata));
            }
        }
        ngModuleSymbols.forEach((ngModuleSymbol) => {
            if (this.summaryResolver.isLibraryFile(ngModuleSymbol.filePath)) {
                let exportAs = exportAsBySymbol.get(ngModuleSymbol) || ngModuleSymbol.name;
                const jitExportAsName = summaryForJitName(exportAs);
                this.outputCtx.statements.push(o.variable(jitExportAsName)
                    .set(this.serializeSummaryRef(ngModuleSymbol))
                    .toDeclStmt(null, [o.StmtModifier.Exported]));
            }
        });
    }
    serializeSummaryWithDeps(summary, metadata) {
        const expressions = [this.serializeSummary(summary)];
        let providers = [];
        if (metadata instanceof CompileNgModuleMetadata) {
            expressions.push(...
            // For directives / pipes, we only add the declared ones,
            // and rely on transitively importing NgModules to get the transitive
            // summaries.
            metadata.declaredDirectives.concat(metadata.declaredPipes)
                .map(type => type.reference)
                // For modules,
                // we also add the summaries for modules
                // from libraries.
                // This is ok as we produce reexports for all transitive modules.
                .concat(metadata.transitiveModule.modules.map(type => type.reference)
                .filter(ref => ref !== metadata.type.reference))
                .map((ref) => this.serializeSummaryRef(ref)));
            // Note: We don't use `NgModuleSummary.providers`, as that one is transitive,
            // and we already have transitive modules.
            providers = metadata.providers;
        }
        else if (summary.summaryKind === CompileSummaryKind.Directive) {
            const dirSummary = summary;
            providers = dirSummary.providers.concat(dirSummary.viewProviders);
        }
        // Note: We can't just refer to the `ngsummary.ts` files for `useClass` providers (as we do for
        // declaredDirectives / declaredPipes), as we allow
        // providers without ctor arguments to skip the `@Injectable` decorator,
        // i.e. we didn't generate .ngsummary.ts files for these.
        expressions.push(...providers.filter(provider => !!provider.useClass).map(provider => this.serializeSummary({
            summaryKind: CompileSummaryKind.Injectable,
            type: provider.useClass
        })));
        return o.literalArr(expressions);
    }
    serializeSummaryRef(typeSymbol) {
        const jitImportedSymbol = this.symbolResolver.getStaticSymbol(summaryForJitFileName(typeSymbol.filePath), summaryForJitName(typeSymbol.name));
        return this.outputCtx.importExpr(jitImportedSymbol);
    }
    serializeSummary(data) {
        const outputCtx = this.outputCtx;
        class Transformer {
            visitArray(arr, context) {
                return o.literalArr(arr.map(entry => visitValue(entry, this, context)));
            }
            visitStringMap(map, context) {
                return new o.LiteralMapExpr(Object.keys(map).map((key) => new o.LiteralMapEntry(key, visitValue(map[key], this, context), false)));
            }
            visitPrimitive(value, context) {
                return o.literal(value);
            }
            visitOther(value, context) {
                if (value instanceof StaticSymbol) {
                    return outputCtx.importExpr(value);
                }
                else {
                    throw new Error(`Illegal State: Encountered value ${value}`);
                }
            }
        }
        return visitValue(data, new Transformer(), null);
    }
}
class FromJsonDeserializer extends ValueTransformer {
    constructor(symbolCache, summaryResolver) {
        super();
        this.symbolCache = symbolCache;
        this.summaryResolver = summaryResolver;
    }
    deserialize(libraryFileName, json) {
        const data = JSON.parse(json);
        const allImportAs = [];
        this.symbols = data.symbols.map((serializedSymbol) => this.symbolCache.get(this.summaryResolver.fromSummaryFileName(serializedSymbol.filePath, libraryFileName), serializedSymbol.name));
        data.symbols.forEach((serializedSymbol, index) => {
            const symbol = this.symbols[index];
            const importAs = serializedSymbol.importAs;
            if (typeof importAs === 'number') {
                allImportAs.push({ symbol, importAs: this.symbols[importAs] });
            }
            else if (typeof importAs === 'string') {
                allImportAs.push({ symbol, importAs: this.symbolCache.get(ngfactoryFilePath(libraryFileName), importAs) });
            }
        });
        const summaries = visitValue(data.summaries, this, null);
        return { moduleName: data.moduleName, summaries, importAs: allImportAs };
    }
    visitStringMap(map, context) {
        if ('__symbol' in map) {
            const baseSymbol = this.symbols[map['__symbol']];
            const members = map['members'];
            return members.length ? this.symbolCache.get(baseSymbol.filePath, baseSymbol.name, members) :
                baseSymbol;
        }
        else {
            return super.visitStringMap(map, context);
        }
    }
}
function isCall(metadata) {
    return metadata && metadata.__symbolic === 'call';
}
function isFunctionCall(metadata) {
    return isCall(metadata) && unwrapResolvedMetadata(metadata.expression) instanceof StaticSymbol;
}
function isMethodCallOnVariable(metadata) {
    return isCall(metadata) && metadata.expression && metadata.expression.__symbolic === 'select' &&
        unwrapResolvedMetadata(metadata.expression.expression) instanceof StaticSymbol;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9zZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXIvc3JjL2FvdC9zdW1tYXJ5X3NlcmlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxFQUFvRCx1QkFBdUIsRUFBd0Usa0JBQWtCLEVBQTBDLE1BQU0scUJBQXFCLENBQUM7QUFFbFAsT0FBTyxLQUFLLENBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUUxQyxPQUFPLEVBQUMsZ0JBQWdCLEVBQWdCLFVBQVUsRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUVuRSxPQUFPLEVBQUMsWUFBWSxFQUFvQixNQUFNLGlCQUFpQixDQUFDO0FBQ2hFLE9BQU8sRUFBNkMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RyxPQUFPLEVBQUMsZUFBZSxFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFDLE1BQU0sUUFBUSxDQUFDO0FBRXBHLE1BQU0sVUFBVSxrQkFBa0IsQ0FDOUIsV0FBbUIsRUFBRSxTQUE2QixFQUNsRCxlQUE4QyxFQUFFLGNBQW9DLEVBQ3BGLE9BQStCLEVBQUUsS0FJOUIsRUFDSCw2QkFBNkIsR0FDekIsS0FBSztJQUNYLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRTVGLHNFQUFzRTtJQUN0RSwwRUFBMEU7SUFDMUUsc0JBQXNCO0lBQ3RCLE9BQU8sQ0FBQyxPQUFPLENBQ1gsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDM0MsRUFBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUU3RSxzQkFBc0I7SUFDdEIs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LE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMvQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNyRSxVQUFVLENBQUM7U0FDcEM7YUFBTTtZQUNMLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDM0M7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLE1BQU0sQ0FBQyxRQUFhO0lBQzNCLE9BQU8sUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssTUFBTSxDQUFDO0FBQ3BELENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxRQUFhO0lBQ25DLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsWUFBWSxZQUFZLENBQUM7QUFDakcsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBYTtJQUMzQyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxLQUFLLFFBQVE7UUFDekYsc0JBQXNCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsWUFBWSxZQUFZLENBQUM7QUFDckYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlTmdNb2R1bGVNZXRhZGF0YSwgQ29tcGlsZU5nTW9kdWxlU3VtbWFyeSwgQ29tcGlsZVBpcGVNZXRhZGF0YSwgQ29tcGlsZVByb3ZpZGVyTWV0YWRhdGEsIENvbXBpbGVTdW1tYXJ5S2luZCwgQ29tcGlsZVR5cGVNZXRhZGF0YSwgQ29tcGlsZVR5cGVTdW1tYXJ5fSBmcm9tICcuLi9jb21waWxlX21ldGFkYXRhJztcbmltcG9ydCB7T3V0cHV0Q29udGV4dH0gZnJvbSAnLi4vY29uc3RhbnRfcG9vbCc7XG5pbXBvcnQgKiBhcyBvIGZyb20gJy4uL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7U3VtbWFyeSwgU3VtbWFyeVJlc29sdmVyfSBmcm9tICcuLi9zdW1tYXJ5X3Jlc29sdmVyJztcbmltcG9ydCB7VmFsdWVUcmFuc2Zvcm1lciwgVmFsdWVWaXNpdG9yLCB2aXNpdFZhbHVlfSBmcm9tICcuLi91dGlsJztcblxuaW1wb3J0IHtTdGF0aWNTeW1ib2wsIFN0YXRpY1N5bWJvbENhY2hlfSBmcm9tICcuL3N0YXRpY19zeW1ib2wnO1xuaW1wb3J0IHtSZXNvbHZlZFN0YXRpY1N5bWJvbCwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIHVud3JhcFJlc29sdmVkTWV0YWRhdGF9IGZyb20gJy4vc3RhdGljX3N5bWJvbF9yZXNvbHZlcic7XG5pbXBvcnQge2lzTG93ZXJlZFN5bWJvbCwgbmdmYWN0b3J5RmlsZVBhdGgsIHN1bW1hcnlGb3JKaXRGaWxlTmFtZSwgc3VtbWFyeUZvckppdE5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTdW1tYXJpZXMoXG4gICAgc3JjRmlsZU5hbWU6IHN0cmluZywgZm9ySml0Q3R4OiBPdXRwdXRDb250ZXh0fG51bGwsXG4gICAgc3VtbWFyeVJlc29sdmVyOiBTdW1tYXJ5UmVzb2x2ZXI8U3RhdGljU3ltYm9sPiwgc3ltYm9sUmVzb2x2ZXI6IFN0YXRpY1N5bWJvbFJlc29sdmVyLFxuICAgIHN5bWJvbHM6IFJlc29sdmVkU3RhdGljU3ltYm9sW10sIHR5cGVzOiB7XG4gICAgICBzdW1tYXJ5OiBDb21waWxlVHlwZVN1bW1hcnksXG4gICAgICBtZXRhZGF0YTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8Q29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhfENvbXBpbGVQaXBlTWV0YWRhdGF8XG4gICAgICBDb21waWxlVHlwZU1ldGFkYXRhXG4gICAgfVtdLFxuICAgIGNyZWF0ZUV4dGVybmFsU3ltYm9sUmVleHBvcnRzID1cbiAgICAgICAgZmFsc2UpOiB7anNvbjogc3RyaW5nLCBleHBvcnRBczoge3N5bWJvbDogU3RhdGljU3ltYm9sLCBleHBvcnRBczogc3RyaW5nfVtdfSB7XG4gIGNvbnN0IHRvSnNvblNlcmlhbGl6ZXIgPSBuZXcgVG9Kc29uU2VyaWFsaXplcihzeW1ib2xSZXNvbHZlciwgc3VtbWFyeVJlc29sdmVyLCBzcmNGaWxlTmFtZSk7XG5cbiAgLy8gZm9yIHN5bWJvbHMsIHdlIHVzZSBldmVyeXRoaW5nIGV4Y2VwdCBmb3IgdGhlIGNsYXNzIG1ldGFkYXRhIGl0c2VsZlxuICAvLyAod2Uga2VlcCB0aGUgc3RhdGljcyB0aG91Z2gpLCBhcyB0aGUgY2xhc3MgbWV0YWRhdGEgaXMgY29udGFpbmVkIGluIHRoZVxuICAvLyBDb21waWxlVHlwZVN1bW1hcnkuXG4gIHN5bWJvbHMuZm9yRWFjaChcbiAgICAgIChyZXNvbHZlZFN5bWJvbCkgPT4gdG9Kc29uU2VyaWFsaXplci5hZGRTdW1tYXJ5KFxuICAgICAgICAgIHtzeW1ib2w6IHJlc29sdmVkU3ltYm9sLnN5bWJvbCwgbWV0YWRhdGE6IHJlc29sdmVkU3ltYm9sLm1ldGFkYXRhfSkpO1xuXG4gIC8vIEFkZCB0eXBlIHN1bW1hcmllcy5cbiAgdHlwZXMuZm9yRWFjaCgoe3N1bW1hcnksIG1ldGFkYXRhfSkgPT4ge1xuICAgIHRvSnNvblNlcmlhbGl6ZXIuYWRkU3VtbWFyeShcbiAgICAgICAge3N5bWJvbDogc3VtbWFyeS50eXBlLnJlZmVyZW5jZSwgbWV0YWRhdGE6IHVuZGVmaW5lZCwgdHlwZTogc3VtbWFyeX0pO1xuICB9KTtcbiAgY29uc3Qge2pzb24sIGV4cG9ydEFzfSA9IHRvSnNvblNlcmlhbGl6ZXIuc2VyaWFsaXplKGNyZWF0ZUV4dGVybmFsU3ltYm9sUmVleHBvcnRzKTtcbiAgaWYgKGZvckppdEN0eCkge1xuICAgIGNvbnN0IGZvckppdFNlcmlhbGl6ZXIgPSBuZXcgRm9ySml0U2VyaWFsaXplcihmb3JKaXRDdHgsIHN5bWJvbFJlc29sdmVyLCBzdW1tYXJ5UmVzb2x2ZXIpO1xuICAgIHR5cGVzLmZvckVhY2goKHtzdW1tYXJ5LCBtZXRhZGF0YX0pID0+IHtcbiAgICAgIGZvckppdFNlcmlhbGl6ZXIuYWRkU291cmNlVHlwZShzdW1tYXJ5LCBtZXRhZGF0YSk7XG4gICAgfSk7XG4gICAgdG9Kc29uU2VyaWFsaXplci51bnByb2Nlc3NlZFN5bWJvbFN1bW1hcmllc0J5U3ltYm9sLmZvckVhY2goKHN1bW1hcnkpID0+IHtcbiAgICAgIGlmIChzdW1tYXJ5UmVzb2x2ZXIuaXNMaWJyYXJ5RmlsZShzdW1tYXJ5LnN5bWJvbC5maWxlUGF0aCkgJiYgc3VtbWFyeS50eXBlKSB7XG4gICAgICAgIGZvckppdFNlcmlhbGl6ZXIuYWRkTGliVHlwZShzdW1tYXJ5LnR5cGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGZvckppdFNlcmlhbGl6ZXIuc2VyaWFsaXplKGV4cG9ydEFzKTtcbiAgfVxuICByZXR1cm4ge2pzb24sIGV4cG9ydEFzfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplU3VtbWFyaWVzKFxuICAgIHN5bWJvbENhY2hlOiBTdGF0aWNTeW1ib2xDYWNoZSwgc3VtbWFyeVJlc29sdmVyOiBTdW1tYXJ5UmVzb2x2ZXI8U3RhdGljU3ltYm9sPixcbiAgICBsaWJyYXJ5RmlsZU5hbWU6IHN0cmluZywganNvbjogc3RyaW5nKToge1xuICBtb2R1bGVOYW1lOiBzdHJpbmd8bnVsbCxcbiAgc3VtbWFyaWVzOiBTdW1tYXJ5PFN0YXRpY1N5bWJvbD5bXSxcbiAgaW1wb3J0QXM6IHtzeW1ib2w6IFN0YXRpY1N5bWJvbCwgaW1wb3J0QXM6IFN0YXRpY1N5bWJvbH1bXVxufSB7XG4gIGNvbnN0IGRlc2VyaWFsaXplciA9IG5ldyBGcm9tSnNvbkRlc2VyaWFsaXplcihzeW1ib2xDYWNoZSwgc3VtbWFyeVJlc29sdmVyKTtcbiAgcmV0dXJuIGRlc2VyaWFsaXplci5kZXNlcmlhbGl6ZShsaWJyYXJ5RmlsZU5hbWUsIGpzb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRm9ySml0U3R1YihvdXRwdXRDdHg6IE91dHB1dENvbnRleHQsIHJlZmVyZW5jZTogU3RhdGljU3ltYm9sKSB7XG4gIHJldHVybiBjcmVhdGVTdW1tYXJ5Rm9ySml0RnVuY3Rpb24ob3V0cHV0Q3R4LCByZWZlcmVuY2UsIG8uTlVMTF9FWFBSKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU3VtbWFyeUZvckppdEZ1bmN0aW9uKFxuICAgIG91dHB1dEN0eDogT3V0cHV0Q29udGV4dCwgcmVmZXJlbmNlOiBTdGF0aWNTeW1ib2wsIHZhbHVlOiBvLkV4cHJlc3Npb24pIHtcbiAgY29uc3QgZm5OYW1lID0gc3VtbWFyeUZvckppdE5hbWUocmVmZXJlbmNlLm5hbWUpO1xuICBvdXRwdXRDdHguc3RhdGVtZW50cy5wdXNoKFxuICAgICAgby5mbihbXSwgW25ldyBvLlJldHVyblN0YXRlbWVudCh2YWx1ZSldLCBuZXcgby5BcnJheVR5cGUoby5EWU5BTUlDX1RZUEUpKS50b0RlY2xTdG10KGZuTmFtZSwgW1xuICAgICAgICBvLlN0bXRNb2RpZmllci5GaW5hbCwgby5TdG10TW9kaWZpZXIuRXhwb3J0ZWRcbiAgICAgIF0pKTtcbn1cblxuY29uc3QgZW51bSBTZXJpYWxpemF0aW9uRmxhZ3Mge1xuICBOb25lID0gMCxcbiAgUmVzb2x2ZVZhbHVlID0gMSxcbn1cblxuY2xhc3MgVG9Kc29uU2VyaWFsaXplciBleHRlbmRzIFZhbHVlVHJhbnNmb3JtZXIge1xuICAvLyBOb3RlOiBUaGlzIG9ubHkgY29udGFpbnMgc3ltYm9scyB3aXRob3V0IG1lbWJlcnMuXG4gIHByaXZhdGUgc3ltYm9sczogU3RhdGljU3ltYm9sW10gPSBbXTtcbiAgcHJpdmF0ZSBpbmRleEJ5U3ltYm9sID0gbmV3IE1hcDxTdGF0aWNTeW1ib2wsIG51bWJlcj4oKTtcbiAgcHJpdmF0ZSByZWV4cG9ydGVkQnkgPSBuZXcgTWFwPFN0YXRpY1N5bWJvbCwgU3RhdGljU3ltYm9sPigpO1xuICAvLyBUaGlzIG5vdyBjb250YWlucyBhIGBfX3N5bWJvbDogbnVtYmVyYCBpbiB0aGUgcGxhY2Ugb2ZcbiAgLy8gU3RhdGljU3ltYm9scywgYnV0IG90aGVyd2lzZSBoYXMgdGhlIHNhbWUgc2hhcGUgYXMgdGhlIG9yaWdpbmFsIG9iamVjdHMuXG4gIHByaXZhdGUgcHJvY2Vzc2VkU3VtbWFyeUJ5U3ltYm9sID0gbmV3IE1hcDxTdGF0aWNTeW1ib2wsIGFueT4oKTtcbiAgcHJpdmF0ZSBwcm9jZXNzZWRTdW1tYXJpZXM6IGFueVtdID0gW107XG4gIHByaXZhdGUgbW9kdWxlTmFtZTogc3RyaW5nfG51bGw7XG5cbiAgdW5wcm9jZXNzZWRTeW1ib2xTdW1tYXJpZXNCeVN5bWJvbCA9IG5ldyBNYXA8U3RhdGljU3ltYm9sLCBTdW1tYXJ5PFN0YXRpY1N5bWJvbD4+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHN5bWJvbFJlc29sdmVyOiBTdGF0aWNTeW1ib2xSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgc3VtbWFyeVJlc29sdmVyOiBTdW1tYXJ5UmVzb2x2ZXI8U3RhdGljU3ltYm9sPiwgcHJpdmF0ZSBzcmNGaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLm1vZHVsZU5hbWUgPSBzeW1ib2xSZXNvbHZlci5nZXRLbm93bk1vZHVsZU5hbWUoc3JjRmlsZU5hbWUpO1xuICB9XG5cbiAgYWRkU3VtbWFyeShzdW1tYXJ5OiBTdW1tYXJ5PFN0YXRpY1N5bWJvbD4pIHtcbiAgICBsZXQgdW5wcm9jZXNzZWRTdW1tYXJ5ID0gdGhpcy51bnByb2Nlc3NlZFN5bWJvbFN1bW1hcmllc0J5U3ltYm9sLmdldChzdW1tYXJ5LnN5bWJvbCk7XG4gICAgbGV0IHByb2Nlc3NlZFN1bW1hcnkgPSB0aGlzLnByb2Nlc3NlZFN1bW1hcnlCeVN5bWJvbC5nZXQoc3VtbWFyeS5zeW1ib2wpO1xuICAgIGlmICghdW5wcm9jZXNzZWRTdW1tYXJ5KSB7XG4gICAgICB1bnByb2Nlc3NlZFN1bW1hcnkgPSB7c3ltYm9sOiBzdW1tYXJ5LnN5bWJvbCwgbWV0YWRhdGE6IHVuZGVmaW5lZH07XG4gICAgICB0aGlzLnVucHJvY2Vzc2VkU3ltYm9sU3VtbWFyaWVzQnlTeW1ib2wuc2V0KHN1bW1hcnkuc3ltYm9sLCB1bnByb2Nlc3NlZFN1bW1hcnkpO1xuICAgICAgcHJvY2Vzc2VkU3VtbWFyeSA9IHtzeW1ib2w6IHRoaXMucHJvY2Vzc1ZhbHVlKHN1bW1hcnkuc3ltYm9sLCBTZXJpYWxpemF0aW9uRmxhZ3MuTm9uZSl9O1xuICAgICAgdGhpcy5wcm9jZXNzZWRTdW1tYXJpZXMucHVzaChwcm9jZXNzZWRTdW1tYXJ5KTtcbiAgICAgIHRoaXMucHJvY2Vzc2VkU3VtbWFyeUJ5U3ltYm9sLnNldChzdW1tYXJ5LnN5bWJvbCwgcHJvY2Vzc2VkU3VtbWFyeSk7XG4gICAgfVxuICAgIGlmICghdW5wcm9jZXNzZWRTdW1tYXJ5Lm1ldGFkYXRhICYmIHN1bW1hcnkubWV0YWRhdGEpIHtcbiAgICAgIGxldCBtZXRhZGF0YSA9IHN1bW1hcnkubWV0YWRhdGEgfHwge307XG4gICAgICBpZiAobWV0YWRhdGEuX19zeW1ib2xpYyA9PT0gJ2NsYXNzJykge1xuICAgICAgICAvLyBGb3IgY2xhc3Nlcywgd2Uga2VlcCBldmVyeXRoaW5nIGV4Y2VwdCB0aGVpciBjbGFzcyBkZWNvcmF0b3JzLlxuICAgICAgICAvLyBXZSBuZWVkIHRvIGtlZXAgZS5nLiB0aGUgY3RvciBhcmdzLCBtZXRob2QgbmFtZXMsIG1ldGhvZCBkZWNvcmF0b3JzXG4gICAgICAgIC8vIHNvIHRoYXQgdGhlIGNsYXNzIGNhbiBiZSBleHRlbmRlZCBpbiBhbm90aGVyIGNvbXBpbGF0aW9uIHVuaXQuXG4gICAgICAgIC8vIFdlIGRvbid0IGtlZXAgdGhlIGNsYXNzIGRlY29yYXRvcnMgYXNcbiAgICAgICAgLy8gMSkgdGhleSByZWZlciB0byBkYXRhXG4gICAgICAgIC8vICAgdGhhdCBzaG91bGQgbm90IGNhdXNlIGEgcmVidWlsZCBvZiBkb3duc3RyZWFtIGNvbXBpbGF0aW9uIHVuaXRzXG4gICAgICAgIC8vICAgKGUuZy4gaW5saW5lIHRlbXBsYXRlcyBvZiBAQ29tcG9uZW50LCBvciBATmdNb2R1bGUuZGVjbGFyYXRpb25zKVxuICAgICAgICAvLyAyKSB0aGVpciBkYXRhIGlzIGFscmVhZHkgY2FwdHVyZWQgaW4gVHlwZVN1bW1hcmllcywgZS5nLiBEaXJlY3RpdmVTdW1tYXJ5LlxuICAgICAgICBjb25zdCBjbG9uZToge1trZXk6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXMobWV0YWRhdGEpLmZvckVhY2goKHByb3BOYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKHByb3BOYW1lICE9PSAnZGVjb3JhdG9ycycpIHtcbiAgICAgICAgICAgIGNsb25lW3Byb3BOYW1lXSA9IG1ldGFkYXRhW3Byb3BOYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBtZXRhZGF0YSA9IGNsb25lO1xuICAgICAgfSBlbHNlIGlmIChpc0NhbGwobWV0YWRhdGEpKSB7XG4gICAgICAgIGlmICghaXNGdW5jdGlvbkNhbGwobWV0YWRhdGEpICYmICFpc01ldGhvZENhbGxPblZhcmlhYmxlKG1ldGFkYXRhKSkge1xuICAgICAgICAgIC8vIERvbid0IHN0b3JlIGNvbXBsZXggY2FsbHMgYXMgd2Ugd29uJ3QgYmUgYWJsZSB0byBzaW1wbGlmeSB0aGVtIGFueXdheXMgbGF0ZXIgb24uXG4gICAgICAgICAgbWV0YWRhdGEgPSB7XG4gICAgICAgICAgICBfX3N5bWJvbGljOiAnZXJyb3InLFxuICAgICAgICAgICAgbWVzc2FnZTogJ0NvbXBsZXggZnVuY3Rpb24gY2FsbHMgYXJlIG5vdCBzdXBwb3J0ZWQuJyxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBOb3RlOiBXZSBuZWVkIHRvIGtlZXAgc3RvcmluZyBjdG9yIGNhbGxzIGZvciBlLmcuXG4gICAgICAvLyBgZXhwb3J0IGNvbnN0IHggPSBuZXcgSW5qZWN0aW9uVG9rZW4oLi4uKWBcbiAgICAgIHVucHJvY2Vzc2VkU3VtbWFyeS5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuICAgICAgcHJvY2Vzc2VkU3VtbWFyeS5tZXRhZGF0YSA9IHRoaXMucHJvY2Vzc1ZhbHVlKG1ldGFkYXRhLCBTZXJpYWxpemF0aW9uRmxhZ3MuUmVzb2x2ZVZhbHVlKTtcbiAgICAgIGlmIChtZXRhZGF0YSBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCAmJlxuICAgICAgICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyLmlzTGlicmFyeUZpbGUobWV0YWRhdGEuZmlsZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uU3ltYm9sID0gdGhpcy5zeW1ib2xzW3RoaXMuaW5kZXhCeVN5bWJvbC5nZXQobWV0YWRhdGEpIV07XG4gICAgICAgIGlmICghaXNMb3dlcmVkU3ltYm9sKGRlY2xhcmF0aW9uU3ltYm9sLm5hbWUpKSB7XG4gICAgICAgICAgLy8gTm90ZTogc3ltYm9scyB0aGF0IHdlcmUgaW50cm9kdWNlZCBkdXJpbmcgY29kZWdlbiBpbiB0aGUgdXNlciBmaWxlIGNhbiBoYXZlIGEgcmVleHBvcnRcbiAgICAgICAgICAvLyBpZiBhIHVzZXIgdXNlZCBgZXhwb3J0ICpgLiBIb3dldmVyLCB3ZSBjYW4ndCByZWx5IG9uIHRoaXMgYXMgdHNpY2tsZSB3aWxsIGNoYW5nZVxuICAgICAgICAgIC8vIGBleHBvcnQgKmAgaW50byBuYW1lZCBleHBvcnRzLCB1c2luZyBvbmx5IHRoZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSB0eXBlY2hlY2tlci5cbiAgICAgICAgICAvLyBBcyB3ZSBpbnRyb2R1Y2UgdGhlIG5ldyBzeW1ib2xzIGFmdGVyIHR5cGVjaGVjaywgVHNpY2tsZSBkb2VzIG5vdCBrbm93IGFib3V0IHRoZW0sXG4gICAgICAgICAgLy8gYW5kIG9taXRzIHRoZW0gd2hlbiBleHBhbmRpbmcgYGV4cG9ydCAqYC5cbiAgICAgICAgICAvLyBTbyB3ZSBoYXZlIHRvIGtlZXAgcmVleHBvcnRpbmcgdGhlc2Ugc3ltYm9scyBtYW51YWxseSB2aWEgLm5nZmFjdG9yeSBmaWxlcy5cbiAgICAgICAgICB0aGlzLnJlZXhwb3J0ZWRCeS5zZXQoZGVjbGFyYXRpb25TeW1ib2wsIHN1bW1hcnkuc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXVucHJvY2Vzc2VkU3VtbWFyeS50eXBlICYmIHN1bW1hcnkudHlwZSkge1xuICAgICAgdW5wcm9jZXNzZWRTdW1tYXJ5LnR5cGUgPSBzdW1tYXJ5LnR5cGU7XG4gICAgICAvLyBOb3RlOiBXZSBkb24ndCBhZGQgdGhlIHN1bW1hcmllcyBvZiBhbGwgcmVmZXJlbmNlZCBzeW1ib2xzIGFzIGZvciB0aGUgUmVzb2x2ZWRTeW1ib2xzLFxuICAgICAgLy8gYXMgdGhlIHR5cGUgc3VtbWFyaWVzIGFscmVhZHkgY29udGFpbiB0aGUgdHJhbnNpdGl2ZSBkYXRhIHRoYXQgdGhleSByZXF1aXJlXG4gICAgICAvLyAoaW4gYSBtaW5pbWFsIHdheSkuXG4gICAgICBwcm9jZXNzZWRTdW1tYXJ5LnR5cGUgPSB0aGlzLnByb2Nlc3NWYWx1ZShzdW1tYXJ5LnR5cGUsIFNlcmlhbGl6YXRpb25GbGFncy5Ob25lKTtcbiAgICAgIC8vIGV4Y2VwdCBmb3IgcmVleHBvcnRlZCBkaXJlY3RpdmVzIC8gcGlwZXMsIHNvIHdlIG5lZWQgdG8gc3RvcmVcbiAgICAgIC8vIHRoZWlyIHN1bW1hcmllcyBleHBsaWNpdGx5LlxuICAgICAgaWYgKHN1bW1hcnkudHlwZS5zdW1tYXJ5S2luZCA9PT0gQ29tcGlsZVN1bW1hcnlLaW5kLk5nTW9kdWxlKSB7XG4gICAgICAgIGNvbnN0IG5nTW9kdWxlU3VtbWFyeSA9IDxDb21waWxlTmdNb2R1bGVTdW1tYXJ5PnN1bW1hcnkudHlwZTtcbiAgICAgICAgbmdNb2R1bGVTdW1tYXJ5LmV4cG9ydGVkRGlyZWN0aXZlcy5jb25jYXQobmdNb2R1bGVTdW1tYXJ5LmV4cG9ydGVkUGlwZXMpLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sOiBTdGF0aWNTeW1ib2wgPSBpZC5yZWZlcmVuY2U7XG4gICAgICAgICAgaWYgKHRoaXMuc3VtbWFyeVJlc29sdmVyLmlzTGlicmFyeUZpbGUoc3ltYm9sLmZpbGVQYXRoKSAmJlxuICAgICAgICAgICAgICAhdGhpcy51bnByb2Nlc3NlZFN5bWJvbFN1bW1hcmllc0J5U3ltYm9sLmhhcyhzeW1ib2wpKSB7XG4gICAgICAgICAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5zdW1tYXJ5UmVzb2x2ZXIucmVzb2x2ZVN1bW1hcnkoc3ltYm9sKTtcbiAgICAgICAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgICAgICAgIHRoaXMuYWRkU3VtbWFyeShzdW1tYXJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gY3JlYXRlRXh0ZXJuYWxTeW1ib2xSZWV4cG9ydHMgV2hldGhlciBleHRlcm5hbCBzdGF0aWMgc3ltYm9scyBzaG91bGQgYmUgcmUtZXhwb3J0ZWQuXG4gICAqIFRoaXMgY2FuIGJlIGVuYWJsZWQgaWYgZXh0ZXJuYWwgc3ltYm9scyBzaG91bGQgYmUgcmUtZXhwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgbW9kdWxlIGluXG4gICAqIG9yZGVyIHRvIGF2b2lkIGR5bmFtaWNhbGx5IGdlbmVyYXRlZCBtb2R1bGUgZGVwZW5kZW5jaWVzIHdoaWNoIGNhbiBicmVhayBzdHJpY3QgZGVwZW5kZW5jeVxuICAgKiBlbmZvcmNlbWVudHMgKGFzIGluIEdvb2dsZTMpLiBSZWFkIG1vcmUgaGVyZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMjU2NDRcbiAgICovXG4gIHNlcmlhbGl6ZShjcmVhdGVFeHRlcm5hbFN5bWJvbFJlZXhwb3J0czogYm9vbGVhbik6XG4gICAgICB7anNvbjogc3RyaW5nLCBleHBvcnRBczoge3N5bWJvbDogU3RhdGljU3ltYm9sLCBleHBvcnRBczogc3RyaW5nfVtdfSB7XG4gICAgY29uc3QgZXhwb3J0QXM6IHtzeW1ib2w6IFN0YXRpY1N5bWJvbCwgZXhwb3J0QXM6IHN0cmluZ31bXSA9IFtdO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBtb2R1bGVOYW1lOiB0aGlzLm1vZHVsZU5hbWUsXG4gICAgICBzdW1tYXJpZXM6IHRoaXMucHJvY2Vzc2VkU3VtbWFyaWVzLFxuICAgICAgc3ltYm9sczogdGhpcy5zeW1ib2xzLm1hcCgoc3ltYm9sLCBpbmRleCkgPT4ge1xuICAgICAgICBzeW1ib2wuYXNzZXJ0Tm9NZW1iZXJzKCk7XG4gICAgICAgIGxldCBpbXBvcnRBczogc3RyaW5nfG51bWJlciA9IHVuZGVmaW5lZCE7XG4gICAgICAgIGlmICh0aGlzLnN1bW1hcnlSZXNvbHZlci5pc0xpYnJhcnlGaWxlKHN5bWJvbC5maWxlUGF0aCkpIHtcbiAgICAgICAgICBjb25zdCByZWV4cG9ydFN5bWJvbCA9IHRoaXMucmVleHBvcnRlZEJ5LmdldChzeW1ib2wpO1xuICAgICAgICAgIGlmIChyZWV4cG9ydFN5bWJvbCkge1xuICAgICAgICAgICAgLy8gSW4gY2FzZSB0aGUgZ2l2ZW4gZXh0ZXJuYWwgc3RhdGljIHN5bWJvbCBpcyBhbHJlYWR5IG1hbnVhbGx5IGV4cG9ydGVkIGJ5IHRoZVxuICAgICAgICAgICAgLy8gdXNlciwgd2UganVzdCBwcm94eSB0aGUgZXh0ZXJuYWwgc3RhdGljIHN5bWJvbCByZWZlcmVuY2UgdG8gdGhlIG1hbnVhbCBleHBvcnQuXG4gICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgQU9UIGNvbXBpbGVyIGltcG9ydHMgdGhlIGV4dGVybmFsIHN5bWJvbCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgLy8gdXNlciBleHBvcnQgYW5kIGRvZXMgbm90IGludHJvZHVjZSBhbm90aGVyIGRlcGVuZGVuY3kgd2hpY2ggaXMgbm90IG5lZWRlZC5cbiAgICAgICAgICAgIGltcG9ydEFzID0gdGhpcy5pbmRleEJ5U3ltYm9sLmdldChyZWV4cG9ydFN5bWJvbCkhO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY3JlYXRlRXh0ZXJuYWxTeW1ib2xSZWV4cG9ydHMpIHtcbiAgICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSwgdGhlIGdpdmVuIGV4dGVybmFsIHN0YXRpYyBzeW1ib2wgaXMgKm5vdCogbWFudWFsbHkgZXhwb3J0ZWQgYnlcbiAgICAgICAgICAgIC8vIHRoZSB1c2VyLCBhbmQgd2UgbWFudWFsbHkgY3JlYXRlIGEgcmUtZXhwb3J0IGluIHRoZSBmYWN0b3J5IGZpbGUgc28gdGhhdCB3ZVxuICAgICAgICAgICAgLy8gZG9uJ3QgaW50cm9kdWNlIGFub3RoZXIgbW9kdWxlIGRlcGVuZGVuY3kuIFRoaXMgaXMgdXNlZnVsIHdoZW4gcnVubmluZyB3aXRoaW5cbiAgICAgICAgICAgIC8vIEJhemVsIHNvIHRoYXQgdGhlIEFPVCBjb21waWxlciBkb2VzIG5vdCBpbnRyb2R1Y2UgYW55IG1vZHVsZSBkZXBlbmRlbmNpZXNcbiAgICAgICAgICAgIC8vIHdoaWNoIGNhbiBicmVhayB0aGUgc3RyaWN0IGRlcGVuZGVuY3kgZW5mb3JjZW1lbnQuIChlLmcuIGFzIGluIEdvb2dsZTMpXG4gICAgICAgICAgICAvLyBSZWFkIG1vcmUgYWJvdXQgdGhpcyBoZXJlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8yNTY0NFxuICAgICAgICAgICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMudW5wcm9jZXNzZWRTeW1ib2xTdW1tYXJpZXNCeVN5bWJvbC5nZXQoc3ltYm9sKTtcbiAgICAgICAgICAgIGlmICghc3VtbWFyeSB8fCAhc3VtbWFyeS5tZXRhZGF0YSB8fCBzdW1tYXJ5Lm1ldGFkYXRhLl9fc3ltYm9saWMgIT09ICdpbnRlcmZhY2UnKSB7XG4gICAgICAgICAgICAgIGltcG9ydEFzID0gYCR7c3ltYm9sLm5hbWV9XyR7aW5kZXh9YDtcbiAgICAgICAgICAgICAgZXhwb3J0QXMucHVzaCh7c3ltYm9sLCBleHBvcnRBczogaW1wb3J0QXN9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBfX3N5bWJvbDogaW5kZXgsXG4gICAgICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICAgICAgZmlsZVBhdGg6IHRoaXMuc3VtbWFyeVJlc29sdmVyLnRvU3VtbWFyeUZpbGVOYW1lKHN5bWJvbC5maWxlUGF0aCwgdGhpcy5zcmNGaWxlTmFtZSksXG4gICAgICAgICAgaW1wb3J0QXM6IGltcG9ydEFzXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgIH0pO1xuICAgIHJldHVybiB7anNvbiwgZXhwb3J0QXN9O1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzVmFsdWUodmFsdWU6IGFueSwgZmxhZ3M6IFNlcmlhbGl6YXRpb25GbGFncyk6IGFueSB7XG4gICAgcmV0dXJuIHZpc2l0VmFsdWUodmFsdWUsIHRoaXMsIGZsYWdzKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0T3RoZXIodmFsdWU6IGFueSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2wpIHtcbiAgICAgIGxldCBiYXNlU3ltYm9sID0gdGhpcy5zeW1ib2xSZXNvbHZlci5nZXRTdGF0aWNTeW1ib2wodmFsdWUuZmlsZVBhdGgsIHZhbHVlLm5hbWUpO1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnZpc2l0U3RhdGljU3ltYm9sKGJhc2VTeW1ib2wsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHtfX3N5bWJvbDogaW5kZXgsIG1lbWJlcnM6IHZhbHVlLm1lbWJlcnN9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdHJpcCBsaW5lIGFuZCBjaGFyYWN0ZXIgbnVtYmVycyBmcm9tIG5nc3VtbWFyaWVzLlxuICAgKiBFbWl0dGluZyB0aGVtIGNhdXNlcyB3aGl0ZSBzcGFjZXMgY2hhbmdlcyB0byByZXRyaWdnZXIgdXBzdHJlYW1cbiAgICogcmVjb21waWxhdGlvbnMgaW4gYmF6ZWwuXG4gICAqIFRPRE86IGZpbmQgb3V0IGEgd2F5IHRvIGhhdmUgbGluZSBhbmQgY2hhcmFjdGVyIG51bWJlcnMgaW4gZXJyb3JzIHdpdGhvdXRcbiAgICogZXhjZXNzaXZlIHJlY29tcGlsYXRpb24gaW4gYmF6ZWwuXG4gICAqL1xuICBvdmVycmlkZSB2aXNpdFN0cmluZ01hcChtYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGlmIChtYXBbJ19fc3ltYm9saWMnXSA9PT0gJ3Jlc29sdmVkJykge1xuICAgICAgcmV0dXJuIHZpc2l0VmFsdWUobWFwWydzeW1ib2wnXSwgdGhpcywgY29udGV4dCk7XG4gICAgfVxuICAgIGlmIChtYXBbJ19fc3ltYm9saWMnXSA9PT0gJ2Vycm9yJykge1xuICAgICAgZGVsZXRlIG1hcFsnbGluZSddO1xuICAgICAgZGVsZXRlIG1hcFsnY2hhcmFjdGVyJ107XG4gICAgfVxuICAgIHJldHVybiBzdXBlci52aXNpdFN0cmluZ01hcChtYXAsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgbnVsbCBpZiB0aGUgb3B0aW9ucy5yZXNvbHZlVmFsdWUgaXMgdHJ1ZSwgYW5kIHRoZSBzdW1tYXJ5IGZvciB0aGUgc3ltYm9sXG4gICAqIHJlc29sdmVkIHRvIGEgdHlwZSBvciBjb3VsZCBub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICBwcml2YXRlIHZpc2l0U3RhdGljU3ltYm9sKGJhc2VTeW1ib2w6IFN0YXRpY1N5bWJvbCwgZmxhZ3M6IFNlcmlhbGl6YXRpb25GbGFncyk6IG51bWJlciB7XG4gICAgbGV0IGluZGV4OiBudW1iZXJ8dW5kZWZpbmVkfG51bGwgPSB0aGlzLmluZGV4QnlTeW1ib2wuZ2V0KGJhc2VTeW1ib2wpO1xuICAgIGxldCBzdW1tYXJ5OiBTdW1tYXJ5PFN0YXRpY1N5bWJvbD58bnVsbCA9IG51bGw7XG4gICAgaWYgKGZsYWdzICYgU2VyaWFsaXphdGlvbkZsYWdzLlJlc29sdmVWYWx1ZSAmJlxuICAgICAgICB0aGlzLnN1bW1hcnlSZXNvbHZlci5pc0xpYnJhcnlGaWxlKGJhc2VTeW1ib2wuZmlsZVBhdGgpKSB7XG4gICAgICBpZiAodGhpcy51bnByb2Nlc3NlZFN5bWJvbFN1bW1hcmllc0J5U3ltYm9sLmhhcyhiYXNlU3ltYm9sKSkge1xuICAgICAgICAvLyB0aGUgc3VtbWFyeSBmb3IgdGhpcyBzeW1ib2wgd2FzIGFscmVhZHkgYWRkZWRcbiAgICAgICAgLy8gLT4gbm90aGluZyB0byBkby5cbiAgICAgICAgcmV0dXJuIGluZGV4ITtcbiAgICAgIH1cbiAgICAgIHN1bW1hcnkgPSB0aGlzLmxvYWRTdW1tYXJ5KGJhc2VTeW1ib2wpO1xuICAgICAgaWYgKHN1bW1hcnkgJiYgc3VtbWFyeS5tZXRhZGF0YSBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbCkge1xuICAgICAgICAvLyBUaGUgc3VtbWFyeSBpcyBhIHJlZXhwb3J0XG4gICAgICAgIGluZGV4ID0gdGhpcy52aXNpdFN0YXRpY1N5bWJvbChzdW1tYXJ5Lm1ldGFkYXRhLCBmbGFncyk7XG4gICAgICAgIC8vIHJlc2V0IHRoZSBzdW1tYXJ5IGFzIGl0IGlzIGp1c3QgYSByZWV4cG9ydCwgc28gd2UgZG9uJ3Qgd2FudCB0byBzdG9yZSBpdC5cbiAgICAgICAgc3VtbWFyeSA9IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAvLyBOb3RlOiA9PSBvbiBwdXJwb3NlIHRvIGNvbXBhcmUgd2l0aCB1bmRlZmluZWQhXG4gICAgICAvLyBObyBzdW1tYXJ5IGFuZCB0aGUgc3ltYm9sIGlzIGFscmVhZHkgYWRkZWQgLT4gbm90aGluZyB0byBkby5cbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gICAgLy8gTm90ZTogPT0gb24gcHVycG9zZSB0byBjb21wYXJlIHdpdGggdW5kZWZpbmVkIVxuICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICBpbmRleCA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaChiYXNlU3ltYm9sKTtcbiAgICB9XG4gICAgdGhpcy5pbmRleEJ5U3ltYm9sLnNldChiYXNlU3ltYm9sLCBpbmRleCk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHRoaXMuYWRkU3VtbWFyeShzdW1tYXJ5KTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkU3VtbWFyeShzeW1ib2w6IFN0YXRpY1N5bWJvbCk6IFN1bW1hcnk8U3RhdGljU3ltYm9sPnxudWxsIHtcbiAgICBsZXQgc3VtbWFyeSA9IHRoaXMuc3VtbWFyeVJlc29sdmVyLnJlc29sdmVTdW1tYXJ5KHN5bWJvbCk7XG4gICAgaWYgKCFzdW1tYXJ5KSB7XG4gICAgICAvLyBzb21lIHN5bWJvbHMgbWlnaHQgb3JpZ2luYXRlIGZyb20gYSBwbGFpbiB0eXBlc2NyaXB0IGxpYnJhcnlcbiAgICAgIC8vIHRoYXQganVzdCBleHBvcnRlZCAuZC50cyBhbmQgLm1ldGFkYXRhLmpzb24gZmlsZXMsIGkuZS4gd2hlcmUgbm8gc3VtbWFyeVxuICAgICAgLy8gZmlsZXMgd2VyZSBjcmVhdGVkLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTeW1ib2wgPSB0aGlzLnN5bWJvbFJlc29sdmVyLnJlc29sdmVTeW1ib2woc3ltYm9sKTtcbiAgICAgIGlmIChyZXNvbHZlZFN5bWJvbCkge1xuICAgICAgICBzdW1tYXJ5ID0ge3N5bWJvbDogcmVzb2x2ZWRTeW1ib2wuc3ltYm9sLCBtZXRhZGF0YTogcmVzb2x2ZWRTeW1ib2wubWV0YWRhdGF9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VtbWFyeTtcbiAgfVxufVxuXG5jbGFzcyBGb3JKaXRTZXJpYWxpemVyIHtcbiAgcHJpdmF0ZSBkYXRhOiBBcnJheTx7XG4gICAgc3VtbWFyeTogQ29tcGlsZVR5cGVTdW1tYXJ5LFxuICAgIG1ldGFkYXRhOiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXxDb21waWxlRGlyZWN0aXZlTWV0YWRhdGF8Q29tcGlsZVBpcGVNZXRhZGF0YXxcbiAgICBDb21waWxlVHlwZU1ldGFkYXRhfG51bGwsXG4gICAgaXNMaWJyYXJ5OiBib29sZWFuXG4gIH0+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG91dHB1dEN0eDogT3V0cHV0Q29udGV4dCwgcHJpdmF0ZSBzeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIHN1bW1hcnlSZXNvbHZlcjogU3VtbWFyeVJlc29sdmVyPFN0YXRpY1N5bWJvbD4pIHt9XG5cbiAgYWRkU291cmNlVHlwZShcbiAgICAgIHN1bW1hcnk6IENvbXBpbGVUeXBlU3VtbWFyeSxcbiAgICAgIG1ldGFkYXRhOiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXxDb21waWxlRGlyZWN0aXZlTWV0YWRhdGF8Q29tcGlsZVBpcGVNZXRhZGF0YXxcbiAgICAgIENvbXBpbGVUeXBlTWV0YWRhdGEpIHtcbiAgICB0aGlzLmRhdGEucHVzaCh7c3VtbWFyeSwgbWV0YWRhdGEsIGlzTGlicmFyeTogZmFsc2V9KTtcbiAgfVxuXG4gIGFkZExpYlR5cGUoc3VtbWFyeTogQ29tcGlsZVR5cGVTdW1tYXJ5KSB7XG4gICAgdGhpcy5kYXRhLnB1c2goe3N1bW1hcnksIG1ldGFkYXRhOiBudWxsLCBpc0xpYnJhcnk6IHRydWV9KTtcbiAgfVxuXG4gIHNlcmlhbGl6ZShleHBvcnRBc0Fycjoge3N5bWJvbDogU3RhdGljU3ltYm9sLCBleHBvcnRBczogc3RyaW5nfVtdKTogdm9pZCB7XG4gICAgY29uc3QgZXhwb3J0QXNCeVN5bWJvbCA9IG5ldyBNYXA8U3RhdGljU3ltYm9sLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB7c3ltYm9sLCBleHBvcnRBc30gb2YgZXhwb3J0QXNBcnIpIHtcbiAgICAgIGV4cG9ydEFzQnlTeW1ib2wuc2V0KHN5bWJvbCwgZXhwb3J0QXMpO1xuICAgIH1cbiAgICBjb25zdCBuZ01vZHVsZVN5bWJvbHMgPSBuZXcgU2V0PFN0YXRpY1N5bWJvbD4oKTtcblxuICAgIGZvciAoY29uc3Qge3N1bW1hcnksIG1ldGFkYXRhLCBpc0xpYnJhcnl9IG9mIHRoaXMuZGF0YSkge1xuICAgICAgaWYgKHN1bW1hcnkuc3VtbWFyeUtpbmQgPT09IENvbXBpbGVTdW1tYXJ5S2luZC5OZ01vZHVsZSkge1xuICAgICAgICAvLyBjb2xsZWN0IHRoZSBzeW1ib2xzIHRoYXQgcmVmZXIgdG8gTmdNb2R1bGUgY2xhc3Nlcy5cbiAgICAgICAgLy8gTm90ZTogd2UgY2FuJ3QganVzdCByZWx5IG9uIGBzdW1tYXJ5LnR5cGUuc3VtbWFyeUtpbmRgIHRvIGRldGVybWluZSB0aGlzIGFzXG4gICAgICAgIC8vIHdlIGRvbid0IGFkZCB0aGUgc3VtbWFyaWVzIG9mIGFsbCByZWZlcmVuY2VkIHN5bWJvbHMgd2hlbiB3ZSBzZXJpYWxpemUgdHlwZSBzdW1tYXJpZXMuXG4gICAgICAgIC8vIFNlZSBzZXJpYWxpemVTdW1tYXJpZXMgZm9yIGRldGFpbHMuXG4gICAgICAgIG5nTW9kdWxlU3ltYm9scy5hZGQoc3VtbWFyeS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgIGNvbnN0IG1vZFN1bW1hcnkgPSA8Q29tcGlsZU5nTW9kdWxlU3VtbWFyeT5zdW1tYXJ5O1xuICAgICAgICBmb3IgKGNvbnN0IG1vZCBvZiBtb2RTdW1tYXJ5Lm1vZHVsZXMpIHtcbiAgICAgICAgICBuZ01vZHVsZVN5bWJvbHMuYWRkKG1vZC5yZWZlcmVuY2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWlzTGlicmFyeSkge1xuICAgICAgICBjb25zdCBmbk5hbWUgPSBzdW1tYXJ5Rm9ySml0TmFtZShzdW1tYXJ5LnR5cGUucmVmZXJlbmNlLm5hbWUpO1xuICAgICAgICBjcmVhdGVTdW1tYXJ5Rm9ySml0RnVuY3Rpb24oXG4gICAgICAgICAgICB0aGlzLm91dHB1dEN0eCwgc3VtbWFyeS50eXBlLnJlZmVyZW5jZSxcbiAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplU3VtbWFyeVdpdGhEZXBzKHN1bW1hcnksIG1ldGFkYXRhISkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5nTW9kdWxlU3ltYm9scy5mb3JFYWNoKChuZ01vZHVsZVN5bWJvbCkgPT4ge1xuICAgICAgaWYgKHRoaXMuc3VtbWFyeVJlc29sdmVyLmlzTGlicmFyeUZpbGUobmdNb2R1bGVTeW1ib2wuZmlsZVBhdGgpKSB7XG4gICAgICAgIGxldCBleHBvcnRBcyA9IGV4cG9ydEFzQnlTeW1ib2wuZ2V0KG5nTW9kdWxlU3ltYm9sKSB8fCBuZ01vZHVsZVN5bWJvbC5uYW1lO1xuICAgICAgICBjb25zdCBqaXRFeHBvcnRBc05hbWUgPSBzdW1tYXJ5Rm9ySml0TmFtZShleHBvcnRBcyk7XG4gICAgICAgIHRoaXMub3V0cHV0Q3R4LnN0YXRlbWVudHMucHVzaChvLnZhcmlhYmxlKGppdEV4cG9ydEFzTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0KHRoaXMuc2VyaWFsaXplU3VtbWFyeVJlZihuZ01vZHVsZVN5bWJvbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvRGVjbFN0bXQobnVsbCwgW28uU3RtdE1vZGlmaWVyLkV4cG9ydGVkXSkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXJpYWxpemVTdW1tYXJ5V2l0aERlcHMoXG4gICAgICBzdW1tYXJ5OiBDb21waWxlVHlwZVN1bW1hcnksXG4gICAgICBtZXRhZGF0YTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8Q29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhfENvbXBpbGVQaXBlTWV0YWRhdGF8XG4gICAgICBDb21waWxlVHlwZU1ldGFkYXRhKTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByZXNzaW9uczogby5FeHByZXNzaW9uW10gPSBbdGhpcy5zZXJpYWxpemVTdW1tYXJ5KHN1bW1hcnkpXTtcbiAgICBsZXQgcHJvdmlkZXJzOiBDb21waWxlUHJvdmlkZXJNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG1ldGFkYXRhIGluc3RhbmNlb2YgQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEpIHtcbiAgICAgIGV4cHJlc3Npb25zLnB1c2goLi4uXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBkaXJlY3RpdmVzIC8gcGlwZXMsIHdlIG9ubHkgYWRkIHRoZSBkZWNsYXJlZCBvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgcmVseSBvbiB0cmFuc2l0aXZlbHkgaW1wb3J0aW5nIE5nTW9kdWxlcyB0byBnZXQgdGhlIHRyYW5zaXRpdmVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gc3VtbWFyaWVzLlxuICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5kZWNsYXJlZERpcmVjdGl2ZXMuY29uY2F0KG1ldGFkYXRhLmRlY2xhcmVkUGlwZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHR5cGUgPT4gdHlwZS5yZWZlcmVuY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGFsc28gYWRkIHRoZSBzdW1tYXJpZXMgZm9yIG1vZHVsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZyb20gbGlicmFyaWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvayBhcyB3ZSBwcm9kdWNlIHJlZXhwb3J0cyBmb3IgYWxsIHRyYW5zaXRpdmUgbW9kdWxlcy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jb25jYXQobWV0YWRhdGEudHJhbnNpdGl2ZU1vZHVsZS5tb2R1bGVzLm1hcCh0eXBlID0+IHR5cGUucmVmZXJlbmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihyZWYgPT4gcmVmICE9PSBtZXRhZGF0YS50eXBlLnJlZmVyZW5jZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChyZWYpID0+IHRoaXMuc2VyaWFsaXplU3VtbWFyeVJlZihyZWYpKSk7XG4gICAgICAvLyBOb3RlOiBXZSBkb24ndCB1c2UgYE5nTW9kdWxlU3VtbWFyeS5wcm92aWRlcnNgLCBhcyB0aGF0IG9uZSBpcyB0cmFuc2l0aXZlLFxuICAgICAgLy8gYW5kIHdlIGFscmVhZHkgaGF2ZSB0cmFuc2l0aXZlIG1vZHVsZXMuXG4gICAgICBwcm92aWRlcnMgPSBtZXRhZGF0YS5wcm92aWRlcnM7XG4gICAgfSBlbHNlIGlmIChzdW1tYXJ5LnN1bW1hcnlLaW5kID09PSBDb21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKSB7XG4gICAgICBjb25zdCBkaXJTdW1tYXJ5ID0gPENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5PnN1bW1hcnk7XG4gICAgICBwcm92aWRlcnMgPSBkaXJTdW1tYXJ5LnByb3ZpZGVycy5jb25jYXQoZGlyU3VtbWFyeS52aWV3UHJvdmlkZXJzKTtcbiAgICB9XG4gICAgLy8gTm90ZTogV2UgY2FuJ3QganVzdCByZWZlciB0byB0aGUgYG5nc3VtbWFyeS50c2AgZmlsZXMgZm9yIGB1c2VDbGFzc2AgcHJvdmlkZXJzIChhcyB3ZSBkbyBmb3JcbiAgICAvLyBkZWNsYXJlZERpcmVjdGl2ZXMgLyBkZWNsYXJlZFBpcGVzKSwgYXMgd2UgYWxsb3dcbiAgICAvLyBwcm92aWRlcnMgd2l0aG91dCBjdG9yIGFyZ3VtZW50cyB0byBza2lwIHRoZSBgQEluamVjdGFibGVgIGRlY29yYXRvcixcbiAgICAvLyBpLmUuIHdlIGRpZG4ndCBnZW5lcmF0ZSAubmdzdW1tYXJ5LnRzIGZpbGVzIGZvciB0aGVzZS5cbiAgICBleHByZXNzaW9ucy5wdXNoKFxuICAgICAgICAuLi5wcm92aWRlcnMuZmlsdGVyKHByb3ZpZGVyID0+ICEhcHJvdmlkZXIudXNlQ2xhc3MpLm1hcChwcm92aWRlciA9PiB0aGlzLnNlcmlhbGl6ZVN1bW1hcnkoe1xuICAgICAgICAgIHN1bW1hcnlLaW5kOiBDb21waWxlU3VtbWFyeUtpbmQuSW5qZWN0YWJsZSxcbiAgICAgICAgICB0eXBlOiBwcm92aWRlci51c2VDbGFzc1xuICAgICAgICB9IGFzIENvbXBpbGVUeXBlU3VtbWFyeSkpKTtcbiAgICByZXR1cm4gby5saXRlcmFsQXJyKGV4cHJlc3Npb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgc2VyaWFsaXplU3VtbWFyeVJlZih0eXBlU3ltYm9sOiBTdGF0aWNTeW1ib2wpOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGppdEltcG9ydGVkU3ltYm9sID0gdGhpcy5zeW1ib2xSZXNvbHZlci5nZXRTdGF0aWNTeW1ib2woXG4gICAgICAgIHN1bW1hcnlGb3JKaXRGaWxlTmFtZSh0eXBlU3ltYm9sLmZpbGVQYXRoKSwgc3VtbWFyeUZvckppdE5hbWUodHlwZVN5bWJvbC5uYW1lKSk7XG4gICAgcmV0dXJuIHRoaXMub3V0cHV0Q3R4LmltcG9ydEV4cHIoaml0SW1wb3J0ZWRTeW1ib2wpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXJpYWxpemVTdW1tYXJ5KGRhdGE6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBvdXRwdXRDdHggPSB0aGlzLm91dHB1dEN0eDtcblxuICAgIGNsYXNzIFRyYW5zZm9ybWVyIGltcGxlbWVudHMgVmFsdWVWaXNpdG9yIHtcbiAgICAgIHZpc2l0QXJyYXkoYXJyOiBhbnlbXSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgICAgcmV0dXJuIG8ubGl0ZXJhbEFycihhcnIubWFwKGVudHJ5ID0+IHZpc2l0VmFsdWUoZW50cnksIHRoaXMsIGNvbnRleHQpKSk7XG4gICAgICB9XG4gICAgICB2aXNpdFN0cmluZ01hcChtYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgICByZXR1cm4gbmV3IG8uTGl0ZXJhbE1hcEV4cHIoT2JqZWN0LmtleXMobWFwKS5tYXAoXG4gICAgICAgICAgICAoa2V5KSA9PiBuZXcgby5MaXRlcmFsTWFwRW50cnkoa2V5LCB2aXNpdFZhbHVlKG1hcFtrZXldLCB0aGlzLCBjb250ZXh0KSwgZmFsc2UpKSk7XG4gICAgICB9XG4gICAgICB2aXNpdFByaW1pdGl2ZSh2YWx1ZTogYW55LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgICByZXR1cm4gby5saXRlcmFsKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHZpc2l0T3RoZXIodmFsdWU6IGFueSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgU3RhdGljU3ltYm9sKSB7XG4gICAgICAgICAgcmV0dXJuIG91dHB1dEN0eC5pbXBvcnRFeHByKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYElsbGVnYWwgU3RhdGU6IEVuY291bnRlcmVkIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmlzaXRWYWx1ZShkYXRhLCBuZXcgVHJhbnNmb3JtZXIoKSwgbnVsbCk7XG4gIH1cbn1cblxuY2xhc3MgRnJvbUpzb25EZXNlcmlhbGl6ZXIgZXh0ZW5kcyBWYWx1ZVRyYW5zZm9ybWVyIHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgc3ltYm9scyE6IFN0YXRpY1N5bWJvbFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBzeW1ib2xDYWNoZTogU3RhdGljU3ltYm9sQ2FjaGUsXG4gICAgICBwcml2YXRlIHN1bW1hcnlSZXNvbHZlcjogU3VtbWFyeVJlc29sdmVyPFN0YXRpY1N5bWJvbD4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZGVzZXJpYWxpemUobGlicmFyeUZpbGVOYW1lOiBzdHJpbmcsIGpzb246IHN0cmluZyk6IHtcbiAgICBtb2R1bGVOYW1lOiBzdHJpbmd8bnVsbCxcbiAgICBzdW1tYXJpZXM6IFN1bW1hcnk8U3RhdGljU3ltYm9sPltdLFxuICAgIGltcG9ydEFzOiB7c3ltYm9sOiBTdGF0aWNTeW1ib2wsIGltcG9ydEFzOiBTdGF0aWNTeW1ib2x9W11cbiAgfSB7XG4gICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbikgYXMge21vZHVsZU5hbWU6IHN0cmluZyB8IG51bGwsIHN1bW1hcmllczogYW55W10sIHN5bWJvbHM6IGFueVtdfTtcbiAgICBjb25zdCBhbGxJbXBvcnRBczoge3N5bWJvbDogU3RhdGljU3ltYm9sLCBpbXBvcnRBczogU3RhdGljU3ltYm9sfVtdID0gW107XG4gICAgdGhpcy5zeW1ib2xzID0gZGF0YS5zeW1ib2xzLm1hcChcbiAgICAgICAgKHNlcmlhbGl6ZWRTeW1ib2wpID0+IHRoaXMuc3ltYm9sQ2FjaGUuZ2V0KFxuICAgICAgICAgICAgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIuZnJvbVN1bW1hcnlGaWxlTmFtZShzZXJpYWxpemVkU3ltYm9sLmZpbGVQYXRoLCBsaWJyYXJ5RmlsZU5hbWUpLFxuICAgICAgICAgICAgc2VyaWFsaXplZFN5bWJvbC5uYW1lKSk7XG4gICAgZGF0YS5zeW1ib2xzLmZvckVhY2goKHNlcmlhbGl6ZWRTeW1ib2wsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnN5bWJvbHNbaW5kZXhdO1xuICAgICAgY29uc3QgaW1wb3J0QXMgPSBzZXJpYWxpemVkU3ltYm9sLmltcG9ydEFzO1xuICAgICAgaWYgKHR5cGVvZiBpbXBvcnRBcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgYWxsSW1wb3J0QXMucHVzaCh7c3ltYm9sLCBpbXBvcnRBczogdGhpcy5zeW1ib2xzW2ltcG9ydEFzXX0pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW1wb3J0QXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFsbEltcG9ydEFzLnB1c2goXG4gICAgICAgICAgICB7c3ltYm9sLCBpbXBvcnRBczogdGhpcy5zeW1ib2xDYWNoZS5nZXQobmdmYWN0b3J5RmlsZVBhdGgobGlicmFyeUZpbGVOYW1lKSwgaW1wb3J0QXMpfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3Qgc3VtbWFyaWVzID0gdmlzaXRWYWx1ZShkYXRhLnN1bW1hcmllcywgdGhpcywgbnVsbCkgYXMgU3VtbWFyeTxTdGF0aWNTeW1ib2w+W107XG4gICAgcmV0dXJuIHttb2R1bGVOYW1lOiBkYXRhLm1vZHVsZU5hbWUsIHN1bW1hcmllcywgaW1wb3J0QXM6IGFsbEltcG9ydEFzfTtcbiAgfVxuXG4gIG92ZXJyaWRlIHZpc2l0U3RyaW5nTWFwKG1hcDoge1trZXk6IHN0cmluZ106IGFueX0sIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgaWYgKCdfX3N5bWJvbCcgaW4gbWFwKSB7XG4gICAgICBjb25zdCBiYXNlU3ltYm9sID0gdGhpcy5zeW1ib2xzW21hcFsnX19zeW1ib2wnXV07XG4gICAgICBjb25zdCBtZW1iZXJzID0gbWFwWydtZW1iZXJzJ107XG4gICAgICByZXR1cm4gbWVtYmVycy5sZW5ndGggPyB0aGlzLnN5bWJvbENhY2hlLmdldChiYXNlU3ltYm9sLmZpbGVQYXRoLCBiYXNlU3ltYm9sLm5hbWUsIG1lbWJlcnMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VTeW1ib2w7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdXBlci52aXNpdFN0cmluZ01hcChtYXAsIGNvbnRleHQpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc0NhbGwobWV0YWRhdGE6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gbWV0YWRhdGEgJiYgbWV0YWRhdGEuX19zeW1ib2xpYyA9PT0gJ2NhbGwnO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uQ2FsbChtZXRhZGF0YTogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0NhbGwobWV0YWRhdGEpICYmIHVud3JhcFJlc29sdmVkTWV0YWRhdGEobWV0YWRhdGEuZXhwcmVzc2lvbikgaW5zdGFuY2VvZiBTdGF0aWNTeW1ib2w7XG59XG5cbmZ1bmN0aW9uIGlzTWV0aG9kQ2FsbE9uVmFyaWFibGUobWV0YWRhdGE6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNDYWxsKG1ldGFkYXRhKSAmJiBtZXRhZGF0YS5leHByZXNzaW9uICYmIG1ldGFkYXRhLmV4cHJlc3Npb24uX19zeW1ib2xpYyA9PT0gJ3NlbGVjdCcgJiZcbiAgICAgIHVud3JhcFJlc29sdmVkTWV0YWRhdGEobWV0YWRhdGEuZXhwcmVzc2lvbi5leHByZXNzaW9uKSBpbnN0YW5jZW9mIFN0YXRpY1N5bWJvbDtcbn1cbiJdfQ==