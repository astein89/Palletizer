# Network Access Configuration

This guide explains how to access the Palletizer application from other devices on your network.

## Backend Server Configuration

The backend server is configured to listen on all network interfaces (`0.0.0.0`) by default, allowing external access.

### Finding Your IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### Accessing from Other Devices

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   The server will run on `http://0.0.0.0:3001`

2. **Start the frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://0.0.0.0:3000`

3. **Access from other devices:**
   - Find your computer's IP address (see above)
   - On another device, open a browser and navigate to: `http://<your-ip-address>:3000`
   - Example: `http://192.168.1.100:3000`

## Environment Variables

### Backend (.env file in backend directory)

Create a `.env` file in the `backend` directory:

```env
PORT=3001
HOST=0.0.0.0
DB_PATH=./data/palletizer.db
JWT_SECRET=your-secret-key-here
```

### Frontend (.env file in frontend directory)

For external access, create a `.env` file in the `frontend` directory:

**Option 1: Set API URL directly (Recommended)**
```env
VITE_API_URL=http://<your-ip-address>:3001/api
```

Replace `<your-ip-address>` with your actual IP address.

**Example:**
```env
VITE_API_URL=http://192.168.1.100:3001/api
```

**Option 2: Set Vite proxy target**
```env
VITE_API_TARGET=http://<your-ip-address>:3001
```

**Note:** The frontend will auto-detect if you're accessing via IP address and try to connect to the backend on the same IP. However, setting `VITE_API_URL` explicitly is more reliable.

## Firewall Configuration

You may need to allow incoming connections through your firewall:

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter ports `3000` and `3001`
6. Allow the connection
7. Apply to all profiles

**Mac Firewall:**
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Node.js to allowed applications

**Linux (ufw):**
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

## Troubleshooting

### Cannot connect from other devices

1. **Check firewall settings** - Make sure ports 3000 and 3001 are open
2. **Verify IP address** - Ensure you're using the correct IP address
3. **Check network** - Ensure all devices are on the same network
4. **Check server logs** - Verify the server is listening on `0.0.0.0`

### API requests fail from external devices

1. **Update VITE_API_URL** - Make sure the frontend `.env` file has the correct IP address
2. **Restart frontend** - After changing `.env`, restart the Vite dev server
3. **Check CORS** - The backend CORS is configured to allow all origins, but verify it's working

### Production Deployment

For production deployment, consider:
- Using a reverse proxy (nginx, Apache)
- Setting up SSL/TLS certificates
- Using environment-specific configuration
- Implementing proper security measures
