# Direct UPI Payment Gateway (Zero Aggregator)

A lightweight Node.js solution to accept payments directly into your bank account via NPCI Dynamic UPI QR Codes and UPI Intent links with **0% gateway fees**.

## Features
- **Zero Aggregators:** Direct P2P / P2M settlement into your linked bank account.
- **Dynamic QR Code:** Generates unique QR codes per order encoding payee VPA, business name, and exact order amount.
- **Mobile Intent:** Click-to-pay button that launches Google Pay, PhonePe, Paytm, or BHIM directly on mobile devices.
- **UTR Verification:** Instant payment confirmation via 12-digit UPI UTR reference number.

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Configuration
Create a `.env` file from `.env.example`:
```env
UPI_VPA=yourupi@bank
PAYEE_NAME=RK SOLUTIONS
PORT=3000
```

### 3. Run Server
```bash
# Development mode
npm run dev

# Production
npm start
```

Visit `http://localhost:3000` to access the checkout portal.
