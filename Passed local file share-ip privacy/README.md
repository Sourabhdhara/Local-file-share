# Local File Share (Flask + Socket.IO)

A small local network file sharing server built with Flask and Flask-SocketIO.

## Overview

This project provides a simple local file sharing server that lets devices on the same network upload, share, and download files. It uses WebSockets (Socket.IO) to keep connected clients updated in real time and includes an admin device concept (the first connected device becomes admin and can see all IPs).

Key features:
- Real-time client/connect list via Socket.IO
- File upload and download endpoints
- Share entire folders (zipped on server)
- Basic cleanup routine to remove files when client disconnects

## Requirements

- Python 3.10+ (compatible with later versions — includes a compatibility guard for Python 3.14)
- See `requirements.txt` for pinned dependencies:

```
Flask==2.3.2
Flask-SocketIO==5.3.4
Flask-CORS==4.0.0
python-socketio==5.9.0
eventlet==0.33.3
Werkzeug==2.3.6
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

## Run (development)

Create the upload folder (the app will also create it automatically):

```bash
mkdir uploads
```

Start the server:

```bash
python app.py
```

Open the admin UI in a browser:

http://localhost:5000

Or access the server on the local network using the printed network URL.

Note: the app uses `socketio.run()` and ships a small compatibility workaround for Python 3.14 — use a reasonably recent Python interpreter.

## Endpoints & Socket events (overview)

- `GET /` — Serves the main UI (`templates/index.html`).
- `POST /upload` — Upload file(s); expects form field `file` and `client_sid`.
- `GET /download/<file_id>` — Download a shared file.
- `POST /share-folder` — Share a folder path (server-side); responds with a zipped archive added to shared files.
- `POST /remove-file/<file_id>` — Remove a shared file (must be owner or admin).

Socket events (server-side):
- `connect` / `disconnect` — client lifecycle handling
- `files_updated` — broadcast when shared files change
- `client_connected` — per-client update of connected devices list

## Configuration

Configurable settings inside `app.py`:

- `app.config['SECRET_KEY']` — Flask secret key.
- `app.config['UPLOAD_FOLDER']` — where uploaded files and folder-zips are stored (default `uploads`).
- `app.config['MAX_CONTENT_LENGTH']` — max upload size.
- `app.config['ALLOWED_EXTENSIONS']` — set of allowed file extensions.

Adjust these values near the top of `app.py` as needed.

## File structure

- `app.py` — main Flask + Socket.IO server.
- `requirements.txt` — Python dependencies.
- `templates/index.html` — front-end UI.
- `static/` — CSS and JS used by the UI.
- `uploads/` — runtime directory where uploaded files and shared folder zips are stored.

## Security & Privacy notes

- The first device to connect becomes the admin and can see the real IP addresses of all clients; other devices see only their own IP.
- The server exposes upload and download endpoints on the local network; run only on trusted networks.
- There is no authentication built in — if you need access control, add authentication (API keys, OAuth, or a simple login) before exposing the server beyond a trusted LAN.

## Customization ideas

- Add authentication and role management for better access control.
- Persist shared files metadata to a lightweight DB instead of an in-memory dict (`shared_files`).
- Add limits and quotas per client and progress reporting for uploads.

## Troubleshooting

- If Socket.IO clients cannot connect, ensure `eventlet` is installed and the firewall allows port 5000.
- If you see errors about Werkzeug or newer Python versions, the compatibility workaround in `app.py` helps; consider using Python 3.11 or 3.12 for stable behavior.

## License

Add your preferred license to the repository (e.g., `MIT`).

---

If you'd like, I can:
- add a minimal `README` badge and license file,
- add a Dockerfile or systemd unit to run the server as a service,
- or wire a simple username-based auth flow into the UI.
