const Datastore = require('nedb');

module.exports = {
    firstnames: new Datastore({
        filename: "db/firstnames.db",
        autoload: true
    }),

    /**
     * 
     * @param {*} firstname 
     * @param {*} gender 
     * @param {function(error)} callback
     */
    addFirstname(firstname, gender, callback) {
        if (gender !== 'M' && gender !== 'F') {
            callback("Gender is not 'F' or 'M'");
            return;
        }

        this.firstnames.insert({
            name: firstname,
            gender: gender
        }, (error, document) => {

            if (error) {
                console.log(`Trying to insert ${JSON.stringify({ name: firstname, gender: gender })}:`, error);
                callback(error);
                return;
            }

            console.log('Inserted', document.name, 'with ID', document._id);
            callback();
        });
    },

    /**
     * 
     * @param {*} firstname 
     * @param {function(JSON, error)} callback 
     */
    getGender(firstname, callback) {
        this.firstnames.findOne({
            name: firstname
        }, (error, document) => {
            if (error) {
                console.log(`Trying to find ${JSON.stringify({ name: firstname })}:`, error);
                callback(null, error);
                return;
            }

            callback(document);
        });
    },

    /**
     * 
     * @param {*} firstname 
     * @param {function(error)} callback 
     */
    deleteFirstname(firstname, callback) {
        this.firstnames.remove({
            name: firstname
        }, {
            multi: true
        }, (error, numberDeleted) => {
            if (error) {
                console.log(`Trying to delete ${JSON.stringify({ name: firstname })}:`, error);
                callback(error);
                return;
            }

            console.log(`Deleted ${numberDeleted} entries in firstnames.db`);
            callback();
        });
    }

};