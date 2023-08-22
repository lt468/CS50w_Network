from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("api/data/", views.get_data, name="get_data"),
    path("api/get_username_by_id/", views.get_username_by_id, name="get_username_by_id"),
    path("api/post_scribble/", views.post_scribble, name="post_scribble")
]
