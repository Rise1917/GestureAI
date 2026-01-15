from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json
from django.views.decorators.http import require_http_methods
from .models import History

def home(request):
    return render(request, 'main/home.html')

@login_required
def index(request):
    return render(request, 'main/camera_and_ai.html')

def second(request):
    return render(request, 'main/second.html')

@require_POST
@login_required
def save_text(request):
    try:
        data = json.loads(request.body)
        gesture_text = data.get("gesture", "").strip()  # 👈 именно "gesture"

        if not gesture_text:
            return JsonResponse({"status": "error", "message": "Пустой текст"}, status=400)

        History.objects.create(gesture=gesture_text, user=request.user)

        return JsonResponse({"status": "success", "text": gesture_text})

    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Невалидный JSON"}, status=400)
    except Exception as e:
        import traceback
        traceback.print_exc()  # 👈 Это поможет в debug
        return JsonResponse({"status": "error", "message": str(e)}, status=500)



@login_required
def get_history(request):
    history = History.objects.filter(user=request.user).order_by('-timestamp')
    data = [{
        "id": item.id,  
        "gesture": item.gesture,
        "timestamp": item.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    } for item in history]
    return JsonResponse(data, safe=False)



@require_http_methods(["DELETE"])
@login_required
def delete_history(request, pk):
    try:
        history = History.objects.get(pk=pk, user=request.user)
        history.delete()
        return JsonResponse({"status": "deleted"})
    except History.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)