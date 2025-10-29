const fs = require('fs');
const path = require('path');
let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { PDFDocument = null; }

function generateReceipt(payment, tenant, landlord) {
  const receipt = {
    id: `RCPT-${payment.id}-${Date.now()}`,
    paymentId: payment.id,
    amount: payment.amount,
    date: payment.date || new Date(),
    tenant: tenant ? { id: tenant.id, name: tenant.name, email: tenant.email } : null,
    landlord: landlord ? { id: landlord.id, name: landlord.name, email: landlord.email } : null,
    mpesaReceipt: payment.mpesaReceipt || payment.mpesaReceipt,
    method: payment.method || 'mpesa',
  };
  // persist to uploads/receipts as json
  try {
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const jsonPath = path.join(dir, `${receipt.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2));

    let pdfPath = null;
    if (PDFDocument) {
      try {
        pdfPath = path.join(dir, `${receipt.id}.pdf`);
        const doc = new PDFDocument({ margin: 40 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        doc.fontSize(18).text('Payment Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Receipt ID: ${receipt.id}`);
        doc.text(`Payment ID: ${receipt.paymentId}`);
        doc.text(`Amount: KSh ${Number(receipt.amount || 0).toLocaleString()}`);
        doc.text(`Date: ${new Date(receipt.date).toLocaleString()}`);
        doc.moveDown();
        doc.text('Tenant:');
        if (receipt.tenant) doc.text(`${receipt.tenant.name || ''} <${receipt.tenant.email || ''}> (ID: ${receipt.tenant.id})`);
        doc.moveDown();
        doc.text('Landlord:');
        if (receipt.landlord) doc.text(`${receipt.landlord.name || ''} <${receipt.landlord.email || ''}> (ID: ${receipt.landlord.id})`);
        doc.moveDown();
        doc.text(`Method: ${receipt.method}`);
        if (receipt.mpesaReceipt) doc.text(`M-Pesa Ref: ${receipt.mpesaReceipt}`);
        doc.end();
      } catch (e) {
        console.error('Failed to create PDF receipt', e && e.message ? e.message : e);
        pdfPath = null;
      }
    }
    return { receipt, path: `/uploads/receipts/${receipt.id}.json`, pdfPath: pdfPath ? `/uploads/receipts/${receipt.id}.pdf` : null };
  } catch (err) {
    console.error('Failed to write receipt', err.message || err);
    return { receipt, path: null, pdfPath: null };
  }
}

module.exports = { generateReceipt };
