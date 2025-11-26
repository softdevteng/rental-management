import React, { useEffect, useRef, useState } from 'react';

// Accessible modal for collecting amount and phone for M-Pesa push
export default function MPesaModal({ open, onClose, onSubmit, initialPhone }) {
  const amountRef = useRef(null);
  const phoneRef = useRef(null);
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const submitRef = useRef(null);
  const cancelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const [errors, setErrors] = useState({ amount: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const liveRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    // focus amount input when opened
    setTimeout(() => {
      if (amountRef.current) amountRef.current.focus();
    }, 0);

    // handle Escape and focus trap
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
        return;
      }
      if (e.key === 'Tab') {
        // simple focus trap within dialog
        const node = dialogRef.current;
        if (!node) return;
        const focusable = node.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      try { previouslyFocused.current && previouslyFocused.current.focus(); } catch (e) {}
    };
  }, [open, onClose]);

  useEffect(() => { if (!open) { setErrors({ amount: '', phone: '' }); setSubmitting(false); } }, [open]);

  if (!open) return null;

  const validate = (amt, phone) => {
    const e = { amount: '', phone: '' };
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) e.amount = 'Enter a valid amount';
    if (!phone || !/^0?7\d{8}$/.test(String(phone).trim())) e.phone = 'Enter a valid phone (07XXXXXXXX)';
    return e;
  };

  const submit = async (ev) => {
    ev && ev.preventDefault();
    const amt = amountRef.current && amountRef.current.value;
    const phone = phoneRef.current && phoneRef.current.value;
    const e = validate(amt, phone);
    setErrors(e);
    if (e.amount || e.phone) {
      if (liveRef.current) liveRef.current.textContent = 'Please fix the errors';
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit && onSubmit({ amount: Number(amt), phone: String(phone).trim() });
      if (liveRef.current) liveRef.current.textContent = 'STK push initiated';
    } catch (err) {
      // surface error in live region
      const msg = (err && err.message) ? err.message : 'Failed to initiate STK push';
      if (liveRef.current) liveRef.current.textContent = msg;
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" role="presentation" ref={backdropRef} onClick={(e) => { if (e.target === backdropRef.current) onClose && onClose(); }}>
      {/* focus sentinel before dialog to catch Shift+Tab from first element */}
      <div tabIndex="0" aria-hidden onFocus={() => { try { submitRef.current && submitRef.current.focus(); } catch {} }} />

      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="mpesa-title" aria-describedby="mpesa-desc" ref={dialogRef}>
        <h3 id="mpesa-title">Initiate M-Pesa Push</h3>
        <div id="mpesa-desc" className="muted">Enter amount and tenant phone to send an STK push.</div>
        <form onSubmit={submit}>
          <label htmlFor="mpesa-amount">Amount</label>
          <input id="mpesa-amount" ref={amountRef} name="amount" type="number" min="1" placeholder="e.g. 1000" aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'err-amount' : undefined} />
          {errors.amount && <div id="err-amount" role="alert" className="field-error">{errors.amount}</div>}

          <label htmlFor="mpesa-phone">Phone (07XXXXXXXX)</label>
          <input id="mpesa-phone" ref={phoneRef} name="phone" defaultValue={initialPhone || ''} placeholder="07XXXXXXXX" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'err-phone' : undefined} />
          {errors.phone && <div id="err-phone" role="alert" className="field-error">{errors.phone}</div>}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
            <button ref={cancelRef} type="button" className="btn classic" onClick={() => onClose && onClose()} disabled={submitting} aria-label="Cancel">Cancel</button>
            <button ref={submitRef} type="submit" className="btn" disabled={submitting} aria-label="Send STK Push">{submitting ? 'Sending…' : 'Send STK Push'}</button>
          </div>
        </form>
        <div aria-live="polite" ref={liveRef} className="visually-hidden" />
      </div>

      {/* focus sentinel after dialog to catch Tab from last element */}
      <div tabIndex="0" aria-hidden onFocus={() => { try { amountRef.current && amountRef.current.focus(); } catch {} }} />
    </div>
  );
}
