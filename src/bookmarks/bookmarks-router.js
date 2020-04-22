const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const { bookmarks } = require('../store');
const { isWebUri } = require('valid-url'); 
const bookmarksService = require('./bookmarks-service');
const xss = require('xss');
const path = require('path');

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
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(sanitize(bookmark));
            })
            .catch(next);
    });

bookmarksRouter
    .route(`/:id`)
    .all((req, res, next) => {
        bookmarksService.getById(req.app.get('db'), req.params.id)
            .then(bookmark => {
                if (!bookmark) {
                    return res.status(404).json({
                        error: { message: `Bookmark does not exist` }
                    });
                }
                res.bookmark = bookmark;
                next();
            })
            .catch(next);
    })
    .get((req, res, next) => {
        res.json(sanitize(res.bookmark));
    })
    .delete((req, res, next) => {
        bookmarksService.deleteBookmark(req.app.get('db'), req.params.id)
            .then(() => {
                res.status(204).end()
            })
            .catch(next);
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const updateBookmark = { title, url, description, rating };

        const fieldCount = Object.values(updateBookmark).filter(Boolean).length;
        if (fieldCount === 0) {
            return res.status(400).json({ 
                error: { message: `Request body must include at least one of 'title', 'url', 'description' and 'rating'` } 
            });
        }

        bookmarksService.patchBookmark(
            req.app.get('db'),
            req.params.id,
            updateBookmark
        )
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    });

module.exports = bookmarksRouter;