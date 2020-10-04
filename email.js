const constants = require('./constants');
const util = require('./util');

const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

module.exports = {

    fetchAllMails(email_settings, from, firstname, lastname) {

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
                    this.fetchMailsFrom(email_settings, email, "")
                        .then(mails => promises[email].resolve(mails))
                        .catch(error => promises[email].resolve(error));
                });

                // fetch mails from booking.com that have their first and last name in the subject
                if (hasBookingCom) {
                    promises[bookingComEmail] = util.generateDeferredPromise();
                    this.fetchMailsFrom(email_settings, bookingComEmail, `${firstname} ${lastname}`)
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
    fetchMailsFrom(email_settings, from, subject) {
        console.log("fetching mails");

        return new Promise((resolve, reject) => {


            if (!email_settings.user ||
                !email_settings.password ||
                !email_settings.host ||
                !email_settings.port ||
                typeof email_settings.tls === 'undefined') {
                reject("incomplete login data");
                return;
            }

            if (from === "") {
                resolve({
                    mails: []
                });
                return;
            }

            const imap = new Imap(email_settings);

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