// Listen to the page after it is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the scribble area
    let scribbleArea = document.querySelector('#new_scribble')

    // Update the character count
    scribbleArea.addEventListener('input', () => updateCharacterCount(scribbleArea.value.length, scribbleArea));

    // Load the posts by default
    getPosts();
});

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
            // Sort the data array in descending order based on the timestamp
            const sortedData = data.sort((a, b) => new Date(b['time']) - new Date(a['time']));

            sortedData.forEach(post => {
                getUserName(post.owner_id, username => {
                    displayPost(post, username);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

// Function to fetch the username using owner_id
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

// Function to generate the inner html of the scribble
function displayPost(post, username) {
    const scribble = document.createElement('div');
    scribble.classList.add('m-3', 'p-5', 'scrib-box', 'rounded-3');
    scribble.innerHTML = `
        <h2 class="scrib-font">${username} scribbled...</h2>
        <p>${post['contents']}</p>
    `;

    // Add to the DOM
    document.getElementById('display_scrib').append(scribble);
}
