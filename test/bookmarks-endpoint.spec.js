const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures.js');

describe.only('Bookmarks Endpoints', () => {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean table', () => db('bookmarks').truncate());

    afterEach('clean table', () => db('bookmarks').truncate());

    describe('GET /bookmarks', () => {
        context('given no bookmarks', () => {
            it('gets 200 and empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, []);
            });
        });

        context('given bookmarks', () => {
            const testList = makeBookmarksArray();

            before('seed db', () => { return db('bookmarks').insert(testList) });

            it('gets 200 and all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, testList)
            });
        });
    });

    describe('GET /bookmarks/:id', () => {
        context('given no bookmarks', () => {
            it('gets 404 and error message', () => {
                const id = 999;
                return supertest(app)
                    .get(`/bookmarks/${id}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } });
            });
        });

        context('given bookmarks', () => {
            const testList = makeBookmarksArray();

            before('seed db', () => { return db('bookmarks').insert(testList) });

            it('gets the matching bookmark', () => {
                const id = 2;
                const bookmark = testList[id - 1];

                return supertest(app)
                    .get(`/bookmarks/${id}`)
                    .expect(200, bookmark);
            });
        });
    });
});