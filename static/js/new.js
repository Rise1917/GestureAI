const VIDEO_WIDTH = 224;
const VIDEO_HEIGHT = 224;
const FRAME_COUNT = 32;

let session = null;
let labels = [];
let frames = [];
let streamIntervalId = null;
let videoStream = null;

let fullGesture = "";
let lastGesture = "";

// Загрузка модели и списка жестов
async function loadModel() {
  session = await ort.InferenceSession.create("/static/js/S3D.onnx");
  const res = await fetch("/static/js/RSL_class_list.txt");
  const text = await res.text();
  labels = text.trim().split("\n").map(line => line.split("\t")[1]);
  console.log("Модель загружена");
}

// Softmax для вывода вероятностей
function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b);
  return exps.map(e => e / sum);
}
function clearFullText() {
    document.getElementById('output').textContent = '';
}
// Преобразование кадра в тензор
function getFrameTensor(ctx) {
  const imageData = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  const data = imageData.data;
  const frame = new Float32Array(3 * VIDEO_WIDTH * VIDEO_HEIGHT);

  for (let i = 0; i < VIDEO_WIDTH * VIDEO_HEIGHT; i++) {
    frame[i] = data[i * 4] / 255;                             // R
    frame[i + VIDEO_WIDTH * VIDEO_HEIGHT] = data[i * 4 + 1] / 255; // G
    frame[i + 2 * VIDEO_WIDTH * VIDEO_HEIGHT] = data[i * 4 + 2] / 255; // B
  }

  return frame;
}

// Предсказание жеста
async function predictGesture() {
  if (!session || frames.length < FRAME_COUNT) return;

  const input = new Float32Array(1 * 3 * FRAME_COUNT * VIDEO_HEIGHT * VIDEO_WIDTH);

  for (let t = 0; t < FRAME_COUNT; t++) {
    const frame = frames[t];
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < VIDEO_HEIGHT; h++) {
        for (let w = 0; w < VIDEO_WIDTH; w++) {
          const idx =
            c * FRAME_COUNT * VIDEO_HEIGHT * VIDEO_WIDTH +
            t * VIDEO_HEIGHT * VIDEO_WIDTH +
            h * VIDEO_WIDTH + w;
          input[idx] = frame[c * VIDEO_HEIGHT * VIDEO_WIDTH + h * VIDEO_WIDTH + w];
        }
      }
    }
  }

  const tensor = new ort.Tensor("float32", input, [1, 3, FRAME_COUNT, VIDEO_HEIGHT, VIDEO_WIDTH]);
  const feeds = {};
  feeds[session.inputNames[0]] = tensor;

  const outputMap = await session.run(feeds);
  const output = outputMap[session.outputNames[0]].data;

  const probs = softmax(output);
  const maxIdx = probs.indexOf(Math.max(...probs));
  const gesture = labels[maxIdx];

  if (gesture !== lastGesture) {
    lastGesture = gesture;
    fullGesture += gesture + " ";
    document.getElementById("result").innerText =
      `Жест: ${gesture} (${(probs[maxIdx] * 100).toFixed(1)}%)`;
    document.getElementById("output").innerText = fullGesture.trim();
  }

  frames = [];
}

function speakFullGesture() {
  const text = fullGesture.trim();
  if (!text) {
    alert("Нет текста для озвучивания.");
    return;
  }

  const selectedLang = document.getElementById("language-select").value;
  
  // Подбор подходящего голоса
  const voices = speechSynthesis.getVoices();
  let voice = voices.find(v => v.lang === selectedLang);

  if (!voice) {
    // Попробуем найти голос по первой части языка (например, "ru" вместо "ru-RU")
    const shortLang = selectedLang.split("-")[0];
    voice = voices.find(v => v.lang.startsWith(shortLang));
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || selectedLang;
  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}


// Запуск камеры
async function startCamera() {
  const video = document.getElementById("video");
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d");

  videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = videoStream;

  video.addEventListener("loadeddata", () => {
    if (streamIntervalId) clearInterval(streamIntervalId);

    streamIntervalId = setInterval(() => {
      ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      const frame = getFrameTensor(ctx);

      if (frames.length >= FRAME_COUNT) frames.shift();
      frames.push(frame);

      if (frames.length === FRAME_COUNT) {
        predictGesture();
      }
    }, 200); // 5 fps
  });
}


// Открытие модального окна истории
function openHistoryModal() {
  fetch("/get-history/")
    .then((res) => res.json())
    .then((data) => {
      const list = document.getElementById("historyList");
      list.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = "<li>Пусто</li>";
        return;
      }

      data.forEach(item => {
        if (!item.id) return; // Защита от пустых ID

        const li = document.createElement("li");
        li.classList.add("history-item");

        const gestureText = document.createElement("span");
        gestureText.textContent = `${item.gesture} (${item.timestamp})`;
        gestureText.classList.add("gesture-text");

        const speakBtn = document.createElement("button");
        speakBtn.textContent = "🔊";
        speakBtn.title = "Озвучить";
        speakBtn.onclick = () => speakText(item.gesture);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = "Удалить";
        deleteBtn.onclick = () => deleteHistoryItem(item.id, li);

        li.appendChild(gestureText);
        li.appendChild(speakBtn);
        li.appendChild(deleteBtn);
        list.appendChild(li);
      });

      document.getElementById("historyModal").style.display = "block";
    })
    .catch(err => {
      alert("Ошибка загрузки истории");
      console.error(err);
    });
}

// Закрытие модального окна
function closeHistoryModal() {
  document.getElementById("historyModal").style.display = "none";
}

// Озвучивание текста
function speakText(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "ru-RU"; // можно заменить на "kk-KZ", "en-US" и т.п.
  speechSynthesis.speak(msg);
}

// Удаление элемента истории
function deleteHistoryItem(id, listItem) {
  if (!id || !confirm("Удалить этот жест из истории?")) return;

  fetch(`/delete-history/${id}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": getCSRF()
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Ошибка удаления");
      listItem.remove();
    })
    .catch(err => {
      alert("Ошибка при удалении");
      console.error(err);
    });
}



// Остановка камеры
function stopCamera() {
  const video = document.getElementById("video");

  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    videoStream = null;
  }

  if (streamIntervalId) {
    clearInterval(streamIntervalId);
    streamIntervalId = null;
  }

  document.getElementById("result").innerText = "Распознавание остановлено";
}

// Получение CSRF токена
function getCSRF() {
  let name = "csrftoken";
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Сохранение текста жеста
function saveFullText() {
  const text = fullGesture.trim();
  if (!text) {
    alert("Нет текста для сохранения.");
    return;
  }

  fetch("/save-text/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRF(),
    },
    body: JSON.stringify({ gesture: text }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Ошибка сервера");
      return res.json();
    })
    .then((data) => {
      console.log("Сохранено:", data);
      document.getElementById("result").innerText = "Сохранено в историю";
      fullGesture = "";
      document.getElementById("output").innerText = "";
    })
    .catch((err) => {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении текста.");
    });
}

// Инициализация
loadModel().then(startCamera);
