import { useState, useEffect } from "react";
import '../CSS/App.css';
import { fetchPages, connectFacebook } from "../Features/Tool";
import axios from "axios";

function getDefaultMessages() {
  const saved = localStorage.getItem('defaultMessages');
  return saved ? JSON.parse(saved) : [];
}

function App() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [psid, setPsid] = useState("");
  const [sendResult, setSendResult] = useState("");
  const [defaultMessages, setDefaultMessages] = useState(getDefaultMessages());

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

  // โหลด defaultMessages ใหม่ทุกครั้งที่เข้า
  useEffect(() => {
    setDefaultMessages(getDefaultMessages());
  }, []);

  // ดึงข้อความและ log โครงสร้างข้อมูล
  const handleFetchMessages = () => {
    if (!selectedPage || !conversationId) {
      alert("กรุณาเลือกเพจและใส่ Conversation ID ให้ครบ");
      return;
    }
    setLoading(true);
    axios.get(`http://localhost:8000/messages/${selectedPage}/${conversationId}`)
      .then(res => {
        const fetchedMessages = res.data.data || [];
        setMessages(fetchedMessages);
        // ดึง PSID จากข้อความแรก
        if (fetchedMessages.length > 0 && fetchedMessages[0].from?.id) {
          setPsid(fetchedMessages[0].from.id);
        } else {
          setPsid("");
        }
      })
      .catch(err => {
        setMessages([]);
        setPsid("");
        alert("เกิดข้อผิดพลาดในการดึงข้อความ");
      })
      .finally(() => setLoading(false));
  };

  // ส่งข้อความไปยัง PSID ที่ได้จากข้อความแรก
  const handleSendMessage = async () => {
    if (!selectedPage || !conversationId || !newMessage) {
      alert("กรุณาเลือกเพจ ระบุ Conversation ID และกรอกข้อความ");
      return;
    }
    if (!psid) {
      alert("ไม่พบ PSID ของผู้ใช้ใน Conversation นี้");
      return;
    }
    try {
      const res = await axios.post(
        `http://localhost:8000/send/${selectedPage}/${psid}`,
        { message: newMessage }
      );
      setSendResult("✅ ส่งข้อความแล้ว");
      setNewMessage("");
      handleFetchMessages();
    } catch (err) {
      setSendResult("❌ ส่งข้อความไม่สำเร็จ");
    }
  };

  return (

    /*****หน้าเว็ปไซต์******/
    <div className="App">
      <header className="App-header">
        <h1>📬 ดึงข้อความจาก Facebook Page</h1>

        {/* ปุ่มเชื่อมต่อ Facebook */}
        <button onClick={connectFacebook} style={{ padding: "10px 20px", marginBottom: "20px" }}>
          🔗 เชื่อมต่อ Facebook
        </button>

        {/* Dropdown เลือกเพจ */}
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

        {/* Input สำหรับ Conversation ID */}
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

        {/* แสดง PSID ที่ดึงได้ */}
        {psid && (
          <div style={{ marginBottom: "10px" }}>
            <b>PSID:</b> {psid}
          </div>
        )}

        {/* Input สำหรับส่งข้อความ */}
        <div style={{ marginTop: "20px" }}>
          {/* Dropdown สำหรับเลือกข้อความที่บันทึกไว้ */}
          {defaultMessages.length > 0 && (
            <select
              style={{ padding: "8px", width: "300px", marginBottom: "10px" }}
              onChange={e => {
                setNewMessage(e.target.value);
                if (e.target.value) handleSendMessage(e.target.value);
              }}
              value={newMessage}
            >
              <option value="">-- เลือกข้อความที่บันทึกไว้ --</option>
              {defaultMessages.map((msg, idx) => (
                <option key={idx} value={msg}>{msg}</option>
              ))}
            </select>
          )}
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
          {sendResult && <div style={{ marginTop: "10px" }}>{sendResult}</div>}
        </div>

        {/* แสดงข้อความ */}
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
