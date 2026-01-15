# get_video.py
from playwright.sync_api import sync_playwright
import time

def get_video_url(word):
    with sync_playwright() as p:
        # Установите headless=True для работы в фоновом режиме без открытия окна браузера
        # Для отладки можно оставить headless=False
        browser = p.firefox.launch(headless=True)
        page = browser.new_page()
        page.goto("https://spreadthesign.com/ru.ru/search/")

        # Очистка, ввод текста и "Enter"
        page.fill("#search-field", word)
        page.keyboard.press("Enter")

        # Ожидаем появления тега <video>
        try:
            # Увеличьте таймаут, если у вас медленное соединение или сайт
            page.wait_for_selector("video", timeout=10000)  # до 10 сек
            video = page.query_selector("video")
            if video:
                src = video.get_attribute("src")
                print(f"✅ {word}: {src}")
                return src
            else:
                print(f"❌ Видео не найдено для слова: {word}")
        except Exception as e: # Ловим конкретное исключение для лучшего отслеживания
            print(f"⏱ Время ожидания истекло или произошла ошибка для слова: {word}. Ошибка: {e}")
        finally:
            browser.close() # Важно закрывать браузер после использования
        return None

# Пример (эту строку можно удалить в рабочей версии, если не нужна для тестирования отдельно)
# get_video_url("август")