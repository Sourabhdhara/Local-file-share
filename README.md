<div align="center">

# 🌐 Local File Share

**A lightning-fast, real-time LAN file-sharing application.**

[![Python](https://img.shields.io/badge/Python-3.7+-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Framework-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Android](https://img.shields.io/badge/Android-Native_App-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/)

*No cables. No USBs. Just pure WebSocket speed across your Wi-Fi network.*

[Explore Features](#-features) • [Download APK](#-android-app-apk) • [Desktop Setup](#-getting-started-desktop)

</div>

---

## 📖 Overview

**Local File Share** allows devices on the same Wi-Fi or local network to easily discover each other and share files or folders directly from the browser. Built with privacy and speed in mind, it features automatic compression, large file support, and a built-in admin hierarchy.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| ⚡ **Real-Time Discovery** | Instantly see who joins or leaves the network. Files appear in real-time via WebSockets—no page refresh needed! |
| 📂 **Folder & Drag-Drop** | Drag and drop support for single/multiple files. Folders are automatically compressed into `.zip` files upon upload. |
| 🚀 **Large File Support** | Move massive files across your network. Supports uploads up to **10GB**. |
| 👑 **Admin Privacy System** | The first device to connect becomes the **Server Admin**. Admins can view IPs and manage all files. Regular users are protected with hidden IPs. |
| 📊 **Download Tracking** | Keep track of how many times your shared files have been downloaded. |
| 📱 **Mobile Optimized** | A responsive, app-like UI that works flawlessly on smartphones and tablets, complete with touch optimizations. |
| 🛠️ **Zero Config** | No databases. No complex setups. Files are simply stored locally in the `uploads` directory. |

---

## 📱 Android App (APK)

Don't want to use a PC? **Turn your Android phone into the server host!**

<div align="center">

📥 **[DOWNLOAD THE LATEST APK](https://drive.google.com/file/d/1CuFyctbL2oMxtU4C_NJkPnnrqbNCaaHI/view?usp=drive_link)**

</div>

Built with **Chaquopy**, this native Android wrapper provides incredible flexibility:

- 🐍 **Embedded Python Server:** The app runs the Flask/Socket.IO server directly on the Android device. Your phone becomes the hub.
- 🖼️ **Integrated UI:** Uses an embedded WebView to display the rich web interface natively for the host.
- 💾 **Native File Handling:** Uploads go straight to `Downloads/LocalFileShare/uploads`. Downloads land in `Downloads/LocalFileShare/downloads`.
- 🏗️ **Easy Build:** Open the `android/` directory in Android Studio and build the Gradle project yourself.

---

## 🛠️ Tech Stack

<details>
<summary>Click to view the technologies powering this app</summary>

- **Backend:** `Python`, `Flask`, `Flask-SocketIO`, `Flask-CORS`, `Werkzeug`
- **Frontend:** `HTML5`, `CSS3`, `Vanilla JavaScript`, `Socket.IO Client`
- **Android:** `Java`, `WebView`, `Chaquopy (Python on Android)`
- **Styling/UI:** Custom CSS, `FontAwesome Icons`

</details>

---

## 🚀 Getting Started (Desktop)

Want to run the server from your PC? It takes less than 2 minutes.

### 📋 Prerequisites
- Python 3.7+
- pip (Python package installer)

### ⚙️ Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/local-file-share.git
   cd local-file-share
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ignite the Server:**
   ```bash
   python app.py
   ```

4. **Connect Your Devices:**
   Check your console output! It will print the local and network URLs. 
   - 💻 **Host Machine:** Open `http://localhost:5000`
   - 📱 **Other Devices:** Open the network URL (e.g., `http://192.168.1.X:5000`)

---

## 📁 File Structure

```text
📦 local-file-share
 ┣ 📂 android/             # Android app source code & Chaquopy config
 ┣ 📂 static/              # CSS styles and Frontend JavaScript
 ┣ 📂 templates/           # HTML templates (index.html)
 ┣ 📂 uploads/             # Auto-generated. Stores shared files & zips.
 ┣ 📜 app.py               # The main Flask & WebSocket server
 ┣ 📜 requirements.txt     # Python dependencies
 ┗ 📜 README.md            # You are here!
```

---

## 🛡️ Privacy Rules & Admin Privileges

Security and privacy are built into the connection flow:

> **👑 Who is the Admin?** 
> The host machine (connecting via `127.0.0.1`) OR the very first device to connect over the network automatically receives Admin rights.

- 👁️ **IP Visibility:** Only the Admin can see the true IP addresses of other connected devices.
- 🗑️ **File Moderation:** The Admin has the power to delete *any* file shared on the network. Regular users can only manage their *own* uploads.

---

## ⚠️ Important Notes

- **Temporary Storage:** Files are stored temporarily in the `uploads/` folder. They persist until manually deleted by the uploader or the Admin.
- **Network Trust:** This application is intended for use on trusted Local Area Networks (LAN). It does not implement user authentication beyond the session-based Admin role.

<div align="center">
  <br>
  Made with ❤️ for faster local sharing.
</div>
