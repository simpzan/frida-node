function log() {
    const args = [];
    for (const arg of arguments) {
        args.push(JSON.stringify(arg));
    }
    console.log('tracee.js', ...args);
}
log(`js runtime ${Script.runtime}`);

const cm = new CModule(`
#include <glib.h>
int64_t getTimeMicrosecond() { return g_get_real_time(); }
`);
const getTimeMicrosecond = new NativeFunction(cm.getTimeMicrosecond, 'long', []);

let events = [];
function flushEvents() {
    const count = events.length;
    if (count == 0) return;

    log(`Flushing ${count} events...`);
    // send({ type:'events', events });
    events = [];
}
function handleEvent(fn, ph, tid) {
    const pid = Process.id;
    const addr = fn.address;
    const ts = getTimeMicrosecond();
    const event = { ph, tid, pid, addr, ts };
    log(event);
    events.push(event);
}
function getFunctionsOfModule(libName) {
    const module = Process.getModuleByName(libName);
    const functions = module.enumerateSymbols().filter(s => {
        return s.type === 'function' && s.size > 10;
    });
    const map = new Map();
    for (const fn of functions) {
        const existing = map.get(fn.address);
        if (existing) log(`conflict ${existing} and ${fn}`);
        else map.set(fn.address, fn);
    }
    return functions;
}
function traceLib(libName) {
    let functions = getFunctionsOfModule(libName);
    // log(functions[45], functions[215]);
    // functions = functions.slice(46, 216);
    log(`found ${functions.length} functions from ${libName}.`);

    // send({ type: 'functions', functions });

    functions.forEach((fn, idx) => {
        const cb = {
            onEnter: function(args) {
                handleEvent(fn, 'B', this.threadId);
            },
            onLeave: function(retval) {
                handleEvent(fn, 'E', this.threadId);
            }
        };
        try {
            Interceptor.attach(fn.address, cb);
        } catch (error) {
            log(`failed to attach ${idx} ${JSON.stringify(fn)}, ${error}`);
        }
    });
    log('tracing started.');
}

class Tracer {
    constructor(libName) {
        this.libName = libName;
    }
    start() {
        log(`start tracing ${this.libName}`);
        traceLib(this.libName);
        this.timerId = setInterval(flushEvents, 1000);
    }
    stop() {
        clearInterval(this.timerId);
        flushEvents();
        log(`stop tracing ${this.libName}`);
    }
}

let tracer = null;
rpc.exports = {
    startTracing(libName) {
        tracer = new Tracer(libName);
        tracer.start();
    },
    stopTracing() {
        tracer.stop();
        tracer = null;
    }
};

function test() {
    const libName = "libui.so";
    const tracer = new Tracer(libName);
    tracer.start();
    setTimeout(() => tracer.stop(), 40000);
}
test()