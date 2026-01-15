from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    avatar = models.ImageField(
        verbose_name='Аватар',
        upload_to='avatar_img/',
        null=True,
        blank=True
    )

    bio = models.TextField(
        verbose_name='О себе',
        max_length=500,
        blank=True
    )

    preferred_language = models.CharField(
        verbose_name='Предпочтительный язык перевода',
        max_length=10,
        choices=[
            ('ru', 'Русский'),
            ('en', 'Английский'),
            ('kz', 'Казахский'),
            ('de', 'Немецкий'),
        ],
        default='ru'
    )

    receive_voice_feedback = models.BooleanField(
        verbose_name='Озвучивать распознанные фразы',
        default=True
    )

    def __str__(self):
        return self.username