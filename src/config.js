module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_TOKEN: process.env.API_TOKEN || 'config.js-api-token',
    DB_URL: process.env.DB_URL || 'config.js-DB-URL'
}