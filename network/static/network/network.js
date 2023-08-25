// Add event listener to handle DOMContentLoaded event. This ensures that our code only runs after the entire HTML document has been fully loaded.
document.addEventListener('DOMContentLoaded', function () {
    // Check the pathname to determine if we're on the home page.
    if (window.location.pathname === '/') {
        // If on the home page, set up event listeners specific to this page.
        setupHomePageListeners();
    } else {
        // If not on the home page, we might be on a profile page.
        // Check if we're on a profile page and get the respective user's posts.
        let whoToLoad = checkIfOnProfilePage();
        getPosts(whoToLoad);
    }

    // Add a global click event listener to handle various click events across the page.
    document.addEventListener('click', handlePageClick);
});

// This function sets up specific event listeners for the home page.
function setupHomePageListeners() {
    // Get the text area where users can write new posts (scribbles).
    let scribbleArea = document.querySelector('#new_scribble');

    try {
        // Add an event listener to update the character count as the user types.
        scribbleArea.addEventListener('input', () => updateCharacterCount(scribbleArea.value.length, scribbleArea));
        
        // Add an event listener to handle the submission of a new post.
        document.querySelector('#submit_new_scrib').addEventListener('submit', async event => {
            event.preventDefault();
            await postNewScribble();
        });
    } catch (error) {
        // If there's any error (e.g., if no user is logged in and thus the textarea doesn't exist), log the error.
        console.log('No user logged in ' + error);
    }

    // Load all posts for the home page.
    getPosts('all');
}

// This function handles the global click events on the page. Based on what was clicked, different functions are executed.
async function handlePageClick(event) {
    // Check if a follow button was clicked.
    if (event.target.classList.contains('follow-btn')) {
        handleFollowBtnClick(event);
    } 
    // Check if a like button was clicked.
    else if (event.target.classList.contains('like-btn')) {
        updateLike(event);
    } 
    // Check if a pagination link (next or previous) was clicked.
    else if (event.target.classList.contains('page-link')) {
        await handlePageLinkClick(event);
    }
}

// This function handles the click event when the "Follow" or "Unfollow" button is clicked. It makes an API request to update the follow status for the respective user.
function handleFollowBtnClick(event) {
    // Get the button that was clicked.
    const followBtn = event.target;
    // Prevent the default action (useful if the button is part of a form).
    event.preventDefault(); 
    // Update the follow status based on the clicked button's ID.
    updateFollow(event.target.getAttribute('id'), followBtn);
}

// This function handles the click event of pagination links. It fetches the appropriate page of posts based on the clicked link (next or previous).
async function handlePageLinkClick(event) {
    // Determine the current page based on the clicked link's data attribute.
    let indexPage = parseInt(event.target.getAttribute('data-current-page') || "1");
    // Increment or decrement the page number based on whether "Next" or "Previous" was clicked.
    event.target.id === 'next-link' ? indexPage++ : indexPage--;

    // Determine if we're on a profile page and fetch posts for the respective user.
    let person = checkIfOnProfilePage();
    let data = await getPosts(person, indexPage);
    let totalPages = data['total_pages'];
    let currentPageCount = data['current_page_count'];

    // Adjust the visibility and state of the pagination buttons based on the current page and total pages.
    adjustPaginationButtons(indexPage, totalPages, currentPageCount);
}

// This function adjusts the visibility and state of the pagination buttons. The Next button is disabled on the last page, and the Previous button is disabled on the first page.
function adjustPaginationButtons(indexPage, totalPages, currentPageCount) {
    // Get the Next and Previous buttons.
    let nextBtn = document.getElementById('next-page');
    let prevBtn = document.getElementById('prev-page');

    // Logic to enable/disable the Previous button.
    if (indexPage !== 1) {
        prevBtn.classList.remove('disabled');
    } else {
        if (!prevBtn.classList.contains('disabled')) {
            prevBtn.classList.add('disabled');
        }
    }

    // Logic to enable/disable the Next button.
    if (indexPage !== totalPages && currentPageCount === 10) {
        nextBtn.classList.remove('disabled');
    } else {
        if (!nextBtn.classList.contains('disabled')) {
            nextBtn.classList.add('disabled');
        }
    }
}

async function updateFollow(id, btn) {
    // Want to add or remove a follow

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        };

        const response = await fetch('/api/update_follow/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id: id
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const isNewFollow = responseData['is_new_follow'];
            const follower_count = responseData['follower_count']
            const following_count = responseData['following_count']

            // First get the following and then update the following count 
            const followingElement = document.getElementById('following');

            // Get the followers
            const followerElement = document.getElementById('followers');

            // First change the follow button if the user is already following the profile
            if (isNewFollow) {
                btn.classList.replace('btn-primary', 'btn-outline-primary')
                btn.innerHTML = 'unfollow';
            } else {
                btn.classList.replace('btn-outline-primary', 'btn-primary')
                btn.innerHTML = 'follow';
            }

            // Change the follower count

            followerElement.innerHTML = `<strong>followers: ${follower_count} </strong>`;
            followingElement.innerHTML = `<strong>following: ${following_count} </strong>`;
        
        } else {
            console.error('Error updating follow value');
        }
    } catch (error) {
        console.error('Error updating follow value with error: ', error);
    }
}

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
async function getPosts(who, page=1) {
    try {
        let url = `/api/data/?page=${page}`;
        // Add owner_id parameter to the URL if we're fetching for a specific user
        if (who !== 'all') {
            url += `&owner_id=${who}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        const filteredData = filterWho(data.posts, who);

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

        return data;
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
                <button type="button" id="${post['id']}" class="me-3 btn btn-outline-danger like-btn">
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
            console.error('Error updating like value, likely user not logged in: ', error);
            alert('Please log in to like a post')
            // Redirect to login pag
            window.location.href = 'http://127.0.0.1:8000/login'

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

function checkIfOnProfilePage () {
    if (/^\/profile\/\d+$/.test(window.location.pathname)) {
        // Get URL
        const currentURL = window.location.pathname;

        // Use regex to get integer
        const user_int = currentURL.match(/\/(\d+)$/);
        const integerAtEnd = parseInt(user_int[1]);
        return integerAtEnd;
    } else {
        return 'all';
    }
}
