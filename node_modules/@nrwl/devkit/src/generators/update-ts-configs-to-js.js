"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTsConfigsToJs = void 0;
const json_1 = require("../utils/json");
function updateTsConfigsToJs(host, options) {
    let updateConfigPath;
    const paths = {
        tsConfig: `${options.projectRoot}/tsconfig.json`,
        tsConfigLib: `${options.projectRoot}/tsconfig.lib.json`,
        tsConfigApp: `${options.projectRoot}/tsconfig.app.json`,
    };
    const getProjectType = (tree) => {
        if (tree.exists(paths.tsConfigApp)) {
            return 'application';
        }
        if (tree.exists(paths.tsConfigLib)) {
            return 'library';
        }
        throw new Error(`project is missing tsconfig.lib.json or tsconfig.app.json`);
    };
    json_1.updateJson(host, paths.tsConfig, (json) => {
        if (json.compilerOptions) {
            json.compilerOptions.allowJs = true;
        }
        else {
            json.compilerOptions = { allowJs: true };
        }
        return json;
    });
    const projectType = getProjectType(host);
    if (projectType === 'library') {
        updateConfigPath = paths.tsConfigLib;
    }
    if (projectType === 'application') {
        updateConfigPath = paths.tsConfigApp;
    }
    json_1.updateJson(host, updateConfigPath, (json) => {
        json.include = uniq([...json.include, '**/*.js']);
        json.exclude = uniq([...json.exclude, '**/*.spec.js']);
        return json;
    });
}
exports.updateTsConfigsToJs = updateTsConfigsToJs;
const uniq = (value) => [...new Set(value)];
//# sourceMappingURL=update-ts-configs-to-js.js.map