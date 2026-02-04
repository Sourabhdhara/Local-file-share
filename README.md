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
Werkzeug==2.3.6
