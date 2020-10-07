
module.exports = {

    generateDeferredPromise: function () {
        return (() => {
            let resolve;

            const p = new Promise(res => {
                resolve = res;
            });

            return {
                promise: p,
                resolve
            };
        })();
    }

};