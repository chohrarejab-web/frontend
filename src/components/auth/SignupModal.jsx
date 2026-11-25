import React from 'react';
import LoginModal from './LoginModal';

export default function SignupModal({ isOpen, onClose, onOpenLogin, ...props }) {
  return (
    <LoginModal
      isOpen={isOpen}
      onClose={onClose}
      initialMode="signup"
      onOpenLogin={onOpenLogin}
      {...props}
    />
  );
}
