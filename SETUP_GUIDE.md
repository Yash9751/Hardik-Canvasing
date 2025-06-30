# 🔗 Backend & Frontend Connection Setup Guide

## 📋 **Current Status: Partially Connected**

The backend and frontend are **structurally connected** but need some configuration to work properly on mobile devices.

## 🚨 **Issues to Fix:**

### 1. **API URL Configuration**
- Frontend is trying to connect to `localhost` which won't work on mobile
- Need to use your computer's IP address instead

### 2. **Missing Dependencies**
- AsyncStorage package needs to be installed

## 🔧 **Step-by-Step Fix:**

### **Step 1: Find Your Computer's IP Address**

**On Windows:**
```bash
ipconfig
# Look for "IPv4 Address" (usually 192.168.x.x)
```

**On Mac/Linux:**
```bash
ifconfig
# Look for "inet" followed by your IP address
```

### **Step 2: Update API Configuration**

Edit `goodluck-tracker/config/api.ts`:
```typescript
export const API_CONFIG = {
  // Replace 192.168.1.100 with YOUR actual IP address
  BASE_URL: 'http://YOUR_IP_ADDRESS:5000/api',
  TIMEOUT: 10000,
};
```

### **Step 3: Install Missing Dependencies**

```bash
cd goodluck-tracker
npm install @react-native-async-storage/async-storage
```

### **Step 4: Test Backend Connection**

```bash
cd backend
node test-connection.js
```

You should see:
```
🧪 Testing Backend Connection...

1. Testing server connection...
✅ Server is running and responding
📊 Dashboard data: { summary: {...}, stock: [...] }

2. Testing authentication...
✅ Authentication working
🔐 Login response: { message: 'Login successful', user: {...} }

3. Testing stock API...
✅ Stock API working
📦 Stock data: [...]

🎉 All tests passed! Backend is working correctly.
```

### **Step 5: Start Both Services**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd goodluck-tracker
npm start
```

## 🧪 **Testing the Connection:**

### **Test 1: Backend Health Check**
```bash
curl http://localhost:5000/api/dashboard/summary
```

### **Test 2: Authentication**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### **Test 3: Mobile App**
1. Open the app on your phone
2. Try to login with `admin` / `admin123`
3. Check if dashboard loads data

## 🔍 **Troubleshooting:**

### **Issue: "Network Error" on Mobile**
**Solution:**
1. Make sure phone and computer are on same WiFi
2. Check firewall settings
3. Verify IP address is correct
4. Try using `10.0.2.2` for Android emulator

### **Issue: "Cannot connect to server"**
**Solution:**
1. Check if backend is running: `npm run dev`
2. Verify database is connected
3. Check if port 5000 is available

### **Issue: "Database connection failed"**
**Solution:**
1. Start PostgreSQL service
2. Check `.env` file configuration
3. Run database schema: `psql -d goodluck_traders -f schema.sql`

## 📱 **Mobile Development Tips:**

### **For Physical Device:**
- Use your computer's actual IP address
- Ensure both devices are on same network
- Check firewall/antivirus settings

### **For Emulator:**
- Android: Use `10.0.2.2` instead of localhost
- iOS: Use `localhost` or your computer's IP

### **For Web Development:**
- Use `localhost:5000` for API calls

## ✅ **Verification Checklist:**

- [ ] Backend server running on port 5000
- [ ] Database connected and schema loaded
- [ ] API endpoints responding correctly
- [ ] Frontend API URL updated with correct IP
- [ ] AsyncStorage package installed
- [ ] Mobile app can connect to backend
- [ ] Login functionality working
- [ ] Dashboard loading data

## 🎯 **Expected Behavior:**

When everything is connected properly:

1. **Backend:** Running on `http://localhost:5000`
2. **Frontend:** Connecting to `http://YOUR_IP:5000/api`
3. **Mobile App:** Can login and load dashboard data
4. **Database:** All tables created and accessible

## 🚀 **Quick Start Commands:**

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Start frontend (in new terminal)
cd goodluck-tracker && npm start

# 3. Test connection
cd backend && node test-connection.js
```

## 📞 **Need Help?**

If you're still having connection issues:

1. Check the troubleshooting section above
2. Verify your IP address is correct
3. Ensure both services are running
4. Check network connectivity
5. Review error messages in console

---

**Once these steps are completed, your backend and frontend will be fully connected! 🎉** 