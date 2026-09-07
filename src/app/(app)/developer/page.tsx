'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import DeveloperMode from '@/components/DeveloperMode';

export default function DeveloperPage() {
  const { user } = useAuth();

  return (
    <DeveloperMode currentUser={user?.id || 'authenticated_user'} />
  );
}
