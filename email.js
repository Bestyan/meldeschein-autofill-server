const constants = require('./constants');

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;


function generateDeferredPromise() {
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

module.exports = {

    /**
     * fetches all mails received from the given address
     * @param {string} from
     */
    fetchMails(email_settings, from) {

        return new Promise((resolve, reject) => {

            if (!email_settings.user ||
                !email_settings.password ||
                !email_settings.host ||
                !email_settings.port ||
                typeof email_settings.tls === 'undefined') {
                reject("incomplete login data");
                return;
            }

            const imap = new Imap(email_settings);

            imap.once('ready', () => {
                imap.openBox('INBOX', true, (error, box) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    imap.seq.search([
                        ['FROM', from]
                    ], (error, results) => {

                        if (error) {
                            reject(error);
                            return;
                        }

                        if (!results || results.length === 0) {
                            resolve({
                                mails: []
                            });
                            return;
                        }

                        try {
                            // results is an array of the sequence numbers
                            // create a dictionary that maps the sequence number to a deferred promise
                            const deferredPromises = results.reduce((map, _) => {
                                map[_] = generateDeferredPromise();
                                return map;
                            }, {});

                            // fetch only the mails matching the sequence numbers returned by the search
                            const fetch = imap.seq.fetch(results, {
                                bodies: ''
                            });

                            fetch.on('message', (msg, sequence_number) => {
                                msg.on('body', (stream, info) => {
                                    // resolve the promise belonging to the sequence number when parsed
                                    simpleParser(stream)
                                        .then(parsedMail => deferredPromises[sequence_number].resolve(parsedMail))
                                        .catch(error => deferredPromises[sequence_number].resolve(error));
                                });
                            });

                            fetch.once('error', error => {
                                reject(error);
                                return;
                            });

                            fetch.once('end', () => {
                                imap.end();
                            });

                            // wait for all mails to be parsed, then trigger callback
                            Promise.all(
                                    Object.values(deferredPromises).map(deferred => deferred.promise)
                                )
                                .then(mails => resolve({
                                    mails: mails
                                }));
                        } catch (exception) {
                            reject(exception);
                        } finally{
                            imap.destroy();
                        }
                    });
                });
            });

            imap.once('error', error => {
                reject(error);
                imap.destroy();
                return;
            });

            imap.connect();

        });

    },

    /**
     * Tries to login with given settings
     * @param {*} settings 
     * @param {function} callback 
     */
    testConnection(settings) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(settings);

            imap.once('ready', () => {
                resolve({
                    message: "Connection successful"
                });
                imap.end();
            });

            imap.once('error', error => {
                reject(error);
                imap.destroy();
            });

            imap.connect();
        });
    }
};