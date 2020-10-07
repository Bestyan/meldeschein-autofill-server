const constants = require('./constants');
const util = require('./util');

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

module.exports = {

    fetchAllMails(emailSettings, from, firstname, lastname) {

        return new Promise((resolve, reject) => {

            try {

                // if the from array includes a booking.com address, add the guest communication domain from booking.com
                const hasBookingCom = from.reduce((hasBookingCom, _) => hasBookingCom || _.includes("booking.com"), false);
                const bookingComEmail = "@mchat.booking.com";

                const promises = from.reduce((promiseMap, _) => {
                    promiseMap[_] = util.generateDeferredPromise();
                    return promiseMap;
                }, {});

                // fetch mails separately
                from.forEach(email => {
                    this.fetchMailsFrom(emailSettings, email, "")
                        .then(mails => promises[email].resolve(mails))
                        .catch(error => promises[email].resolve(error));
                });

                // fetch mails from booking.com that have their first and last name in the subject
                if (hasBookingCom) {
                    promises[bookingComEmail] = util.generateDeferredPromise();
                    this.fetchMailsFrom(emailSettings, bookingComEmail, `${firstname} ${lastname}`)
                        .then(mails => promises[bookingComEmail].resolve(mails))
                        .catch(error => promises[bookingComEmail].resolve(error));
                }

                // wait for all mails to be fetched, then combine the arrays into one
                return Promise.all(
                    Object.values(promises).map(deferred => deferred.promise)
                )
                    .then(mailArrays => {
                        console.log("all mails loaded!");
                        console.log(mailArrays);
                        resolve(
                            {
                                mails: mailArrays.reduce((mails, mailArray) => {
                                    mails.push(...mailArray.mails);
                                    return mails;
                                }, [])
                            }
                        );
                    });

            } catch (exception) {
                reject(exception);
            }

        });

    },

    /**
     * fetches all mails received from the given address
     * @param {string} from
     */
    fetchMailsFrom(emailSettings, from, subject) {
        console.log("fetching mails");

        return new Promise((resolve, reject) => {


            if (!emailSettings.user ||
                !emailSettings.password ||
                !emailSettings.host ||
                !emailSettings.port ||
                typeof emailSettings.tls === 'undefined') {
                reject("incomplete login data");
                return;
            }

            if (from === "") {
                resolve({
                    mails: []
                });
                return;
            }

            const imap = new Imap(emailSettings);

            imap.once('ready', () => {

                console.log("connection successful");

                imap.openBox('INBOX', true, (error, box) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    console.log("inbox opened");
                    imap.seq.search([
                        ['FROM', from],
                        ['SUBJECT', subject]
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

                        console.log("found mails");
                        console.log(results);

                        try {
                            // results is an array of the sequence numbers
                            // create a dictionary that maps the sequence number to a deferred promise
                            const deferredPromises = results.reduce((map, _) => {
                                map[_] = util.generateDeferredPromise();
                                return map;
                            }, {});

                            // fetch only the mails matching the sequence numbers returned by the search
                            const fetch = imap.seq.fetch(results, {
                                bodies: ''
                            });

                            fetch.on('message', (msg, sequence_number) => {
                                // create deferred promises
                                let mailPromise = util.generateDeferredPromise();
                                let uidPromise = util.generateDeferredPromise();

                                // mail body - resolve promise when done
                                msg.on('body', (stream, info) => {
                                    simpleParser(stream)
                                        .then(parsedMail => mailPromise.resolve(parsedMail))
                                });

                                // mail uid - resolve when done
                                msg.once('attributes', function (attrs) {
                                    uidPromise.resolve(attrs.uid);
                                });

                                // resolve the promise belonging to the sequence number when the body and the uid are available
                                Promise.all([mailPromise.promise, uidPromise.promise])
                                    .then(values => {
                                        const mail = values[0];
                                        const uid = values[1];
                                        mail.uid = uid;
                                        deferredPromises[sequence_number].resolve(mail);
                                    })
                                    .catch(error => console.log(error));
                            });

                            fetch.once('error', error => {
                                reject(error);
                                return;
                            });

                            fetch.once('end', () => {
                                imap.end();
                            });

                            // wait for all mails to be parsed, then trigger callback
                            console.log("waiting for mails to be loaded");
                            Promise.all(
                                Object.values(deferredPromises).map(deferred => deferred.promise)
                            )
                                .then(mails => {
                                    console.log("loaded!");
                                    resolve({
                                        mails: mails
                                    });
                                });
                        } catch (exception) {
                            reject(exception);
                            imap.destroy();
                            return;
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

    save(emailSettings, email, folder) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(emailSettings);
            imap.once('ready', function () {
                imap.openBox(folder, false, (error, box) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    imap.append(email);
                })
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
     * move the given mails from one folder to another
     * @param {*} emailSettings 
     * @param {*} mails 
     * @param {*} fromFolder 
     * @param {*} toFolder 
     */
    move(emailSettings, mails, fromFolder, toFolder) {
        return new Promise((resolve, reject) => {

            const imap = new Imap(emailSettings);

            imap.once('ready', () => {

                imap.openBox(fromFolder, false, (error, box) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    // create a promise for each mail
                    const promises = mails.reduce((map, _) => {
                        map[_] = util.generateDeferredPromise();
                        return map;
                    }, {});

                    // move mails
                    mails.forEach(mail => imap.move(mail.uid, toFolder, error => {
                        if (error) {
                            console.log(error);
                            reject(error);
                            return;
                        }
                        promises[mail].resolve();
                    }));

                    // resolve promise when all mails have been moved
                    Promise.all(
                        Object.entries(promises).map(deferred => deferred.promise)
                    ).then(() => resolve());

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
    },

    getFolderNames(settings) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(settings);

            imap.once('ready', () => {
                imap.getBoxes((error, boxes) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(boxes);
                })
            })

            imap.connect();
        });
    }
};