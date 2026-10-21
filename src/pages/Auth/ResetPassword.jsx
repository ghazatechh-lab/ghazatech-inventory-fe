import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { errorMessage } from '../../api/client';
import { toast } from 'sonner';
export const ResetPassword = () => {
  const [params] = useSearchParams();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [done,setDone] = useState(false);
  const confirm = params.has('uid') && params.has('token');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const {data} = confirm ? await authApi.confirmReset({uid:params.get('uid'),token:params.get('token'),newPassword:password}) : await authApi.resetPassword({email});
      toast.success(data.detail);setDone(true);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <div className="erp-auth-form min-h-screen"><div className="erp-panel max-w-md w-full p-8"><h1 className="text-2xl font-bold font-sans">PerfumASol</h1><h2 className="text-sm font-bold text-[var(--primary)] my-4">{confirm ? 'Choose a new password' : 'Reset your password'}</h2>{done ? <p className="text-sm mb-4">{confirm ? 'Password reset. You may sign in.' : 'If the account exists, reset instructions have been sent.'}</p> : <form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold">{confirm ? 'New password' : 'Account email'}<input required type={confirm ? 'password':'email'} minLength={confirm ? 8:undefined} value={confirm ? password:email} onChange={e => confirm ? setPassword(e.target.value):setEmail(e.target.value)} className="erp-input mt-2" /></label><button disabled={busy} className="erp-primary w-full">{busy ? 'Submitting...' : 'Submit'}</button></form>}<Link to="/login" className="block mt-4 text-xs text-[var(--primary)]">Back to sign in</Link></div></div>;
};
