// Listen to the page after it is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/') {
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
        getPosts('all');
    } else {
        // Get URL
        const currentURL = window.location.pathname;

        // Use regex to get integer
        const user_int = currentURL.match(/\/(\d+)$/);
        const integerAtEnd = parseInt(user_int[1]);

        getPosts(integerAtEnd);
    }

  
    // Checking if user has clicked on the DOM
    document.addEventListener('click', event => {
        updateLike(event);
    });

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
            getPosts('all'); // Call getPosts() only if the post was successfully added
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

// Get the posts via an API 
async function getPosts(who) {
    try {
        const response = await fetch('/api/data/');
        const data = await response.json();
        const filteredData = filterWho(data, who);

        // Clear the existing content, text area, and character count
        document.querySelector('#display_scrib').innerHTML = '';
        new_srib_el = document.querySelector('#new_scribble')
        chars_el = document.querySelector('#chars')
        if (!new_srib_el === null) {
            new_srib_el.value = '';
            chers_el.innerHTML = 0;
        } 

        // Iterate through the data and display posts
        for (const post of filteredData) {
            const username = await getUserNameAsync(post['owner_id']);
            displayPost(post, username);
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
}

// Function to fetch username using async/await
async function getUserNameAsync(ownerId) {
    try {
        const response = await fetch(`/api/get_username_by_id/?owner_id=${ownerId}`);
        const data = await response.json();
        return data.username || 'Unknown User';
    } catch (error) {
        console.error('Error fetching username:', error);
        return 'Unknown User';
    }
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

    // Check if the logged-in user has liked the post
    const userLikedPost = post['user_has_liked']; // Replace with the actual data indicating whether the user has liked the post

    scribble.innerHTML = `
        <h2 class="scrib-font"><a class="not-active" href="profile/${post['owner_id']}">${username}</a> scribbled...</h2>
        <p>${post['contents']}</p>
        <div class="d-flex justify-content-between">
            <span><small class="scrib-font">on ${time}</small></span>
            <span>
                <button type="button" id="${post['id']}" class="me-3 btn btn-outline-danger">
                <svg xmlns="http://www.w3.org/2000/svg" id="heart_${post['id']}" width="16" height="16" fill="currentColor" class="bi bi-heart ${userLikedPost ? 'liked-heart' : 'unliked-heart'}" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                </svg>
                </button><span id="like-count-${post['id']}">${post['likes']}</span>
            </span>
        </div>
    `;

    // Add to the DOM
    document.getElementById('display_scrib').append(scribble);
}

async function updateLike(event) {
    // Gets the nearest like button on the DOM
    let element = event.target.closest('.btn-outline-danger');
    
    // Check if the clicked element is the like button
    if (element && element.getAttribute('id')) {
        console.log('Like button clicked');
        
        // Try to update like
        try {
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            const headers = {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            };

            const response = await fetch('/api/update_like/', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    id: element.getAttribute('id')
                })
            });

            if (response.ok) {
                // Check if the response indicates a new like was added or removed
                const responseData = await response.json();
                const isNewLike = responseData.is_new_like;

                const likeCountElement = document.getElementById(`like-count-${element.getAttribute('id')}`);
                
                // Get the correct heart
                const heartElement = document.getElementById(`heart_${element.getAttribute('id')}`);

                if (likeCountElement) {
                    const currentLikeCount = parseInt(likeCountElement.textContent);

                    // Update the like count value based on whether it's a new like or not
                    if (isNewLike) {
                        likeCountElement.textContent = currentLikeCount + 1; // Increment like count
                        heartElement.classList.replace('unliked-heart', 'liked-heart');
                    } else {
                        if (currentLikeCount > 0) {
                            likeCountElement.textContent = currentLikeCount - 1; // Decrement like count
                            heartElement.classList.replace('liked-heart', 'unliked-heart');
                        }
                    }
                    console.log('Like updated successfully');

                } else {
                    console.error('Error updating like count');
                }
            } else {
                console.error('Error updating like value');
            }
        } catch (error) {
            console.error('Error updating like value: ', error);
        }
    } else {
        console.log('Clicked element is not the like button');
    }
}

// Filter function to display certain (or all posts)
function filterWho(data, who) {

    if (who === "all") {
        return data;
    } else {
        return data.filter(data => data['owner_id'] === who);
    }
}
