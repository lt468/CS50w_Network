import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.db.models import Exists, OuterRef
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect
from django.core.paginator import Paginator

from .models import User, Post, Like, Follow

@require_POST
@csrf_protect
def edit_post(request, post_id):
    try:
        data = json.loads(request.body)
        post_content = data.get('content')

        # Fetch the post and check if it belongs to the logged-in user
        post = Post.objects.get(id=post_id)

        if post.owner != request.user:
            return JsonResponse({"error": "You do not have permission to edit this post."}, status=403)

        # Update the post content
        post.contents = post_content
        post.save()

        return JsonResponse({"message": "Post updated successfully"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def following(request):
    return render(request, "network/following.html")

@require_POST
@csrf_protect
def update_follow(request):
    try:
        data = json.loads(request.body)
        following_user_id = data.get('id')
        follower_user_id = request.user.id

        # Make sure can't follow yourself
        if int(following_user_id) == int(follower_user_id):
            return JsonResponse({'error': 'You cannot follow yourself!'}, status=400)

        # Check if there's an existing follow from the user
        existing_follow = Follow.objects.filter(follower_id=follower_user_id, following_id=following_user_id).first()

        if existing_follow:
            existing_follow.delete()
            is_new_follow = False
        else:
            Follow.objects.create(follower_id=follower_user_id, following_id=following_user_id)
            is_new_follow = True

        # Count the number of followers of the profile being viewed
        follower_count = Follow.objects.filter(following_id=following_user_id).count()

        # Count the number of users the profile being viewed is following
        following_count = Follow.objects.filter(follower_id=following_user_id).count()

        return JsonResponse({
            "message": "Following updated successfully", 
            "follower_count": follower_count,
            "following_count": following_count,
            "is_new_follow": is_new_follow
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def profile(request, owner_id):
    owner_name = User.objects.get(pk=owner_id)
    user_posts = Post.objects.filter(owner=owner_id)
    
    # Sort by reverse chronological
    user_posts = user_posts.order_by('-time')

    # Count the number of followers a user has
    followers = Follow.objects.filter(following=owner_id).count()
    following = Follow.objects.filter(follower=owner_id).count()
        
    # Check if there's an existing follow from the user
    try:
        follower_user = request.user.id  # User's ID from authentication
        follower_user_obj = User.objects.get(id=follower_user)
        existing_follow = Follow.objects.filter(follower=follower_user_obj, following=owner_name).first()
    except User.DoesNotExist:
        existing_follow = False

    return render(request, "network/profile.html", {
        "owner_id": owner_id,
        "owner_name": owner_name,
        "followers": followers,
        "following": following,
        "user_posts": user_posts,
        "follow_exists": existing_follow
        })


@require_POST
@csrf_protect
def update_like(request):
    try:
        data = json.loads(request.body)
        like_id = data.get('id')
        user_id = request.user.id  # User's ID from authentication

        # Check if there's an existing like from the user
        existing_like = Like.objects.filter(user_id=user_id, post_id=like_id).first()

        if existing_like:
            # If there's an existing like, remove it
            existing_like.delete()
            is_new_like = False
        else:
            # If there's no existing like, create a new one
            Like.objects.create(user_id=user_id, post_id=like_id)
            is_new_like = True

        # Count the number of likes for the specific post using aggregation
        post_likes_count = Like.objects.filter(post_id=like_id).count()

        # Update the likes field of the Post instance
        post = Post.objects.get(id=like_id)
        post.likes = post_likes_count
        post.save()

        return JsonResponse({"message": "Like updated successfully", "is_new_like": is_new_like})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_POST
@csrf_protect
def post_scribble(request):
    try:
        data = json.loads(request.body)
        scribble_content = data.get('contents')
        user_id = request.user.id  # User's ID from authentication

        # Create a new scribble associated with the user's ID
        scribble = Post.objects.create(contents=scribble_content, owner_id=user_id, likes=0)

        return JsonResponse({"message": "Scribble posted successfully"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def get_username_by_id(request):
    owner_id = request.GET.get('owner_id')
    try:
        user = User.objects.get(id=owner_id)
        return JsonResponse({'username': user.username})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)


def get_data(request, following=False):
    posts_per_page = 10 
    # Get the page parameter, default to 1 if not provided
    page = request.GET.get('page', 1)  

    # Get the owner_id parameter if it's provided (i.e., when on a profile page)
    owner_id = request.GET.get('owner_id', None)

    # Get if need to make sure it's following only
    following = request.GET.get('following', False)
    
    # Start with all posts and then apply the owner_id filter if provided
    data = Post.objects.all()
    if owner_id:
        data = data.filter(owner_id=owner_id)

    # Get the data and check if user has liked that post
    user_id = request.user.id
    data = data.annotate(user_has_liked=Exists(Like.objects.filter(post=OuterRef('pk'), user=user_id)))

    if following:
        data = data.filter(owner__in=User.objects.filter(following__follower=request.user))

    # Sort by reverse chronological
    data = data.order_by('-time')

    # Show 10 posts per page
    paginator = Paginator(data, posts_per_page)  
    current_page_data = paginator.get_page(page)

    # Return posts and the total number of pages

    response_data = {
        "posts": [{
            **post,
            "username": User.objects.get(id=post["owner_id"]).username
        } for post in current_page_data.object_list.values()],
        "total_pages": paginator.num_pages,
        "current_page_count": len(current_page_data.object_list)
    }

    return JsonResponse(response_data, safe=False)

def index(request):
    return render(request, "network/index.html", {
        "posts": Post.objects.all()
        })

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
