import React, { useState } from 'react';
import styles from '../../OwnerTurfs/OwnerTurfs.module.css';
import { turfService } from '../../../../services/turfService';
import { X, Upload, Trash2, Plus, Star } from 'lucide-react';
import { IMAGE_BASE_URL } from '../../../../config';

interface TurfModalProps {
  turf: any | null;
  onClose: () => void;
  onRefresh: () => void;
}

const COMMON_FACILITIES = ['Parking', 'Washroom', 'Floodlights', 'Changing Room', 'Drinking Water', 'First Aid'];

const TurfModal: React.FC<TurfModalProps> = ({ turf, onClose, onRefresh }) => {
  const sanitizePrice = (value: string) => value.replace(/[^\d]/g, '');

  const [formData, setFormData] = useState({
    name: turf?.name || '',
    location: turf?.location || '',
    openingTime: turf?.openingTime || '',
    closingTime: turf?.closingTime || '',
    contactNumber: turf?.contactNumber || '',
    address: turf?.address || '',
    facilities: turf?.facilities || [],
    status: turf?.status || 'ACTIVE',
    googleMapsUrl: turf?.googleMapsUrl || '',
    latitude: turf?.latitude || '',
    longitude: turf?.longitude || ''
  });
  
  const [courts, setCourts] = useState<any[]>(turf?.courts || []);
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(turf?.images || []);
  const [coverImage, setCoverImage] = useState<string>(turf?.images?.[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleChip = (value: string) => {
    setFormData(prev => {
      const currentArray = prev.facilities;
      if (currentArray.includes(value)) {
        return { ...prev, facilities: currentArray.filter((item: string) => item !== value) };
      } else {
        return { ...prev, facilities: [...currentArray, value] };
      }
    });
  };

  const handleAddCourt = () => {
    setCourts([...courts, {
      name: '',
      type: 'CRICKET',
      pricePerHour: '',
      weekendPricePerHour: '',
      allowHalfCourtBooking: false,
      halfCourtPricePerHour: '',
      halfCourtWeekendPricePerHour: '',
      id: `temp-${Date.now()}`
    }]);
  };

  const handleRemoveCourt = (id: string) => {
    setCourts(courts.filter(c => c.id !== id));
  };

  const handleCourtChange = (id: string, field: string, value: any) => {
    const nextValue = field === 'pricePerHour' || field === 'weekendPricePerHour' || field === 'halfCourtPricePerHour' || field === 'halfCourtWeekendPricePerHour'
      ? sanitizePrice(String(value))
      : value;

    setCourts(courts.map(c => c.id === id ? { ...c, [field]: nextValue } : c));
  };

  const handleGoogleMapsUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, googleMapsUrl: url }));
    
    if (!url) {
      setParseStatus('idle');
      return;
    }

    try {
      // 1. Extract Address/Name from /place/
      const placeMatch = url.match(/\/place\/([^\/]+)\//);
      if (placeMatch && placeMatch[1]) {
        const extractedName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        if (!formData.address || formData.address === '') {
          setFormData(prev => ({ ...prev, address: extractedName }));
        }
      }

      // 2. Extract Coordinates
      let lat = null;
      let lng = null;

      // Pattern A: @12.345,67.890
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      // Pattern B: q=12.345,67.890
      const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      // Pattern C: !3d12.345!4d67.890 (Common in long search URLs)
      const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

      if (atMatch) {
        lat = parseFloat(atMatch[1]);
        lng = parseFloat(atMatch[2]);
      } else if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      } else if (bangMatch) {
        lat = parseFloat(bangMatch[1]);
        lng = parseFloat(bangMatch[2]);
      }

      if (lat !== null && lng !== null) {
        setFormData(prev => ({ 
          ...prev, 
          latitude: lat!.toString(), 
          longitude: lng!.toString() 
        }));
        setParseStatus('success');
      } else {
        // If it's a short link (goo.gl), we can't parse it client-side without a fetch
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
           // We could potentially try to fetch it via a proxy, but for now let's show a hint
           setParseStatus('error');
        } else {
           setParseStatus('error');
        }
      }
    } catch (err) {
      setParseStatus('error');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      if (!coverImage && newFiles.length > 0 && existingImages.length === 0) {
        setCoverImage(newFiles[0].name);
      }
    }
  };

  const removeNewImage = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (coverImage === removed.name) {
        setCoverImage(existingImages[0] || newFiles[0]?.name || '');
      }
      return newFiles;
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => {
      const newImages = [...prev];
      const removed = newImages.splice(index, 1)[0];
      if (coverImage === removed) {
        setCoverImage(newImages[0] || files[0]?.name || '');
      }
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (formData.openingTime && formData.closingTime && formData.openingTime >= formData.closingTime) {
      setError('Opening time must be before closing time');
      setIsLoading(false);
      return;
    }

    if (courts.length === 0) {
      setError('At least one court is required');
      setIsLoading(false);
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('location', formData.location);
    if (formData.openingTime) data.append('openingTime', formData.openingTime);
    if (formData.closingTime) data.append('closingTime', formData.closingTime);
    if (formData.contactNumber) data.append('contactNumber', formData.contactNumber);
    if (formData.address) data.append('address', formData.address);
    data.append('status', formData.status);
    if (formData.googleMapsUrl) data.append('googleMapsUrl', formData.googleMapsUrl);
    if (formData.latitude) data.append('latitude', formData.latitude.toString());
    if (formData.longitude) data.append('longitude', formData.longitude.toString());

    if (formData.facilities && formData.facilities.length > 0) {
      formData.facilities.forEach((f: string) => data.append('facilities', f));
    }

    if (coverImage) {
      data.append('coverIdentifier', coverImage);
    }

    files.forEach(f => {
      data.append('images', f);
    });

    existingImages.forEach(img => {
      data.append('existingImages', img);
    });

    try {
      let savedTurf;
      if (turf) {
        savedTurf = await turfService.updateTurf(turf.id, data);
      } else {
        savedTurf = await turfService.createTurf(data);
      }

      // Sync courts
      if (turf) {
        const existingCourtIds = turf.courts?.map((c: any) => c.id) || [];
        const currentCourtIds = courts.map(c => c.id);
        const toDelete = existingCourtIds.filter((id: string) => !currentCourtIds.includes(id));
        for (const id of toDelete) {
          await turfService.deleteCourt(id);
        }
      }

      for (const court of courts) {
        const courtData = {
          name: court.name,
          type: court.type,
          pricePerHour: parseFloat(court.pricePerHour),
          weekendPricePerHour: court.weekendPricePerHour ? parseFloat(court.weekendPricePerHour) : null,
          allowHalfCourtBooking: Boolean(court.allowHalfCourtBooking),
          halfCourtPricePerHour: court.allowHalfCourtBooking && court.halfCourtPricePerHour ? parseFloat(court.halfCourtPricePerHour) : null,
          halfCourtWeekendPricePerHour: court.allowHalfCourtBooking && court.halfCourtWeekendPricePerHour ? parseFloat(court.halfCourtWeekendPricePerHour) : null,
          existingImages: court.images || [] // Preserve images
        };

        if (court.id && String(court.id).startsWith('temp-')) {
          await turfService.addCourt(savedTurf.id, courtData);
        } else {
          await turfService.updateCourt(court.id, courtData);
        }
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save turf details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{turf ? 'Edit Turf Facility' : 'Register New Turf Facility'}</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.formSection}>
            <h3 className={`${styles.sectionHeading} ${styles.sectionHeadingTight}`}>Basic Info</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Turf Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Empire Sports Arena" 
                  required 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Location (City/Area)</label>
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={e => setFormData({ ...formData, location: e.target.value })} 
                  placeholder="e.g. MG Road, Bangalore" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={`${styles.sectionHeading} ${styles.sectionHeadingFlush}`}>Courts Management</h3>
              <button type="button" onClick={handleAddCourt} className={`${styles.addSidebarBtn} ${styles.addCompactBtn}`}>
                <Plus size={14} /> Add Court
              </button>
            </div>
            
            <div className={styles.courtList}>
              {courts.map((court) => (
                <div key={court.id} className={styles.courtEditor}>
                   <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Court Name</label>
                        <input type="text" value={court.name} onChange={e => handleCourtChange(court.id, 'name', e.target.value)} placeholder="e.g. Court 1" required />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Type</label>
                        <select value={court.type} onChange={e => handleCourtChange(court.id, 'type', e.target.value)}>
                           <option value="CRICKET">Cricket</option>
                           <option value="FOOTBALL">Football</option>
                           <option value="CRICKET_FOOTBALL">Cricket/Football</option>
                           <option value="TENNIS">Tennis</option>
                           <option value="PICKLEBALL">Pickleball</option>
                        </select>
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Price (Rs/hr)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={court.pricePerHour}
                          onChange={e => handleCourtChange(court.id, 'pricePerHour', e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Weekend (Rs/hr)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={court.weekendPricePerHour}
                          onChange={e => handleCourtChange(court.id, 'weekendPricePerHour', e.target.value)}
                        />
                      </div>
                      <div className={`${styles.inlineToggleRow} ${styles.fullSpan}`}>
                        <div>
                          <label>Half Court Booking</label>
                          <p>Allow two half-court bookings in the same time slot.</p>
                        </div>
                        <button
                          type="button"
                          className={`${styles.toggleSwitch} ${court.allowHalfCourtBooking ? styles.toggleSwitchOn : ''}`}
                          onClick={() => handleCourtChange(court.id, 'allowHalfCourtBooking', !court.allowHalfCourtBooking)}
                          aria-pressed={Boolean(court.allowHalfCourtBooking)}
                        >
                          <span />
                        </button>
                      </div>
                      {court.allowHalfCourtBooking && (
                        <>
                          <div className={styles.inputGroup}>
                            <label>Half Court (Rs/hr)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={court.halfCourtPricePerHour || ''}
                              onChange={e => handleCourtChange(court.id, 'halfCourtPricePerHour', e.target.value)}
                              required
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>Half Weekend (Rs/hr)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={court.halfCourtWeekendPricePerHour || ''}
                              onChange={e => handleCourtChange(court.id, 'halfCourtWeekendPricePerHour', e.target.value)}
                            />
                          </div>
                        </>
                      )}
                      <div className={styles.removeCourtWrap}>
                        <button type="button" onClick={() => handleRemoveCourt(court.id)} className={styles.removeCourtBtn}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Location & Contact</h3>
            <div className={styles.inputGroup}>
              <label>Detailed Address</label>
              <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} placeholder="Full address..." />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Contact Number</label>
                <input type="tel" value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} placeholder="e.g. +91 9876543210" />
              </div>
              <div className={styles.inputGroup}>
                <label>Google Maps Link</label>
                <input type="url" value={formData.googleMapsUrl} onChange={handleGoogleMapsUrlChange} placeholder="Paste link to extract coordinates" />
              </div>
            </div>
            <div className={styles.mapStatus}>
              {parseStatus === 'success' && <span className={styles.successText}>Location pinned</span>}
              {parseStatus === 'error' && <span className={styles.errorText}>Could not parse link</span>}
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Operations</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Opening Time</label>
                <input type="time" value={formData.openingTime} onChange={e => setFormData({ ...formData, openingTime: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label>Closing Time</label>
                <input type="time" value={formData.closingTime} onChange={e => setFormData({ ...formData, closingTime: e.target.value })} />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Facilities</h3>
            <div className={styles.chipGroup}>
              {COMMON_FACILITIES.map(facility => (
                <div
                  key={facility}
                  className={`${styles.chip} ${formData.facilities.includes(facility) ? styles.chipActive : ''}`}
                  onClick={() => toggleChip(facility)}
                >
                  {facility}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.uploadSection}>
            <h3 className={styles.sectionHeading}>Images</h3>
            {(existingImages.length + files.length) < 10 && (
              <div className={styles.fileUpload}>
                <Upload size={32} />
                <p>Click or drag to upload images</p>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} />
              </div>
            )}
            <div className={styles.imageGrid}>
              {existingImages.map((imgUrl, idx) => (
                <div key={`exist-${idx}`} className={`${styles.imagePreviewCard} ${coverImage === imgUrl ? styles.isCover : ''}`}>
                  {coverImage === imgUrl && <div className={styles.coverRibbon}>COVER</div>}
                  <img src={`${IMAGE_BASE_URL}${imgUrl}`} alt="Preview" />
                  <div className={styles.previewOverlay}>
                    <button 
                      type="button" 
                      className={`${styles.overlayActionBtn} ${coverImage === imgUrl ? styles.isCover : ''}`}
                      onClick={() => setCoverImage(imgUrl)}
                      title="Set as Cover"
                    >
                      <Star size={18} fill={coverImage === imgUrl ? "currentColor" : "none"} />
                    </button>
                    <button 
                      type="button" 
                      className={`${styles.overlayActionBtn} ${styles.removeBtn}`}
                      onClick={() => removeExistingImage(idx)}
                      title="Remove Image"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {files.map((fileObj, idx) => (
                <div key={`new-${idx}`} className={`${styles.imagePreviewCard} ${coverImage === fileObj.name ? styles.isCover : ''}`}>
                  {coverImage === fileObj.name && <div className={styles.coverRibbon}>COVER</div>}
                  <img src={URL.createObjectURL(fileObj)} alt="New Preview" />
                  <div className={styles.previewOverlay}>
                    <button 
                      type="button" 
                      className={`${styles.overlayActionBtn} ${coverImage === fileObj.name ? styles.isCover : ''}`}
                      onClick={() => setCoverImage(fileObj.name)}
                      title="Set as Cover"
                    >
                      <Star size={18} fill={coverImage === fileObj.name ? "currentColor" : "none"} />
                    </button>
                    <button 
                      type="button" 
                      className={`${styles.overlayActionBtn} ${styles.removeBtn}`}
                      onClick={() => removeNewImage(idx)}
                      title="Remove Image"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Turf Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TurfModal;
