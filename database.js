const Datastore = require('nedb');

module.exports = {
    firstnames: new Datastore({
        filename: "db/firstnames.db",
        autoload: true
    }),

    init() {
        // auto compaction once a week
        this.firstnames.persistence.setAutocompactionInterval(7 * 24 * 60 * 1000);
        // set index on name
        this.firstnames.ensureIndex({
            fieldName: "name"
        }, error => {
            if (error) console.log(error);
        });

        // initial population from json
        this.firstnames.count({}, (error, number) => {

            if (error) {
                console.log(error);
            }

            if (number === 0) {

                console.log("firstnames is empty. populating ...");

                const initialData = require("./firstnames.json");
                this.firstnames.insert(initialData, (error, documents) => {

                    if (error) {
                        console.log(error);
                    }

                    console.log("populating firstnames complete");

                });
            }

        });
    },

    /**
     * 
     * @param {*} firstname 
     * @param {*} gender 
     */
    addFirstname(firstname, gender) {
        return new Promise((resolve, reject) => {
            if (gender !== 'M' && gender !== 'F') {
                reject("Gender is not 'F' or 'M'");
                return;
            }

            if (!firstname) {
                reject("no name given");
                return;
            }

            this.firstnames.insert({
                name: firstname,
                gender: gender
            }, (error, document) => {

                if (error) {
                    console.log(`Trying to insert ${JSON.stringify({ name: firstname, gender: gender })}:`, error);
                    reject(error);
                    return;
                }

                console.log('Inserted', document.name, 'with ID', document._id);
                resolve();
            });
        })
    },

    /**
     * 
     * @param {*} firstname 
     */
    getFirstname(firstname) {
        return new Promise((resolve, reject) => {
            if (!firstname) {
                reject("no name given");
            }

            this.firstnames.findOne({
                name: firstname
            }, (error, document) => {
                if (error) {
                    console.log(`Trying to find ${JSON.stringify({ name: firstname })}:`, error);
                    reject(error);
                    return;
                }

                resolve(document);
            });
        })
    },

    /**
     * 
     * @param {*} firstname 
     */
    deleteFirstname(firstname) {
        return new Promise((resolve, reject) => {

            this.firstnames.remove({
                name: firstname
            }, {
                multi: true
            }, (error, numberDeleted) => {
                if (error) {
                    console.log(`Trying to delete ${JSON.stringify({ name: firstname })}:`, error);
                    reject(error);
                    return;
                }

                console.log(`Deleted ${numberDeleted} entries (${JSON.stringify({ name: firstname })}) in firstnames.db`);
                resolve();
            });
        });
    }


};