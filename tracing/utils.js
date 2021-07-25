const log = console.log.bind(console);
// const log = {};
log.e = console.error.bind(console, "E");
log.w = console.warn.bind(console, "W");
log.i = console.info.bind(console, "I");
log.d = console.debug.bind(console, "D");
log.v = console.log.bind(console, "V");
const noop = () => { };
// log.d = noop;
log.v = noop;
global.log = log;

function delay(seconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds);
    });
}

class StdIn {
    constructor() {
        var readline = require('readline');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
    }
    getline = () => new Promise((resolve, reject) => {
        this.rl.once('line', resolve);
    });
    destroy() {
        this.rl.close();
    }
}

module.exports = { delay, StdIn };