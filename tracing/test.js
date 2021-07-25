const log = console.log.bind(console, "test.js");

const functionName = '_ZNSt6__ndk122__compressed_pair_elemINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE5__repELi0ELb0EE5__getEv';
const symbol = DebugSymbol.fromName(functionName);
log(symbol);

Interceptor.attach(symbol.address, {
    onEnter: function(args) {
        log("B", symbol, this.threadId);
    },
    onLeave: function(retval) {
        log("E", symbol, this.threadId);
    }
});
