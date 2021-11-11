"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTargetOptions = void 0;
const workspace_1 = require("@nrwl/tao/src/shared/workspace");
const params_1 = require("@nrwl/tao/src/shared/params");
/**
 * Reads and combines options for a given target.
 *
 * Works as if you invoked the target yourself without passing any command lint overrides.
 */
function readTargetOptions({ project, target, configuration }, context) {
    const projectConfiguration = context.workspace.projects[project];
    const targetConfiguration = projectConfiguration.targets[target];
    const ws = new workspace_1.Workspaces(context.root);
    const [nodeModule, executorName] = targetConfiguration.executor.split(':');
    const { schema } = ws.readExecutor(nodeModule, executorName);
    const defaultProject = ws.calculateDefaultProjectName(context.cwd, context.workspace);
    return params_1.combineOptionsForExecutor({}, configuration !== null && configuration !== void 0 ? configuration : '', targetConfiguration, schema, defaultProject, ws.relativeCwd(context.cwd));
}
exports.readTargetOptions = readTargetOptions;
//# sourceMappingURL=read-target-options.js.map