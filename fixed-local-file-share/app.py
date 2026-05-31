from flask import Flask, render_template, request, send_file, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import uuid
import threading
import time
import sys
from datetime import datetime
from werkzeug.utils import secure_filename
import zipfile
import socket

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.config['SECRET_KEY'] = 'local-file-share-secret-key'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024  # 10GB max
app.config['ALLOWED_EXTENSIONS'] = {
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip',
    'mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
}

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    logger=False,
    engineio_logger=False
)

# Store shared files and connected clients
shared_files = {}
connected_clients = {}
admin_sid = None
lock = threading.Lock()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def create_upload_folder():
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])


def cleanup_old_files():
    while True:
        time.sleep(60)
        with lock:
            files_to_remove = [
                fid for fid, fd in list(shared_files.items())
                if fd['client_sid'] not in connected_clients
            ]
            for file_id in files_to_remove:
                fd = shared_files.pop(file_id, None)
                if fd and os.path.exists(fd['file_path']):
                    os.remove(fd['file_path'])
        if files_to_remove:
            socketio.emit('files_updated', {'files': get_files_list()})


cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    files = request.files.getlist('file')
    client_sid = request.form.get('client_sid', '')

    with lock:
        if not client_sid or client_sid not in connected_clients:
            return jsonify({'error': 'Client not connected'}), 400

    uploaded_files = []
    for file in files:
        if file.filename == '':
            continue
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            file_id = str(uuid.uuid4())
            with lock:
                client_info = connected_clients.get(client_sid, {})
                file_data = {
                    'id': file_id,
                    'name': filename,
                    'unique_name': unique_filename,
                    'size': os.path.getsize(file_path),
                    'upload_time': datetime.now().isoformat(),
                    'client_sid': client_sid,
                    'client_name': client_info.get('name', 'Unknown'),
                    'client_ip': client_info.get('ip', 'Unknown'),
                    'file_path': file_path,
                    'is_folder': False,
                    'download_count': 0
                }
                shared_files[file_id] = file_data
                uploaded_files.append(file_data)

    socketio.emit('files_updated', {'files': get_files_list()})
    return jsonify({'message': 'Files uploaded successfully', 'files': uploaded_files})


@app.route('/download/<file_id>')
def download_file(file_id):
    with lock:
        if file_id not in shared_files:
            return jsonify({'error': 'File not found'}), 404
        file_data = shared_files[file_id]
        file_data['download_count'] += 1

    return send_file(
        file_data['file_path'],
        as_attachment=True,
        download_name=file_data['name']
    )


@app.route('/share-folder', methods=['POST'])
def share_folder():
    client_sid = request.form.get('client_sid', '')
    folder_path = request.form.get('folder_path', '')

    if not folder_path or not os.path.isdir(folder_path):
        return jsonify({'error': 'Invalid folder path'}), 400

    folder_name = os.path.basename(folder_path)
    zip_filename = f"{uuid.uuid4().hex}_{folder_name}.zip"
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                fp = os.path.join(root, file)
                zipf.write(fp, os.path.relpath(fp, folder_path))

    file_id = str(uuid.uuid4())
    with lock:
        client_info = connected_clients.get(client_sid, {})
        file_data = {
            'id': file_id,
            'name': folder_name,
            'unique_name': zip_filename,
            'size': os.path.getsize(zip_path),
            'upload_time': datetime.now().isoformat(),
            'client_sid': client_sid,
            'client_name': client_info.get('name', 'Unknown'),
            'client_ip': client_info.get('ip', 'Unknown'),
            'file_path': zip_path,
            'is_folder': True,
            'download_count': 0
        }
        shared_files[file_id] = file_data

    socketio.emit('files_updated', {'files': get_files_list()})
    return jsonify({'message': 'Folder shared successfully', 'file': file_data})


@app.route('/remove-file/<file_id>', methods=['POST'])
def remove_file(file_id):
    with lock:
        if file_id not in shared_files:
            return jsonify({'error': 'File not found'}), 404
        file_data = shared_files[file_id]
        client_sid = request.json.get('client_sid', '')
        if client_sid != file_data['client_sid'] and client_sid != admin_sid:
            return jsonify({'error': 'Permission denied'}), 403
        if os.path.exists(file_data['file_path']):
            os.remove(file_data['file_path'])
        del shared_files[file_id]

    socketio.emit('files_updated', {'files': get_files_list()})
    return jsonify({'message': 'File removed successfully'})


def get_files_list():
    with lock:
        return [{
            'id': fid,
            'name': fd['name'],
            'size': fd['size'],
            'upload_time': fd['upload_time'],
            'client_name': fd['client_name'],
            'client_ip': fd['client_ip'],
            'is_folder': fd['is_folder'],
            'download_count': fd['download_count'],
            'owned_by_me': False
        } for fid, fd in shared_files.items()]


def build_client_list_for(viewer_sid):
    """Return the client list with IPs filtered for non-admins."""
    is_admin = (viewer_sid == admin_sid)
    result = []
    for sid, cd in connected_clients.items():
        entry = cd.copy()
        if not is_admin and sid != viewer_sid:
            entry['ip'] = 'Hidden'
        result.append(entry)
    return result


@socketio.on('connect')
def handle_connect():
    global admin_sid
    client_ip = request.remote_addr
    client_name = request.args.get('name', f'Device-{str(uuid.uuid4())[:8]}')
    current_sid = request.sid

    with lock:
        client_data = {
            'sid': current_sid,
            'name': client_name,
            'ip': client_ip,
            'connected_at': datetime.now().isoformat(),
            'is_admin': False
        }
        connected_clients[current_sid] = client_data

        if admin_sid is None:
            admin_sid = current_sid
            client_data['is_admin'] = True

    # ── Send state to the NEW client (bare emit = works in request context) ──
    with lock:
        is_admin = (current_sid == admin_sid)
        clients_for_me = build_client_list_for(current_sid)

    emit('client_connected', {
        'clients': clients_for_me,
        'total_clients': len(connected_clients),
        'is_admin': is_admin,
        'is_server_admin': is_admin
    })
    emit('files_updated', {'files': get_files_list()})

    # ── Notify every OTHER already-connected client in a background thread ──
    # Using a thread avoids emitting to other rooms inside the connect handler,
    # which can be dropped in threading mode before handshake completes.
    def notify_others():
        time.sleep(0.1)          # tiny delay — let current handshake finish
        with lock:
            others = [s for s in connected_clients if s != current_sid]
        for other_sid in others:
            with lock:
                if other_sid not in connected_clients:
                    continue
                is_other_admin = (other_sid == admin_sid)
                clients_for_other = build_client_list_for(other_sid)
            socketio.emit('client_connected', {
                'clients': clients_for_other,
                'total_clients': len(connected_clients),
                'is_admin': is_other_admin,
                'is_server_admin': is_other_admin
            }, to=other_sid)

    threading.Thread(target=notify_others, daemon=True).start()
    print(f"Connected: {client_name} ({client_ip}) sid={current_sid}")


@socketio.on('disconnect')
def handle_disconnect():
    global admin_sid
    current_sid = request.sid

    with lock:
        connected_clients.pop(current_sid, None)
        if current_sid == admin_sid:
            admin_sid = next(iter(connected_clients), None)
            if admin_sid:
                connected_clients[admin_sid]['is_admin'] = True

    # Notify remaining clients
    def notify_all():
        time.sleep(0.05)
        with lock:
            remaining = list(connected_clients.keys())
        for other_sid in remaining:
            with lock:
                if other_sid not in connected_clients:
                    continue
                is_other_admin = (other_sid == admin_sid)
                clients_for_other = build_client_list_for(other_sid)
            socketio.emit('client_connected', {
                'clients': clients_for_other,
                'total_clients': len(connected_clients),
                'is_admin': is_other_admin,
                'is_server_admin': is_other_admin
            }, to=other_sid)

    threading.Thread(target=notify_all, daemon=True).start()
    print(f"Disconnected: {current_sid}")


if __name__ == '__main__':
    create_upload_folder()

    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = '127.0.0.1'

    print("\n" + "="*50)
    print("Local File Share Server Started!")
    print("="*50)
    print(f"Local:    http://localhost:5000")
    print(f"Network:  http://{local_ip}:5000")
    print("="*50)
    print("First device to connect becomes Admin.")
    print("="*50 + "\n")

    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
