const nodeGeocoder = require('node-geocoder');

const geocoder = (() => {

    const options = {
        provider: 'openstreetmap',
        language: 'de'
    }

    return nodeGeocoder(options);

})();

module.exports = {

    /**
     * promised object is an array of location objects:
     *  [{
     *      country, city, state, zipcode, streetName, streetNumber
     *  }, {...}]
     * @param {*} location_string 
     * @returns {Promise} 
     */
    getLocation(location_string) {

        return geocoder.geocode(location_string);

    }

};