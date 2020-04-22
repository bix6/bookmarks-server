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

    describe('GET /api/bookmarks', () => {
        context('given no bookmarks', () => {
            it('gets 200 and empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context('given bookmarks', () => {
            const testList = makeBookmarksArray();

            before('seed db', () => { return db('bookmarks').insert(testList) });

            it('gets 200 and all bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testList)
            });
        });
    });

    describe('GET /api/bookmarks/:id', () => {
        context('given no bookmarks', () => {
            it('gets 404 and error message', () => {
                const id = 999;
                return supertest(app)
                    .get(`/api/bookmarks/${id}`)
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
                    .get(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, bookmark);
            });
        });
    });

    describe('POST /api/bookmarks', () => {
        it('creates bookmark, returns 201 and new bookmark', function() {
            const newBookmark = makeTestBookmark();
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
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
                    .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: `url must be valid` }
                });
        });

        it(`removes XSS attack content`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title);
                    expect(res.body.description).to.eql(expectedBookmark.description)
                });
        });
    });

    describe('DELETE /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('returns 404', () => {
                const id = 666;
                return supertest(app)
                    .delete(`/api/bookmarks/${id}`)
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
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedList)
                    );
            });
        });
    });

    describe.only('PATCH /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('returns 404', () => {
                const id = 666;
                return supertest(app)
                    .patch(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark does not exist` } });
            });
        });

        context('Given bookmarks', () => {
            const testList = makeBookmarksArray();

            beforeEach('insert bookmarks', () => { return db('bookmarks').insert(testList) });

            it('responds with 204 and updates bookmark', () => {
                const id = 2;
                const updateBookmark = {
                    title: 'Updated Title',
                    url: 'www.updated.com',
                    description: 'Updated desc',
                    rating: '5'
                };
                const expectedBookmark = {
                    ...testList[id - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${id}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    );
            });

            it('responds with 400 when no fields supplied', () => {
                const id = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ 'made up field': 'made up content' })
                    .expect(400, {
                        error: { message: `Request body must include at least one of 'title', 'url', 'description' and 'rating'` }
                    });
            });

            it('responds with 204 when updating subset of fields', () => {
                const id = 2;
                const updateBookmark = {
                    title: 'Updated title',
                };
                const expectedBookmark = {
                    ...testList[id - 1],
                    ...updateBookmark
                };
                return supertest(app)
                    .patch(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ 
                        ...updateBookmark, 
                        madeUpField: 'bad input' 
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${id}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    );
            });
        });
    });
});