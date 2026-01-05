(function () {
    if (window.__CMES_CHATBOT__) return;
    window.__CMES_CHATBOT__ = true;
  
    const root = document.createElement("div");
    root.id = "cmes-chatbot-root";
  
    Object.assign(root.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: "#000",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      zIndex: "99999",
      cursor: "pointer"
    });
  
    root.innerText = "CHAT";
  
    root.onclick = () => {
      alert("CMES Chatbot placeholder");
    };
  
    document.body.appendChild(root);
  })();
  