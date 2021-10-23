(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeParameterEmitter = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var type_emitter_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_emitter");
    /**
     * See `TypeEmitter` for more information on the emitting process.
     */
    var TypeParameterEmitter = /** @class */ (function () {
        function TypeParameterEmitter(typeParameters, reflector) {
            this.typeParameters = typeParameters;
            this.reflector = reflector;
        }
        /**
         * Determines whether the type parameters can be emitted. If this returns true, then a call to
         * `emit` is known to succeed. Vice versa, if false is returned then `emit` should not be
         * called, as it would fail.
         */
        TypeParameterEmitter.prototype.canEmit = function () {
            var _this = this;
            if (this.typeParameters === undefined) {
                return true;
            }
            return this.typeParameters.every(function (typeParam) {
                return _this.canEmitType(typeParam.constraint) && _this.canEmitType(typeParam.default);
            });
        };
        TypeParameterEmitter.prototype.canEmitType = function (type) {
            var _this = this;
            if (type === undefined) {
                return true;
            }
            return type_emitter_1.canEmitType(type, function (typeReference) { return _this.resolveTypeReference(typeReference); });
        };
        /**
         * Emits the type parameters using the provided emitter function for `Reference`s.
         */
        TypeParameterEmitter.prototype.emit = function (emitReference) {
            var _this = this;
            if (this.typeParameters === undefined) {
                return undefined;
            }
            var emitter = new type_emitter_1.TypeEmitter(function (type) { return _this.resolveTypeReference(type); }, emitReference);
            return this.typeParameters.map(function (typeParam) {
                var constraint = typeParam.constraint !== undefined ? emitter.emitType(typeParam.constraint) : undefined;
                var defaultType = typeParam.default !== undefined ? emitter.emitType(typeParam.default) : undefined;
                return ts.updateTypeParameterDeclaration(
                /* node */ typeParam, 
                /* name */ typeParam.name, 
                /* constraint */ constraint, 
                /* defaultType */ defaultType);
            });
        };
        TypeParameterEmitter.prototype.resolveTypeReference = function (type) {
            var target = ts.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
            var declaration = this.reflector.getDeclarationOfIdentifier(target);
            // If no declaration could be resolved or does not have a `ts.Declaration`, the type cannot be
            // resolved.
            if (declaration === null || declaration.node === null) {
                return null;
            }
            // If the declaration corresponds with a local type parameter, the type reference can be used
            // as is.
            if (this.isLocalTypeParameter(declaration.node)) {
                return type;
            }
            var owningModule = null;
            if (declaration.viaModule !== null) {
                owningModule = {
                    specifier: declaration.viaModule,
                    resolutionContext: type.getSourceFile().fileName,
                };
            }
            // The declaration needs to be exported as a top-level export to be able to emit an import
            // statement for it. If the declaration is not exported, null is returned to prevent emit.
            if (!this.isTopLevelExport(declaration.node)) {
                return null;
            }
            return new imports_1.Reference(declaration.node, owningModule);
        };
        TypeParameterEmitter.prototype.isTopLevelExport = function (decl) {
            if (decl.parent === undefined || !ts.isSourceFile(decl.parent)) {
                // The declaration has to exist at the top-level, as the reference emitters are not capable of
                // generating imports to classes declared in a namespace.
                return false;
            }
            return this.reflector.isStaticallyExported(decl);
        };
        TypeParameterEmitter.prototype.isLocalTypeParameter = function (decl) {
            // Checking for local type parameters only occurs during resolution of type parameters, so it is
            // guaranteed that type parameters are present.
            return this.typeParameters.some(function (param) { return param === decl; });
        };
        return TypeParameterEmitter;
    }());
    exports.TypeParameterEmitter = TypeParameterEmitter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9wYXJhbWV0ZXJfZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX3BhcmFtZXRlcl9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQyxtRUFBc0Q7SUFHdEQsMkZBQStFO0lBRy9FOztPQUVHO0lBQ0g7UUFDRSw4QkFDWSxjQUFtRSxFQUNuRSxTQUF5QjtZQUR6QixtQkFBYyxHQUFkLGNBQWMsQ0FBcUQ7WUFDbkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRXpDOzs7O1dBSUc7UUFDSCxzQ0FBTyxHQUFQO1lBQUEsaUJBUUM7WUFQQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFBLFNBQVM7Z0JBQ3hDLE9BQU8sS0FBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkYsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRU8sMENBQVcsR0FBbkIsVUFBb0IsSUFBMkI7WUFBL0MsaUJBTUM7WUFMQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLDBCQUFXLENBQUMsSUFBSSxFQUFFLFVBQUEsYUFBYSxJQUFJLE9BQUEsS0FBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxFQUF4QyxDQUF3QyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVEOztXQUVHO1FBQ0gsbUNB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aEQsZ0dBQWdHO1lBQ2hHLCtDQUErQztZQUMvQyxPQUFPLElBQUksQ0FBQyxjQUFlLENBQUMsSUFBSSxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxLQUFLLElBQUksRUFBZCxDQUFjLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBcEdELElBb0dDO0lBcEdZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7T3duaW5nTW9kdWxlLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGUsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtjYW5FbWl0VHlwZSwgUmVzb2x2ZWRUeXBlUmVmZXJlbmNlLCBUeXBlRW1pdHRlcn0gZnJvbSAnLi90eXBlX2VtaXR0ZXInO1xuXG5cbi8qKlxuICogU2VlIGBUeXBlRW1pdHRlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIGVtaXR0aW5nIHByb2Nlc3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlUGFyYW1ldGVyRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0eXBlUGFyYW1ldGVyczogdHMuTm9kZUFycmF5PHRzLlR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbj58dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHR5cGUgcGFyYW1ldGVycyBjYW4gYmUgZW1pdHRlZC4gSWYgdGhpcyByZXR1cm5zIHRydWUsIHRoZW4gYSBjYWxsIHRvXG4gICAqIGBlbWl0YCBpcyBrbm93biB0byBzdWNjZWVkLiBWaWNlIHZlcnNhLCBpZiBmYWxzZSBpcyByZXR1cm5lZCB0aGVuIGBlbWl0YCBzaG91bGQgbm90IGJlXG4gICAqIGNhbGxlZCwgYXMgaXQgd291bGQgZmFpbC5cbiAgICovXG4gIGNhbkVtaXQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMudHlwZVBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudHlwZVBhcmFtZXRlcnMuZXZlcnkodHlwZVBhcmFtID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNhbkVtaXRUeXBlKHR5cGVQYXJhbS5jb25zdHJhaW50KSAmJiB0aGlzLmNhbkVtaXRUeXBlKHR5cGVQYXJhbS5kZWZhdWx0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY2FuRW1pdFR5cGUodHlwZTogdHMuVHlwZU5vZGV8dW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgaWYgKHR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbkVtaXRUeXBlKHR5cGUsIHR5cGVSZWZlcmVuY2UgPT4gdGhpcy5yZXNvbHZlVHlwZVJlZmVyZW5jZSh0eXBlUmVmZXJlbmNlKSk7XG4gIH1cblxuICAvKipcbiAgICogRW1pdHMgdGhlIHR5cGUgcGFyYW1ldGVycyB1c2luZyB0aGUgcHJvdmlkZWQgZW1pdHRlciBmdW5jdGlvbiBmb3IgYFJlZmVyZW5jZWBzLlxuICAgKi9cbiAgZW1pdChlbWl0UmVmZXJlbmNlOiAocmVmOiBSZWZlcmVuY2UpID0+IHRzLlR5cGVOb2RlKTogdHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uW118dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGVtaXR0ZXIgPSBuZXcgVHlwZUVtaXR0ZXIodHlwZSA9PiB0aGlzLnJlc29sdmVUeXBlUmVmZXJlbmNlKHR5cGUpLCBlbWl0UmVmZXJlbmNlKTtcblxuICAgIHJldHVybiB0aGlzLnR5cGVQYXJhbWV0ZXJzLm1hcCh0eXBlUGFyYW0gPT4ge1xuICAgICAgY29uc3QgY29uc3RyYWludCA9XG4gICAgICAgICAgdHlwZVBhcmFtLmNvbnN0cmFpbnQgIT09IHVuZGVmaW5lZCA/IGVtaXR0ZXIuZW1pdFR5cGUodHlwZVBhcmFtLmNvbnN0cmFpbnQpIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgZGVmYXVsdFR5cGUgPVxuICAgICAgICAgIHR5cGVQYXJhbS5kZWZhdWx0ICE9PSB1bmRlZmluZWQgPyBlbWl0dGVyLmVtaXRUeXBlKHR5cGVQYXJhbS5kZWZhdWx0KSA6IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIHRzLnVwZGF0ZVR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbihcbiAgICAgICAgICAvKiBub2RlICovIHR5cGVQYXJhbSxcbiAgICAgICAgICAvKiBuYW1lICovIHR5cGVQYXJhbS5uYW1lLFxuICAgICAgICAgIC8qIGNvbnN0cmFpbnQgKi8gY29uc3RyYWludCxcbiAgICAgICAgICAvKiBkZWZhdWx0VHlwZSAqLyBkZWZhdWx0VHlwZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVUeXBlUmVmZXJlbmNlKHR5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogUmVzb2x2ZWRUeXBlUmVmZXJlbmNlIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0cy5pc0lkZW50aWZpZXIodHlwZS50eXBlTmFtZSkgPyB0eXBlLnR5cGVOYW1lIDogdHlwZS50eXBlTmFtZS5yaWdodDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMucmVmbGVjdG9yLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKHRhcmdldCk7XG5cbiAgICAvLyBJZiBubyBkZWNsYXJhdGlvbiBjb3VsZCBiZSByZXNvbHZlZCBvciBkb2VzIG5vdCBoYXZlIGEgYHRzLkRlY2xhcmF0aW9uYCwgdGhlIHR5cGUgY2Fubm90IGJlXG4gICAgLy8gcmVzb2x2ZWQuXG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSBudWxsIHx8IGRlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBkZWNsYXJhdGlvbiBjb3JyZXNwb25kcyB3aXRoIGEgbG9jYWwgdHlwZSBwYXJhbWV0ZXIsIHRoZSB0eXBlIHJlZmVyZW5jZSBjYW4gYmUgdXNlZFxuICAgIC8vIGFzIGlzLlxuICAgIGlmICh0aGlzLmlzTG9jYWxUeXBlUGFyYW1ldGVyKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdHlwZTtcbiAgICB9XG5cbiAgICBsZXQgb3duaW5nTW9kdWxlOiBPd25pbmdNb2R1bGV8bnVsbCA9IG51bGw7XG4gICAgaWYgKGRlY2xhcmF0aW9uLnZpYU1vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgb3duaW5nTW9kdWxlID0ge1xuICAgICAgICBzcGVjaWZpZXI6IGRlY2xhcmF0aW9uLnZpYU1vZHVsZSxcbiAgICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHR5cGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZGVjbGFyYXRpb24gbmVlZHMgdG8gYmUgZXhwb3J0ZWQgYXMgYSB0b3AtbGV2ZWwgZXhwb3J0IHRvIGJlIGFibGUgdG8gZW1pdCBhbiBpbXBvcnRcbiAgICAvLyBzdGF0ZW1lbnQgZm9yIGl0LiBJZiB0aGUgZGVjbGFyYXRpb24gaXMgbm90IGV4cG9ydGVkLCBudWxsIGlzIHJldHVybmVkIHRvIHByZXZlbnQgZW1pdC5cbiAgICBpZiAoIXRoaXMuaXNUb3BMZXZlbEV4cG9ydChkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2UoZGVjbGFyYXRpb24ubm9kZSwgb3duaW5nTW9kdWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNUb3BMZXZlbEV4cG9ydChkZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBib29sZWFuIHtcbiAgICBpZiAoZGVjbC5wYXJlbnQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTb3VyY2VGaWxlKGRlY2wucGFyZW50KSkge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGhhcyB0byBleGlzdCBhdCB0aGUgdG9wLWxldmVsLCBhcyB0aGUgcmVmZXJlbmNlIGVtaXR0ZXJzIGFyZSBub3QgY2FwYWJsZSBvZlxuICAgICAgLy8gZ2VuZXJhdGluZyBpbXBvcnRzIHRvIGNsYXNzZXMgZGVjbGFyZWQgaW4gYSBuYW1lc3BhY2UuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmlzU3RhdGljYWxseUV4cG9ydGVkKGRlY2wpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xvY2FsVHlwZVBhcmFtZXRlcihkZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBib29sZWFuIHtcbiAgICAvLyBDaGVja2luZyBmb3IgbG9jYWwgdHlwZSBwYXJhbWV0ZXJzIG9ubHkgb2NjdXJzIGR1cmluZyByZXNvbHV0aW9uIG9mIHR5cGUgcGFyYW1ldGVycywgc28gaXQgaXNcbiAgICAvLyBndWFyYW50ZWVkIHRoYXQgdHlwZSBwYXJhbWV0ZXJzIGFyZSBwcmVzZW50LlxuICAgIHJldHVybiB0aGlzLnR5cGVQYXJhbWV0ZXJzIS5zb21lKHBhcmFtID0+IHBhcmFtID09PSBkZWNsKTtcbiAgfVxufVxuIl19