import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import QuickPay from '../QuickPay';

jest.mock('../../../lib/api', () => ({ api: jest.fn() }));
import { api } from '../../../lib/api';

describe('QuickPay', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('submits valid data and calls onSuccess and toast', async () => {
    const mockRes = { paymentId: 'p1' };
    api.mockResolvedValueOnce(mockRes);
    const toast = { add: jest.fn() };
    const onSuccess = jest.fn();
    const estates = [{ id: 1, name: 'E1' }];

    const { getByPlaceholderText, getByText, container } = render(
      <QuickPay token="t" estates={estates} onSuccess={onSuccess} toast={toast} />
    );

    // select estate (tests must set estateId otherwise submit will throw)
    const sel = container.querySelector('select');
    fireEvent.change(sel, { target: { value: '1' } });
    // set apartment
    fireEvent.change(getByPlaceholderText('Apartment ID'), { target: { value: '101' } });
    // set amount
    fireEvent.change(getByPlaceholderText('Amount (KSh)'), { target: { value: '1000' } });
    // set phone
    fireEvent.change(getByPlaceholderText('Phone (07XXXXXXXX)'), { target: { value: '0712345678' } });

    fireEvent.click(getByText('Initiate STK Push'));

    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(toast.add).toHaveBeenCalledWith('STK Push initiated', 'info');
    expect(onSuccess).toHaveBeenCalledWith(mockRes);
  });
});
