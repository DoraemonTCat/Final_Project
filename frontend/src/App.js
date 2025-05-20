import { useState, useEffect } from "react";
import './App.css';
import { fetchPages, sendMessage, connectFacebook } from "./Features/Tool";
import axios from "axios";

function App() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  // ดึง page_id จาก URL ถ้ามี (หลัง redirect จาก Facebook)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageIdFromUrl = params.get("page_id");
    if (pageIdFromUrl) setSelectedPage(pageIdFromUrl);
  }, []);

  // ดึงรายชื่อเพจหลังจากผู้ใช้เชื่อมต่อ Facebook แล้ว
  useEffect(() => {
    fetchPages()
      .then(setPages)
      .catch(err => console.error("ไม่สามารถโหลดเพจได้:", err));
  }, []);

  // ✅ ดึงข้อความและ log โครงสร้างข้อมูล
  const handleFetchMessages = () => {
    if (!selectedPage || !conversationId) {
      alert("กรุณาเลือกเพจและใส่ Conversation ID ให้ครบ");
      return;
    }
    setLoading(true);
    axios.get(`http://localhost:8000/messages/${selectedPage}/${conversationId}`)
      .then(res => {
        const fetchedMessages = res.data.data || [];
        console.log("📦 ข้อความที่ได้:", fetchedMessages); // 👈 ดูโครงสร้างจริง
        setMessages(fetchedMessages);
      })
      .catch(err => {
        console.error("เกิดข้อผิดพลาดในการดึงข้อความ:", err);
        alert("เกิดข้อผิดพลาดในการดึงข้อความ");
      })
      .finally(() => setLoading(false));
  };

  const handleSendMessage = () => {
    if (!selectedPage || !conversationId || !newMessage) {
      alert("กรุณาเลือกเพจ ระบุ Conversation ID และกรอกข้อความ");
      return;
    }
    sendMessage(selectedPage, conversationId, newMessage)
      .then(() => {
        alert("✅ ส่งข้อความแล้ว");
        setNewMessage("");
        handleFetchMessages();
      })
      .catch(err => {
        alert(err.message || "ส่งข้อความไม่สำเร็จ");
        console.error(err);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📬 ดึงข้อความจาก Facebook Page</h1>

        {/* ✅ ปุ่มเชื่อมต่อ Facebook */}
        <button onClick={connectFacebook} style={{ padding: "10px 20px", marginBottom: "20px" }}>
          🔗 เชื่อมต่อ Facebook
        </button>

        {/* ✅ Dropdown เลือกเพจ */}
        <div style={{ marginBottom: "10px" }}>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            style={{ padding: "8px", width: "300px" }}
          >
            <option value="">-- เลือกเพจของคุณ --</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Input สำหรับ Conversation ID */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="ใส่ Conversation ID"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            style={{ padding: "8px", width: "300px" }}
          />
          <br />
          <button onClick={handleFetchMessages} style={{ marginTop: "10px", padding: "10px 20px" }}>
            📩 ดึงข้อความ
          </button>
        </div>
         <div style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="พิมพ์ข้อความที่ต้องการส่ง"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ padding: "8px", width: "300px" }}
          />
          <br />
          <button
            onClick={handleSendMessage}
            style={{ marginTop: "10px", padding: "10px 20px" }}
          >
            🚀 ส่งข้อความ
          </button>
        </div>
    
  
        

        {/* ✅ แสดงข้อความ */}
        {loading ? (
          <p>กำลังโหลด...</p>
        ) : messages.length === 0 ? (
          <p>ยังไม่มีข้อความ</p>
        ) : (
          <ul>
            {messages.map((msg, index) => (
              <li key={index} style={{ marginBottom: "20px" }}>
                {/* ✅ แสดงข้อความ ถ้ามี */}
                {msg.message && <p>{msg.message}</p>}

                {/* ✅ ถ้าไม่มีข้อความเลยแต่ไม่มีไฟล์แนบ */}
                {!msg.message && (!msg.attachments || msg.attachments.data.length === 0) && (
                  <p>[ไม่มีข้อความ]</p>
                )}

                {/* ✅ แสดงไฟล์แนบ */}
                {msg.attachments?.data.map((attachment, i) => {
                  const type = attachment.type;
                  const payload = attachment.payload;
                  // รองรับทั้ง payload.url และ image_data.url
                  const url = payload?.url || attachment.image_data?.url || attachment.image_data?.preview_url;

                  if (!url) {
                    console.log("🚨 attachment ไม่มี url:", attachment);
                  }

                  if (type === "image" && url) {
                    return (
                      <div key={i} style={{ marginTop: "10px" }}>
                        <img
                          src={url}
                          alt="รูปแนบ"
                          style={{ maxWidth: "200px", marginTop: "10px" }}
                        />
                        <div>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            🔗 เปิดรูปภาพขนาดเต็ม
                          </a>
                        </div>
                      </div>
                    );
                  } else if (type === "video" && url) {
                    return (
                      <video key={i} controls style={{ maxWidth: "300px", marginTop: "10px" }}>
                        <source src={url} type="video/mp4" />
                        วิดีโอไม่รองรับ
                      </video>
                    );
                  } else if (url) {
                    return (
                      <div key={i} style={{ marginTop: "10px" }}>
                        🔗 <a href={url} target="_blank" rel="noopener noreferrer">เปิดลิงก์</a>
                      </div>
                    );
                  } else if (attachment.file_url) {
                    return (
                      <div key={i}>
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📎 {decodeURIComponent(attachment.file_url.split("/").pop().split("?")[0])}
                        </a>
                      </div>
                    );
                  } else {
                    return (
                      <div key={i}>
                        [ไม่สามารถแสดงไฟล์แนบ]<br />
                        <pre>{JSON.stringify(attachment, null, 2)}</pre>
                      </div>
                    );
                  }
                })}
              </li>
            ))}
          </ul>
        )}

       
      </header>
    </div>
  );
}

export default App;
