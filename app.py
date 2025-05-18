import requests
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from fastapi.responses import HTMLResponse

app = FastAPI()
# ด้านบนสุดของไฟล์
page_tokens = {}  # key = page_id, value = PAGE_ACCESS_TOKEN

PAGE_ACCESS_TOKEN = "EAAX72rF185kBO5MkoMeUI5dZC4ToZAfJ4Y7iEEreohrhXdsY1yAoa5xy43BQBfkJWokJ6JuvVvy1If6feZCCQ8ZBWQzf4f7ivx9OGIhbfyunZB7ZCiJD8uSZC4wgwwpKTUGgIK55o3XelkfBZCyKYiO5Aco0nzQPgbHrZBo2nrTBEuoMKI5R4OHa0ScANRBwcL9IIwBBs4ArpI2xAQWo9M4UZD"  # แทนที่ด้วย Access Token ของคุณ
VERIFY_TOKEN = "My_Token"  # เปลี่ยนเป็น verify token ของคุณ

# ฟังก์ชันที่ใช้ดึงข้อความจาก conversation ID
def get_conversation_messages(conversation_id: str):
    url = f'https://graph.facebook.com/v14.0/{conversation_id}/messages'
    params = {
        'access_token': PAGE_ACCESS_TOKEN,
        'fields': 'message,from,to,created_time,attachments'  # ดึง attachments มาด้วย
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

    # ดึง sender id
    sender_id = body['entry'][0]['messaging'][0]['sender']['id']
    # ส่งข้อความกลับ
    send_message(sender_id, "ขอบคุณที่ติดต่อมา!")

    return PlainTextResponse(content="EVENT_RECEIVED", status_code=200)

# Endpoints ที่ใช้ดึงข้อความจาก Conversation
@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    messages = get_conversation_messages(conversation_id)
    return messages

import requests

def send_message(recipient_id: str, message_text: str):
    url = 'https://graph.facebook.com/v14.0/me/messages'
    params = {
        'access_token': PAGE_ACCESS_TOKEN
    }
    data = {
        'recipient': {'id': recipient_id},
        'message': {'text': message_text}
    }
    response = requests.post(url, params=params, json=data)
    return response.json()

FB_APP_ID = "1684291582292889"
FB_APP_SECRET = "1572143aaef1398d8f50188ff0d2c07e"
REDIRECT_URI = "https://helen-futures-politicians-homework.trycloudflare.com/facebook/callback"

OAUTH_LINK = f"https://www.facebook.com/v14.0/dialog/oauth?client_id={FB_APP_ID}&redirect_uri={REDIRECT_URI}&scope=pages_show_list,pages_read_engagement,pages_messaging&response_type=code"

@app.get("/facebook/callback")
async def fb_callback(request: Request):
    code = request.query_params.get("code")

    token_url = "https://graph.facebook.com/v14.0/oauth/access_token"
    params = {
        "client_id": FB_APP_ID,
        "redirect_uri": REDIRECT_URI,
        "client_secret": FB_APP_SECRET,
        "code": code
    }
    res = requests.get(token_url, params=params)
    token_data = res.json()
    user_token = token_data.get("access_token")

    # ดึงเพจ
    pages_url = "https://graph.facebook.com/me/accounts"
    pages_res = requests.get(pages_url, params={"access_token": user_token})
    pages = pages_res.json()

    # 👉 เก็บ page access token ลง dictionary
    for page in pages.get("data", []):
        page_id = page["id"]
        access_token = page["access_token"]
        page_tokens[page_id] = access_token  # เก็บไว้

    return {"saved_pages": list(page_tokens.keys())}

@app.get("/connect", response_class=HTMLResponse)
async def connect_facebook_page():
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>เชื่อมต่อ Facebook Page</title>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                text-align: center;
                margin-top: 100px;
                background-color: #f0f2f5;
            }}
            a.button {{
                background-color: #4267B2;
                color: white;
                padding: 14px 24px;
                text-decoration: none;
                font-size: 18px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            a.button:hover {{
                background-color: #365899;
            }}
        </style>
    </head>
    <body>
        <h1>เชื่อมต่อ Facebook Page ของคุณ</h1>
        <p>คลิกปุ่มด้านล่างเพื่อเริ่มต้นการเชื่อมต่อ</p>
        <a href="{OAUTH_LINK}" class="button">🔗 เชื่อมต่อ Facebook</a>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/messages/{page_id}/{conversation_id}")
async def get_messages(page_id: str, conversation_id: str):
    access_token = page_tokens.get(page_id)
    if not access_token:
        return {"error": "Page token not found. Please connect via /connect first."}

    url = f'https://graph.facebook.com/v14.0/{conversation_id}/messages'
    params = {
        'access_token': access_token,
        'fields': 'message,from,to,created_time,attachments'
    }

    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": response.json()}




