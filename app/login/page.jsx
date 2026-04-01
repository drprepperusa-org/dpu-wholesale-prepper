'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleLogin = (loginData) => {
    // Store token + user info
    localStorage.setItem('token', loginData.token);
    localStorage.setItem('user', JSON.stringify(loginData.user));
    localStorage.setItem('userRole', loginData.role);
    localStorage.setItem('authToken', loginData.token);
    localStorage.setItem('userInfo', JSON.stringify({ ...loginData.user, role: loginData.role }));
    router.replace('/');
  };

  return <Login onLogin={handleLogin} />;
}
