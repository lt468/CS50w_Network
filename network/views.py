import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect

from .models import User, Post, Like, Follow

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
    # Get data in reverse chronological order
    data = Post.objects.all().order_by('-time').values()
    return JsonResponse(list(data), safe=False)

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
