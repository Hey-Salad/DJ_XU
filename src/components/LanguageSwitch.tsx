/**
 * @fileoverview Language switch component for toggling between English and Chinese.
 */

import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * A toggle switch component for language selection.
 * @return {JSX.Element} The rendered component.
 */
export const LanguageSwitch: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="form-control">
      <label className="label cursor-pointer">
        <span className="label-text mr-2">中文</span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={language === 'en'}
          onChange={(e) => setLanguage(e.target.checked ? 'en' : 'cn')}
        />
        <span className="label-text ml-2">English</span>
      </label>
    </div>
  );
};