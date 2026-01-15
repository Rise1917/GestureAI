from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth import update_session_auth_hash
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from django.contrib.auth import get_user_model
# from django.conf import settings # Эта строка больше не нужна, если не используем BASE_DIR напрямую для загрузки

from django.contrib.auth import get_user_model

User = get_user_model()

from get_video import get_video_url

# === Эту функцию load_second_html_content() можно полностью удалить, если second.html будет рендериться напрямую ===
# (или оставить её, если она нужна для других целей, но для index_view она больше не потребуется)
def load_second_html_content():
    # Эта функция больше не нужна для index_view, если вы используете render()
    # Однако, если вы хотите сохранить её на случай, если где-то ещё в коде
    # (вне предоставленного) она используется для загрузки HTML как строки,
    # то оставьте её, но знайте, что она не будет влиять на index_view после изменения ниже.
    current_dir = os.path.dirname(__file__)
    template_path = os.path.join(current_dir, '..', 'templates', 'second.html')
    try:
        with open(template_path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Ошибка: second.html не найден. Проверьте путь к шаблону.</h1>"
@csrf_exempt
def api_search_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            word = data.get("word", "").strip()

            if not word:
                return JsonResponse({"error": "Слово для поиска не предоставлено."}, status=400)

            video_url = get_video_url(word)

            if video_url:
                return JsonResponse({"video_url": video_url, "word": word})
            else:
                return JsonResponse({"error": "Видео не найдено 😢", "word": word}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Неверный формат JSON запроса."}, status=400)
        except Exception as e:
            print(f"Ошибка в API-маршруте /api/search: {e}")
            return JsonResponse({"error": "Внутренняя ошибка сервера. Попробуйте позже."}, status=500)
    else:
        return JsonResponse({"error": "Метод не разрешен."}, status=405)

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('home')
        else:
            messages.error(request, 'Ошибка имя или пароль неправильный')
    return render(request, 'accounts/login.html')
        

def register(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']

        if User.objects.filter(username=username).exists():
            messages.error(request, 'Ошибка пользователь с таким именем уже есть')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Ошибка пользователь с таким email уже есть')
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
            login(request, user)
            return redirect('home')
    return render(request, 'accounts/register.html')



def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def profile_view(request):
    if request.method == 'POST':
        user = request.user

        username = request.POST.get('username')
        avatar = request.FILES.get('avatar')
        password = request.POST.get('password')

        if username:
            user.username = username

        if avatar:
            user.avatar = avatar

        if password:
            user.set_password(password)
            update_session_auth_hash(request, user)  

        user.save()
        messages.success(request, 'Профиль успешно обновлён')
        return redirect('profile')

    return render(request, 'accounts/profile.html')