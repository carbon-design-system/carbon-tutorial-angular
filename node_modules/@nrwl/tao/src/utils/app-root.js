"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.appRootPath = void 0;
const path = require("path");
const fs_1 = require("fs");
exports.appRootPath = pathInner(__dirname);
function pathInner(dir) {
    if (process.env.NX_WORKSPACE_ROOT_PATH)
        return process.env.NX_WORKSPACE_ROOT_PATH;
    if (path.dirname(dir) === dir)
        return process.cwd();
    if (fileExists(path.join(dir, 'workspace.json')) ||
        fileExists(path.join(dir, 'angular.json'))) {
        return dir;
    }
    else {
        return pathInner(path.dirname(dir));
    }
}
function fileExists(filePath) {
    try {
        return fs_1.statSync(filePath).isFile();
    }
    catch (err) {
        return false;
    }
}
exports.fileExists = fileExists;
//# sourceMappingURL=app-root.js.map