import { useState, useEffect } from "react";
import './App.css';
import { fetchPages, connectFacebook } from "./Features/Tool";
import axios from "axios";

function App() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPages()
      .then(setPages)
      .catch(err => console.error("ไม่สามารถโหลดเพจได้:", err));
  }, []);

  // ฟังก์ชันแปลงเวลาห่าง
  function timeAgo(dateString) {
    if (!dateString) return "-";
    const past = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 0) return "0 วินาทีที่แล้ว";
    if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} วันที่แล้ว`;
  }

  const handleFetchConversations = () => {
    if (!selectedPage) {
      alert("กรุณาเลือกเพจ");
      return;
    }
    setLoading(true);
    axios.get(`http://localhost:8000/psids?page_id=${selectedPage}`)
      .then(res => {
        const allConvs = res.data.conversations || [];
        const mapped = allConvs.map((conv, idx) => {
          const userName = conv.names && conv.names[0]
            ? conv.names[0]
            : (conv.participants && conv.participants[0]?.name)
              ? conv.participants[0].name
              : 'ไม่ทราบชื่อ';
          return {
            id: idx + 1,
            updated_time: conv.updated_time,
            created_time: conv.created_time, // เพิ่มตรงนี้
            sender_name: conv.psids[0] || "Unknown",
            conversation_id: conv.conversation_id,
            conversation_name: ` ${userName}`,
            user_name: userName,
            raw_psid: conv.psids[0]
          };
        });
        setConversations(mapped);
      })
      .catch(err => {
        alert("เกิดข้อผิดพลาด");
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#222" }}>
      {/* Sidebar */}
      <aside style={{ width: "200px", backgroundColor: "#ccc", padding: "20px" }}>
        <h3 style={{marginLeft:"35px"}}>ช่องทางเชื่อมต่อ</h3>
        <button onClick={connectFacebook} class = "BT">
          <svg width="20" height="20" viewBox="0 0 320 512" fill="#fff" style={{ background: "#1877f3", borderRadius: "3px" }}>
            <path d="M279.14 288l14.22-92.66h-88.91V127.91c0-25.35 12.42-50.06 52.24-50.06H293V6.26S259.5 0 225.36 0c-73.22 0-121 44.38-121 124.72v70.62H22.89V288h81.47v224h100.2V288z"/>
          </svg>
        </button>
        <hr />
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "10px" }}
        >
          <option value="" style={{textAlign:"center"}}>-- เลือกเพจ --</option>
          {pages.map(page => (
            <option style={{textAlign:"center"}} key={page.id} value={page.id}>{page.name} </option>
          ))}
        </select>
        
        <a href="#" class="title" style={{marginLeft:"50px"}}>ตั้งค่าระบบขุด</a><br />
        <a href="#" class="title" style={{marginLeft:"53px"}}>Dashboard</a><br />
        <a href="#" class="title" style={{marginLeft:"64px"}}>Setting</a><br />
      
      </aside>

      {/* Main Dashboard */}
      <main style={{ flexGrow: 1, padding: "20px", backgroundColor: "#f0f0f0" }}>
        <h2>📋 ตารางการขุด</h2>

        {/* Filters Bar (mockup) */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input type="date" />
          <select><option>หมวดหมู่ลูกค้า</option></select>
          
          <select><option>Platform</option></select>
          <select><option>สินค้า</option></select>
          <select><option>ประเภท</option></select>
          <select><option>สถานะการขุด</option></select>
          <input input type="number" placeholder="ระยะเวลา" min="0"/>
          <button>🔍 ค้นหา</button>
          

        </div>

        {/* Table */}
        {loading ? (
          <p>⏳ กำลังโหลด...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "8px"}}>ลำดับ</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>ชื่อผู้ใช้</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>วันที่เข้ามา</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>ระยะเวลาที่หาย</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Context</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>สินค้าที่สนใจ</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Platform</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>หมวดหมู่ลูกค้า</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>สถานะการขุด</th>
                
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>เลือก</th>

                
              </tr>
            </thead>
            <tbody> 
              {conversations.map((conv, idx) => (
                <tr key={conv.conversation_id}>
                  <td style={{ border: "1px solid #ccc", padding: "8px" , textAlign: "center"}}>     {/* ลำดับ */}
                    {idx + 1}
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* ชื่อผู้ใช้ */}
                    {conv.conversation_name || `บทสนทนาที่ ${idx + 1}`}
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>   {/* วันที่เข้ามา */}
                    {conv.created_time? new Date(conv.created_time).toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' }): "-"}
                  </td> 
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* ระยะเวลาที่หาย */}
                    {timeAgo(conv.updated_time)}
                  </td> 
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* Context */}
                    Context
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* สินค้าที่สนใจ */}
                    สินค้าที่สนใจ
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* Platform */}
                    Platform
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* หมวดหมู่ลูกค้า */}
                    หมวดหมู่ลูกค้า
                  </td>
                  
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* สถานะการขุด */}
                    สถานะการขุด
                  </td>
                 
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>    {/* เลือก */}
                    <input type="checkbox" />
                  </td>
                </tr>
                
              ))}
            </tbody>
            
          </table>
          
        )}
        <button onClick={handleFetchConversations} style={{ marginTop: "10px" }}>
          📥 ขุด
        </button>
      </main>
    </div>
  );
}

export default App;