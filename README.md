# Local File Share Application

A fast, real-time local area network (LAN) file sharing application built with Flask, WebSockets (Flask-SocketIO), and Vanilla JavaScript. It allows devices on the same Wi-Fi or local network to easily discover each other and share files or folders directly from the browser, with built-in privacy and admin controls.

## ✨ Features

- **Real-Time Discovery & Updates**: Instantly see who joins or leaves the network, and watch files appear in real-time without refreshing the page using WebSockets.
- **File & Folder Sharing**: Drag and drop support for single or multiple files. Folders are automatically compressed into `.zip` files upon upload.
- **Large File Support**: Supports uploads up to 10GB.
- **Privacy & Security (Admin System)**: 
  - The first device to connect (or the host device) automatically becomes the **Server Admin**.
  - **Admins** can see the IP addresses of all connected devices and remove any shared file.
  - **Regular users** have their IP addresses hidden from each other and can only delete the files they uploaded.
- **Download Tracking**: See how many times a file has been downloaded.
- **Mobile Optimized**: Responsive design that works flawlessly on smartphones and tablets, complete with touch optimizations.
- **Zero Configuration**: No database required. Files are stored locally in the `uploads` directory.

## 📱 Android App (APK)

📥 **[Download the latest APK here](https://drive.google.com/file/d/1CuFyctbL2oMxtU4C_NJkPnnrqbNCaaHI/view?usp=drive_link)**

The project includes a fully functional Android app built using **Chaquopy**, allowing any Android device to act as the server host natively:
- **Embedded Python Server**: The app runs the Flask/Socket.IO server directly on the Android device using `mobile_server.py`. You don't need a PC—your phone becomes the local network file sharing hub.
- **Integrated UI**: The app uses an embedded WebView to display the standard web interface for the host device.
- **Native File Handling**: Files uploaded to the Android host are saved natively to the `Downloads/LocalFileShare/uploads` directory. When downloading files via the app, they go directly to `Downloads/LocalFileShare/downloads`.
- **Easy Build**: You can build the APK natively via Android Studio by opening the `android/` directory and building the gradle project.

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO, Flask-CORS, Werkzeug
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Socket.IO Client
- **Android:** Java, WebView, Chaquopy (Python on Android)
- **Icons:** FontAwesome

## 🚀 Getting Started (Desktop)

### Prerequisites
- Python 3.7+
- pip (Python package installer)

### Installation

1. **Clone or Download the Repository:**
   Ensure you have the project files on your local machine.

2. **Install Dependencies:**
   Navigate to the project directory and install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application:**
   Start the server by running:
   ```bash
   python app.py
   ```

4. **Connect Devices:**
   Once the server starts, it will print the local and network URLs to the console. 
   - On the host machine, open: `http://localhost:5000`
   - On other devices on the same network, open the network URL (e.g., `http://192.168.1.X:5000`)

## 📁 File Structure

- `app.py`: The main Flask server application, handling HTTP routing, WebSocket events, and file management.
- `android/`: The Android project containing the Java wrapper and Chaquopy configuration.
- `requirements.txt`: Python package dependencies.
- `templates/index.html`: The main user interface.
- `static/css/style.css`: Application styling.
- `static/js/script.js`: Client-side logic for WebSockets, UI interactions, and file uploads.
- `uploads/`: Directory where all shared files and zipped folders are temporarily stored.

## 🛡️ Privacy Rules & Admin Privileges

- **Who is Admin?** The host machine (connecting via `127.0.0.1`) or the very first device to connect over the network becomes the Admin.
- **IP Visibility:** Only the Admin can see the IP addresses of other connected devices.
- **File Moderation:** The Admin can delete *any* file shared on the network. Regular users can only manage their *own* shared files.

## ⚠️ Notes

- Files are stored temporarily in the `uploads/` folder and persist until manually deleted by a user or the Admin.
- This application is intended for use on trusted Local Area Networks (LAN). It does not implement user authentication beyond the session-based Admin role.
