import React, { useState, useEffect } from 'react';
import styles from './OfflineBookingModal.module.css';
import { bookingService } from '../../../../services/bookingService';
import { turfService } from '../../../../services/turfService';
import { X, User, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { formatTime } from '../../../../utils/formatTime';
import { toIsoDateKey } from '../../../../utils/formatDate';

interface OfflineBookingModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

const displayToIsoDate = (date: string) => {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);
  const isValid =
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() + 1 === Number(month) &&
    parsed.getDate() === Number(day);

  return isValid ? iso : '';
};

const normalizeDisplayDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
};

const OfflineBookingModal: React.FC<OfflineBookingModalProps> = ({ onClose, onRefresh }) => {
  const [myTurf, setMyTurf] = useState<any>(null);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [date, setDate] = useState('');
  const [displayDate, setDisplayDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingType, setBookingType] = useState<'FULL' | 'HALF'>('FULL');
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    totalAmount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    turfService.getMyTurfs().then(data => {
      if (data.length > 0) {
        setMyTurf(data[0]);
        if (data[0].courts?.length > 0) {
          setSelectedCourtId(data[0].courts[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCourtId && date && myTurf) {
      const court = myTurf.courts?.find((c: any) => c.id === selectedCourtId);
      if (court) {
        const slots = (court.slots || []).filter((s: any) => {
          const slotDateStr = toIsoDateKey(s.startTimeUTC || s.date);
          return slotDateStr === date && (s.status === 'AVAILABLE' || (bookingType === 'HALF' && court.allowHalfCourtBooking && s.status === 'PARTIALLY_BOOKED'));
        });
        setAvailableSlots(slots);
        setSelectedSlot('');
      }
    }
  }, [selectedCourtId, date, myTurf, bookingType]);

  const selectedCourt = myTurf?.courts?.find((c: any) => c.id === selectedCourtId);
  const getOfflineRate = (slot: any) => {
    if (!selectedCourt) return slot?.price || 0;
    const isWeekend = date ? [0, 6].includes(new Date(`${date}T00:00:00`).getDay()) : false;
    if (bookingType === 'HALF') {
      return isWeekend
        ? selectedCourt.halfCourtWeekendPricePerHour || selectedCourt.halfCourtPricePerHour || Math.ceil((slot?.price || selectedCourt.weekendPricePerHour || selectedCourt.pricePerHour || 0) / 2)
        : selectedCourt.halfCourtPricePerHour || Math.ceil((slot?.price || selectedCourt.pricePerHour || 0) / 2);
    }
    return slot?.price || (isWeekend ? selectedCourt.weekendPricePerHour || selectedCourt.pricePerHour : selectedCourt.pricePerHour);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select a time slot.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const slot = availableSlots.find(s => s.id === selectedSlot);
      await bookingService.createOfflineBooking({
        turfId: myTurf.id,
        courtId: selectedCourtId,
        slotId: selectedSlot,
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        totalAmount: formData.totalAmount || getOfflineRate(slot),
        bookingType
      });
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create offline booking.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Offline Booking Entry</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Select Court</label>
              <select value={selectedCourtId} onChange={e => setSelectedCourtId(e.target.value)} required>
                <option value="">Choose a court...</option>
                {myTurf?.courts?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
              </select>
            </div>

            {selectedCourt?.allowHalfCourtBooking && (
              <div className={styles.inputGroup}>
                <label>Booking Type</label>
                <div className={styles.segmented}>
                  <button type="button" className={bookingType === 'FULL' ? styles.segmentActive : ''} onClick={() => setBookingType('FULL')}>Full court</button>
                  <button type="button" className={bookingType === 'HALF' ? styles.segmentActive : ''} onClick={() => setBookingType('HALF')}>Half court</button>
                </div>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Select Date</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                value={displayDate}
                onChange={e => {
                  const nextDisplayDate = normalizeDisplayDate(e.target.value);
                  setDisplayDate(nextDisplayDate);
                  setDate(displayToIsoDate(nextDisplayDate));
                }}
                pattern="\d{2}/\d{2}/\d{4}"
                maxLength={10}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Available Slots</label>
              <select value={selectedSlot} onChange={e => {
                setSelectedSlot(e.target.value);
                const slot = availableSlots.find(s => s.id === e.target.value);
                if (slot) setFormData({...formData, totalAmount: getOfflineRate(slot)});
              }} required disabled={!date}>
                <option value="">{date ? 'Choose slot...' : 'Select date first'}</option>
                {availableSlots.map(s => (
                  <option key={s.id} value={s.id}>
                    {formatTime(s.startTimeUTC || s.startTime)} - {formatTime(s.endTimeUTC || s.endTime)} ({s.status === 'PARTIALLY_BOOKED' ? '1/2 booked, ' : ''}Rs {getOfflineRate(s)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Guest Name</label>
              <div className={styles.inputWrapper}>
                <User size={18} />
                <input 
                  type="text" 
                  value={formData.guestName} 
                  onChange={e => setFormData({...formData, guestName: e.target.value})} 
                  placeholder="Enter name"
                  required 
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Guest Phone</label>
              <div className={styles.inputWrapper}>
                <Phone size={18} />
                <input 
                  type="tel" 
                  value={formData.guestPhone} 
                  onChange={e => setFormData({...formData, guestPhone: e.target.value})} 
                  placeholder="Enter phone"
                  required 
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Amount Collected (Rs)</label>
              <div className={styles.inputWrapper}>
                <CreditCard size={18} />
                <input 
                  type="number" 
                  value={formData.totalAmount} 
                  onChange={e => setFormData({...formData, totalAmount: parseInt(e.target.value)})} 
                  required 
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isLoading || !selectedSlot}>
              {isLoading ? 'Processing...' : 'Finalize Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfflineBookingModal;
