const scriptId = 'AKfycbwn9QVQxNLpX77bauD-ixOTY8qj-JG-9JW8LOqYJx16nBdUOs_kM4Nfc2Kj_t1MJT6y';
const url = `https://script.google.com/macros/s/${scriptId}/exec`;

const startRow = 3; /* this is the number corresponding to the row where the data starts */

const loadingText = `We're scouting for content...`;
const importedContentContainers = Array.from(document.querySelectorAll('.imported-content'));

if (window.location.hash.match('del')) localStorage.clear();
var cachedData = localStorage.getItem('sheet-content-cache');

var loading = true;

async function loadContent(fetchTable) {
    async function writeText(element, content) {
        var textContainer = document.createElement('span');
        element.append(textContainer);
        
        for (var segment of content.split(' ')) {
            var segmentContainer = document.createElement('span');
            segmentContainer.innerText = segment + ' ';
            segmentContainer.classList.add('imported-content-segment');
            textContainer.append(segmentContainer);

            element.style.height = `${textContainer.offsetHeight + 0}px`; // you can add a number here for extra padding

            await new Promise(resolve => setTimeout(resolve, 20));

            segmentContainer.style.opacity = 1;
        }

        element.style.height = `${textContainer.offsetHeight}px`; // just incase you added extra padding
    }

    for (var element of importedContentContainers) { // orderly "generate" the text on the page
        var content = fetchTable[element.id] || fetchTable['error'] || 'Drats! There was an error loading this content.';
        var loadingTextContainer = element.firstChild;
        var loadingCharacters = Array.from(loadingTextContainer.childNodes);

        element.style.height = `${loadingTextContainer.offsetHeight}px`;

        for (var character of loadingCharacters) {
            character.style.opacity = 0;
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        loadingTextContainer.remove();

        element.innerHTML = '';

        if (!fetchTable[element.id]) {
            element.style.color = 'red';
        }

        writeText(element, content);
    }

    loading = false;
}

async function fetchData(n) { // n is the number of times retried
    var fetchTable = {};

    try {
        var response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            }
        });
        var data = await response.json();

        for (var i in data) {
            if (i < (startRow - 1)) continue; // filter out rows prior

            var [_, id, content] = data[i];
            fetchTable[id] = content;
        }

        var storageCache = { data: fetchTable, expires: (Date.now() + 1000 * 60 * 30) }; // expires in 30 mins
        localStorage.setItem('sheet-content-cache', JSON.stringify(storageCache));

        await loadContent(fetchTable);
    } catch (e) {
        n = parseInt(n) ? n + 1 : 0;
        console.log(`cannot load resources (${n + 1})`);
        if (n < 3) { fetchData(n) } else { await loadContent(fetchTable) };
    }
}

async function stepLoadingAnimation() { // runs loading animation
    var loadingCharacters = Array.from(document.querySelectorAll('.imports-loading-character'));

    loadingCharacters.forEach(character => {
        character.style.animation = null;
    })

    await new Promise(resolve => setTimeout(resolve, 0));

    if (loading) {
        for (var character of loadingCharacters) {
            character.style.animation = 'characterBounce 2s';
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setTimeout(stepLoadingAnimation, 2000);
    }
}

function prepareLoading() { // sets up all loading animations
    importedContentContainers.forEach(container => {
        var loadingTextContainer = document.createElement('span'); // containing all import loading characters so they are easier to delete
        
        loadingText.split('').forEach(character => {
            var characterContainer = document.createElement('span');
            characterContainer.classList.add('imports-loading-character');
            characterContainer.innerText = character;
            
            loadingTextContainer.append(characterContainer);
        });

        container.append(loadingTextContainer)
    })

    stepLoadingAnimation();
}

if (window.location.hash.match('dev')) {
    importedContentContainers.forEach(container => {
        container.innerText = `[${container.id}]`;
    });
} else if (cachedData) {
    try {
        cachedData = JSON.parse(cachedData);
        console.dir(cachedData.data)
        console.log(cachedData.expires)

        if (cachedData.expires < Date.now()) throw new Error('Cache expired');
    } catch (e) {
        console.log(`cannot load from cache`);
        prepareLoading();
        window.addEventListener('load', fetchData);
    }
} else {
    prepareLoading();
    window.addEventListener('load', fetchData); /* i wait 'till it loads bc i want them to see how cool i am for the loading anims */
}