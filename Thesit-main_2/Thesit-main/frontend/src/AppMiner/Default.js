import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../CSS/Default.css';
import { fetchPages, connectFacebook, saveMessageToDB, getMessagesByPageId, deleteMessageFromDB } from "../Features/Tool";

function SetDefault() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ✅ เพิ่ม state สำหรับไฟล์สื่อ
  const [mediaFiles, setMediaFiles] = useState({
    videos: [],
    images1: [],
    images2: []
  });

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
    
    // รีเซ็ตข้อความที่กำลังพิมพ์และไฟล์สื่อ
    setNewMessage("");
    setMediaFiles({
      videos: [],
      images1: [],
      images2: []
    });
  };

  // ✅ ฟังก์ชันจัดการไฟล์สื่อ
  const handleFileUpload = (event, mediaType) => {
    const files = Array.from(event.target.files);
    const fileData = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size
    }));

    setMediaFiles(prev => ({
      ...prev,
      [mediaType]: [...prev[mediaType], ...fileData]
    }));
  };

  const removeMediaFile = (mediaType, index) => {
    setMediaFiles(prev => {
      const newFiles = [...prev[mediaType]];
      // ลบ URL object เพื่อป้องกัน memory leak
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return {
        ...prev,
        [mediaType]: newFiles
      };
    });
  };

  // ✅ ฟังก์ชันแปลงไฟล์เป็น base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // ✅ ฟังก์ชันเตรียมข้อมูลสื่อสำหรับบันทึก
  const prepareMediaData = async () => {
    const mediaData = {
      videos: [],
      images1: [],
      images2: []
    };

    try {
      // แปลงวิดีโอเป็น base64
      for (const video of mediaFiles.videos) {
        const base64 = await convertFileToBase64(video.file);
        mediaData.videos.push({
          name: video.name,
          type: video.type,
          size: video.size,
          data: base64
        });
      }

      // แปลงรูปภาพชุดที่ 1 เป็น base64
      for (const image of mediaFiles.images1) {
        const base64 = await convertFileToBase64(image.file);
        mediaData.images1.push({
          name: image.name,
          type: image.type,
          size: image.size,
          data: base64
        });
      }

      // แปลงรูปภาพชุดที่ 2 เป็น base64
      for (const image of mediaFiles.images2) {
        const base64 = await convertFileToBase64(image.file);
        mediaData.images2.push({
          name: image.name,
          type: image.type,
          size: image.size,
          data: base64
        });
      }

      return mediaData;
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการแปลงไฟล์:", error);
      throw error;
    }
  };

  // ✅ ฟังก์ชันบันทึกข้อความพร้อมสื่อ
  const handleAddMessage = async () => {
    if (!selectedPage) {
      alert("กรุณาเลือกเพจก่อน");
      return;
    }
    
    if (!newMessage.trim()) {
      alert("กรุณากรอกข้อความ");
      return;
    }

    // ตรวจสอบว่ามีไฟล์สื่อหรือไม่
    const hasMedia = mediaFiles.videos.length > 0 || 
                     mediaFiles.images1.length > 0 || 
                     mediaFiles.images2.length > 0;

    try {
      console.log(`💾 กำลังบันทึกข้อความ: "${newMessage}" สำหรับ page_id: ${selectedPage}`);
      
      let messageData = {
        page_id: selectedPage,
        message: newMessage.trim()
      };

      // ถ้ามีไฟล์สื่อ ให้เตรียมข้อมูลสื่อ
      if (hasMedia) {
        console.log("📎 กำลังเตรียมข้อมูลสื่อ...");
        const mediaData = await prepareMediaData();
        messageData.media = mediaData;
        
        console.log("📊 ข้อมูลสื่อที่เตรียมได้:", {
          videos: mediaData.videos.length,
          images1: mediaData.images1.length,
          images2: mediaData.images2.length
        });
      }

      // บันทึกข้อความพร้อมสื่อ
      const savedMsg = await saveMessageToDB(selectedPage, newMessage.trim(), hasMedia ? messageData.media : null);
      console.log(`✅ บันทึกสำเร็จ:`, savedMsg);
      
      // เพิ่มข้อความใหม่เข้าไปใน state พร้อมข้อมูลสื่อ
      const newMessageItem = {
        ...savedMsg,
        media: hasMedia ? messageData.media : null,
        mediaCount: {
          videos: mediaFiles.videos.length,
          images1: mediaFiles.images1.length,
          images2: mediaFiles.images2.length
        }
      };
      
      setMessages(prevMessages => [...prevMessages, newMessageItem]);
      
      // รีเซ็ตฟอร์ม
      setNewMessage("");
      
      // ลบไฟล์สื่อและ URL previews
      Object.values(mediaFiles).flat().forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      setMediaFiles({
        videos: [],
        images1: [],
        images2: []
      });
      
      alert("บันทึกข้อความพร้อมสื่อสำเร็จ!");
      
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกข้อความ:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อความ: " + error.message);
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

  // ✅ ฟังก์ชันนับจำนวนไฟล์สื่อทั้งหมด
  const getTotalMediaCount = () => {
    return mediaFiles.videos.length + mediaFiles.images1.length + mediaFiles.images2.length;
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

        {/* ✅ เพิ่มส่วนอัพโหลดสื่อ */}
        <div className="media-upload-section">
          
          {/* กล่องข้อความ */}
          <div className="message-box-section">
            <div className="message-box-header">
              <span className="message-icon">💬</span>
              <span className="message-title">กล่องข้อความ </span>
              {getTotalMediaCount() > 0 && (
                <span className="media-count-badge">
                  📎 {getTotalMediaCount()} ไฟล์
                </span>
              )}
            </div>
              
        {/* ✅ แสดงรายการข้อความที่บันทึกไว้ */}
              
              <div style={{ marginBottom: "20px" , marginLeft: "10px" , marginRight: "10px"}}>
                 <div className="message-list">
                      {loading ? (
                        <p className="loading">🔄 กำลังโหลดข้อความ...</p>
                      ) : messages.length > 0 ? (
                        messages.map((msg, index) => (
                          <div key={msg.id || index} className="message-item">
                            <div className="message-content">
                              <span className="message-text">{msg.message}</span>
                              {msg.mediaCount && (
                                <div className="message-media-info">
                                  {msg.mediaCount.videos > 0 && (
                                    <span className="media-badge video-badge">📹 {msg.mediaCount.videos}</span>
                                  )}
                                  {msg.mediaCount.images1 > 0 && (
                                    <span className="media-badge image-badge">🖼️ {msg.mediaCount.images1}</span>
                                  )}
                                  {msg.mediaCount.images2 > 0 && (
                                    <span className="media-badge image-badge">🖼️ {msg.mediaCount.images2}</span>
                                  )}
                                </div>
                              )}
                            </div>
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
            </div>
          </div>

          {/* วิดีโอ */}
          <div className="media-group">
            <div className="media-header">
              <span className="media-icon">📹</span>
              <span className="media-title">วิดีโอ</span>
              {mediaFiles.videos.length > 0 && (
                <span className="file-count">({mediaFiles.videos.length} ไฟล์)</span>
              )}
            </div>
            <div className="media-upload-area">
              <input
                type="file"
                id="video-upload"
                accept="video/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'videos')}
                style={{ display: 'none' }}
              />
              <label htmlFor="video-upload" className="upload-button">
                <span className="upload-icon">⬆️</span>
                <span>Drop files to attach, Browse Files</span>
              </label>
              {mediaFiles.videos.length > 0 && (
                <div className="media-preview">
                  {mediaFiles.videos.map((file, index) => (
                    <div key={index} className="media-item">
                      <video src={file.preview} controls className="media-thumbnail" />
                      <div className="media-info">
                        <span className="media-name">{file.name}</span>
                        <span className="media-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button 
                        onClick={() => removeMediaFile('videos', index)}
                        className="remove-media-btn"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* รูปที่ 1 */}
          <div className="media-group">
            <div className="media-header">
              <span className="media-icon">🖼️</span>
              <span className="media-title">รูปที่ 1</span>
              {mediaFiles.images1.length > 0 && (
                <span className="file-count">({mediaFiles.images1.length} ไฟล์)</span>
              )}
            </div>
            <div className="media-upload-area">
              <input
                type="file"
                id="image1-upload"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'images1')}
                style={{ display: 'none' }}
              />
              <label htmlFor="image1-upload" className="upload-button">
                <span className="upload-icon">⬆️</span>
                <span>Drop files to attach, Browse Files</span>
              </label>
              {mediaFiles.images1.length > 0 && (
                <div className="media-preview">
                  {mediaFiles.images1.map((file, index) => (
                    <div key={index} className="media-item">
                      <img src={file.preview} alt={file.name} className="media-thumbnail" />
                      <div className="media-info">
                        <span className="media-name">{file.name}</span>
                        <span className="media-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button 
                        onClick={() => removeMediaFile('images1', index)}
                        className="remove-media-btn"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* รูปที่ 2 */}
         
        </div>

        {/* ✅ แสดงรายการข้อความที่บันทึกไว้ */}
       

        {/* ✅ ส่วนกรอกข้อความใหม่ */}
        <div className="message-input-group">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedPage ? "เพิ่มข้อความใหม่..." : "กรุณาเลือกเพจก่อน"}
            className="message-textarea"
            disabled={!selectedPage}
          />
          <div className="message-controls">
           
            <button
              onClick={handleAddMessage}
              className="add-button"
              disabled={!selectedPage || !newMessage.trim()}
            >
              {getTotalMediaCount() > 0 ? "เพิ่มข้อความ" : "เพิ่มข้อความ"}
            </button>
          </div>
        </div>

        <Link to="/Set_Miner" className="back-button">
          กลับไปหน้าก่อนหน้า
        </Link>
      </div>
    </div>
  );
}

export default SetDefault;