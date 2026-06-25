(() => {
  if (window.__IG_PUBLISHER_INSTALLED__) return;
  window.__IG_PUBLISHER_INSTALLED__ = true;

  const STORAGE_KEY = "ig-publisher-caption";
  const APP_ID = "ig-publisher-tools";
  const DESKTOP_WIDTH = "980";

  function forceDesktopViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head?.appendChild(viewport);
    }
    viewport.content =
      `width=${DESKTOP_WIDTH}, initial-scale=0.44, minimum-scale=0.25, maximum-scale=3, user-scalable=yes, viewport-fit=cover`;
  }

  function addStyles() {
    if (document.getElementById(`${APP_ID}-style`)) return;
    const style = document.createElement("style");
    style.id = `${APP_ID}-style`;
    style.textContent = `
      #${APP_ID}, #${APP_ID} * { box-sizing: border-box; }
      #${APP_ID} {
        --igp-accent: #ff3f77;
        position: fixed;
        z-index: 2147483647;
        left: 50%;
        bottom: max(18px, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: min(920px, calc(100vw - 36px));
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #fff;
        pointer-events: none;
      }
      #${APP_ID} button, #${APP_ID} textarea { font: inherit; }
      #${APP_ID} .igp-bar {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 28px;
        background: rgba(18,18,20,.94);
        box-shadow: 0 18px 50px rgba(0,0,0,.38);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
        pointer-events: auto;
      }
      #${APP_ID} .igp-button {
        min-height: 68px;
        border: 0;
        border-radius: 18px;
        color: #fff;
        background: #303035;
        font-weight: 750;
        font-size: 25px;
      }
      #${APP_ID} .igp-button:active { transform: scale(.97); opacity: .82; }
      #${APP_ID} .igp-primary {
        background: linear-gradient(135deg, #ff7849, #ff296d 55%, #a934d8);
      }
      #${APP_ID} .igp-editor {
        display: none;
        margin-bottom: 14px;
        padding: 22px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 30px;
        background: rgba(18,18,20,.98);
        box-shadow: 0 18px 70px rgba(0,0,0,.52);
        pointer-events: auto;
      }
      #${APP_ID} .igp-editor[data-open="true"] { display: block; }
      #${APP_ID} .igp-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        font-size: 28px;
        font-weight: 800;
      }
      #${APP_ID} .igp-close {
        width: 54px;
        height: 54px;
        border: 0;
        border-radius: 50%;
        background: #303035;
        color: #fff;
        font-size: 30px;
      }
      #${APP_ID} .igp-caption {
        display: block;
        width: 100%;
        min-height: 310px;
        resize: vertical;
        padding: 20px;
        border: 1px solid #4c4c53;
        border-radius: 20px;
        outline: 0;
        background: #09090a;
        color: #fff;
        font-size: 28px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      #${APP_ID} .igp-caption:focus { border-color: var(--igp-accent); }
      #${APP_ID} .igp-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 14px;
      }
      #${APP_ID} .igp-status {
        min-height: 32px;
        margin: 10px 4px 0;
        color: #bdbdc5;
        font-size: 21px;
      }
      @media (prefers-color-scheme: light) {
        #${APP_ID} .igp-editor, #${APP_ID} .igp-bar { background: rgba(24,24,27,.96); }
      }
    `;
    document.head?.appendChild(style);
  }

  function visible(element) {
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.width > 0 && box.height > 0 && style.visibility !== "hidden";
  }

  function textOf(element) {
    return [
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("title"),
      element.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
  }

  function clickCreate() {
    const words = ["create", "new post", "建立", "新增", "發佈", "發文", "貼文"];
    const candidates = [
      ...document.querySelectorAll(
        'a, button, [role="button"], [aria-label], svg[aria-label]'
      ),
    ];
    const match = candidates.find((item) => {
      const target = item.closest?.('a, button, [role="button"]') || item;
      const label = textOf(item);
      return visible(target) && words.some((word) => label === word || label.includes(word));
    });

    if (match) {
      (match.closest?.('a, button, [role="button"]') || match).click();
      setStatus("已開啟 Instagram 發文流程");
    } else {
      setStatus("找不到發文按鈕；請先回首頁或直接點 Instagram 的「建立」");
    }
  }

  function findCaptionField() {
    const selectors = [
      'textarea[aria-label*="caption" i]',
      'textarea[placeholder*="caption" i]',
      '[contenteditable="true"][aria-label*="caption" i]',
      '[contenteditable="true"][aria-label*="說明"]',
      '[contenteditable="true"][aria-label*="文字"]',
      'textarea',
      '[contenteditable="true"][role="textbox"]',
    ];
    for (const selector of selectors) {
      const field = [...document.querySelectorAll(selector)].find(visible);
      if (field) return field;
    }
    return null;
  }

  function setNativeValue(field, value) {
    field.focus();
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      const prototype =
        field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(field, value);
      field.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(field);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("insertText", false, value);
    field.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    }));
  }

  async function copyCaption(caption) {
    try {
      await navigator.clipboard.writeText(caption);
      setStatus("文案已複製，換行會完整保留");
    } catch {
      const textarea = document.querySelector(`#${APP_ID} .igp-caption`);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      setStatus("文案已複製");
    }
  }

  async function applyCaption(caption) {
    localStorage.setItem(STORAGE_KEY, caption);
    const field = findCaptionField();
    if (!field) {
      await copyCaption(caption);
      setStatus("目前找不到說明文字欄位，已先複製；到輸入步驟後長按貼上");
      return;
    }
    setNativeValue(field, caption);
    setStatus("已套用到 Instagram；送出前請快速確認換行");
    toggleEditor(false);
  }

  function setStatus(message) {
    const status = document.querySelector(`#${APP_ID} .igp-status`);
    if (status) status.textContent = message;
  }

  function toggleEditor(open) {
    const editor = document.querySelector(`#${APP_ID} .igp-editor`);
    if (!editor) return;
    const next = open ?? editor.dataset.open !== "true";
    editor.dataset.open = String(next);
    if (next) {
      const caption = editor.querySelector(".igp-caption");
      caption.value = localStorage.getItem(STORAGE_KEY) || caption.value;
      setTimeout(() => caption.focus(), 50);
    }
  }

  function installTools() {
    if (!document.body || document.getElementById(APP_ID)) return;
    addStyles();

    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <section class="igp-editor" data-open="false" aria-label="IG 文案板">
        <div class="igp-title">
          <span>多行文案板</span>
          <button class="igp-close" type="button" aria-label="關閉">×</button>
        </div>
        <textarea class="igp-caption" placeholder="在這裡輸入貼文文字…&#10;&#10;換行會被完整保留。"></textarea>
        <div class="igp-actions">
          <button class="igp-button igp-copy" type="button">複製文案</button>
          <button class="igp-button igp-primary igp-apply" type="button">套用到 IG</button>
        </div>
        <div class="igp-status">文案會自動保存在這支裝置。</div>
      </section>
      <nav class="igp-bar" aria-label="IG Publisher 工具列">
        <button class="igp-button igp-primary igp-create" type="button">＋ 發文</button>
        <button class="igp-button igp-edit" type="button">文案</button>
        <button class="igp-button igp-home" type="button">首頁</button>
        <button class="igp-button igp-reload" type="button">重整</button>
      </nav>
    `;
    document.body.appendChild(root);

    const caption = root.querySelector(".igp-caption");
    caption.value = localStorage.getItem(STORAGE_KEY) || "";
    caption.addEventListener("input", () => {
      localStorage.setItem(STORAGE_KEY, caption.value);
      setStatus(`已自動保存 · ${caption.value.length} 字`);
    });

    root.querySelector(".igp-create").addEventListener("click", clickCreate);
    root.querySelector(".igp-edit").addEventListener("click", () => toggleEditor());
    root.querySelector(".igp-close").addEventListener("click", () => toggleEditor(false));
    root.querySelector(".igp-copy").addEventListener("click", () => copyCaption(caption.value));
    root.querySelector(".igp-apply").addEventListener("click", () => applyCaption(caption.value));
    root.querySelector(".igp-home").addEventListener("click", () => {
      location.href = "https://www.instagram.com/";
    });
    root.querySelector(".igp-reload").addEventListener("click", () => location.reload());
  }

  forceDesktopViewport();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installTools, { once: true });
  } else {
    installTools();
  }

  const observer = new MutationObserver(() => {
    forceDesktopViewport();
    installTools();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

