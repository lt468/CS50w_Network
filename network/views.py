import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.db.models import Exists, OuterRef
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect

from .models import User, Post, Like, Follow

def profile(request, owner_id):
    owner_name = User.objects.get(pk=owner_id)
    user_posts = Post.objects.filter(owner=owner_id)
    
    # Sort by reverse chronological
    user_posts = user_posts.order_by('-time')

    # Count the number of followers a user has
    followers = Follow.objects.filter(following=owner_id).count()
    following = Follow.objects.filter(follower=owner_id).count()

    return render(request, "network/profile.html", {
        "owner_id": owner_id,
        "owner_name": owner_name,
        "followers": followers,
        "following": following,
        "user_posts": user_posts
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

def get_data(request):
    user_id = request.user.id
    # Get the data and check if user has liked that post
    data = Post.objects.annotate(user_has_liked=Exists(Like.objects.filter(post=OuterRef('pk'), user=user_id)))

    # Sort by reverse chronological
    data = data.order_by('-time')

    return JsonResponse(list(data.values()), safe=False)

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
