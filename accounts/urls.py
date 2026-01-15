from django.urls import path
from .views  import *



urlpatterns = [
    path('login/', login_view, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('api/search/', api_search_view, name='api_search')
]
