(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler/src/render3/view/i18n/localize_utils", ["require", "exports", "@angular/compiler/src/output/output_ast", "@angular/compiler/src/parse_util", "@angular/compiler/src/render3/view/i18n/icu_serializer", "@angular/compiler/src/render3/view/i18n/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serializeI18nMessageForLocalize = exports.createLocalizeStatements = void 0;
    var o = require("@angular/compiler/src/output/output_ast");
    var parse_util_1 = require("@angular/compiler/src/parse_util");
    var icu_serializer_1 = require("@angular/compiler/src/render3/view/i18n/icu_serializer");
    var util_1 = require("@angular/compiler/src/render3/view/i18n/util");
    function createLocalizeStatements(variable, message, params) {
        var _a = serializeI18nMessageForLocalize(message), messageParts = _a.messageParts, placeHolders = _a.placeHolders;
        var sourceSpan = getSourceSpan(message);
        var expressions = placeHolders.map(function (ph) { return params[ph.text]; });
        var localizedString = o.localizedString(message, messageParts, placeHolders, expressions, sourceSpan);
        var variableInitialization = variable.set(localizedString);
        return [new o.ExpressionStatement(variableInitialization)];
    }
    exports.createLocalizeStatements = createLocalizeStatements;
    /**
     * This visitor walks over an i18n tree, capturing literal strings and placeholders.
     *
     * The result can be used for generating the `$localize` tagged template literals.
     */
    var LocalizeSerializerVisitor = /** @class */ (function () {
        function LocalizeSerializerVisitor() {
        }
        LocalizeSerializerVisitor.prototype.visitText = function (text, context) {
            if (context[context.length - 1] instanceof o.LiteralPiece) {
                // Two literal pieces in a row means that there was some comment node in-between.
                context[context.length - 1].text += text.value;
            }
            else {
                var sourceSpan = new parse_util_1.ParseSourceSpan(text.sourceSpan.fullStart, text.sourceSpan.end, text.sourceSpan.fullStart, text.sourceSpan.details);
                context.push(new o.LiteralPiece(text.value, sourceSpan));
            }
        };
        LocalizeSerializerVisitor.prototype.visitContainer = function (container, context) {
            var _this = this;
            container.children.forEach(function (child) { return child.visit(_this, context); });
        };
        LocalizeSerializerVisitor.prototype.visitIcu = function (icu, context) {
            context.push(new o.LiteralPiece(icu_serializer_1.serializeIcuNode(icu), icu.sourceSpan));
        };
        LocalizeSerializerVisitor.prototype.visitTagPlaceholder = function (ph, context) {
            var _this = this;
            var _a, _b;
            context.push(this.createPlaceholderPiece(ph.startName, (_a = ph.startSourceSpan) !== null && _a !== void 0 ? _a : ph.sourceSpan));
            if (!ph.isVoid) {
                ph.children.forEach(function (child) { return child.visit(_this, context); });
                context.push(this.createPlaceholderPiece(ph.closeName, (_b = ph.endSourceSpan) !== null && _b !== void 0 ? _b : ph.sourceSpan));
            }
        };
        LocalizeSerializerVisitor.prototype.visitPlaceholder = function (ph, context) {
            context.push(this.createPlaceholderPiece(ph.name, ph.sourceSpan));
        };
        LocalizeSerializerVisitor.prototype.visitIcuPlaceholder = function (ph, context) {
            context.push(this.createPlaceholderPiece(ph.name, ph.sourceSpan));
        };
        LocalizeSerializerVisitor.prototype.createPlaceholderPiece = function (name, sourceSpan) {
            return new o.PlaceholderPiece(util_1.formatI18nPlaceholderName(name, /* useCamelCase */ false), sourceSpan);
        };
        return LocalizeSerializerVisitor;
    }());
    var serializerVisitor = new LocalizeSerializerVisitor();
    /**
     * Serialize an i18n message into two arrays: messageParts and placeholders.
     *
     * These arrays will be used to generate `$localize` tagged template literals.
     *
     * @param message The message to be serialized.
     * @returns an object containing the messageParts and placeholders.
     */
    function serializeI18nMessageForLocalize(message) {
        var pieces = [];
        message.nodes.forEach(function (node) { return node.visit(serializerVisitor, pieces); });
        return processMessagePieces(pieces);
    }
    exports.serializeI18nMessageForLocalize = serializeI18nMessageForLocalize;
    function getSourceSpan(message) {
        var startNode = message.nodes[0];
        var endNode = message.nodes[message.nodes.length - 1];
        return new parse_util_1.ParseSourceSpan(startNode.sourceSpan.fullStart, endNode.sourceSpan.end, startNode.sourceSpan.fullStart, startNode.sourceSpan.details);
    }
    /**
     * Convert the list of serialized MessagePieces into two arrays.
     *
     * One contains the literal string pieces and the other the placeholders that will be replaced by
     * expressions when rendering `$localize` tagged template literals.
     *
     * @param pieces The pieces to process.
     * @returns an object containing the messageParts and placeholders.
     */
    function processMessagePieces(pieces) {
        var messageParts = [];
        var placeHolders = [];
        if (pieces[0] instanceof o.PlaceholderPiece) {
            // The first piece was a placeholder so we need to add an initial empty message part.
            messageParts.push(createEmptyMessagePart(pieces[0].sourceSpan.start));
        }
        for (var i = 0; i < pieces.length; i++) {
            var part = pieces[i];
            if (part instanceof o.LiteralPiece) {
                messageParts.push(part);
            }
            else {
                placeHolders.push(part);
                if (pieces[i - 1] instanceof o.PlaceholderPiece) {
                    // There were two placeholders in a row, so we need to add an empty message part.
                    messageParts.push(createEmptyMessagePart(pieces[i - 1].sourceSpan.end));
                }
            }
        }
        if (pieces[pieces.length - 1] instanceof o.PlaceholderPiece) {
            // The last piece was a placeholder so we need to add a final empty message part.
            messageParts.push(createEmptyMessagePart(pieces[pieces.length - 1].sourceSpan.end));
        }
        return { messageParts: messageParts, placeHolders: placeHolders };
    }
    function createEmptyMessagePart(location) {
        return new o.LiteralPiece('', new parse_util_1.ParseSourceSpan(location, location));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemVfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci9zcmMvcmVuZGVyMy92aWV3L2kxOG4vbG9jYWxpemVfdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBUUEsMkRBQWdEO0lBQ2hELCtEQUFtRTtJQUVuRSx5RkFBa0Q7SUFDbEQscUVBQWlEO0lBRWpELFNBQWdCLHdCQUF3QixDQUNwQyxRQUF1QixFQUFFLE9BQXFCLEVBQzlDLE1BQXNDO1FBQ2xDLElBQUEsS0FBK0IsK0JBQStCLENBQUMsT0FBTyxDQUFDLEVBQXRFLFlBQVksa0JBQUEsRUFBRSxZQUFZLGtCQUE0QyxDQUFDO1FBQzlFLElBQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxJQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQztRQUM1RCxJQUFNLGVBQWUsR0FDakIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEYsSUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzdELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQVZELDREQVVDO0lBRUQ7Ozs7T0FJRztJQUNIO1FBQUE7UUF5Q0EsQ0FBQztRQXhDQyw2Q0FBUyxHQUFULFVBQVUsSUFBZSxFQUFFLE9BQXlCO1lBQ2xELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLFlBQVks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SSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLElBQUksWUFBWSxDQUFDLENBQUMsWUFBWSxFQUFFO2dCQUNsQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pCO2lCQUFNO2dCQUNMLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsZ0JBQWdCLEVBQUU7b0JBQy9DLGlGQUFpRjtvQkFDakYsWUFBWSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUN6RTthQUNGO1NBQ0Y7UUFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzRCxpRkFBaUY7WUFDakYsWUFBWSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNyRjtRQUNELE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxZQUFZLGNBQUEsRUFBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQXVCO1FBQ3JELE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxJQUFJLDRCQUFlLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDekUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgaTE4biBmcm9tICcuLi8uLi8uLi9pMThuL2kxOG5fYXN0JztcbmltcG9ydCAqIGFzIG8gZnJvbSAnLi4vLi4vLi4vb3V0cHV0L291dHB1dF9hc3QnO1xuaW1wb3J0IHtQYXJzZUxvY2F0aW9uLCBQYXJzZVNvdXJjZVNwYW59IGZyb20gJy4uLy4uLy4uL3BhcnNlX3V0aWwnO1xuXG5pbXBvcnQge3NlcmlhbGl6ZUljdU5vZGV9IGZyb20gJy4vaWN1X3NlcmlhbGl6ZXInO1xuaW1wb3J0IHtmb3JtYXRJMThuUGxhY2Vob2xkZXJOYW1lfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYWxpemVTdGF0ZW1lbnRzKFxuICAgIHZhcmlhYmxlOiBvLlJlYWRWYXJFeHByLCBtZXNzYWdlOiBpMThuLk1lc3NhZ2UsXG4gICAgcGFyYW1zOiB7W25hbWU6IHN0cmluZ106IG8uRXhwcmVzc2lvbn0pOiBvLlN0YXRlbWVudFtdIHtcbiAgY29uc3Qge21lc3NhZ2VQYXJ0cywgcGxhY2VIb2xkZXJzfSA9IHNlcmlhbGl6ZUkxOG5NZXNzYWdlRm9yTG9jYWxpemUobWVzc2FnZSk7XG4gIGNvbnN0IHNvdXJjZVNwYW4gPSBnZXRTb3VyY2VTcGFuKG1lc3NhZ2UpO1xuICBjb25zdCBleHByZXNzaW9ucyA9IHBsYWNlSG9sZGVycy5tYXAocGggPT4gcGFyYW1zW3BoLnRleHRdKTtcbiAgY29uc3QgbG9jYWxpemVkU3RyaW5nID1cbiAgICAgIG8ubG9jYWxpemVkU3RyaW5nKG1lc3NhZ2UsIG1lc3NhZ2VQYXJ0cywgcGxhY2VIb2xkZXJzLCBleHByZXNzaW9ucywgc291cmNlU3Bhbik7XG4gIGNvbnN0IHZhcmlhYmxlSW5pdGlhbGl6YXRpb24gPSB2YXJpYWJsZS5zZXQobG9jYWxpemVkU3RyaW5nKTtcbiAgcmV0dXJuIFtuZXcgby5FeHByZXNzaW9uU3RhdGVtZW50KHZhcmlhYmxlSW5pdGlhbGl6YXRpb24pXTtcbn1cblxuLyoqXG4gKiBUaGlzIHZpc2l0b3Igd2Fsa3Mgb3ZlciBhbiBpMThuIHRyZWUsIGNhcHR1cmluZyBsaXRlcmFsIHN0cmluZ3MgYW5kIHBsYWNlaG9sZGVycy5cbiAqXG4gKiBUaGUgcmVzdWx0IGNhbiBiZSB1c2VkIGZvciBnZW5lcmF0aW5nIHRoZSBgJGxvY2FsaXplYCB0YWdnZWQgdGVtcGxhdGUgbGl0ZXJhbHMuXG4gKi9cbmNsYXNzIExvY2FsaXplU2VyaWFsaXplclZpc2l0b3IgaW1wbGVtZW50cyBpMThuLlZpc2l0b3Ige1xuICB2aXNpdFRleHQodGV4dDogaTE4bi5UZXh0LCBjb250ZXh0OiBvLk1lc3NhZ2VQaWVjZVtdKTogYW55IHtcbiAgICBpZiAoY29udGV4dFtjb250ZXh0Lmxlbmd0aCAtIDFdIGluc3RhbmNlb2Ygby5MaXRlcmFsUGllY2UpIHtcbiAgICAgIC8vIFR3byBsaXRlcmFsIHBpZWNlcyBpbiBhIHJvdyBtZWFucyB0aGF0IHRoZXJlIHdhcyBzb21lIGNvbW1lbnQgbm9kZSBpbi1iZXR3ZWVuLlxuICAgICAgY29udGV4dFtjb250ZXh0Lmxlbmd0aCAtIDFdLnRleHQgKz0gdGV4dC52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc291cmNlU3BhbiA9IG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICAgICAgdGV4dC5zb3VyY2VTcGFuLmZ1bGxTdGFydCwgdGV4dC5zb3VyY2VTcGFuLmVuZCwgdGV4dC5zb3VyY2VTcGFuLmZ1bGxTdGFydCxcbiAgICAgICAgICB0ZXh0LnNvdXJjZVNwYW4uZGV0YWlscyk7XG4gICAgICBjb250ZXh0LnB1c2gobmV3IG8uTGl0ZXJhbFBpZWNlKHRleHQudmFsdWUsIHNvdXJjZVNwYW4pKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbnRhaW5lcihjb250YWluZXI6IGkxOG4uQ29udGFpbmVyLCBjb250ZXh0OiBvLk1lc3NhZ2VQaWVjZVtdKTogYW55IHtcbiAgICBjb250YWluZXIuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiBjaGlsZC52aXNpdCh0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEljdShpY3U6IGkxOG4uSWN1LCBjb250ZXh0OiBvLk1lc3NhZ2VQaWVjZVtdKTogYW55IHtcbiAgICBjb250ZXh0LnB1c2gobmV3IG8uTGl0ZXJhbFBpZWNlKHNlcmlhbGl6ZUljdU5vZGUoaWN1KSwgaWN1LnNvdXJjZVNwYW4pKTtcbiAgfVxuXG4gIHZpc2l0VGFnUGxhY2Vob2xkZXIocGg6IGkxOG4uVGFnUGxhY2Vob2xkZXIsIGNvbnRleHQ6IG8uTWVzc2FnZVBpZWNlW10pOiBhbnkge1xuICAgIGNvbnRleHQucHVzaCh0aGlzLmNyZWF0ZVBsYWNlaG9sZGVyUGllY2UocGguc3RhcnROYW1lLCBwaC5zdGFydFNvdXJjZVNwYW4gPz8gcGguc291cmNlU3BhbikpO1xuICAgIGlmICghcGguaXNWb2lkKSB7XG4gICAgICBwaC5jaGlsZHJlbi5mb3JFYWNoKGNoaWxkID0+IGNoaWxkLnZpc2l0KHRoaXMsIGNvbnRleHQpKTtcbiAgICAgIGNvbnRleHQucHVzaCh0aGlzLmNyZWF0ZVBsYWNlaG9sZGVyUGllY2UocGguY2xvc2VOYW1lLCBwaC5lbmRTb3VyY2VTcGFuID8/IHBoLnNvdXJjZVNwYW4pKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdFBsYWNlaG9sZGVyKHBoOiBpMThuLlBsYWNlaG9sZGVyLCBjb250ZXh0OiBvLk1lc3NhZ2VQaWVjZVtdKTogYW55IHtcbiAgICBjb250ZXh0LnB1c2godGhpcy5jcmVhdGVQbGFjZWhvbGRlclBpZWNlKHBoLm5hbWUsIHBoLnNvdXJjZVNwYW4pKTtcbiAgfVxuXG4gIHZpc2l0SWN1UGxhY2Vob2xkZXIocGg6IGkxOG4uSWN1UGxhY2Vob2xkZXIsIGNvbnRleHQ/OiBhbnkpOiBhbnkge1xuICAgIGNvbnRleHQucHVzaCh0aGlzLmNyZWF0ZVBsYWNlaG9sZGVyUGllY2UocGgubmFtZSwgcGguc291cmNlU3BhbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVQbGFjZWhvbGRlclBpZWNlKG5hbWU6IHN0cmluZywgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuKTogby5QbGFjZWhvbGRlclBpZWNlIHtcbiAgICByZXR1cm4gbmV3IG8uUGxhY2Vob2xkZXJQaWVjZShcbiAgICAgICAgZm9ybWF0STE4blBsYWNlaG9sZGVyTmFtZShuYW1lLCAvKiB1c2VDYW1lbENhc2UgKi8gZmFsc2UpLCBzb3VyY2VTcGFuKTtcbiAgfVxufVxuXG5jb25zdCBzZXJpYWxpemVyVmlzaXRvciA9IG5ldyBMb2NhbGl6ZVNlcmlhbGl6ZXJWaXNpdG9yKCk7XG5cbi8qKlxuICogU2VyaWFsaXplIGFuIGkxOG4gbWVzc2FnZSBpbnRvIHR3byBhcnJheXM6IG1lc3NhZ2VQYXJ0cyBhbmQgcGxhY2Vob2xkZXJzLlxuICpcbiAqIFRoZXNlIGFycmF5cyB3aWxsIGJlIHVzZWQgdG8gZ2VuZXJhdGUgYCRsb2NhbGl6ZWAgdGFnZ2VkIHRlbXBsYXRlIGxpdGVyYWxzLlxuICpcbiAqIEBwYXJhbSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGJlIHNlcmlhbGl6ZWQuXG4gKiBAcmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgbWVzc2FnZVBhcnRzIGFuZCBwbGFjZWhvbGRlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVJMThuTWVzc2FnZUZvckxvY2FsaXplKG1lc3NhZ2U6IGkxOG4uTWVzc2FnZSk6XG4gICAge21lc3NhZ2VQYXJ0czogby5MaXRlcmFsUGllY2VbXSwgcGxhY2VIb2xkZXJzOiBvLlBsYWNlaG9sZGVyUGllY2VbXX0ge1xuICBjb25zdCBwaWVjZXM6IG8uTWVzc2FnZVBpZWNlW10gPSBbXTtcbiAgbWVzc2FnZS5ub2Rlcy5mb3JFYWNoKG5vZGUgPT4gbm9kZS52aXNpdChzZXJpYWxpemVyVmlzaXRvciwgcGllY2VzKSk7XG4gIHJldHVybiBwcm9jZXNzTWVzc2FnZVBpZWNlcyhwaWVjZXMpO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VTcGFuKG1lc3NhZ2U6IGkxOG4uTWVzc2FnZSk6IFBhcnNlU291cmNlU3BhbiB7XG4gIGNvbnN0IHN0YXJ0Tm9kZSA9IG1lc3NhZ2Uubm9kZXNbMF07XG4gIGNvbnN0IGVuZE5vZGUgPSBtZXNzYWdlLm5vZGVzW21lc3NhZ2Uubm9kZXMubGVuZ3RoIC0gMV07XG4gIHJldHVybiBuZXcgUGFyc2VTb3VyY2VTcGFuKFxuICAgICAgc3RhcnROb2RlLnNvdXJjZVNwYW4uZnVsbFN0YXJ0LCBlbmROb2RlLnNvdXJjZVNwYW4uZW5kLCBzdGFydE5vZGUuc291cmNlU3Bhbi5mdWxsU3RhcnQsXG4gICAgICBzdGFydE5vZGUuc291cmNlU3Bhbi5kZXRhaWxzKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBsaXN0IG9mIHNlcmlhbGl6ZWQgTWVzc2FnZVBpZWNlcyBpbnRvIHR3byBhcnJheXMuXG4gKlxuICogT25lIGNvbnRhaW5zIHRoZSBsaXRlcmFsIHN0cmluZyBwaWVjZXMgYW5kIHRoZSBvdGhlciB0aGUgcGxhY2Vob2xkZXJzIHRoYXQgd2lsbCBiZSByZXBsYWNlZCBieVxuICogZXhwcmVzc2lvbnMgd2hlbiByZW5kZXJpbmcgYCRsb2NhbGl6ZWAgdGFnZ2VkIHRlbXBsYXRlIGxpdGVyYWxzLlxuICpcbiAqIEBwYXJhbSBwaWVjZXMgVGhlIHBpZWNlcyB0byBwcm9jZXNzLlxuICogQHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1lc3NhZ2VQYXJ0cyBhbmQgcGxhY2Vob2xkZXJzLlxuICovXG5mdW5jdGlvbiBwcm9jZXNzTWVzc2FnZVBpZWNlcyhwaWVjZXM6IG8uTWVzc2FnZVBpZWNlW10pOlxuICAgIHttZXNzYWdlUGFydHM6IG8uTGl0ZXJhbFBpZWNlW10sIHBsYWNlSG9sZGVyczogby5QbGFjZWhvbGRlclBpZWNlW119IHtcbiAgY29uc3QgbWVzc2FnZVBhcnRzOiBvLkxpdGVyYWxQaWVjZVtdID0gW107XG4gIGNvbnN0IHBsYWNlSG9sZGVyczogby5QbGFjZWhvbGRlclBpZWNlW10gPSBbXTtcblxuICBpZiAocGllY2VzWzBdIGluc3RhbmNlb2Ygby5QbGFjZWhvbGRlclBpZWNlKSB7XG4gICAgLy8gVGhlIGZpcnN0IHBpZWNlIHdhcyBhIHBsYWNlaG9sZGVyIHNvIHdlIG5lZWQgdG8gYWRkIGFuIGluaXRpYWwgZW1wdHkgbWVzc2FnZSBwYXJ0LlxuICAgIG1lc3NhZ2VQYXJ0cy5wdXNoKGNyZWF0ZUVtcHR5TWVzc2FnZVBhcnQocGllY2VzWzBdLnNvdXJjZVNwYW4uc3RhcnQpKTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGllY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcGFydCA9IHBpZWNlc1tpXTtcbiAgICBpZiAocGFydCBpbnN0YW5jZW9mIG8uTGl0ZXJhbFBpZWNlKSB7XG4gICAgICBtZXNzYWdlUGFydHMucHVzaChwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGxhY2VIb2xkZXJzLnB1c2gocGFydCk7XG4gICAgICBpZiAocGllY2VzW2kgLSAxXSBpbnN0YW5jZW9mIG8uUGxhY2Vob2xkZXJQaWVjZSkge1xuICAgICAgICAvLyBUaGVyZSB3ZXJlIHR3byBwbGFjZWhvbGRlcnMgaW4gYSByb3csIHNvIHdlIG5lZWQgdG8gYWRkIGFuIGVtcHR5IG1lc3NhZ2UgcGFydC5cbiAgICAgICAgbWVzc2FnZVBhcnRzLnB1c2goY3JlYXRlRW1wdHlNZXNzYWdlUGFydChwaWVjZXNbaSAtIDFdLnNvdXJjZVNwYW4uZW5kKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChwaWVjZXNbcGllY2VzLmxlbmd0aCAtIDFdIGluc3RhbmNlb2Ygby5QbGFjZWhvbGRlclBpZWNlKSB7XG4gICAgLy8gVGhlIGxhc3QgcGllY2Ugd2FzIGEgcGxhY2Vob2xkZXIgc28gd2UgbmVlZCB0byBhZGQgYSBmaW5hbCBlbXB0eSBtZXNzYWdlIHBhcnQuXG4gICAgbWVzc2FnZVBhcnRzLnB1c2goY3JlYXRlRW1wdHlNZXNzYWdlUGFydChwaWVjZXNbcGllY2VzLmxlbmd0aCAtIDFdLnNvdXJjZVNwYW4uZW5kKSk7XG4gIH1cbiAgcmV0dXJuIHttZXNzYWdlUGFydHMsIHBsYWNlSG9sZGVyc307XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVtcHR5TWVzc2FnZVBhcnQobG9jYXRpb246IFBhcnNlTG9jYXRpb24pOiBvLkxpdGVyYWxQaWVjZSB7XG4gIHJldHVybiBuZXcgby5MaXRlcmFsUGllY2UoJycsIG5ldyBQYXJzZVNvdXJjZVNwYW4obG9jYXRpb24sIGxvY2F0aW9uKSk7XG59XG4iXX0=