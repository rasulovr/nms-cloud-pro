import React from 'react';
import {tagLabels} from './qrMenuTags.mjs';
import './QRPaperTag.css';
export default function QRPaperTag({code}){
  return <span className="qr-paper-tag" data-tag={code}>{tagLabels[code]}</span>;
}
