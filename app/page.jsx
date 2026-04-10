'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Page error:', error, info); }
  render() {
    if (this.state.error) {
      return React.createElement('div', { style: { padding: 40, fontFamily: 'sans-serif' } },
        React.createElement('h2', null, 'Something went wrong'),
        React.createElement('pre', { style: { color: 'red', whiteSpace: 'pre-wrap', fontSize: 13 } }, String(this.state.error?.message || this.state.error)),
        React.createElement('pre', { style: { color: '#666', whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 10 } }, this.state.error?.stack)
      );
    }
    return this.props.children;
  }
}

import AdminPortal from '@/components/AdminPortal';
import CustomerApp from '@/components/CustomerApp';

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState('customer');
  const [userRole, setUserRole] = useState('customer');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const userData = localStorage.getItem('user') || localStorage.getItem('userInfo');
    const role = localStorage.getItem('userRole');

    if (!token) {
      router.replace('/login');
      return;
    }

    setIsLoggedIn(true);
    let parsedUser = null;
    let parsedRole = role;

    try {
      if (userData) {
        parsedUser = JSON.parse(userData);
        if (!parsedRole) parsedRole = parsedUser.role;
      }
    } catch (e) {
      console.error('Session restoration error:', e);
    }

    const finalRole = parsedRole || 'customer';
    setUserRole(finalRole);
    setViewMode(finalRole === 'admin' ? 'admin' : 'customer');
    setCurrentUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('customer');
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Poppins', sans-serif" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (viewMode === 'admin') {
    return (
      <ErrorBoundary>
        <AdminPortal
          onLogout={handleLogout}
          onSwitchToCustomer={() => setViewMode('customer')}
          currentUser={currentUser}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <CustomerApp
        currentUser={currentUser}
        userRole={userRole}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onLogout={handleLogout}
      />
    </ErrorBoundary>
  );
}
