from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    pass

class Post(models.Model):
    id = models.AutoField(primary_key=True)
    contents = models.CharField(max_length=280)
    likes = models.IntegerField(default=0)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="creator")
    time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post: {self.id} by {self.owner}, starts with: {self.contents[:50]}..."

# Many users can like many posts and many posts can be liked by many users
class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

# Many users can follow many people and many people can have many followers
class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    timestamp = models.DateTimeField(auto_now_add=True)
