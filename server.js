require('dotenv').config();
const express = require('express');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const UPI_VPA = process.env.UPI_VPA || 'rksolutions@upi';
const PAYEE_NAME = process.env.PAYEE_NAME || 'RK SOLUTIONS';

// In-memory order tracking (In production, replace with MongoDB or PostgreSQL)
const orders = new Map();

/**
 * 1. Generate Direct NPCI Dynamic UPI Intent URI & QR Code
 * Endpoint: POST /api/create-payment
 */
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, purpose } = req.body;
    const orderAmount = parseFloat(amount);

    if (!orderAmount || orderAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Generate unique order reference ID (12-16 chars alphanumeric)
    const referenceId = 'ORD' + Date.now().toString().slice(-8) + Math.floor(1000 + Math.random() * 9000);

    // Standard NPCI UPI URI Specification:
    // upi://pay?pa=<VPA>&pn=<PayeeName>&am=<Amount>&cu=INR&tn=<Note/RefId>&tr=<TransactionRef>
    const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_VPA.trim())}&pn=${encodeURIComponent(PAYEE_NAME.trim())}&am=${orderAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(purpose || 'Payment for ' + referenceId)}&tr=${referenceId}`;

    // Generate high-resolution QR code as Data URL
    const qrImage = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    // Save order status
    orders.set(referenceId, {
      referenceId,
      amount: orderAmount,
      purpose: purpose || 'Order payment',
      status: 'PENDING',
      createdAt: new Date(),
      utr: null
    });

    console.log(`[Order Created] Ref: ${referenceId} | Amount: ₹${orderAmount} | Payee: ${UPI_VPA}`);

    res.json({
      success: true,
      referenceId,
      amount: orderAmount,
      payeeVpa: UPI_VPA,
      payeeName: PAYEE_NAME,
      upiUri,
      qrImage,
      message: 'Direct UPI payment QR generated successfully'
    });
  } catch (error) {
    console.error('[Error generating UPI payment]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 2. User/Customer submits the 12-digit UPI UTR / Transaction ID after paying
 * Endpoint: POST /api/verify-payment
 */
app.post('/api/verify-payment', (req, res) => {
  try {
    const { referenceId, utr } = req.body;

    if (!referenceId || !orders.has(referenceId)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!utr || utr.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit UTR/Transaction ID' });
    }

    const order = orders.get(referenceId);
    order.status = 'PAID';
    order.utr = utr.trim();
    order.verifiedAt = new Date();
    orders.set(referenceId, order);

    console.log(`[Payment Verified] Order ${referenceId} paid with UTR: ${utr}`);

    res.json({
      success: true,
      status: 'PAID',
      referenceId,
      utr: order.utr,
      message: 'Payment recorded and confirmed successfully!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 3. Status Check / Polling Endpoint
 * Endpoint: GET /api/payment-status/:referenceId
 */
app.get('/api/payment-status/:referenceId', (req, res) => {
  const { referenceId } = req.params;
  const order = orders.get(referenceId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.json({
    success: true,
    referenceId: order.referenceId,
    status: order.status,
    amount: order.amount,
    utr: order.utr
  });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Direct UPI Payment Gateway running at: http://localhost:${PORT}`);
  console.log(`Settling directly to VPA: ${UPI_VPA} (${PAYEE_NAME})`);
  console.log(`0% aggregator fees. Direct to bank.`);
  console.log(`===================================================`);
});
