// ==UserScript==
// @name         IG 直向發文助手
// @namespace    https://horseface1110.github.io/portrait-ig-publisher/
// @version      1.0.2
// @description  在 Instagram 網頁版加入多圖、換行文案與自動發文流程。
// @author       horseface1110
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://horseface1110.github.io/portrait-ig-publisher/ig-publisher.meta.js
// @downloadURL  https://horseface1110.github.io/portrait-ig-publisher/ig-publisher.user.js
// ==/UserScript==

(() => {
  "use strict";

  if (window.__IG_PORTRAIT_PUBLISHER__) return;
  window.__IG_PORTRAIT_PUBLISHER__ = true;

  const ROOT_ID = "igpp-root";
  const words = {
    next: ["next", "下一步"],
    share: ["share", "分享", "發佈", "發布"],
  };
  const exactWords = {
    create: ["create", "建立", "new post", "create new post", "建立貼文", "新增貼文"],
    post: ["post", "貼文"],
  };

  let selectedFiles = [];
  let busy = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
  }

  function labelOf(element) {
    return [
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("title"),
      element.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function labelsOf(element) {
    return [
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("title"),
      element.textContent,
    ]
      .filter(Boolean)
      .map((value) => value.replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);
  }

  function matchesWords(element, candidates) {
    const label = labelOf(element);
    return candidates.some((word) => label === word || label.includes(word));
  }

  function findButton(candidates, scope = document) {
    return [...scope.querySelectorAll('button, a, [role="button"]')].find(
      (element) => visible(element) && matchesWords(element, candidates),
    );
  }

  function findExactButton(candidates, scope = document) {
    return [...scope.querySelectorAll('button, a, [role="button"]')].find((element) => {
      if (!visible(element)) return false;
      const labels = labelsOf(element);
      return candidates.some((word) => labels.includes(word));
    });
  }

  function findPostCreateLink() {
    return [...document.querySelectorAll('a[href]')].find((element) => {
      if (!visible(element)) return false;
      const href = element.getAttribute("href") || "";
      return href === "/create/select/" || href.startsWith("/create/select?");
    });
  }

  async function openPostComposer() {
    const directLink = findPostCreateLink();
    if (directLink) {
      directLink.click();
      await sleep(700);
      return;
    }

    const createButton = findExactButton(exactWords.create);
    if (!createButton) {
      throw new Error("找不到 Instagram 的「建立貼文」入口");
    }
    const createLabels = labelsOf(createButton);
    createButton.click();
    await sleep(700);

    const explicitlyPost =
      createLabels.includes("new post") ||
      createLabels.includes("create new post") ||
      createLabels.includes("建立貼文") ||
      createLabels.includes("新增貼文");
    if (explicitlyPost) return;

    const postOption = await waitFor(
      () => findExactButton(exactWords.post),
      "Instagram 顯示了建立選單，但找不到「貼文」選項",
      4000,
    );
    postOption.click();
    await sleep(700);
  }

  function activeDialog() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    return dialogs[dialogs.length - 1] || document;
  }

  async function waitFor(getter, message, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = getter();
      if (value) return value;
      await sleep(250);
    }
    throw new Error(message);
  }

  function setStatus(message, type = "") {
    const status = document.querySelector(`#${ROOT_ID} .igpp-status`);
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
  }

  function setBusy(next) {
    busy = next;
    document
      .querySelectorAll(`#${ROOT_ID} button, #${ROOT_ID} input, #${ROOT_ID} textarea`)
      .forEach((element) => {
        if (!element.classList.contains("igpp-close")) element.disabled = next;
      });
  }

  function setFieldValue(field, value) {
    field.focus();
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      const prototype =
        field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
      field.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: value,
        }),
      );
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    field.textContent = value;
    field.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }),
    );
  }

  async function clickAndPause(button, message) {
    if (!button) throw new Error(message);
    button.click();
    await sleep(900);
  }

  async function startPublish() {
    if (busy) return;
    const caption = document.querySelector(`#${ROOT_ID} .igpp-caption`).value;

    if (!selectedFiles.length) {
      setStatus("請先選擇照片", "error");
      return;
    }

    const confirmed = window.confirm(
      `準備發佈 ${selectedFiles.length} 張照片到目前登入的 Instagram 帳號。\n\n最後會自動按下「分享」。確定繼續嗎？`,
    );
    if (!confirmed) return;

    setBusy(true);

    try {
      setStatus("正在開啟建立貼文…");
      await openPostComposer();

      setStatus("正在加入照片…");
      const fileInput = await waitFor(
        () =>
          [...activeDialog().querySelectorAll('input[type="file"]')].find(
            (input) => !input.disabled,
          ),
        "找不到照片選擇欄位",
      );
      const transfer = new DataTransfer();
      selectedFiles.forEach((file) => transfer.items.add(file));
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      setStatus("等待 Instagram 處理照片…");
      await sleep(1800);

      for (let step = 0; step < 2; step += 1) {
        const nextButton = await waitFor(
          () => findButton(words.next, activeDialog()),
          `第 ${step + 1} 個「下一步」沒有出現`,
        );
        await clickAndPause(nextButton, "無法前往下一步");
      }

      setStatus("正在填入文案…");
      const captionField = await waitFor(
        () =>
          [...activeDialog().querySelectorAll(
            'textarea[aria-label*="caption" i], textarea[placeholder*="caption" i], [contenteditable="true"][aria-label*="caption" i], [contenteditable="true"][role="textbox"], textarea',
          )].find(visible),
        "找不到文案輸入欄位",
      );
      setFieldValue(captionField, caption);
      await sleep(500);

      setStatus("即將發佈…");
      const shareButton = await waitFor(
        () => findButton(words.share, activeDialog()),
        "找不到 Instagram 的「分享」按鈕",
      );
      shareButton.click();
      setStatus("已送出發佈。請等待 Instagram 完成上傳。", "success");
      localStorage.setItem("igpp-caption", caption);
    } catch (error) {
      console.error("[IG 發文助手]", error);
      setStatus(`${error.message}。Instagram 可能已改版，請截圖目前畫面。`, "error");
    } finally {
      setBusy(false);
    }
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #${ROOT_ID}, #${ROOT_ID} * { box-sizing: border-box; }
      #${ROOT_ID} {
        position: fixed;
        z-index: 2147483647;
        right: 16px;
        bottom: max(18px, env(safe-area-inset-bottom));
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif;
        color: #fff;
      }
      #${ROOT_ID} button, #${ROOT_ID} input, #${ROOT_ID} textarea { font: inherit; }
      #${ROOT_ID} .igpp-launcher {
        width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(135deg, #ff8248, #ff296e 55%, #9838d5);
        box-shadow: 0 8px 22px rgba(0,0,0,.28);
        opacity: .58;
        font-size: 24px;
        line-height: 1;
        font-weight: 800;
      }
      #${ROOT_ID} .igpp-launcher:active { opacity: 1; transform: scale(.94); }
      #${ROOT_ID} .igpp-launcher[hidden] { display: none; }
      #${ROOT_ID} .igpp-panel {
        display: none;
        position: fixed;
        inset: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
        padding: 20px;
        overflow: auto;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 26px;
        background: rgba(18,18,21,.98);
        box-shadow: 0 30px 90px rgba(0,0,0,.55);
      }
      #${ROOT_ID} .igpp-panel[data-open="true"] { display: block; }
      #${ROOT_ID} .igpp-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
      }
      #${ROOT_ID} h2 { margin: 0; font-size: 23px; }
      #${ROOT_ID} .igpp-close {
        width: 42px; height: 42px; border: 0; border-radius: 50%;
        color: #fff; background: #303035; font-size: 25px;
      }
      #${ROOT_ID} label { display: block; margin: 16px 0 8px; font-weight: 750; }
      #${ROOT_ID} .igpp-file, #${ROOT_ID} .igpp-caption {
        width: 100%; border: 1px solid #45454c; border-radius: 16px;
        color: #fff; background: #09090b;
      }
      #${ROOT_ID} .igpp-file { padding: 14px; }
      #${ROOT_ID} .igpp-caption {
        min-height: 240px; padding: 16px; resize: vertical; line-height: 1.55;
        white-space: pre-wrap;
      }
      #${ROOT_ID} .igpp-count { margin-top: 8px; color: #aaa6ae; font-size: 12px; }
      #${ROOT_ID} .igpp-publish {
        width: 100%; min-height: 56px; margin-top: 18px; border: 0;
        border-radius: 17px; color: #fff;
        background: linear-gradient(135deg, #ff8248, #ff296e 55%, #9838d5);
        font-weight: 850;
      }
      #${ROOT_ID} button:disabled, #${ROOT_ID} input:disabled, #${ROOT_ID} textarea:disabled {
        opacity: .5;
      }
      #${ROOT_ID} .igpp-status {
        min-height: 38px; margin-top: 12px; color: #bab6be; font-size: 13px; line-height: 1.45;
      }
      #${ROOT_ID} .igpp-status[data-type="error"] { color: #ff8297; }
      #${ROOT_ID} .igpp-status[data-type="success"] { color: #70dda1; }
      #${ROOT_ID} .igpp-note {
        margin: 0 0 16px; color: #aaa6ae; font-size: 12px; line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  function installUI() {
    if (!document.body || document.getElementById(ROOT_ID)) return;
    installStyles();

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <button class="igpp-launcher" type="button" aria-label="開啟發文助手" title="發文助手">＋</button>
      <section class="igpp-panel" data-open="false">
        <div class="igpp-head">
          <h2>IG 直向發文助手</h2>
          <button class="igpp-close" type="button" aria-label="關閉">×</button>
        </div>
        <p class="igpp-note">照片只交給目前這個 Instagram 頁面。程式不會讀取或上傳你的密碼與 Cookie。</p>
        <label for="igpp-files">照片（最多 10 張）</label>
        <input class="igpp-file" id="igpp-files" type="file" accept="image/*" multiple>
        <div class="igpp-count">尚未選擇照片</div>
        <label for="igpp-caption">文案</label>
        <textarea class="igpp-caption" id="igpp-caption" maxlength="2200" placeholder="換行會完整保留…"></textarea>
        <button class="igpp-publish" type="button">確認並自動發佈</button>
        <div class="igpp-status">請先選擇照片並輸入文案。</div>
      </section>
    `;
    document.body.appendChild(root);

    const panel = root.querySelector(".igpp-panel");
    const caption = root.querySelector(".igpp-caption");
    const count = root.querySelector(".igpp-count");
    caption.value = localStorage.getItem("igpp-caption") || "";

    const launcher = root.querySelector(".igpp-launcher");
    launcher.addEventListener("click", () => {
      panel.dataset.open = "true";
      launcher.hidden = true;
    });
    root.querySelector(".igpp-close").addEventListener("click", () => {
      if (!busy) {
        panel.dataset.open = "false";
        launcher.hidden = false;
      }
    });
    root.querySelector(".igpp-file").addEventListener("change", (event) => {
      selectedFiles = [...event.target.files].slice(0, 10);
      count.textContent = selectedFiles.length
        ? `已選擇 ${selectedFiles.length} 張照片`
        : "尚未選擇照片";
      setStatus(selectedFiles.length ? "準備完成，發佈前會再次詢問。" : "請先選擇照片。");
    });
    caption.addEventListener("input", () => {
      localStorage.setItem("igpp-caption", caption.value);
    });
    root.querySelector(".igpp-publish").addEventListener("click", startPublish);
  }

  installUI();
  new MutationObserver(installUI).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
