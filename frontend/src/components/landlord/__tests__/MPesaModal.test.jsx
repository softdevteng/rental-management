import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import MPesaModal from '../MPesaModal';

describe('MPesaModal', () => {
  test('shows validation errors and submits valid data', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(<MPesaModal open={true} onClose={onClose} onSubmit={onSubmit} initialPhone="0712345678" />);

    // Initially focused on amount input
    const amount = screen.getByPlaceholderText(/e.g. 1000/i) || screen.getByLabelText(/Amount/i);
    expect(amount).toBeTruthy();

    const send = screen.getByRole('button', { name: /Send STK Push/i });
    // empty submit -> validation errors
    fireEvent.click(send);
    expect(await screen.findByText(/Enter a valid amount/i)).toBeTruthy();

    // fill invalid phone
    fireEvent.change(amount, { target: { value: '1000' } });
    const phone = screen.getByPlaceholderText(/07XXXXXXXX/i);
    fireEvent.change(phone, { target: { value: '123' } });
    fireEvent.click(send);
    expect(await screen.findByText(/Enter a valid phone/i)).toBeTruthy();

    // fill valid phone and submit
    fireEvent.change(phone, { target: { value: '0712345678' } });
    fireEvent.click(send);
    // wait for async submit to be invoked
    await screen.findByText(/STK push initiated|Please fix the errors|Failed to initiate STK push/i).catch(() => {});
    await (async () => {
      const { waitFor } = require('@testing-library/react');
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ amount: 1000, phone: '0712345678' }));
    })();
  });
});
