"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHelp = void 0;
const chalk = require("chalk");
const logger_1 = require("../shared/logger");
function formatOption(name, description) {
    return `  --${`${name}                     `.substr(0, 22)}${chalk.grey(description)}`;
}
function printHelp(header, schema) {
    const allPositional = Object.keys(schema.properties).filter((key) => {
        const p = schema.properties[key];
        return p['$default'] && p['$default']['$source'] === 'argv';
    });
    const positional = allPositional.length > 0 ? ` [${allPositional[0]}]` : '';
    const args = Object.keys(schema.properties)
        .map((name) => {
        const d = schema.properties[name];
        const def = d.default ? ` (default: ${d.default})` : '';
        return formatOption(name, `${d.description}${def}`);
    })
        .join('\n');
    logger_1.logger.info(logger_1.stripIndent(`
${chalk.bold(`${header + positional} [options,...]`)}

${chalk.bold('Options')}:
${args}
${formatOption('skip-nx-cache', 'Skip the use of Nx cache.')}
${formatOption('help', 'Show available options for project target.')}
  `));
}
exports.printHelp = printHelp;
//# sourceMappingURL=print-help.js.map