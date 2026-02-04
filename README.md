# 📂 Local File Share (Flask + Socket.IO)

A lightweight **local network file sharing server** built with **Flask** and **Flask-SocketIO**.  
Easily upload, share, and download files across devices on the same LAN — with real-time updates powered by WebSockets.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-2.3.2-lightgrey?logo=flask)
![Socket.IO](https://img.shields.io/badge/Socket.IO-5.3.4-black?logo=socketdotio)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Overview

This project provides a simple **local file sharing server** that lets devices on the same network:
- 📡 Upload and download files
- 📦 Share entire folders (auto-zipped on server)
- 👥 View connected clients in real-time
- 🛠 Auto-cleanup when clients disconnect

The **first connected device** becomes the **admin**, with visibility into all IPs.

---

## ✨ Features
- 🔄 Real-time client list via Socket.IO  
- 📤 File upload & 📥 download endpoints  
- 📂 Share folders (zipped archives)  
- 🧹 Cleanup routine for disconnected clients  

---

## 📋 Requirements

- Python **3.10+** (tested up to 3.14 with compatibility guard)  
- Dependencies (see `requirements.txt`):

```txt
Flask==2.3.2
Flask-SocketIO==5.3.4
Flask-CORS==4.0.0
python-socketio==5.9.0
eventlet==0.33.3
Install dependencies:
python -m pip install -r requirements.txt



▶️ Run (Development)
Create the upload folder (auto-created if missing):
mkdir uploads


Start the server:
python app.py


Open the admin UI in your browser:
👉 http://localhost:5000
Or access via the printed local network URL.
⚠️ Note: Uses socketio.run() with a Python 3.14 compatibility workaround.
Recommended: Python 3.11 or 3.12 for stable behavior.

🔌 Endpoints & Socket Events
REST Endpoints
- GET / → Serves main UI (templates/index.html)
- POST /upload → Upload file(s); expects file + client_sid
- GET /download/<file_id> → Download a shared file
- POST /share-folder → Share a folder (zipped archive)
- POST /remove-file/<file_id> → Remove a shared file (owner/admin only)
Socket Events
- connect / disconnect → Client lifecycle
- files_updated → Broadcast when shared files change
- client_connected → Update connected devices list

⚙️ Configuration
Inside app.py:
- SECRET_KEY → Flask secret key
- UPLOAD_FOLDER → Default: uploads
- MAX_CONTENT_LENGTH → Max upload size
- ALLOWED_EXTENSIONS → Allowed file types

📂 File Structure
├── app.py              # Main Flask + Socket.IO server
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Front-end UI
├── static/             # CSS & JS for UI
└── uploads/            # Runtime storage for files & zips



🔒 Security & Privacy Notes
- 👑 First device = Admin (sees all IPs)
- 🌐 Exposes endpoints on local network → use only on trusted LANs
- 🚫 No authentication → Add your own (API keys, OAuth, login) before exposing beyond LAN

💡 Customization Ideas
- 🔑 Add authentication & role management
- 🗄 Persist metadata in a lightweight DB (instead of in-memory dict)
- 📊 Add quotas, limits, and upload progress reporting

🛠 Troubleshooting
- ❌ Socket.IO clients not connecting → Ensure eventlet is installed & firewall allows port 5000
- ⚠️ Errors with Werkzeug/Python → Use Python 3.11 or 3.12 for stability

📜 License
This project is licensed under the MIT License.
Feel free to adapt and extend!

🌟 Extras you could add:
- Dockerfile for containerized deployment
- Systemd unit for running as a service
- Simple username-based auth flow in the UI

---

This version is **cleaner, more engaging, and visually appealing** with badges, emojis, and structured sections.  

Would you like me to also create a **Dockerfile** so you can run this server easily in a container?



Werkzeug==2.3.6
