# Good Luck Traders - Complete Trading System

A comprehensive trading management system for agricultural commodities with purchase/sell transactions, loading management, stock tracking, and detailed reporting.

## 🏗️ System Architecture

### Frontend (React Native/Expo)
- **Mobile App**: Cross-platform trading management app
- **UI Framework**: React Native with Expo
- **Styling**: Custom styles with modern design
- **Navigation**: Expo Router with tab-based navigation

### Backend (Node.js/Express)
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with comprehensive schema
- **API**: RESTful APIs for all trading operations
- **Authentication**: Simple admin authentication

## 📱 App Features

### 🔄 Tab Layout (Bottom Navigation)
- **Rates**: Item-wise rate management and updates
- **Stock**: Comprehensive stock overview with toggle views
- **Home (Dashboard)**: Today's summary and quick actions
- **Reports**: Detailed trading reports and exports
- **P&L**: Profit & Loss analysis and pending stock views

### 🏠 Home Tab Features
- **Today's Summary**: Purchase, sell, and profit overview
- **Today's Loading**: All loading entries made today
- **Quick Actions**:
  - ➕ Add Purchase (default: "Good Luck Agro")
  - ➕ Add Sell (default: "Good Luck Agro")
  - 📦 Add Purchase Loading
  - 📤 Add Sell Loading
  - 📈 Rate Update (item-wise)

### 📦 Stock Tab Features
- **Toggle Switch**: With/Without 0 stock views
- **Metrics**: Total Purchase, Sell, Net Purchase, Pending Loading
- **Views**: Item-wise and Ex Plant-wise breakdowns
- **Status Indicators**: In Stock, No Stock, Over Sold

### 📄 Reports Tab Features
- **Toggle**: With/Without 0 options
- **Report Types**:
  - All Trades Reports (with loading complete)
  - Pending Trades Reports (with loading pending)
  - Overdue Trades (Loading due date passed)
  - Stock-wise Reports
  - Party-wise Reports
- **Export**: PDF & Excel formats

### 📉 P&L Tab Features
- **All Stock**: Total Purchase/Sell with average rates
- **Profit/Loss**: Calculated profit/loss analysis
- **Pending Stock**: Item-wise profit/loss on pending stock

## 🗄️ Database Schema

### Core Tables
- **parties**: Buyers/Sellers with contact information
- **items**: Trading items with HSN codes
- **ex_plants**: Ex-factory plants
- **brokers**: Trading brokers
- **delivery_conditions**: Delivery terms
- **payment_conditions**: Payment terms

### Transaction Tables
- **sauda**: Main purchase/sell transactions
- **loading**: Loading transactions linked to sauda
- **rates**: Item-wise rate history
- **stock**: Calculated stock levels
- **plus_minus**: Daily profit/loss reports

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Expo CLI (for mobile development)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Good_luck_Traders/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file in the backend directory:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=goodluck_traders
   DB_PASSWORD=your_password
   DB_PORT=5432
   PORT=5001
   ```

4. **Setup database**
   ```bash
   node setup-database.js
   ```

5. **Start the server**
   ```bash
   npm start
   ```

### Mobile App Setup

1. **Navigate to mobile app directory**
   ```bash
   cd ../goodluck-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update API configuration**
   - Edit `config/api.ts`
   - Update `BASE_URL` with your computer's IP address
   - Ensure port 5001 is used

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go app
   - Or press 'i' for iOS simulator
   - Or press 'a' for Android emulator

## 🔧 Configuration

### IP Address Setup
The mobile app needs to connect to your computer's IP address:

1. **Find your IP address**:
   - Windows: Run `ipconfig` in CMD
   - Mac/Linux: Run `ifconfig` in Terminal

2. **Update the mobile app**:
   - Edit `goodluck-tracker/config/api.ts`
   - Change `BASE_URL` to your IP address
   - Example: `http://192.168.1.100:5001/api`

3. **Use the update script**:
   ```bash
   cd goodluck-tracker
   node scripts/update-ip.js
   ```

### Database Configuration
- Ensure PostgreSQL is running
- Create database: `goodluck_traders`
- Update `.env` file with correct credentials
- Run setup script to create tables

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Parties Management
- `GET /api/parties` - Get all parties
- `POST /api/parties` - Create new party
- `PUT /api/parties/:id` - Update party
- `DELETE /api/parties/:id` - Delete party

### Items Management
- `GET /api/items` - Get all items
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Sauda (Transactions)
- `GET /api/sauda` - Get all transactions
- `POST /api/sauda` - Create new transaction
- `PUT /api/sauda/:id` - Update transaction
- `DELETE /api/sauda/:id` - Delete transaction
- `GET /api/sauda/pending` - Get pending transactions

### Loading Management
- `GET /api/loading` - Get all loading entries
- `POST /api/loading` - Create new loading entry
- `PUT /api/loading/:id` - Update loading entry
- `DELETE /api/loading/:id` - Delete loading entry

### Stock Management
- `GET /api/stock` - Get stock overview
- `GET /api/stock/summary` - Get stock summary
- `GET /api/stock/item/:id` - Get item-wise stock

### Reports
- `GET /api/reports/all-trades` - All trades report
- `GET /api/reports/pending-trades` - Pending trades report
- `GET /api/reports/overdue-trades` - Overdue trades report
- `GET /api/reports/stock-wise` - Stock-wise report
- `GET /api/reports/party-wise` - Party-wise report

### Rates Management
- `GET /api/rates/current` - Get current rates
- `POST /api/rates` - Create new rate
- `PUT /api/rates/:id` - Update rate
- `GET /api/rates/history/:itemId` - Get rate history

## 🔐 Default Login
- **Username**: admin
- **Password**: 123456

## 📱 Mobile App Features

### Form Features
- **Auto-generation**: Sauda numbers with financial year prefix
- **Searchable Dropdowns**: Parties, items, ex plants, brokers
- **Smart Matching**: Exact (dark blue) and partial (light blue) matches
- **Date Parsing**: Auto-parse dates like "26 Jun" to full date
- **Validation**: Comprehensive form validation

### Loading Management
- **Sauda Selection**: Show only pending sauda
- **Quantity Tracking**: Auto-deduct loaded quantities
- **Vajan Conversion**: Convert kg to packs (1000kg = 1 pack)
- **Pending Updates**: Real-time pending quantity updates

## 🛠️ Development

### Adding New Features
1. Update database schema in `schema.sql`
2. Create controller in `controllers/` directory
3. Create routes in `routes/` directory
4. Update `app.js` with new routes
5. Update mobile app API services
6. Create mobile app screens

### Database Migrations
- Schema changes should be added to `schema.sql`
- Run `node setup-database.js` to apply changes
- Backup existing data before major schema changes

## 🐛 Troubleshooting

### Connection Issues
1. **Check IP address**: Ensure mobile app has correct IP
2. **Check firewall**: Allow port 5001
3. **Check network**: Ensure same WiFi network
4. **Check server**: Ensure backend is running

### Database Issues
1. **Check PostgreSQL**: Ensure service is running
2. **Check credentials**: Verify `.env` file
3. **Check database**: Ensure database exists
4. **Run setup**: Execute `setup-database.js`

### Mobile App Issues
1. **Clear cache**: `npx expo start --clear`
2. **Reinstall**: Delete `node_modules` and reinstall
3. **Update Expo**: `npx expo install --fix`

## 📄 License
This project is proprietary software for Good Luck Traders.

## 🤝 Support
For technical support or feature requests, please contact the development team. 