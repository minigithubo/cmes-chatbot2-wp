/**
 * CMES Chatbot Frontend Chat API Service
 * -------------------------------------
 * 역할:
 * - 프론트엔드(chatbot.js) → WordPress 백엔드 Chat API 호출
 * - UI 코드와 API 로직 분리
 *
 * Endpoint:
 * POST /wp-json/cmes-chatbot/v1/chat
 */

(function () {
    if (window.CMESChatAPI) return;
  
    async function sendChatMessage({
      message,
      history = [],
      mode = "chatting",
      category = null
    }) {
      if (!message || typeof message !== "string") {
        throw new Error("Message is required");
      }
  
      const res = await fetch("/wp-json/cmes-chatbot/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          history,
          mode,
          category
        })
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error("Chat API failed: " + text);
      }
  
      /**
       * Expected response format:
       * {
       *   answer: string,
       *   sources?: string[],
       *   showQuoteCTA?: boolean
       * }
       */
      return await res.json();
    }
  
    // 글로벌로 노출 (chatbot.js에서 사용)
    window.CMESChatAPI = {
      sendChatMessage
    };
  })();
  