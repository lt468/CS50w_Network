from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("profile/<int:owner_id>", views.profile, name="profile"),
    path("api/data/", views.get_data, name="get_data"),
    path("api/update_like/", views.update_like, name="update_like"),
    path("api/update_follow/", views.update_follow, name="update_follow"),
    path("api/get_username_by_id/", views.get_username_by_id, name="get_username_by_id"),
    path("api/post_scribble/", views.post_scribble, name="post_scribble")
]
