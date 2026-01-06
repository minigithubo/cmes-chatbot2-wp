(function () {
  //중복 실행 막는 가드, 한 번만 실행”하도록 락(lock)
  if (window.__CMES_CHATBOT__) return;
  window.__CMES_CHATBOT__ = true;

  let open = false;
  let mode = "init"; // init | chatting | faq
  let selectedCategory = null;

  const messages = []; 

  // FAQ questions
  const FAQ = {
    companyInfo: [
      "What industries do you serve?",
      "What brands do you partner with?",
      "What does CMES Robotics do?",
      "How do your automation solutions help?"
    ],
    engineering: [
      "What kind of robots are you using?",
      "How many boxes can you handle per hour?",
      "What robots do you integrate?",
      "Do you offer a robotic palletizing/depalletizing solution for a loose bag?"

    ],
    salesLead: [
      "Where can I see a demo?",
      "How can I request a quote?",
      "What is the lead time?",
      "What is a delivery time of robotic palletizer?"
    ],
  };

  // BASE 경로 자동 계산 (플러그인 기준)
//   현재 로드된 스크립트의 실제 URL을 가져와서
// 끝에 assets/chatbot.js를 제거해서
// “플러그인 폴더 기준 base”를 만든다
  const SCRIPT_SRC = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
  const BASE = SCRIPT_SRC.replace(/assets\/chatbot\.js(\?.*)?$/, ""); // .../cmes-chatbot2/

  // root
  const root = document.createElement("div");
  root.id = "cmes-chatbot-root";
  document.body.appendChild(root);

  // trigger button (chatbot button)
  const trigger = document.createElement("button");
  trigger.className = "chatbot-trigger";
  trigger.innerHTML = `<img src="${BASE}assets/public/nmnm.png" alt="Chat" />`;
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
  document.body.appendChild(trigger);

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

    messages.push({ role: "user", text: t, time:getTime()});
    mode = "chatting";
  }
  //유저 메시지가 들어오면 자동으로 mode = "chatting"으로 바꾸는 게 포인트

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
    return messages
      .map((m) => {
        const cls = m.role === "user" ? "chat-bubble user" : "chat-bubble assistant";
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
        ${items
          .map(
            (q, idx) => `
          <button class="faq-btn" data-faq-idx="${idx}"> 
            ${escapeHtml(q)}
          </button>
        `
        //items에 들어있는 질문 하나(q)마다 버튼 HTML 문자열 하나를 만들어라
        //join()-> 배열을 innerhtml 에 못넣으니 하나의 문자열로 합침
          )
          .join("")} 
      </div>
    `;
  }

  function renderQuickActionsHtml() {
    // 
    if (mode !== "init") return "";

    return `
      <div class="quick-actions">
        <button class="quick-btn" data-cat="companyInfo">Company info</button>
        <button class="quick-btn" data-cat="engineering">Engineering</button>
        <button class="quick-btn" data-cat="salesLead">Sales/Lead</button>
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
          ${renderMessagesHtml()}
          ${renderQuickActionsHtml()}
          ${mode === "faq" ? renderFaqButtonsHtml() : ""}
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

      //answer demo version when user ask questions. 
      setTimeout(() => {
        addAssistantMessage("Got it. (demo response) We will connect OpenAI next.");
        render();
      }, 200);
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
        addAssistantMessage("Here are some frequently asked questions. Or you can type your own question as well");
        mode = "faq";
        render();
      };
    });

    // faq button click
    const faqBtns = root.querySelectorAll(".faq-btn");
    faqBtns.forEach((b) => {
      b.onclick = () => {
        const idx = Number(b.getAttribute("data-faq-idx"));
        const q = FAQ[selectedCategory][idx];
        addUserMessage(q);

        // FAQ 선택 이후는 일반 채팅으로 전환
        mode = "chatting";
        render();

        setTimeout(() => {
          addAssistantMessage("Thanks. (demo) I will answer this after OpenAI integration.");
          render();
        }, 200);
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
