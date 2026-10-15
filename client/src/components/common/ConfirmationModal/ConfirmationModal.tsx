import React from 'react';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  onCheckboxChange?: (checked: boolean) => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  showCheckbox = false,
  checkboxLabel = "Don't ask me again",
  onCheckboxChange
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.footer}>
          {showCheckbox && (
            <label className={styles.checkboxWrapper}>
              <input 
                type="checkbox" 
                onChange={e => onCheckboxChange?.(e.target.checked)} 
              />
              <span>{checkboxLabel}</span>
            </label>
          )}
          
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button className={styles.confirmBtn} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
