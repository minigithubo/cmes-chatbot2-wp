(function () {

  //중복 실행 막는 가드, 한 번만 실행”하도록 락(lock)
  if (window.__CMES_CHATBOT__) return;
  window.__CMES_CHATBOT__ = true;

  let open = false;
  let mode = "init"; // init | chatting | faq
  let selectedCategory = null;
  let hasPlayedMessagesFadeUp = false;
  let botIsTyping = false;
  const BOT_THINKING_DELAY_MS = 1400; // min delay before showing reply (feels like "typing")

  const messages = []; 

  // FAQ questions
  const FAQ = {
    companyInfo: [
      { id: "industries_served", label: "What industries do you serve?" },
      { id: "partner_brands", label: "What brands do you partner with?" },
      { id: "company_overview", label: "What does CMES Robotics do?" },
      { id: "automation_benefits", label: "How do your automation solutions help?" }
    ],
    engineering: [
      { id: "robot_types", label: "What kind of robots are you using?" },
      { id: "box_throughput", label: "How many boxes can you handle per hour?" },
      { id: "robot_integration", label: "What robots do you integrate?" },
      { id: "loose_bag_solution", label: "Do you offer a robotic palletizing/depalletizing solution for a loose bag?" },
      { id: "sku_capacity", label: "For a piece picking robot, how many different SKU does it handle?" },
      { id: "pick_speed", label: "What is the pick up speed per hour?" }
    ],
    salesLead: [
      { id: "demo_request", label: "Where can I see a demo?" },
      { id: "request_quote", label: "How can I request a quote?" },
      { id: "lead_time", label: "What is the lead time?" },
      { id: "delivery_time", label: "What is a delivery time of robotic palletizer?" }
    ]
  };

  // BASE 경로 자동 계산 (플러그인 기준)
  // 현재 로드된 스크립트의 실제 URL을 가져와서
  // 끝에 assets/chatbot.js를 제거해서
  // “플러그인 폴더 기준 base”를 만든다
  const SCRIPT_SRC = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
  const BASE = SCRIPT_SRC.replace(/assets\/chatbot\.js(\?.*)?$/, ""); // .../cmes-chatbot2/

  // root
  const host = document.createElement("div");
  host.id = "cmes-chatbot-host";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    /* ================================================= */
    /* ===== Chat Widget Box ===== */
    /* ================================================= */

    .chat-widget {
        position: fixed;
        right: 24px;
        bottom: 100px;
        width: 450px;
        height: 600px;
        background: #ffffff;
        border-radius: 60px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        z-index: 1001;
        flex-direction: column;
        padding: 16px;
        /* 살짝 올라오는 효과 */
        animation: chat-fade-up 0.25s ease;
        display: flex;
        font-family: inherit;
        
      }
      /*Chat Header*/
      .chat-header {
        height: 40px;
        padding: 16px;
        display: flex;
        font-size: 10pt;
        align-items: center;
        justify-content: space-between;
        font-weight: 800;
      }
      .chat-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        
      }
      .chat-active{
        display: flex;
        align-items: center;
      }
      .chat-title {
        display: grid;
        flex-direction: column;
        margin-left: 10px; /* ← 오른쪽으로 살짝 이동 */
      }
      .chat-name {
        font-size: 14px;
        font-weight: 600;
      }
      .chat-notify {
        font-size: 12px;
        color: #777;
        font-weight: 500;
      }
      .chat-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        padding-right:1pt;
      }
      
      /*Chat Body*/
      .chat-body {
        flex: 1;
        padding: 16px;
        font-size: 14px;
        color: #eeebeb;
        overflow-y: auto;
        overflow-x: hidden;     
      }

      /*Chat box */
      .chat-bubble{
        position: relative;
        max-width: 50%;
        background: #3B0694;
        border-radius: 19px;
        padding: 16px;
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 12px;
        display: inline-block;  /* 핵심 */
        word-break: break-word;
        display: flex;
        flex-direction: column;
        text-align: center;
        font-family: inherit;
        
      }
      .chat-bubble.user {
        position: relative;
      }
      
    .chat-bubble.user .chat-time {
        position: absolute;
        left: -320px;
        bottom: 1px;
        font-size: 11px;
        color: rgba(36,35,44,0.4);
      }
      
      .chat-bubble p {
        margin: 0;
        line-height: 1.4;
      }
      
      /* 두 문장 사이 간격만 아주 살짝 */
      .chat-bubble p + p {
        margin-top: 6px;
      }
      .quick-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .faq-list {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      /* 버튼 */
      .quick-btn, .faq-btn {
        padding: 8px;
        border-radius: 20px;
        border: 2px solid #24232C;
        background: 3B0694;
        color: #24232C;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
      }
      .chat-time {
        position: absolute;
        right: -49px;
        bottom: -1px;   /* 음수 = 말풍선 밖 */
        font-size: 11px;
        color: rgba(36,35,44,0.4);
        white-space: nowrap;
      }
      .chat-bottom {
        border-top: 1px solid #dbd6d6;
        padding: 12px 16px;
      }
      .chat-input-wrapper {
        margin-bottom: 8px;
      }
      
      .chat-input {
        width: 100%;
        border: none;
        outline: none;
        font-size: 18px;
        color: #24232C;
        padding: 8px 0;
        background: transparent;
        font-family: inherit;
      }
      
      .chat-input::placeholder {
        color: #aaa;
      }
      .chat-placeholder {
        color: #aaa;
        font-size: 14px;
        display: block;
        margin-bottom: 8px;
      }
      
      .chat-bottom-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .chat-bottom-icon {
        display: flex;
        gap: 12px;
      }
      .chat-bottom-icon button {
        background: none;
        border: none;
        padding: 0;
        width: auto;
        height: auto;
        cursor: pointer;
      }
      .chat-bottom-icon img {
        width: 20px;
        height: 22px;
        opacity: 0.65;
      }
      .chat-send {
        width: 42px;
        height: 42px;
        background:none;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      
      .chat-send img {
      width: 35px;
      height: 35px;
      }
    /* ================================================= */
    /* ===== Quick Contact / Chatbot Trigger (reference: a._quick_contact) ===== */
    /* ================================================= */

    .chatbot-trigger {
        position: fixed;
        right: 24px;
        bottom: 50px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: none;
        cursor: pointer;
        z-index: 1000;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s, opacity 0.3s;
        text-decoration: none;
        color: #fff;
      }
      .chatbot-trigger::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(59, 6, 148, 1) 20%, rgba(0, 159, 227, 1) 180%);
        border-radius: 50%;
        transition: opacity 0.3s;
        z-index: 0;
      }
      .chatbot-trigger::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgb(193, 156, 255) 30%, rgb(26, 213, 255) 100%);
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 0;
      }
      .chatbot-trigger:hover::before { opacity: 0; }
      .chatbot-trigger:hover::after { opacity: 1; }
      .chatbot-trigger .chatbot-trigger-icon {
        position: relative;
        z-index: 2;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chatbot-trigger .chatbot-trigger-icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
      .chat-bubble {
        display: flex;
        align-items: center;     /* 세로 중앙 */
        justify-content: center; /* 가로 중앙 */
        text-align: center;
      }
      
      .chat-bubble p {
        margin: 0;               /* 위아래 간격 제거 */
        line-height: 1.35;
      }
      .chat-bubble.user {
        margin-left: auto;
        background: #e9e9e9;
        color: #24232C;
      }
      
      .chat-bubble.assistant {
        margin-right: auto;
      }
      
      /* AI Agent Notification */
      .ai-agent-notification {
        color: #888;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        margin-bottom: 12px;
        animation: fade-in-out 3s ease-in-out;
      }
      
      /* Messages Container - appears after notification */
      .messages-container {
        opacity: 1;
        transform: translateY(0);
      }
      .messages-container.first-transition {
        opacity: 0;
        transform: translateY(10px);
        animation: fade-in-slide 0.8s ease-in-out 1s forwards;
      }
      
      @keyframes fade-in-out {
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      @keyframes fade-in-slide {
        0% { 
          opacity: 0;
          transform: translateY(10px);
        }
        100% { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Typing indicator (bot is "thinking") */
      .typing-indicator {
        align-self: flex-start;
        margin-right: auto;
        margin-bottom: 12px;
        width: fit-content;
        flex-shrink: 0;
        background: #e9e9e9;
        border-radius: 18px;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 5px;
        animation: typing-bubble-in 0.25s ease-out;
      }
      @keyframes typing-bubble-in {
        0% { opacity: 0; transform: translateY(8px) scale(0.96); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #888;
        animation: typing-bounce 0.6s ease-in-out infinite;
      }
      .typing-dot:nth-child(1) { animation-delay: 0s; }
      .typing-dot:nth-child(2) { animation-delay: 0.12s; }
      .typing-dot:nth-child(3) { animation-delay: 0.24s; }
      @keyframes typing-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }
      
      /* Assistant reply slides in from left (incoming text feel) */
      .chat-bubble.assistant.assistant-slide-in {
        animation: assistant-msg-slide-in 0.35s ease-out forwards;
      }
      @keyframes assistant-msg-slide-in {
        0% {
          opacity: 0;
          transform: translateX(-12px);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* User message status (Sent / Read) */
      .chat-bubble.user .msg-status {
        font-size: 10px;
        color: rgba(36,35,44,0.35);
        margin-top: 4px;
        font-weight: 500;
      }
      
    `;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.id = "cmes-chatbot-root";
  shadow.appendChild(root);


  // Message icon: speech bubble with lines (no external font – always renders)
  const messageIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 11H6v-2h12v2zm0-3H6V8h12v2zm0-3H6V5h12v2z"/></svg>`;

  const trigger = document.createElement("button");
  trigger.className = "chatbot-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Open chat");
  trigger.innerHTML = `<span class="chatbot-trigger-icon">${messageIconSvg}</span>`;
  trigger.onclick = () => {
    open = true;

    //이런 조건 없으면: 열었다 닫았다 할 때마다 웰컴 메시지 무한히 쌓임
    if (messages.length === 0) {
      messages.push({
        role: "assistant",
        text: "Welcome to our page 👋\nHow can we help you?",
        time: getTime()
      });
    }
    render();
  };
  shadow.appendChild(trigger);

  //time visible for every chatting.
  function getTime() {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
  
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  //문장 넣을 때마다 챗박스가 생기는 이유
  function addUserMessage(text) {
    const t = text.trim();
    if (!t) return;

    //유저 메시지가 들어오면 자동으로 mode = "chatting"으로 바꾸는 게 포인트
    messages.push({ role: "user", text: t, time:getTime()});
    mode = "chatting";
  }
 
  function addAssistantMessage(text) {
    const t = text.trim();
    if (!t) return;
    messages.push({ role: "assistant", text: t, time:getTime()});
  }

  function scrollBodyToBottom() {
    const body = root.querySelector(".chat-body");
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }
  //message 배열에 들어있는 모든 메세지를 하나씩 돌면서 각각 말풍선 html 로 바꾸는 함수
  function renderMessagesHtml() {
    const lastIdx = messages.length - 1;
    return messages
      .map((m, i) => {
        let cls = m.role === "user" ? "chat-bubble user" : "chat-bubble assistant";
        if (m.role === "user" && i === lastIdx) cls += " user-slide-up";
        if (m.role === "assistant" && i === lastIdx) cls += " assistant-slide-in";
        const safe = escapeHtml(m.text).replaceAll("\n", "<br/>");
        const time = m.time ? `<span class="chat-time">${m.time}</span>` : ""; // add time
        return `<div class="${cls}"><p>${safe}</p>${time}</div>`;
      })
      .join("");
  }

  function renderFaqButtonsHtml() {
    if (!selectedCategory || !FAQ[selectedCategory]) return "";
    const items = FAQ[selectedCategory];
    return `
    <div class="faq-list">
      ${items.map(
        (item) => `
          <button class="faq-btn" data-faq-id="${item.id}">
            ${escapeHtml(item.label)}
          </button>
        `
      ).join("")}
    </div>
  `;
  }

  function renderQuickActionsHtml() {
    if (mode !== "init") return "";
    return `
      <div class="quick-actions">
        <button class="quick-btn" data-cat="companyInfo">Company info</button>
        <button class="quick-btn" data-cat="engineering">Learn about engineering</button>
        <button class="quick-btn" data-cat="salesLead">Contact sales/Lead</button>
      </div>
    `;
  }
  function render() {
    root.innerHTML = "";
    if (!open) return;

    root.innerHTML = `
      <div class="chat-widget">
        <div class="chat-header">
          <div class="chat-active">
            <img class="chat-avatar" src="${BASE}assets/public/chatbot.png" alt="CMES" />
            <div class="chat-title">
              <span class="chat-name">CMES Agent</span>
              <span class="chat-notify">Ready to help you!</span>
            </div>
          </div>
          <button class="chat-close" type="button" aria-label="Close">✕</button>
        </div>

        <div class="chat-body">
          <div class="ai-agent-notification">AI Agent has joined the chat.</div>
          <div class="messages-container${hasPlayedMessagesFadeUp ? "" : " first-transition"}">
            ${renderMessagesHtml()}
            ${botIsTyping ? '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>' : ""}
            ${renderQuickActionsHtml()}
            ${mode === "faq" ? renderFaqButtonsHtml() : ""}
          </div>
        </div>

        <div class="chat-bottom">
          <div class="chat-input-wrapper">
            <textarea
              class="chat-input"
              rows="1"
              placeholder="What would you like to know?"
            ></textarea>
          </div>

          <div class="chat-bottom-row">
            <div class="chat-bottom-icon">
              <button class="chat-image" type="button" aria-label="Upload image">
                <img src="${BASE}assets/public/plus.svg" alt="" />
              </button>
              <button class="chat-microphone" id="micBtn" type="button" aria-label="Record voice">
                <img src="${BASE}assets/public/microphone.svg" alt="" />
              </button>
            </div>

            <button class="chat-send" id="sendBtn" type="button" aria-label="Send">
              <img src="${BASE}assets/public/arrow1.svg" alt="" />
            </button>
          </div>
        </div>
      </div>
    `;
    //render() 순서
    // root.innerHTML = "" 초기화
    // open이 false면 아무것도 안 그린다
    // open이 true면 전체 HTML을 문자열로 “한 번에” 넣는다
    // 그 다음에 querySelector로 버튼 잡고 이벤트 걸어준다
    // 마지막에 스크롤 맨 아래로, input focus
    // close
    root.querySelector(".chat-close").onclick = () => {
      open = false;
      render();
    };

    // input + send
    const input = root.querySelector(".chat-input");
    const sendBtn = root.querySelector("#sendBtn");

    function sendMessageFromInput() {
      const value = input.value;
      addUserMessage(value);
      input.value = "";
      render();

      botIsTyping = true;
      render();

      const thinkingDelay = new Promise((r) => setTimeout(r, BOT_THINKING_DELAY_MS));
      (async () => {
        try {
          const apiPromise = CMESChatAPI.sendChatMessage({
            message: value,
            history: messages,
            mode: "chatting",
            category: selectedCategory
          });
          const res = (await Promise.all([thinkingDelay, apiPromise]))[1];
          addAssistantMessage(res.answer);
        } catch (err) {
          await thinkingDelay;
          addAssistantMessage("Sorry, something went wrong.");
        }
        botIsTyping = false;
        render();
      })();
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessageFromInput();
      }
    });

    sendBtn.onclick = () => sendMessageFromInput();

    // quick actions (category)
    const quickBtns = root.querySelectorAll(".quick-btn");
    quickBtns.forEach((btn) => {
      btn.onclick = () => {
        const cat = btn.getAttribute("data-cat");
        selectedCategory = cat;

        // 유저가 버튼 누른 것도 "유저 메시지"로 들어가게
        const label = btn.textContent.trim();
        addUserMessage(label);

        // 봇 안내
        addAssistantMessage("Here are some frequently asked questions. Or you can type your own question as well!");
        mode = "faq";
        render();
      };
    });

    // faq button click
    const faqBtns = root.querySelectorAll(".faq-btn");
    faqBtns.forEach((b) => { 
      b.onclick = () => { 
        const faqId = b.getAttribute("data-faq-id"); 
        const label = b.textContent.trim();
        addUserMessage(label);
        mode = "chatting";
        render();

        botIsTyping = true;
        render();

        const thinkingDelay = new Promise((r) => setTimeout(r, BOT_THINKING_DELAY_MS));
        (async () => {
          try {
            const apiPromise = CMESChatAPI.sendChatMessage({
              message: faqId,
              mode: "faq",
              category: selectedCategory
            });
            const res = (await Promise.all([thinkingDelay, apiPromise]))[1];
            addAssistantMessage(res.answer);
          } catch (err) {
            await thinkingDelay;
            addAssistantMessage("Sorry, I couldn't find an answer.");
          }
          botIsTyping = false;
          render();
        })();
      }; 
    });

    // mic demo
    const micBtn = root.querySelector("#micBtn");
    micBtn.onclick = async () => {
      try {
        await handleMic(micBtn);
      } catch (err) {
        console.error(err);
        alert("Mic permission failed.");
      }
    };

    // 렌더 후 스크롤 바닥
    scrollBodyToBottom();
    input.focus();

    if (open) hasPlayedMessagesFadeUp = true;
  }

  // 녹음 상태
  let recording = false;
  let mediaRecorder;
  let audioChunks = [];

  async function handleMic(micBtnEl) {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        console.log("Recorded audio:", blob);

        // 녹음 끝나면 트랙 정리
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      recording = true;
      micBtnEl.classList.add("recording");
    } else {
      mediaRecorder.stop();
      recording = false;
      micBtnEl.classList.remove("recording");
    }
  }
})();
