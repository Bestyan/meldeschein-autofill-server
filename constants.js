
module.exports = {
    getErrorResponse: exception => {
        return {
            status: "error",
            error: exception.toString(),
            data: {}
        };
    },

    getDataResponse: data => {
        return {
            status: "ok",
            error: null,
            data: data
        };
    }
}