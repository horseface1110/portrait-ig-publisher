const DRAFT_KEY = "ig-pwa-caption-v1";
const MAX_PHOTOS = 10;

const caption = document.querySelector("#caption");
const characterCount = document.querySelector("#characterCount");
const saveState = document.querySelector("#saveState");
const photoInput = document.querySelector("#photoInput");
const photoGrid = document.querySelector("#photoGrid");
const photoCount = document.querySelector("#photoCount");
const shareButton = document.querySelector("#shareButton");
const copyButton = document.querySelector("#copyButton");
const instagramButton = document.querySelector("#instagramButton");
const clearButton = document.querySelector("#clearButton");
const helpButton = document.querySelector("#helpButton");
const helpDialog = document.querySelector("#helpDialog");
const closeHelpButton = document.querySelector("#closeHelpButton");
const dialogDoneButton = document.querySelector("#dialogDoneButton");
const toast = document.querySelector("#toast");

let photos = [];
let selectedPhotoIndex = null;
let toastTimer;
let saveTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function updateCaptionState() {
  characterCount.textContent = String(caption.value.length);
  saveState.textContent = "正在保存…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, caption.value);
    saveState.textContent = "草稿已保存";
  }, 240);
}

function revokePhoto(photo) {
  if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
}

function updatePhotos() {
  photoGrid.replaceChildren();
  photos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = `photo-item${selectedPhotoIndex === index ? " selected" : ""}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute(
      "aria-label",
      selectedPhotoIndex === null
        ? `選取第 ${index + 1} 張照片以交換順序`
        : `與第 ${index + 1} 張照片交換順序`,
    );

    const image = document.createElement("img");
    image.src = photo.previewUrl;
    image.alt = `第 ${index + 1} 張照片`;

    const order = document.createElement("span");
    order.className = "photo-order";
    order.textContent = String(index + 1);

    const remove = document.createElement("button");
    remove.className = "photo-remove";
    remove.type = "button";
    remove.setAttribute("aria-label", `移除第 ${index + 1} 張照片`);
    remove.textContent = "×";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      const [deleted] = photos.splice(index, 1);
      revokePhoto(deleted);
      selectedPhotoIndex = null;
      updatePhotos();
    });

    const selectForSwap = () => {
      if (selectedPhotoIndex === null) {
        selectedPhotoIndex = index;
        showToast("再點另一張照片即可交換順序");
      } else if (selectedPhotoIndex === index) {
        selectedPhotoIndex = null;
      } else {
        [photos[selectedPhotoIndex], photos[index]] = [photos[index], photos[selectedPhotoIndex]];
        selectedPhotoIndex = null;
        showToast("照片順序已交換");
      }
      updatePhotos();
    };

    item.addEventListener("click", selectForSwap);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectForSwap();
      }
    });

    item.append(image, order, remove);
    photoGrid.appendChild(item);
  });

  photoCount.textContent = `${photos.length} / ${MAX_PHOTOS}`;
  shareButton.disabled = photos.length === 0;
}

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(caption.value);
  } catch {
    caption.focus();
    caption.select();
    document.execCommand("copy");
  }
  showToast(caption.value ? "文案已複製，換行會保留" : "目前沒有文案");
}

async function sharePhotos() {
  if (!photos.length) {
    showToast("請先選擇照片");
    return;
  }

  const files = photos.map((photo) => photo.file);

  if (navigator.canShare?.({ files }) && navigator.share) {
    try {
      if (caption.value) {
        await navigator.clipboard.writeText(caption.value);
      }
      await navigator.share({
        files,
        title: "分享照片到 Instagram",
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  await copyCaption();
  showToast("此瀏覽器無法分享多圖，已複製文案");
  setTimeout(() => {
    window.location.href = "https://www.instagram.com/";
  }, 450);
}

caption.value = localStorage.getItem(DRAFT_KEY) || "";
characterCount.textContent = String(caption.value.length);
updatePhotos();

caption.addEventListener("input", updateCaptionState);
copyButton.addEventListener("click", copyCaption);
shareButton.addEventListener("click", sharePhotos);

photoInput.addEventListener("change", () => {
  const incoming = [...(photoInput.files || [])].filter((file) =>
    file.type.startsWith("image/"),
  );
  const available = MAX_PHOTOS - photos.length;
  const accepted = incoming.slice(0, available);

  photos.push(
    ...accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    })),
  );
  selectedPhotoIndex = null;

  if (incoming.length > accepted.length) {
    showToast(`最多只能選 ${MAX_PHOTOS} 張照片`);
  }
  photoInput.value = "";
  updatePhotos();
});

instagramButton.addEventListener("click", async () => {
  if (caption.value) await copyCaption();
  window.location.href = "https://www.instagram.com/create/select/";
});

clearButton.addEventListener("click", () => {
  photos.forEach(revokePhoto);
  photos = [];
  selectedPhotoIndex = null;
  caption.value = "";
  localStorage.removeItem(DRAFT_KEY);
  characterCount.textContent = "0";
  saveState.textContent = "草稿已清除";
  updatePhotos();
  showToast("草稿已清除");
});

helpButton.addEventListener("click", () => helpDialog.showModal());
closeHelpButton.addEventListener("click", () => helpDialog.close());
dialogDoneButton.addEventListener("click", () => helpDialog.close());
helpDialog.addEventListener("click", (event) => {
  if (event.target === helpDialog) helpDialog.close();
});

window.addEventListener("beforeunload", () => photos.forEach(revokePhoto));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
