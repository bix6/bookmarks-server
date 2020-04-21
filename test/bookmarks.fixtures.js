function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'Title Uno',
            url: 'www.uno.com',
            description: 'One One',
            rating: 1
        },
        {
            id: 2,
            title: '2 in Two',
            url: 'www.two.com',
            description: 'Baby Yoda',
            rating: 2
        },
        {
            id: 3,
            title: 'The end',
            url: 'https://3',
            description: 'Keyboard',
            rating: -1
        }
    ];
}

module.exports = { makeBookmarksArray };