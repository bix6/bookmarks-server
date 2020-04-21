const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const { bookmarks } = require('../store');
const { isWebUri } = require('valid-url'); 
const bookmarksService = require('./bookmarks-service');
const xss = require('xss');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const sanitize = bookmark => ({
    id: xss(bookmark.id),
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    description: xss(bookmark.description),
    rating: xss(Number(bookmark.rating))
});

bookmarksRouter
    .route('/')
    .get((req, res, next) => {
        const db = req.app.get('db');
        bookmarksService.getAll(db)
            .then(bookmarks => {
                res.json(bookmarks.map(sanitize))
            })
            .catch(next);
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const newBookmark = { title, url, description, rating };

        for (const [key, val] of Object.entries(newBookmark)) { 
            if (val == null && key != 'description') {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                });
            }
        }

        if (Number.isNaN(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating ${rating}`);
            return res.status(400).json({
                error: { message: `rating must be between 0 and 5` }
            });
        }

        if (!isWebUri(url)) {
            logger.error(`Invalid url ${url} supplied`);
            return res.status(400).json({
                error: { message: `url must be valid` }
            });
        };

        bookmarksService.insert(req.app.get('db'), newBookmark)
            .then(bookmark => {
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(sanitize(bookmark));
            })
            .catch(next);
    });

bookmarksRouter
    .route('/:id')
    .get((req, res, next) => {
        const { id } = req.params;
        const db = req.app.get('db');

        bookmarksService.getById(db, id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} not found`);
                    return res.status(404).json({
                        error: { message: `Bookmark doesn't exist` }
                    });
                }
                res.json(sanitize(bookmark));
            })
            .catch(next);
    })
    .delete((req, res) => {
        const { id } = req.params;

        const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

        if (bookmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res
                .status(404)
                .send('Bookmark not found');
        }

        bookmarks.splice(bookmarkIndex, 1);

        logger.info(`Bookmark with id ${id} deleted.`)
        res
            .status(204)
            .end();
    });

module.exports = bookmarksRouter;