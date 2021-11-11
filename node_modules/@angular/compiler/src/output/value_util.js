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
        define("@angular/compiler/src/output/value_util", ["require", "exports", "@angular/compiler/src/util", "@angular/compiler/src/output/output_ast"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertValueToOutputAst = exports.QUOTED_KEYS = void 0;
    var util_1 = require("@angular/compiler/src/util");
    var o = require("@angular/compiler/src/output/output_ast");
    exports.QUOTED_KEYS = '$quoted$';
    function convertValueToOutputAst(ctx, value, type) {
        if (type === void 0) { type = null; }
        return util_1.visitValue(value, new _ValueOutputAstTransformer(ctx), type);
    }
    exports.convertValueToOutputAst = convertValueToOutputAst;
    var _ValueOutputAstTransformer = /** @class */ (function () {
        function _ValueOutputAstTransformer(ctx) {
            this.ctx = ctx;
        }
        _ValueOutputAstTransformer.prototype.visitArray = function (arr, type) {
            var values = [];
            // Note Array.map() must not be used to convert the values because it will
            // skip over empty elements in arrays constructed using `new Array(length)`,
            // resulting in `undefined` elements. This breaks the type guarantee that
            // all values in `o.LiteralArrayExpr` are of type `o.Expression`.
            // See test case in `value_util_spec.ts`.
            for (var i = 0; i < arr.length; ++i) {
                values.push(util_1.visitValue(arr[i], this, null /* context */));
            }
            return o.literalArr(values, type);
        };
        _ValueOutputAstTransformer.prototype.visitStringMap = function (map, type) {
            var _this = this;
            var entries = [];
            var quotedSet = new Set(map && map[exports.QUOTED_KEYS]);
            Object.keys(map).forEach(function (key) {
                entries.push(new o.LiteralMapEntry(key, util_1.visitValue(map[key], _this, null), quotedSet.has(key)));
            });
            return new o.LiteralMapExpr(entries, type);
        };
        _ValueOutputAstTransformer.prototype.visitPrimitive = function (value, type) {
            return o.literal(value, type);
        };
        _ValueOutputAstTransformer.prototype.visitOther = function (value, type) {
            if (value instanceof o.Expression) {
                return value;
            }
            else {
                return this.ctx.importExpr(value);
            }
        };
        return _ValueOutputAstTransformer;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsdWVfdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9vdXRwdXQvdmFsdWVfdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCxtREFBcUQ7SUFFckQsMkRBQWtDO0lBRXJCLFFBQUEsV0FBVyxHQUFHLFVBQVUsQ0FBQztJQUV0QyxTQUFnQix1QkFBdUIsQ0FDbkMsR0FBa0IsRUFBRSxLQUFVLEVBQUUsSUFBd0I7UUFBeEIscUJBQUEsRUFBQSxXQUF3QjtRQUMxRCxPQUFPLGlCQUFVLENBQUMsS0FBSyxFQUFFLElBQUksMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUhELDBEQUdDO0lBRUQ7UUFDRSxvQ0FBb0IsR0FBa0I7WUFBbEIsUUFBRyxHQUFILEdBQUcsQ0FBZTtRQUFHLENBQUM7UUFDMUMsK0NBQVUsR0FBVixVQUFXLEdBQVUsRUFBRSxJQUFZO1lBQ2pDLElBQU0sTUFBTSxHQUFtQixFQUFFLENBQUM7WUFDbEMsMEVBQTBFO1lBQzFFLDRFQUE0RTtZQUM1RSx5RUFBeUU7WUFDekUsaUVBQWlFO1lBQ2pFLHlDQUF5QztZQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7YUFDM0Q7WUFDRCxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxtREFBYyxHQUFkLFVBQWUsR0FBeUIsRUFBRSxJQUFlO1lBQXpELGlCQVFDO1lBUEMsSUFBTSxPQUFPLEdBQXdCLEVBQUUsQ0FBQztZQUN4QyxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLG1CQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDMUIsT0FBTyxDQUFDLElBQUksQ0FDUixJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLGlCQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RixDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsbURBQWMsR0FBZCxVQUFlLEtBQVUsRUFBRSxJQUFZO1lBQ3JDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELCtDQUFVLEdBQVYsVUFBVyxLQUFVLEVBQUUsSUFBWTtZQUNqQyxJQUFJLEtBQUssWUFBWSxDQUFDLENBQUMsVUFBVSxFQUFFO2dCQUNqQyxPQUFPLEtBQUssQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDbkM7UUFDSCxDQUFDO1FBQ0gsaUNBQUM7SUFBRCxDQUFDLEFBcENELElBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cblxuaW1wb3J0IHtPdXRwdXRDb250ZXh0fSBmcm9tICcuLi9jb25zdGFudF9wb29sJztcbmltcG9ydCB7VmFsdWVUcmFuc2Zvcm1lciwgdmlzaXRWYWx1ZX0gZnJvbSAnLi4vdXRpbCc7XG5cbmltcG9ydCAqIGFzIG8gZnJvbSAnLi9vdXRwdXRfYXN0JztcblxuZXhwb3J0IGNvbnN0IFFVT1RFRF9LRVlTID0gJyRxdW90ZWQkJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRWYWx1ZVRvT3V0cHV0QXN0KFxuICAgIGN0eDogT3V0cHV0Q29udGV4dCwgdmFsdWU6IGFueSwgdHlwZTogby5UeXBlfG51bGwgPSBudWxsKTogby5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIHZpc2l0VmFsdWUodmFsdWUsIG5ldyBfVmFsdWVPdXRwdXRBc3RUcmFuc2Zvcm1lcihjdHgpLCB0eXBlKTtcbn1cblxuY2xhc3MgX1ZhbHVlT3V0cHV0QXN0VHJhbnNmb3JtZXIgaW1wbGVtZW50cyBWYWx1ZVRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjdHg6IE91dHB1dENvbnRleHQpIHt9XG4gIHZpc2l0QXJyYXkoYXJyOiBhbnlbXSwgdHlwZTogby5UeXBlKTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCB2YWx1ZXM6IG8uRXhwcmVzc2lvbltdID0gW107XG4gICAgLy8gTm90ZSBBcnJheS5tYXAoKSBtdXN0IG5vdCBiZSB1c2VkIHRvIGNvbnZlcnQgdGhlIHZhbHVlcyBiZWNhdXNlIGl0IHdpbGxcbiAgICAvLyBza2lwIG92ZXIgZW1wdHkgZWxlbWVudHMgaW4gYXJyYXlzIGNvbnN0cnVjdGVkIHVzaW5nIGBuZXcgQXJyYXkobGVuZ3RoKWAsXG4gICAgLy8gcmVzdWx0aW5nIGluIGB1bmRlZmluZWRgIGVsZW1lbnRzLiBUaGlzIGJyZWFrcyB0aGUgdHlwZSBndWFyYW50ZWUgdGhhdFxuICAgIC8vIGFsbCB2YWx1ZXMgaW4gYG8uTGl0ZXJhbEFycmF5RXhwcmAgYXJlIG9mIHR5cGUgYG8uRXhwcmVzc2lvbmAuXG4gICAgLy8gU2VlIHRlc3QgY2FzZSBpbiBgdmFsdWVfdXRpbF9zcGVjLnRzYC5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgdmFsdWVzLnB1c2godmlzaXRWYWx1ZShhcnJbaV0sIHRoaXMsIG51bGwgLyogY29udGV4dCAqLykpO1xuICAgIH1cbiAgICByZXR1cm4gby5saXRlcmFsQXJyKHZhbHVlcywgdHlwZSk7XG4gIH1cblxuICB2aXNpdFN0cmluZ01hcChtYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9LCB0eXBlOiBvLk1hcFR5cGUpOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGVudHJpZXM6IG8uTGl0ZXJhbE1hcEVudHJ5W10gPSBbXTtcbiAgICBjb25zdCBxdW90ZWRTZXQgPSBuZXcgU2V0PHN0cmluZz4obWFwICYmIG1hcFtRVU9URURfS0VZU10pO1xuICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgZW50cmllcy5wdXNoKFxuICAgICAgICAgIG5ldyBvLkxpdGVyYWxNYXBFbnRyeShrZXksIHZpc2l0VmFsdWUobWFwW2tleV0sIHRoaXMsIG51bGwpLCBxdW90ZWRTZXQuaGFzKGtleSkpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IG8uTGl0ZXJhbE1hcEV4cHIoZW50cmllcywgdHlwZSk7XG4gIH1cblxuICB2aXNpdFByaW1pdGl2ZSh2YWx1ZTogYW55LCB0eXBlOiBvLlR5cGUpOiBvLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiBvLmxpdGVyYWwodmFsdWUsIHR5cGUpO1xuICB9XG5cbiAgdmlzaXRPdGhlcih2YWx1ZTogYW55LCB0eXBlOiBvLlR5cGUpOiBvLkV4cHJlc3Npb24ge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG8uRXhwcmVzc2lvbikge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jdHguaW1wb3J0RXhwcih2YWx1ZSk7XG4gICAgfVxuICB9XG59XG4iXX0=