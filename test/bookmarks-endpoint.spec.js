const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray, makeTestBookmark, makeMaliciousBookmark } = require('./bookmarks.fixtures.js');

describe('Bookmarks Endpoints', () => {
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
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context('given bookmarks', () => {
            const testList = makeBookmarksArray();

            before('seed db', () => { return db('bookmarks').insert(testList) });

            it('gets 200 and all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark does not exist` } });
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
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, bookmark);
            });
        });
    });

    describe('POST /bookmarks', () => {
        it('creates bookmark, returns 201 and new bookmark', function() {
            const newBookmark = makeTestBookmark();
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                );
        });

        const requiredFields = ['title', 'url', 'rating'];

        requiredFields.forEach(field => {
            const newBookmark = makeTestBookmark();

            it(`returns 400 and error when '${field}' is missing`, () => {
                delete newBookmark[field];

                return supertest(app)
                    .post('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });

        it(`returns 400 and error when rating is bad`, () => {
            const newBookmark = makeTestBookmark();
            newBookmark.rating = '-5';

            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: `rating must be between 0 and 5` }
                });
        });

        it(`returns 400 and error when url is bad`, () => {
            const newBookmark = makeTestBookmark();
            newBookmark.url = 'ajogijasogi';

            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: `url must be valid` }
                });
        });

        it(`removes XSS attack content`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title);
                    expect(res.body.description).to.eql(expectedBookmark.description)
                });
        });
    });

    describe.only('DELETE /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('returns 404', () => {
                const id = 666;
                return supertest(app)
                    .delete(`/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark does not exist' } });
            });
        });

        context('Given bookmarks', () => {
            const testList = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db('bookmarks').insert(testList);
            });

            it('responds with 204 and deletes item', () => {
                const idToRemove = 2;
                const expectedList = testList.filter(bookmark => bookmark.id != idToRemove);

                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/bookmarks`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedList)
                    );
            });
        });
    });
});