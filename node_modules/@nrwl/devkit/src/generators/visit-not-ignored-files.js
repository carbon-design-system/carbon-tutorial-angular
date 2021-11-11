"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitNotIgnoredFiles = void 0;
const path_1 = require("path");
const ignore_1 = require("ignore");
/**
 * Utility to act on all files in a tree that are not ignored by git.
 */
function visitNotIgnoredFiles(tree, dirPath = tree.root, visitor) {
    let ig;
    if (tree.exists('.gitignore')) {
        ig = ignore_1.default();
        ig.add(tree.read('.gitignore', 'utf-8'));
    }
    if (dirPath !== '' && (ig === null || ig === void 0 ? void 0 : ig.ignores(dirPath))) {
        return;
    }
    for (const child of tree.children(dirPath)) {
        const fullPath = path_1.join(dirPath, child);
        if (ig === null || ig === void 0 ? void 0 : ig.ignores(fullPath)) {
            continue;
        }
        if (tree.isFile(fullPath)) {
            visitor(fullPath);
        }
        else {
            visitNotIgnoredFiles(tree, fullPath, visitor);
        }
    }
}
exports.visitNotIgnoredFiles = visitNotIgnoredFiles;
//# sourceMappingURL=visit-not-ignored-files.js.map