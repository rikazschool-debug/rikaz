const ts = require("typescript");
module.exports = {
  process(source, fileName) {
    return { code: ts.transpileModule(source, {
      fileName,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText };
  },
};
