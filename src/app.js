require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const bookmarksRouter = require('./bookmarks/bookmarks-router');
const validateBearerToken = require('./validate-bearer-token');
const errorHandler = require('./errror-handler');

const app = express()

const morganOption = (NODE_ENV === 'production')
    ? 'tiny' : 'dev';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(validateBearerToken);

app.use('/api/bookmarks', bookmarksRouter);

app.use(errorHandler);

module.exports = app;