from django.db import models



class History(models.Model):
    gesture = models.TextField(
        verbose_name='Жест'
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время'
    )
    user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        verbose_name='Пользователь',
        related_name='gesture_history'
    )

    class Meta:
        verbose_name = 'История жестов'
        verbose_name_plural = 'История жестов'

    def __str__(self):
        return f"{self.gesture} at {self.timestamp}"
    
