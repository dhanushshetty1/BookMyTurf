import React, { useState, useEffect } from 'react';
import { X, Camera, Trash2, Save, AlertCircle } from 'lucide-react';
import { turfService } from '../../../../services/turfService';
import styles from '../../OwnerTurfs/OwnerTurfs.module.css'; // Reuse dashboard styles
import { IMAGE_BASE_URL } from '../../../../config';

interface CourtModalProps {
  turfId: string;
  court?: any;
  onClose: () => void;
  onRefresh: () => void;
}

const CourtModal: React.FC<CourtModalProps> = ({ turfId, court, onClose, onRefresh }) => {
  const sanitizePrice = (value: string) => value.replace(/[^\d]/g, '');

  const [formData, setFormData] = useState({
    name: '',
    type: 'FOOTBALL',
    pricePerHour: '',
    weekendPricePerHour: '',
    allowHalfCourtBooking: false,
    halfCourtPricePerHour: '',
    halfCourtWeekendPricePerHour: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (court) {
      setFormData({
        name: court.name || '',
        type: court.type || 'FOOTBALL',
        pricePerHour: court.pricePerHour?.toString() || '',
        weekendPricePerHour: court.weekendPricePerHour?.toString() || '',
        allowHalfCourtBooking: Boolean(court.allowHalfCourtBooking),
        halfCourtPricePerHour: court.halfCourtPricePerHour?.toString() || '',
        halfCourtWeekendPricePerHour: court.halfCourtWeekendPricePerHour?.toString() || ''
      });
      setExistingImages(court.images || []);
    }
  }, [court]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...selectedFiles]);
      
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('type', formData.type);
      data.append('pricePerHour', formData.pricePerHour);
      if (formData.weekendPricePerHour) {
        data.append('weekendPricePerHour', formData.weekendPricePerHour);
      }
      data.append('allowHalfCourtBooking', String(formData.allowHalfCourtBooking));
      if (formData.allowHalfCourtBooking) {
        data.append('halfCourtPricePerHour', formData.halfCourtPricePerHour);
        if (formData.halfCourtWeekendPricePerHour) {
          data.append('halfCourtWeekendPricePerHour', formData.halfCourtWeekendPricePerHour);
        }
      }
      
      images.forEach(img => data.append('images', img));
      existingImages.forEach(img => data.append('existingImages', img));

      if (court) {
        await turfService.updateCourt(court.id, data);
      } else {
        await turfService.addCourt(turfId, data);
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save court details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.modalNarrow}`}>
        <div className={styles.modalHeader}>
          <h2>{court ? 'Edit Court' : 'Add New Court'}</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
        </div>

        {error && (
          <div className={`${styles.errorAlert} ${styles.errorAlertSpaced}`}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={`${styles.formGrid} ${styles.singleColumnGrid}`}>
            <div className={styles.inputGroup}>
              <label>Court Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Main Football Arena"
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Court Type</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                required
              >
                <option value="FOOTBALL">Football</option>
                <option value="CRICKET">Cricket</option>
                <option value="CRICKET_FOOTBALL">Cricket/Football</option>
                <option value="TENNIS">Tennis</option>
                <option value="PICKLEBALL">Pickleball</option>
              </select>
            </div>

            <div className={styles.priceGrid}>
              <div className={styles.inputGroup}>
                <label>Standard Price (Rs/hr)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.pricePerHour} 
                  onChange={e => setFormData({...formData, pricePerHour: sanitizePrice(e.target.value)})}
                  placeholder="1000"
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Weekend Price (Rs/hr)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.weekendPricePerHour} 
                  onChange={e => setFormData({...formData, weekendPricePerHour: sanitizePrice(e.target.value)})}
                  placeholder="1200"
                />
              </div>
            </div>

            <div className={styles.inlineToggleRow}>
              <div>
                <label>Half Court Booking</label>
                <p>Allow two half-court bookings in the same time slot.</p>
              </div>
              <button
                type="button"
                className={`${styles.toggleSwitch} ${formData.allowHalfCourtBooking ? styles.toggleSwitchOn : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, allowHalfCourtBooking: !prev.allowHalfCourtBooking }))}
                aria-pressed={formData.allowHalfCourtBooking}
              >
                <span />
              </button>
            </div>

            {formData.allowHalfCourtBooking && (
              <div className={styles.priceGrid}>
                <div className={styles.inputGroup}>
                  <label>Half Court Price (Rs/hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.halfCourtPricePerHour}
                    onChange={e => setFormData({...formData, halfCourtPricePerHour: sanitizePrice(e.target.value)})}
                    placeholder="600"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Half Court Weekend (Rs/hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.halfCourtWeekendPricePerHour}
                    onChange={e => setFormData({...formData, halfCourtWeekendPricePerHour: sanitizePrice(e.target.value)})}
                    placeholder="700"
                  />
                </div>
              </div>
            )}

            <div className={`${styles.uploadSection} ${styles.uploadSectionCompact}`}>
              <label className={styles.uploadText}>Court Images</label>
              <div className={`${styles.imageGrid} ${styles.imageGridCompact}`}>
                {existingImages.map((img, idx) => (
                  <div key={idx} className={styles.imagePreviewCard}>
                    <img src={`${IMAGE_BASE_URL}${img}`} alt="Existing" />
                    <button type="button" onClick={() => removeExistingImage(idx)} className={`${styles.overlayActionBtn} ${styles.overlayCornerBtn}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {previews.map((url, idx) => (
                  <div key={idx} className={styles.imagePreviewCard}>
                    <img src={url} alt="New Preview" />
                    <button type="button" onClick={() => removeNewImage(idx)} className={`${styles.overlayActionBtn} ${styles.overlayCornerBtn}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <label className={`${styles.fileUpload} ${styles.fileUploadCompact}`}>
                  <Camera size={24} />
                  <span>Add Photo</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              <Save size={18} className={styles.saveIcon} />
              {isLoading ? 'Saving...' : court ? 'Update Court' : 'Create Court'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourtModal;
