from django.urls import path
from .views import *



urlpatterns = [
    path('', home, name='home'),
    path('index/', index, name='index'),
    path('save-text/', save_text, name='save_text'),
    path("get-history/", get_history, name="get_history"),
    path("delete-history/<int:pk>/", delete_history, name="delete_history"),
    path('second/', second, name='second'),
]
