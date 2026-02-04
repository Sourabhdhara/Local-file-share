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

# Fix for Python 3.14 compatibility
if sys.version_info >= (3, 14):
    import pkgutil
    import importlib
    
    def get_loader_compatible(fullname):
        try:
            spec = importlib.util.find_spec(fullname)
            if spec is not None and spec.loader is not None:
                return spec.loader
        except:
            pass
        
        try:
            module = importlib.import_module(fullname)
            if hasattr(module, '__loader__'):
                return module.__loader__
        except:
            pass
        
        return None
    
    pkgutil.get_loader = get_loader_compatible

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.config['SECRET_KEY'] = 'local-file-share-secret-key'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 10000 * 1024 * 1024 * 1024  # 10000GB max file size
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'mp3', 'mp4', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}

socketio = SocketIO(app, cors_allowed_origins="*")

# Store shared files and connected clients
shared_files = {}
connected_clients = {}
admin_sid = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def create_upload_folder():
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

def cleanup_old_files():
    while True:
        time.sleep(60)
        files_to_remove = []
        
        for file_id, file_data in list(shared_files.items()):
            client_sid = file_data['client_sid']
            if client_sid not in connected_clients:
                file_path = file_data['file_path']
                if os.path.exists(file_path):
                    os.remove(file_path)
                files_to_remove.append(file_id)
        
        for file_id in files_to_remove:
            shared_files.pop(file_id, None)
        
        if files_to_remove:
            socketio.emit('files_updated', {'files': get_files_list()})

# Start cleanup thread
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
    client_sid = request.form.get('client_sid')
    
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
            file_data = {
                'id': file_id,
                'name': filename,
                'unique_name': unique_filename,
                'size': os.path.getsize(file_path),
                'upload_time': datetime.now().isoformat(),
                'client_sid': client_sid,
                'client_name': connected_clients[client_sid]['name'],
                'client_ip': connected_clients[client_sid]['ip'],
                'file_path': file_path,
                'is_folder': False,
                'download_count': 0
            }
            
            shared_files[file_id] = file_data
            uploaded_files.append(file_data)
    
    socketio.emit('files_updated', {'files': get_files_list()})
    
    return jsonify({
        'message': 'Files uploaded successfully',
        'files': uploaded_files
    })

@app.route('/download/<file_id>')
def download_file(file_id):
    if file_id not in shared_files:
        return jsonify({'error': 'File not found'}), 404
    
    file_data = shared_files[file_id]
    file_path = file_data['file_path']
    
    file_data['download_count'] += 1
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_data['name']
    )

@app.route('/share-folder', methods=['POST'])
def share_folder():
    client_sid = request.form.get('client_sid')
    folder_path = request.form.get('folder_path')
    
    if not folder_path or not os.path.isdir(folder_path):
        return jsonify({'error': 'Invalid folder path'}), 400
    
    folder_name = os.path.basename(folder_path)
    zip_filename = f"{uuid.uuid4().hex}_{folder_name}.zip"
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    
    file_id = str(uuid.uuid4())
    file_data = {
        'id': file_id,
        'name': folder_name,
        'unique_name': zip_filename,
        'size': os.path.getsize(zip_path),
        'upload_time': datetime.now().isoformat(),
        'client_sid': client_sid,
        'client_name': connected_clients[client_sid]['name'],
        'client_ip': connected_clients[client_sid]['ip'],
        'file_path': zip_path,
        'is_folder': True,
        'download_count': 0
    }
    
    shared_files[file_id] = file_data
    
    socketio.emit('files_updated', {'files': get_files_list()})
    
    return jsonify({
        'message': 'Folder shared successfully',
        'file': file_data
    })

@app.route('/remove-file/<file_id>', methods=['POST'])
def remove_file(file_id):
    if file_id not in shared_files:
        return jsonify({'error': 'File not found'}), 404
    
    file_data = shared_files[file_id]
    client_sid = request.json.get('client_sid')
    
    if client_sid != file_data['client_sid'] and client_sid != admin_sid:
        return jsonify({'error': 'Permission denied'}), 403
    
    if os.path.exists(file_data['file_path']):
        os.remove(file_data['file_path'])
    
    del shared_files[file_id]
    
    socketio.emit('files_updated', {'files': get_files_list()})
    
    return jsonify({'message': 'File removed successfully'})

def get_files_list():
    files_list = []
    for file_id, file_data in shared_files.items():
        files_list.append({
            'id': file_id,
            'name': file_data['name'],
            'size': file_data['size'],
            'upload_time': file_data['upload_time'],
            'client_name': file_data['client_name'],
            'client_ip': file_data['client_ip'],  # IP will be filtered on frontend based on admin status
            'is_folder': file_data['is_folder'],
            'download_count': file_data['download_count'],
            'owned_by_me': False
        })
    return files_list

@socketio.on('connect')
def handle_connect():
    client_ip = request.remote_addr
    client_name = request.args.get('name', f'Device-{str(uuid.uuid4())[:8]}')
    client_data = {
        'sid': request.sid,
        'name': client_name,
        'ip': client_ip,
        'connected_at': datetime.now().isoformat()
    }
    
    connected_clients[request.sid] = client_data
    
    global admin_sid
    if admin_sid is None:
        admin_sid = request.sid
        client_data['is_admin'] = True
        print(f"Admin device connected: {client_name} ({client_ip})")
    else:
        client_data['is_admin'] = False
    
    # Send filtered client list to all clients
    update_all_clients()
    
    # Send files to new client
    emit('files_updated', {'files': get_files_list()})
    
    print(f"Client connected: {client_name} ({client_ip})")

def update_all_clients():
    """Update all clients with filtered device list based on admin status"""
    for client_sid in list(connected_clients.keys()):
        try:
            is_admin = (client_sid == admin_sid)
            filtered_clients = []
            
            for sid, client_data in connected_clients.items():
                # Create a copy to avoid modifying original
                filtered_client = client_data.copy()
                
                # Only admin can see real IPs
                if not is_admin and sid != client_sid:
                    # Hide IP from non-admin users for other devices
                    filtered_client['ip'] = 'Hidden'
                
                filtered_clients.append(filtered_client)
            
            emit('client_connected', {
                'clients': filtered_clients,
                'total_clients': len(connected_clients),
                'is_admin': is_admin,
                'is_server_admin': (client_sid == admin_sid)
            }, room=client_sid)
        except Exception as e:
            print(f"Error updating client {client_sid}: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    client_sid = request.sid
    
    if client_sid in connected_clients:
        del connected_clients[client_sid]
        
        # If admin disconnected, assign new admin
        global admin_sid
        if client_sid == admin_sid and connected_clients:
            # Assign first connected client as new admin
            admin_sid = next(iter(connected_clients.keys()))
            connected_clients[admin_sid]['is_admin'] = True
            print(f"New admin assigned: {connected_clients[admin_sid]['name']}")
        
        # Update all remaining clients
        update_all_clients()
        
        print(f"Client disconnected: {client_sid}")

if __name__ == '__main__':
    create_upload_folder()
    
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print("\n" + "="*50)
    print("Local File Share Server Started!")
    print("="*50)
    print(f"Admin Panel:   http://localhost:5000")
    print(f"Network URL:   http://{local_ip}:5000")
    print("="*50)
    print("IMPORTANT: First connected device becomes Admin")
    print("Admin can see all IPs, others can only see their own IP")
    print("="*50 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)