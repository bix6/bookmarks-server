const BookmarksService = {
    getAll(knex) {
        return knex.select('*').from('bookmarks');
    },
    getById(knex, id) {
        return knex.select('*').from('bookmarks').where('id', id).first();
    },
    insert(knex, bookmark) {
        return knex.insert(bookmark).into('bookmarks').returning('*').then(rows => {
            return rows[0]
        });
    },
    deleteBookmark(knex, id) {
        return knex('bookmarks').where({ id }).delete();
    },
    patchBookmark(knex, id, bookmark) {
        return knex('bookmarks').update(bookmark).where({ id });
    }
}

module.exports = BookmarksService;