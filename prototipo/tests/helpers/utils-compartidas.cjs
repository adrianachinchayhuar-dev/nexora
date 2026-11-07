// Las páginas cargan assets/js/shared/utils.js antes que cualquier script de rol. Las pruebas ejecutan
// esos scripts en contextos vm aislados; este módulo reproduce esa carga previa cuando el script usa
// window.NexoraUtils y el contexto todavía no la tiene. Basta con requerirlo al inicio de la prueba.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const fuente = fs.readFileSync(path.join(__dirname, '../../assets/js/shared/utils.js'), 'utf8');
const runInContext = vm.runInContext, runInNewContext = vm.runInNewContext;
function preparar(code, context) {
  // Las pruebas fijan «hoy» en el 13 de octubre de 2026; el calendario real es relativo a la fecha de Lima.
  if (typeof code === 'string' && code.includes('window.NexoraData = SEED') && context && context.window && context.window.NEXORA_DEMO_TODAY === undefined) context.window.NEXORA_DEMO_TODAY = '2026-10-13';
  if (typeof code === 'string' && code.includes('window.NexoraUtils') && context && context.window && !context.window.NexoraUtils) runInContext.call(vm, fuente, context);
}
if (!vm.runInContext.nexoraUtils) {
  vm.runInContext = function (code, context, ...rest) { preparar(code, context); return runInContext.call(vm, code, context, ...rest); };
  vm.runInNewContext = function (code, context = {}, ...rest) {
    if (!vm.isContext(context)) vm.createContext(context);
    preparar(code, context);
    return runInContext.call(vm, code, context, ...rest);
  };
  vm.runInContext.nexoraUtils = true;
}
