// Listen to the page after it is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the scribble area
    let scribbleArea = document.querySelector('#new_scribble');

    // Update the character count
    scribbleArea.addEventListener('input', () => updateCharacterCount(scribbleArea.value.length, scribbleArea));

    // Listen for submit button
    document.querySelector('#submit_new_scrib').addEventListener('submit', async event => {
        event.preventDefault();

        await postNewScribble();
    });

    // Load the posts by default
    getPosts();
});

// Add new scribble
async function postNewScribble() {
    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        };

        const response = await fetch('/api/post_scribble/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                contents: document.querySelector('#new_scribble').value
            })
        });

        if (response.ok) {
            console.log('Scribble posted successfully');
            getPosts(); // Call getPosts() only if the post was successfully added
        } else {
            console.error('Error posting scribble');
        }
    } catch (error) {
        console.error('Error posting scribble:', error);
    }
}

// Function to update the character count
function updateCharacterCount(count, area) {
    const chars = document.querySelector('#chars');
    const subBtn = document.querySelector('#send');
    chars.innerHTML = `${count}`;

    // Check to see how many characters and change the text color
    if (count >= 260 && count <= 280) {
        chars.style.color = 'yellow';
        subBtn.disabled = false;
    } else if (count > 280) {
        chars.style.color = 'red';
        subBtn.disabled = true; // Check this on the backend too!
    } else {
        chars.style.color = 'var(--lavender-web)';
        subBtn.disabled = false;
    }
    changeHeight(area);
}

// Change the height of the textarea depending on its content
function changeHeight(area) {
    area.style.height = 'auto'; // Reset the height to auto to properly calculate the new height
    area.style.height = (area.scrollHeight) + 'px';
}

// Get the posts via the API
function getPosts() {
    fetch('/api/data/')
        .then(response => response.json())
        .then(data => {
            // Checking first to see if any posts
            if (data.length) {
                // Clear the existing content
                document.querySelector('#display_scrib').innerHTML = '';
            }

            // Iterate through the data and display posts
            data.forEach(post => {
                getUserName(post['owner_id'], username => {
                    displayPost(post, username);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

// API to fetch the username using owner_id
function getUserName(ownerId, callback) {
    fetch(`/api/get_username_by_id/?owner_id=${ownerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                callback(data.username);
            } else {
                callback('Unknown User');
            }
        })
        .catch(error => {
            console.error('Error fetching username:', error);
            callback('Unknown User');
        });
}

// Formatting the time
function formatTimestamp(timestamp) {
    const date = new Date(timestamp); // Parse the timestamp into a Date object
    
    const hour = ('0' + date.getHours()).slice(-2);
    const minute = ('0' + date.getMinutes()).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();

    return `${day}-${month}-${year} @ ${hour}:${minute}`;
}

// Function to dislay the posts
function displayPost(post, username) {
    const scribble = document.createElement('div');
    scribble.classList.add('m-3', 'p-5', 'scrib-box', 'rounded-3');
    
    const time = formatTimestamp(post['time']);

    // Don't use form, just do an onsubmit listen for when the button is pressed
    // or maybe you have to use form because it is HTML
    scribble.innerHTML = `
        <h2 class="scrib-font">${username} scribbled...</h2>
        <p>${post['contents']}</p>
        <div class="d-flex justify-content-between">
            <span><small class="scrib-font">on ${time}</small></span>
            <span>
                <button type="button" id="like_button" class="me-3 btn btn-outline-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
                    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"></path>
                    </svg>
                </button>${post['likes']}
            </span>
        </div>
        `;

    // Add to the DOM
    document.getElementById('display_scrib').append(scribble);
}

