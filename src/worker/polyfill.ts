// @ts-nocheck
// Polyfill for Babel/SWC async helper to fix "ReferenceError: _async_to_generator is not defined"
// This moves the polyfill to a separate module to ensure it runs BEFORE other imports (like Workbox)
// which might rely on async/await transpilation.

if (typeof self !== 'undefined') {
    self._async_to_generator = function (fn: any) {
        return function (this: any) {
            var gen = fn.apply(this, arguments);
            return new Promise(function (resolve, reject) {
                function step(key: any, arg?: any) {
                    try {
                        var info = gen[key](arg);
                        var value = info.value;
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    if (info.done) {
                        resolve(value);
                    } else {
                        Promise.resolve(value).then(function (value) {
                            step("next", value);
                        }, function (err) {
                            step("throw", err);
                        });
                    }
                }
                step("next");
            });
        };
    };
    console.log('[SW] Async polyfill injected.');
}
