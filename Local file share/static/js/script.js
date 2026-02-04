// Local File Share Application
class LocalFileShare {
    constructor() {
        this.socket = null;
        this.deviceId = this.generateDeviceId();
        this.deviceName = this.getDeviceName();
        this.currentFiles = [];
        this.myFiles = new Set();
        this.isAdmin = false;
        this.isServerAdmin = false;  // Server admin (can see all IPs)
        this.isMobile = this.checkIfMobile();
        this.deviceIP = 'Loading...';
        
        // Initialize the app
        this.init();
    }
    
    // Generate a unique device ID
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Get device name from localStorage or generate one
    getDeviceName() {
        let name = localStorage.getItem('deviceName');
        if (!name) {
            const randomNum = Math.floor(Math.random() * 9000) + 1000;
            name = `Device-${randomNum}`;
            localStorage.setItem('deviceName', name);
        }
        return name;
    }
    
    // Check if user is on mobile
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Initialize the application
    async init() {
        // Set device name in UI
        document.getElementById('device-name').textContent = this.deviceName;
        
        // Get local IP address
        await this.getLocalIP();
        
        // Setup mobile optimizations
        if (this.isMobile) {
            this.setupMobileOptimizations();
        }
        
        // Connect to WebSocket server
        this.connectSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Get server IP for display
        this.displayServerIP();
    }
    
    // Get local IP address
    async getLocalIP() {
        return new Promise((resolve) => {
            // Show loading initially
            document.getElementById('device-ip').textContent = 'Loading...';
            
            // Try using WebRTC to get local IP
            const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
            
            if (RTCPeerConnection) {
                try {
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    pc.createDataChannel('');
                    pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .catch(() => {
                            // Fallback if WebRTC fails
                            this.setFallbackIP();
                            resolve();
                        });
                    
                    pc.onicecandidate = (event) => {
                        if (event && event.candidate && event.candidate.candidate) {
                            const candidate = event.candidate.candidate;
                            const regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                            const matches = regex.exec(candidate);
                            
                            if (matches && matches[1]) {
                                this.deviceIP = matches[1];
                                document.getElementById('device-ip').textContent = this.deviceIP;
                                pc.onicecandidate = () => {};
                                pc.close();
                                resolve();
                            }
                        }
                    };
                    
                    // Timeout fallback
                    setTimeout(() => {
                        if (this.deviceIP === 'Loading...') {
                            this.setFallbackIP();
                            resolve();
                        }
                    }, 1000);
                    
                } catch (error) {
                    this.setFallbackIP();
                    resolve();
                }
            } else {
                this.setFallbackIP();
                resolve();
            }
        });
    }
    
    // Set fallback IP address
    setFallbackIP() {
        // Get IP from current URL
        const url = new URL(window.location.href);
        this.deviceIP = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
        document.getElementById('device-ip').textContent = this.deviceIP;
    }
    
    // Setup mobile optimizations
    setupMobileOptimizations() {
        document.body.classList.add('mobile');
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // Add touch feedback
        document.addEventListener('touchstart', function() {}, { passive: true });
    }
    
    // Connect to WebSocket server
    connectSocket() {
        this.socket = io({
            query: {
                name: this.deviceName,
                ip: this.deviceIP
            }
        });
        
        // Handle connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showToast('Connected to server', 'success');
            this.updateStatus(true);
        });
        
        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showToast('Connection failed. Retrying...', 'error');
            this.updateStatus(false);
        });
        
        // Handle client connected event
        this.socket.on('client_connected', (data) => {
            this.isAdmin = data.is_admin || false;
            this.isServerAdmin = data.is_server_admin || false;
            
            this.updateConnectedDevices(data.clients);
            document.getElementById('connection-count').textContent = data.total_clients;
            
            // Update admin badge if needed
            this.updateAdminUI();
            
            console.log(`User is ${this.isAdmin ? 'Admin' : 'Regular user'}, Server Admin: ${this.isServerAdmin}`);
        });
        
        // Handle client disconnected event
        this.socket.on('client_disconnected', (data) => {
            this.isAdmin = data.is_admin || false;
            this.isServerAdmin = data.is_server_admin || false;
            
            this.updateConnectedDevices(data.clients);
            document.getElementById('connection-count').textContent = data.total_clients;
            
            // Update admin badge if needed
            this.updateAdminUI();
        });
        
        // Handle files updated event
        this.socket.on('files_updated', (data) => {
            this.currentFiles = data.files;
            this.markMyFiles();
            this.renderFiles();
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            this.updateStatus(false);
            this.showToast('Disconnected from server', 'error');
        });
    }
    
    // Update admin UI indicators
    updateAdminUI() {
        const adminIndicator = document.querySelector('.admin-indicator');
        if (!adminIndicator) {
            // Create admin indicator if it doesn't exist
            const header = document.querySelector('header h1');
            if (header && this.isAdmin) {
                const indicator = document.createElement('span');
                indicator.className = 'admin-indicator';
                indicator.innerHTML = '<i class="fas fa-crown"></i> Admin';
                indicator.style.cssText = `
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-left: 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                `;
                header.appendChild(indicator);
            }
        } else {
            adminIndicator.style.display = this.isAdmin ? 'inline-flex' : 'none';
        }
        
        // Update page title if admin
        if (this.isAdmin) {
            document.title = 'Local File Share (Admin)';
        }
    }
    
    // Update connection status in UI
    updateStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status');
        
        if (connected) {
            statusDot.style.backgroundColor = '#10b981';
            statusText.textContent = 'Connected';
            statusText.style.backgroundColor = '#d1fae5';
            statusText.style.color = '#065f46';
        } else {
            statusDot.style.backgroundColor = '#ef4444';
            statusText.textContent = 'Disconnected';
            statusText.style.backgroundColor = '#fee2e2';
            statusText.style.color = '#991b1b';
        }
    }
    
    // Update connected devices list
    updateConnectedDevices(clients) {
        const devicesList = document.getElementById('devices-list');
        const currentSid = this.socket.id;
        
        if (clients.length === 0) {
            devicesList.innerHTML = '<div class="empty-device">No devices connected</div>';
            return;
        }
        
        devicesList.innerHTML = '';
        
        clients.forEach(client => {
            const isCurrent = client.sid === currentSid;
            const isAdminDevice = client.is_admin || false;
            
            // Determine what IP to show
            let displayIP = client.ip;
            if (!isCurrent && !this.isAdmin) {
                // Non-admin users can't see other devices' IPs
                displayIP = 'Hidden';
            }
            
            const deviceItem = document.createElement('div');
            deviceItem.className = 'device-item';
            
            deviceItem.innerHTML = `
                <div class="device-icon ${isAdminDevice ? 'admin' : ''}">
                    <i class="fas fa-laptop"></i>
                    ${isAdminDevice ? '<i class="fas fa-crown admin-badge"></i>' : ''}
                </div>
                <div class="device-details">
                    <h4>
                        ${client.name} 
                        ${isCurrent ? '<span class="you-badge">You</span>' : ''}
                        ${isAdminDevice ? '<span class="admin-badge-text">Admin</span>' : ''}
                    </h4>
                    <p class="device-ip">
                        <i class="fas fa-network-wired"></i> ${displayIP}
                    </p>
                </div>
                <div class="device-status ${isCurrent ? 'online' : 'offline'}">
                    <div class="status-dot-small"></div>
                </div>
            `;
            
            devicesList.appendChild(deviceItem);
        });
    }
    
    // Setup all event listeners
    setupEventListeners() {
        // File upload
        const dropArea = document.getElementById('drop-area');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-btn');
        
        // Browse button
        browseBtn.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        
        // Drag and drop
        this.setupDragAndDrop(dropArea);
        
        // Folder sharing
        document.getElementById('share-folder-btn').addEventListener('click', () => this.shareFolder());
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // File search
        document.getElementById('search-files').addEventListener('input', (e) => this.searchFiles(e.target.value));
        
        // Clear my files
        document.getElementById('clear-my-files').addEventListener('click', () => this.clearMyFiles());
    }
    
    // Setup drag and drop functionality
    setupDragAndDrop(dropArea) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.style.borderColor = '#8b5cf6';
                dropArea.style.backgroundColor = '#ede9fe';
            }, false);
        });
        
        // Remove highlight
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.style.borderColor = '#cbd5e1';
                dropArea.style.backgroundColor = '#f1f5f9';
            }, false);
        });
        
        // Handle dropped files
        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileUpload(files);
        }, false);
    }
    
    // Prevent default event behaviors
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Handle file upload
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        // Check if connected
        if (!this.socket || !this.socket.connected) {
            this.showToast('Not connected to server', 'error');
            return;
        }
        
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }
        formData.append('client_sid', this.socket.id);
        
        // Show upload progress
        const progress = this.showUploadProgress();
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Add files to my files list
            result.files.forEach(file => {
                this.myFiles.add(file.id);
            });
            
            this.updateMyFilesCount();
            this.renderFiles();
            this.showToast(`Uploaded ${files.length} file(s) successfully`, 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast(`Upload failed: ${error.message}`, 'error');
        } finally {
            // Clear file input and hide progress
            document.getElementById('file-input').value = '';
            this.hideUploadProgress(progress);
        }
    }
    
    // Share folder
    async shareFolder() {
        const folderPath = document.getElementById('folder-path').value.trim();
        
        if (!folderPath) {
            this.showToast('Please enter a folder path', 'error');
            return;
        }
        
        if (!this.socket || !this.socket.connected) {
            this.showToast('Not connected to server', 'error');
            return;
        }
        
        const progress = this.showUploadProgress('Sharing folder...');
        
        try {
            const response = await fetch('/share-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `folder_path=${encodeURIComponent(folderPath)}&client_sid=${this.socket.id}`
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.myFiles.add(result.file.id);
            this.updateMyFilesCount();
            this.renderFiles();
            this.showToast('Folder shared successfully', 'success');
            
            // Clear input
            document.getElementById('folder-path').value = '';
            
        } catch (error) {
            console.error('Folder share error:', error);
            this.showToast(`Folder share failed: ${error.message}`, 'error');
        } finally {
            this.hideUploadProgress(progress);
        }
    }
    
    // Mark which files belong to current user
    markMyFiles() {
        this.currentFiles.forEach(file => {
            file.owned_by_me = this.myFiles.has(file.id);
        });
    }
    
    // Render all files
    renderFiles() {
        this.renderAllFiles();
        this.renderMyFiles();
        this.updateMyFilesCount();
    }
    
    // Render all shared files
    renderAllFiles() {
        const container = document.getElementById('all-files-list');
        const searchTerm = document.getElementById('search-files').value.toLowerCase();
        
        let filteredFiles = this.currentFiles;
        
        // Apply search filter
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file => 
                file.name.toLowerCase().includes(searchTerm) ||
                file.client_name.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filteredFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No files found</p>
                    ${searchTerm ? '<p class="subtext">Try a different search term</p>' : ''}
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        filteredFiles.forEach(file => {
            const fileCard = this.createFileCard(file, false);
            container.appendChild(fileCard);
        });
    }
    
    // Render user's own files
    renderMyFiles() {
        const container = document.getElementById('my-files-list');
        const myFiles = this.currentFiles.filter(file => file.owned_by_me);
        
        if (myFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-upload"></i>
                    <p>You haven't shared any files yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        myFiles.forEach(file => {
            const fileCard = this.createFileCard(file, true);
            container.appendChild(fileCard);
        });
    }
    
    // Create file card element
    createFileCard(file, isMyFile) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.fileId = file.id;
        
        const iconClass = file.is_folder ? 'folder' : '';
        const folderBadge = file.is_folder ? '<span class="folder-badge">Folder</span>' : '';
        
        const removeBtn = isMyFile || this.isAdmin ? `
            <button class="action-btn remove-btn" data-file-id="${file.id}" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        ` : '';
        
        // Determine what IP to show
        let displayIP = file.client_ip;
        if (!this.isAdmin && !isMyFile) {
            // Non-admin users can't see other users' IPs in file details
            displayIP = 'Hidden';
        }
        
        card.innerHTML = `
            <div class="file-header">
                <div class="file-icon ${iconClass}">
                    <i class="fas ${file.is_folder ? 'fa-folder' : 'fa-file'}"></i>
                </div>
                <div class="file-info">
                    <h4 title="${file.name}">${file.name} ${folderBadge}</h4>
                    <div class="file-meta">
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        <span>${this.formatTime(file.upload_time)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${removeBtn}
                </div>
            </div>
            
            <div class="file-owner">
                <i class="fas fa-user owner-icon"></i>
                Shared by: ${file.client_name}
                ${displayIP !== 'Hidden' ? `(${displayIP})` : ''}
            </div>
            
            <div class="file-stats">
                <button class="download-btn" data-file-id="${file.id}">
                    <i class="fas fa-download"></i> Download
                </button>
                <div class="download-count">
                    <i class="fas fa-download"></i> ${file.download_count}
                </div>
            </div>
        `;
        
        // Add event listeners
        const downloadBtn = card.querySelector('.download-btn');
        const removeBtnEl = card.querySelector('.remove-btn');
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadFile(file.id));
        }
        
        if (removeBtnEl) {
            removeBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(file.id);
            });
        }
        
        return card;
    }
    
    // Download file
    downloadFile(fileId) {
        try {
            // Open in new tab
            window.open(`/download/${fileId}`, '_blank');
            
            // Update download count locally
            const file = this.currentFiles.find(f => f.id === fileId);
            if (file) {
                file.download_count += 1;
                this.renderFiles();
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }
    
    // Remove file
    async removeFile(fileId) {
        if (!confirm('Are you sure you want to remove this file?')) {
            return;
        }
        
        try {
            const response = await fetch(`/remove-file/${fileId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_sid: this.socket.id
                })
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.myFiles.delete(fileId);
            this.updateMyFilesCount();
            this.showToast('File removed successfully', 'success');
            
        } catch (error) {
            console.error('Remove error:', error);
            this.showToast(`Remove failed: ${error.message}`, 'error');
        }
    }
    
    // Clear all user's files
    async clearMyFiles() {
        if (this.myFiles.size === 0) {
            this.showToast('No files to remove', 'info');
            return;
        }
        
        if (!confirm(`Remove all ${this.myFiles.size} files you shared?`)) {
            return;
        }
        
        const filesToRemove = Array.from(this.myFiles);
        
        for (const fileId of filesToRemove) {
            await this.removeFile(fileId);
        }
        
        this.myFiles.clear();
        this.updateMyFilesCount();
        this.showToast('All files removed', 'success');
    }
    
    // Search files
    searchFiles(searchTerm) {
        this.renderAllFiles();
    }
    
    // Switch tabs
    switchTab(tabId) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });
        
        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
    }
    
    // Update my files count badge
    updateMyFilesCount() {
        document.getElementById('my-files-count').textContent = this.myFiles.size;
    }
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Format time
    formatTime(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        } catch (e) {
            return 'Just now';
        }
    }
    
    // Display server IP
    displayServerIP() {
        const url = new URL(window.location.href);
        const serverIP = url.hostname === 'localhost' ? '127.0.0.1:5000' : url.host;
        document.getElementById('server-ip').textContent = serverIP;
    }
    
    // Show upload progress
    showUploadProgress(message = 'Uploading...') {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'upload-progress';
        progressDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
        `;
        
        progressDiv.innerHTML = `
            <div style="text-align: center; padding: 30px; background: white; border-radius: 15px; color: #333;">
                <div class="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #4f46e5;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p style="font-size: 18px; font-weight: 600; color: #4f46e5;">${message}</p>
                <p style="color: #666; margin-top: 10px;">Please wait...</p>
            </div>
        `;
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(progressDiv);
        return progressDiv;
    }
    
    // Hide upload progress
    hideUploadProgress(progressDiv) {
        if (progressDiv && progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#4f46e5'};
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s ease;
            max-width: 90%;
            text-align: center;
            word-break: break-word;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Add slide up animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for required elements
    if (!document.getElementById('device-ip')) {
        console.error('Required element #device-ip not found');
        return;
    }
    
    // Create and start the app
    window.app = new LocalFileShare();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    // Log app start
    console.log('Local File Share app started');
});