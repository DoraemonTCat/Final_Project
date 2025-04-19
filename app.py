import requests
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

app = FastAPI()

PAGE_ACCESS_TOKEN = "EAAX72rF185kBO4YZA0ZBQtSpRMX60zsEqiEVn1LHKugvRadxlQxVVxvMfjP5FYwJI9VGakNPkGZBOkkcZAt69LiWGQgP8qXSRwmQWKWraJ6aYKNd6rtbN827hE5hAqDTPHrtJfZAqZAglOepLTbkXvZBjcQg96qWOftFBTH8qNhtqJ7IJDv1ivYBZBmxcsSOWkPRiUYJw9BbTEiFsVHtQcvH"  # แทนที่ด้วย Access Token ของคุณ
VERIFY_TOKEN = "My_Token"  # เปลี่ยนเป็น verify token ของคุณ

# ฟังก์ชันที่ใช้ดึงข้อความจาก conversation ID
def get_conversation_messages(conversation_id: str):
    url = f'https://graph.facebook.com/v14.0/{conversation_id}/messages'
    params = {
        'access_token': PAGE_ACCESS_TOKEN,
        'fields': 'message,from,to,created_time'  # ระบุฟิลด์ที่ต้องการ
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": response.json()}

# ตัวอย่างการดึงข้อความจาก id
conversation_id = 't_2109084146235521'
messages = get_conversation_messages(conversation_id)
print(messages)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI application!"}

# Webhook verification
@app.get("/webhook")
async def verify_webhook(request: Request):
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return PlainTextResponse(content=challenge, status_code=200)
    return PlainTextResponse(content="Verification failed", status_code=403)

# Webhook event handler
@app.post("/webhook")
async def handle_webhook(request: Request):
    body = await request.json()
    print("📩 ข้อความจาก Facebook:", body)

    # ตัวอย่างการดึงข้อความจาก conversations ID
    # สมมติว่าเรามี conversation ID จาก webhook
    conversation_id = "t_2109084146235521"  # แทนที่ด้วย conversation ID ที่ดึงมา
    messages = get_conversation_messages(conversation_id)
    print("📨 ข้อความจาก conversation:", messages)

    return PlainTextResponse(content="EVENT_RECEIVED", status_code=200)

# Endpoints ที่ใช้ดึงข้อความจาก Conversation
@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    messages = get_conversation_messages(conversation_id)
    return messages