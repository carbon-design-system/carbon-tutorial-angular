"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageManagerVersion = exports.getPackageManagerCommand = exports.detectPackageManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Detects which package manager is used in the workspace based on the lock file.
 */
function detectPackageManager(dir = '') {
    return fs_1.existsSync(path_1.join(dir, 'yarn.lock'))
        ? 'yarn'
        : fs_1.existsSync(path_1.join(dir, 'pnpm-lock.yaml'))
            ? 'pnpm'
            : 'npm';
}
exports.detectPackageManager = detectPackageManager;
/**
 * Returns commands for the package manager used in the workspace.
 * By default, the package manager is derived based on the lock file,
 * but it can also be passed in explicitly.
 *
 * Example:
 *
 * ```javascript
 * execSync(`${getPackageManagerCommand().addDev} my-dev-package`);
 * ```
 */
function getPackageManagerCommand(packageManager = detectPackageManager()) {
    const commands = {
        yarn: () => ({
            install: 'yarn',
            add: 'yarn add',
            addDev: 'yarn add -D',
            rm: 'yarn remove',
            exec: 'yarn',
            run: (script, args) => `yarn ${script} ${args}`,
            list: 'yarn list',
        }),
        pnpm: () => ({
            install: 'pnpm install --no-frozen-lockfile',
            add: 'pnpm add',
            addDev: 'pnpm add -D',
            rm: 'pnpm rm',
            exec: 'pnpx',
            run: (script, args) => `pnpm run ${script} -- ${args}`,
            list: 'pnpm ls --depth 100',
        }),
        npm: () => {
            var _a;
            var _b;
            (_a = (_b = process.env).npm_config_legacy_peer_deps) !== null && _a !== void 0 ? _a : (_b.npm_config_legacy_peer_deps = 'true');
            return {
                install: 'npm install',
                add: 'npm install',
                addDev: 'npm install -D',
                rm: 'npm rm',
                exec: 'npx',
                run: (script, args) => `npm run ${script} -- ${args}`,
                list: 'npm ls',
            };
        },
    };
    return commands[packageManager]();
}
exports.getPackageManagerCommand = getPackageManagerCommand;
/**
 * Returns the version of the package manager used in the workspace.
 * By default, the package manager is derived based on the lock file,
 * but it can also be passed in explicitly.
 */
function getPackageManagerVersion(packageManager = detectPackageManager()) {
    return child_process_1.execSync(`${packageManager} --version`).toString('utf-8').trim();
}
exports.getPackageManagerVersion = getPackageManagerVersion;
//# sourceMappingURL=package-manager.js.map