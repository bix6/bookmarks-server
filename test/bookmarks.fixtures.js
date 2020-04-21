function makeBookmarksArray() {
    return [
        {
            id: '1',
            title: 'Title Uno',
            url: 'www.uno.com',
            description: 'One One',
            rating: '1'
        },
        {
            id: '2',
            title: '2 in Two',
            url: 'www.two.com',
            description: 'Baby Yoda',
            rating: '2'
        },
        {
            id: '3',
            title: 'The end',
            url: 'https://3',
            description: 'Keyboard',
            rating: '5'
        }
    ];
}

function makeTestBookmark() {
    return {
        title: 'Test title',
        url: 'https://www.test.com',
        rating: '3'
    }
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
      id: 911,
      url: 'https://www.badtest.com',
      rating: '2',
      title: 'Bad script <script>alert("xss");</script>',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    }
    const expectedBookmark = {
      ...maliciousBookmark,
      title: 'Bad script &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
      maliciousBookmark,
      expectedBookmark,
    }
}

module.exports = { 
    makeBookmarksArray, 
    makeTestBookmark, 
    makeMaliciousBookmark 
};