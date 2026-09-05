import React from 'react';
import { createRoot } from 'react-dom/client';
import QRMenu from './QRMenu';

export function mountQrMenu(root) {
  createRoot(root).render(<QRMenu />);
}
