function logInfo(message, context = {}) {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, context }));
}
function logError(message, error, context = {}) {
    console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message, error: error?.message || error, stack: error?.stack, context }));
}
module.exports = { logInfo, logError };
