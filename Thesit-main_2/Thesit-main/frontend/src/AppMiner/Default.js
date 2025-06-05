import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../CSS/Default.css';
import { fetchPages, connectFacebook, saveMessageToDB, getMessagesByPageId, deleteMessageFromDB } from "../Features/Tool";

function SetDefault() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [messages, setMessages] = useState([]); // ✅ ลบการโหลดจาก localStorage
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ โหลดเพจเมื่อ component mount
  useEffect(() => {
    const loadPages = async () => {
      try {
        const pagesData = await fetchPages();
        setPages(pagesData);
        
        // โหลด selectedPage จาก localStorage
        const savedPage = localStorage.getItem("selectedPage");
        if (savedPage && pagesData.some(page => page.id === savedPage)) {
          setSelectedPage(savedPage);
        }
      } catch (err) {
        console.error("ไม่สามารถโหลดเพจได้:", err);
      }
    };
    
    loadPages();
  }, []);

  // ✅ โหลดข้อความเมื่อเปลี่ยน selectedPage
  useEffect(() => {
    const loadMessages = async () => {
      if (selectedPage) {
        setLoading(true);
        try {
          console.log(`🔄 กำลังโหลดข้อความสำหรับ page_id: ${selectedPage}`);
          const data = await getMessagesByPageId(selectedPage);
          console.log(`✅ โหลดข้อความสำเร็จ:`, data);
          setMessages(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("โหลดข้อความล้มเหลว:", err);
          setMessages([]);
        } finally {
          setLoading(false);
        }
      } else {
        setMessages([]);
      }
    };

    loadMessages();
  }, [selectedPage]);

  const handlePageChange = (e) => {
    const pageId = e.target.value;
    console.log(`📄 เปลี่ยนเพจเป็น: ${pageId}`);
    setSelectedPage(pageId);
    
    // บันทึก selectedPage ลง localStorage
    if (pageId) {
      localStorage.setItem("selectedPage", pageId);
    } else {
      localStorage.removeItem("selectedPage");
    }
    
    // รีเซ็ตข้อความที่กำลังพิมพ์
    setNewMessage("");
  };

  const handleAddMessage = async () => {
    if (!selectedPage) {
      alert("กรุณาเลือกเพจก่อน");
      return;
    }
    
    if (!newMessage.trim()) {
      alert("กรุณากรอกข้อความ");
      return;
    }

    try {
      console.log(`💾 กำลังบันทึกข้อความ: "${newMessage}" สำหรับ page_id: ${selectedPage}`);
      const savedMsg = await saveMessageToDB(selectedPage, newMessage.trim());
      console.log(`✅ บันทึกสำเร็จ:`, savedMsg);
      
      // เพิ่มข้อความใหม่เข้าไปใน state
      setMessages(prevMessages => [...prevMessages, savedMsg]);
      setNewMessage("");
      
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกข้อความ:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อความ");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("คุณต้องการลบข้อความนี้หรือไม่?")) {
      return;
    }

    try {
      console.log(`🗑️ กำลังลบข้อความ ID: ${messageId}`);
      await deleteMessageFromDB(messageId);
      console.log(`✅ ลบข้อความสำเร็จ`);
      
      // ลบข้อความออกจาก state
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการลบข้อความ:", err);
      alert("เกิดข้อผิดพลาดในการลบข้อความ");
    }
  };

  // ✅ ข้อมูลสำหรับแสดงผล
  const selectedPageName = pages.find(page => page.id === selectedPage)?.name || "ไม่ได้เลือกเพจ";

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3 className="sidebar-title">ช่องทางเชื่อมต่อ</h3>
        <button onClick={connectFacebook} className="BT">
          <svg width="15" height="20" viewBox="0 0 320 512" fill="#fff" className="fb-icon">
            <path d="M279.14 288l14.22-92.66h-88.91V127.91c0-25.35 12.42-50.06 52.24-50.06H293V6.26S259.5 0 225.36 0c-73.22 0-121 44.38-121 124.72v70.62H22.89V288h81.47v224h100.2V288z" />
          </svg>
        </button>
        <hr />
        <select value={selectedPage} onChange={handlePageChange} className="select-page">
          <option value="">-- เลือกเพจ --</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
        <Link to="/App" className="title" style={{ marginLeft: "64px" }}>หน้าแรก</Link><br />
        <Link to="/Set_Miner" className="title" style={{ marginLeft: "50px" }}>ตั้งค่าระบบขุด</Link><br />
        <a href="#" className="title" style={{ marginLeft: "53px" }}>Dashboard</a><br />
        <a href="#" className="title" style={{ marginLeft: "66px" }}>Setting</a><br />
      </aside>

      {/* Main Content */}
      <div className="message-settings-container">
        <h1>ตั้งค่าชุดข้อความ Default</h1>
        
        {/* ✅ แสดงข้อมูลเพจที่เลือก */}
        <div className="page-info">
          <p style={{textAlign:"center"}}><strong>เพจที่เลือก:</strong> {selectedPageName}</p>  
        </div>

        <div className="message-list">
          {loading ? (
            <p className="loading">🔄 กำลังโหลดข้อความ...</p>
          ) : messages.length > 0 ? (
            messages.map((msg, index) => (
              <div key={msg.id || index} className="message-item">
                <span>{msg.message}</span>
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="delete-button"
                  disabled={!msg.id}
                >
                  ลบ
                </button>
              </div>
            ))
          ) : selectedPage ? (
            <p className="no-messages">ยังไม่มีข้อความที่บันทึกไว้สำหรับเพจนี้</p>
          ) : (
            <p className="no-messages">กรุณาเลือกเพจเพื่อดูข้อความ</p>
          )}
        </div>

        <div className="message-input-group">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedPage ? "เพิ่มข้อความใหม่..." : "กรุณาเลือกเพจก่อน"}
            className="message-textarea"
            disabled={!selectedPage}
          />
          <button
            onClick={handleAddMessage}
            className="add-button"
            disabled={!selectedPage || !newMessage.trim()}
          >
            เพิ่มข้อความ
          </button>
        </div>

        <Link to="/Set_Miner" className="back-button">
          กลับไปหน้าก่อนหน้า
        </Link>
      </div>
    </div>
  );
}

export default SetDefault;