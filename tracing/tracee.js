function log() {
    const args = [];
    for (const arg of arguments) {
        args.push(JSON.stringify(arg));
    }
    console.log('tracee.js', ...args);
}

let events = [];
function flushEvents() {
    const count = events.length;
    if (count == 0) return;

    log(`Flushing ${count} events...`);
    send({ type:'events', events });
    events = [];
}
function handleEvent(fn, ph, tid) {
    const pid = Process.id;
    const addr = fn.address;
    const ts = Date.now();
    const event = { ph, tid, pid, addr, ts };
    // log(event);
    events.push(event);
}
function getFunctionsOfModule(libName) {
    const module = Process.getModuleByName(libName);
    const functions = module.enumerateSymbols().filter(s => {
        return s.type === 'function' && s.size > 4;
    });
    return functions;
}
function traceLib(libName) {
    const functions = getFunctionsOfModule(libName);
    log(`found ${functions.length} functions from ${libName}.`);
    send({ type: 'functions', functions });

    for (const fn of functions) {
        Interceptor.attach(fn.address, {
            onEnter: function(args) {
                handleEvent(fn, 'B', this.threadId);
            },
            onLeave: function(retval) {
                handleEvent(fn, 'E', this.threadId);
            }
        });
    }
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
recv(function onMessage(msg) {
    if (msg.type === 'startTracing') {
        const libName = msg.libName;
        tracer = new Tracer(libName);
        tracer.start();
    } else if (msg.type === 'stopTracing') {
        tracer.stop();
        tracer = null;
    } else {
        log(`unkown msg ${msg}`);
    }
});

function test() {
    const libName = "libnative-lib.so";
    const tracer = new Tracer(libName);
    tracer.start();
    setTimeout(() => tracer.stop(), 4000);
}
