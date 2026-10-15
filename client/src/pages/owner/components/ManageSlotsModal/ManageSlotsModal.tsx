import React, { useEffect, useRef, useState } from 'react';
import styles from './ManageSlotsModal.module.css';
import { turfService } from '../../../../services/turfService';
import api from '../../../../services/api';
import { X, Calendar, Clock, RotateCcw, Plus, Zap, Settings } from 'lucide-react';
import { formatTime } from '../../../../utils/formatTime';
import { formatDate, toIsoDateKey } from '../../../../utils/formatDate';
import ConfirmationModal from '../../../../components/common/ConfirmationModal/ConfirmationModal';

interface ManageSlotsModalProps {
  courtId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const isoToDisplayDate = (date: string) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
};

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

type DateInputProps = {
  value: string;
  isoValue: string;
  onTextChange: (value: string) => void;
  onPickerChange: (isoValue: string) => void;
  required?: boolean;
};

const DateInput: React.FC<DateInputProps> = ({ value, isoValue, onTextChange, onPickerChange, required = false }) => {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!picker) return;

    if (picker.showPicker) {
      picker.showPicker();
      return;
    }

    picker.click();
  };

  return (
    <div className={styles.dateInputWrapper}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={value}
        onChange={e => onTextChange(e.target.value)}
        pattern="\d{2}/\d{2}/\d{4}"
        maxLength={10}
        required={required}
      />
      <button type="button" className={styles.datePickerButton} onClick={openPicker} aria-label="Pick date">
        <Calendar size={18} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        className={styles.nativeDateInput}
        value={isoValue}
        onChange={e => onPickerChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

const ManageSlotsModal: React.FC<ManageSlotsModalProps> = ({ courtId, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'GENERATE' | 'AVAILABILITY'>('VIEW');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [court, setCourt] = useState<any>(null);
  const [selectedExistingDate, setSelectedExistingDate] = useState('');
  
  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    slotId: '',
    newStatus: '' as 'AVAILABLE' | 'BLOCKED'
  });

  // Availability state
  const [availData, setAvailData] = useState({
    holidayDate: '',
  });

  const fetchCourtDetails = async () => {
    try {
      const response = await api.get('/turfs/my-turfs');
      const allTurfs = response.data;
      let foundCourt = null;
      for (const t of allTurfs) {
        const found = t.courts?.find((c: any) => c.id === courtId);
        if (found) {
          foundCourt = found;
          break;
        }
      }
      if (foundCourt) {
        setCourt(foundCourt);
      }
    } catch (err) {
      console.error('Failed to fetch court details', err);
    }
  };

  useEffect(() => {
    fetchCourtDetails();
  }, [courtId]);

  // Generation state
  const [genData, setGenData] = useState({
    startDate: '',
    endDate: '',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0], 
    startTime: '09:00',
    endTime: '22:00',
    durationMinutes: 60
  });

  const [displayDates, setDisplayDates] = useState({
    startDate: '',
    endDate: '',
    holidayDate: '',
    existingDate: '',
  });

  // Automated pricing based on court

  const [isPreviewWeekend, setIsPreviewWeekend] = useState(false);

  const calculatePreviewSlots = () => {
    const slots = [];
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const formatTime = (totalMins: any) => {
      const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
      const m = (totalMins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const startMins = parseTime(genData.startTime);
    const endMins = parseTime(genData.endTime);
    let currentMins = startMins;

    while (currentMins + genData.durationMinutes <= endMins) {
      slots.push({
        start: formatTime(currentMins),
        end: formatTime(currentMins + genData.durationMinutes),
        price: isPreviewWeekend ? (court?.weekendPricePerHour || court?.pricePerHour) : court?.pricePerHour
      });
      currentMins += genData.durationMinutes;
    }
    return slots;
  };

  const previewSlots = calculatePreviewSlots();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!genData.startDate || !genData.endDate) {
        setError('Please enter dates in DD/MM/YYYY format.');
        setIsLoading(false);
        return;
      }

      await turfService.bulkAddSlots(courtId, genData);
      onRefresh();
      onClose();
    } catch(err:any) {
      setError(err.response?.data?.message || 'Failed to generate slots.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    if (genData.daysOfWeek.includes(day)) {
      setGenData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== day) }));
    } else {
      setGenData(prev => ({ ...prev, daysOfWeek: [...prev.daysOfWeek, day] }));
    }
  };

  const handleToggleStatus = async (slotId: string, currentStatus: string) => {
    if (currentStatus === 'BOOKED' || currentStatus === 'PARTIALLY_BOOKED') return;
    const newStatus = currentStatus === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    
    setConfirmModal({
      isOpen: true,
      slotId,
      newStatus
    });
  };

  const executeToggleStatus = async (slotId: string, newStatus: string) => {
    try {
      await turfService.toggleSlotStatus(slotId, newStatus);
      fetchCourtDetails();
    } catch(err) {
      console.error(err);
    }
  };

  const confirmToggleStatus = async () => {
    await executeToggleStatus(confirmModal.slotId, confirmModal.newStatus);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleHoliday = async () => {
    if (!availData.holidayDate) {
      setError('Please enter a date in DD/MM/YYYY format.');
      return;
    }
    
    setIsLoading(true);
    try {
      await turfService.setHolidayMode(courtId, availData.holidayDate);
      fetchCourtDetails();
      alert('Holiday set successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const daysLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedSlots = court ? [...(court.slots || [])].sort((a:any, b:any) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime()) : [];
  const existingDates = Array.from(new Set(sortedSlots.map((slot: any) => toIsoDateKey(slot.startTimeUTC)))).filter(Boolean);
  const todayIso = toIsoDateKey(new Date());
  const nextExistingDate = existingDates.find((date: string) => date >= todayIso);
  const activeExistingDate = selectedExistingDate || nextExistingDate || existingDates[0] || '';
  const existingSlotsForDate = activeExistingDate
    ? sortedSlots.filter((slot: any) => toIsoDateKey(slot.startTimeUTC) === activeExistingDate)
    : [];
  const morningExistingSlots = existingSlotsForDate.filter((slot: any) => new Date(slot.startTimeUTC).getHours() < 12);
  const afternoonExistingSlots = existingSlotsForDate.filter((slot: any) => {
    const hour = new Date(slot.startTimeUTC).getHours();
    return hour >= 12 && hour < 17;
  });
  const eveningExistingSlots = existingSlotsForDate.filter((slot: any) => new Date(slot.startTimeUTC).getHours() >= 17);

  const handleDateFieldChange = (field: 'startDate' | 'endDate' | 'holidayDate', value: string) => {
    const displayDate = normalizeDisplayDate(value);
    const isoDate = displayToIsoDate(displayDate);

    setDisplayDates(prev => ({ ...prev, [field]: displayDate }));

    if (field === 'holidayDate') {
      setAvailData(prev => ({ ...prev, holidayDate: isoDate }));
      return;
    }

    setGenData(prev => ({ ...prev, [field]: isoDate }));
  };

  const handleDatePickerChange = (field: 'startDate' | 'endDate' | 'holidayDate', isoDate: string) => {
    setDisplayDates(prev => ({ ...prev, [field]: isoToDisplayDate(isoDate) }));

    if (field === 'holidayDate') {
      setAvailData(prev => ({ ...prev, holidayDate: isoDate }));
      return;
    }

    setGenData(prev => ({ ...prev, [field]: isoDate }));
  };

  const handleExistingDateTextChange = (value: string) => {
    const displayDate = normalizeDisplayDate(value);
    const isoDate = displayToIsoDate(displayDate);
    setDisplayDates(prev => ({ ...prev, existingDate: displayDate }));
    setSelectedExistingDate(isoDate);
  };

  const handleExistingDatePickerChange = (isoDate: string) => {
    setDisplayDates(prev => ({ ...prev, existingDate: isoToDisplayDate(isoDate) }));
    setSelectedExistingDate(isoDate);
  };

  const renderExistingSlotGroup = (title: string, icon: React.ReactNode, slots: any[]) => {
    if (slots.length === 0) return null;

    return (
      <section className={styles.existingTimeGroup}>
        <div className={styles.existingTimeGroupTitle}>
          {icon}
          <span>{title}</span>
        </div>
        <div className={styles.existingSlotGrid}>
          {slots.map((slot: any) => (
            <button
              key={slot.id}
              type="button"
              className={`${styles.existingSlotBtn} ${
                slot.status === 'AVAILABLE'
                  ? styles.existingAvailable
                  : slot.status === 'BOOKED' || slot.status === 'PARTIALLY_BOOKED'
                    ? slot.status === 'PARTIALLY_BOOKED' ? styles.existingPartial : styles.existingBooked
                    : styles.existingBlocked
              }`}
              onClick={() => handleToggleStatus(slot.id, slot.status)}
              disabled={slot.status === 'BOOKED' || slot.status === 'PARTIALLY_BOOKED'}
              title={slot.status === 'BOOKED' || slot.status === 'PARTIALLY_BOOKED' ? 'Booked slots cannot be changed' : 'Click to block or unblock this slot'}
            >
              <span>{formatTime(slot.startTimeUTC)} - {formatTime(slot.endTimeUTC)}</span>
              <small>{slot.status === 'PARTIALLY_BOOKED' ? '1/2 BOOKED' : slot.status}</small>
            </button>
          ))}
        </div>
      </section>
    );
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
             <h2>Manage Slots - {court?.name} ({court?.type})</h2>
             <p>Configure bulk schedules and availability control.</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <div className={styles.tabs}>
           <button 
             onClick={() => setActiveTab('VIEW')}
             className={`${styles.tabBtn} ${activeTab === 'VIEW' ? styles.tabActive : ''}`}
           >
             <Zap size={16} /> Existing Slots
           </button>
           <button 
             onClick={() => setActiveTab('GENERATE')}
             className={`${styles.tabBtn} ${activeTab === 'GENERATE' ? styles.tabActive : ''}`}
           >
             <Plus size={16} /> Generate Bulk
           </button>
           <button 
             onClick={() => setActiveTab('AVAILABILITY')}
             className={`${styles.tabBtn} ${activeTab === 'AVAILABILITY' ? styles.tabActive : ''}`}
           >
             <Settings size={16} /> Holiday Mode
           </button>
        </div>

        <div className={styles.formContainer}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {activeTab === 'VIEW' && (
            <div className={styles.existingSlotsPanel}>
              {sortedSlots.length === 0 ? (
                <div className={styles.emptySlotState}>
                  <Calendar size={48} />
                  <p>No slots created for this court yet.</p>
                </div>
              ) : (
                <>
                  <div className={styles.existingDateSection}>
                    <div className={styles.existingDateHeader}>
                      <h3>Select Date</h3>
                      <div className={styles.existingDatePicker}>
                        <DateInput
                          value={displayDates.existingDate || isoToDisplayDate(activeExistingDate)}
                          isoValue={activeExistingDate}
                          onTextChange={handleExistingDateTextChange}
                          onPickerChange={handleExistingDatePickerChange}
                        />
                      </div>
                    </div>
                    <div className={styles.existingDateList}>
                      {existingDates.map((date: string) => (
                        <button
                          type="button"
                          key={date}
                          className={`${styles.existingDateItem} ${activeExistingDate === date ? styles.existingDateActive : ''}`}
                          onClick={() => setSelectedExistingDate(date)}
                        >
                          <span>{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <strong>{new Date(`${date}T00:00:00`).getDate()}</strong>
                          <small>{formatDate(`${date}T00:00:00`)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.existingLegend}>
                    <span><i className={styles.legendAvailable}></i> Available</span>
                    <span><i className={styles.legendBooked}></i> Booked</span>
                    <span><i className={styles.legendBlocked}></i> Blocked</span>
                  </div>
                  <h3 className={styles.existingSlotsHeading}>Existing Slots</h3>
                  {existingSlotsForDate.length > 0 ? (
                    <>
                      {renderExistingSlotGroup('Morning', <Zap size={16} />, morningExistingSlots)}
                      {renderExistingSlotGroup('Afternoon', <Clock size={16} />, afternoonExistingSlots)}
                      {renderExistingSlotGroup('Evening', <Settings size={16} />, eveningExistingSlots)}
                    </>
                  ) : (
                    <div className={styles.noExistingSlotsForDate}>
                      <Calendar size={22} />
                      <div>
                        <strong>No slots on {formatDate(`${activeExistingDate}T00:00:00`) || 'this date'}</strong>
                        <p>Pick another date above or generate slots for this day.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'GENERATE' && (
            <div className={styles.generateLayout}>
              <form onSubmit={handleGenerate} className={styles.formStack}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Start Date</label>
                    <DateInput
                      value={displayDates.startDate || isoToDisplayDate(genData.startDate)}
                      isoValue={genData.startDate}
                      onTextChange={value => handleDateFieldChange('startDate', value)}
                      onPickerChange={value => handleDatePickerChange('startDate', value)}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>End Date</label>
                    <DateInput
                      value={displayDates.endDate || isoToDisplayDate(genData.endDate)}
                      isoValue={genData.endDate}
                      onTextChange={value => handleDateFieldChange('endDate', value)}
                      onPickerChange={value => handleDatePickerChange('endDate', value)}
                      required
                    />
                  </div>

                  <div className={`${styles.inputGroup} ${styles.fullSpan}`}>
                    <label>Days of the Week</label>
                    <div className={styles.chipGrid}>
                      {daysLabel.map((lbl, i) => (
                        <button type="button" key={i} onClick={() => toggleDay(i)}
                          className={`${styles.chip} ${genData.daysOfWeek.includes(i) ? styles.chipActive : ''}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Daily Start Time</label>
                    <input type="time" value={genData.startTime} onChange={e => setGenData({...genData, startTime: e.target.value})} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Daily End Time</label>
                    <input type="time" value={genData.endTime} onChange={e => setGenData({...genData, endTime: e.target.value})} required />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Duration (Mins)</label>
                    <select value={genData.durationMinutes} onChange={e => setGenData({...genData, durationMinutes: parseInt(e.target.value)})}>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                      <option value={90}>90</option>
                      <option value={120}>120</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Pricing Mode</label>
                    <div className={styles.pricingNote}>
                      Using court rates: Rs {court?.pricePerHour}/hr (Weekday), Rs {court?.weekendPricePerHour || court?.pricePerHour}/hr (Weekend)
                    </div>
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                  {isLoading ? 'Processing Schedule...' : 'Generate Slots'}
                </button>
              </form>

              <div className={styles.previewSection}>
                <div className={styles.previewHeader}>
                  <h3>Live Preview</h3>
                  <div className={styles.previewToggle}>
                    <button type="button" className={`${styles.toggleBtn} ${!isPreviewWeekend ? styles.toggleBtnActive : ''}`} onClick={() => setIsPreviewWeekend(false)}>Weekday</button>
                    <button type="button" className={`${styles.toggleBtn} ${isPreviewWeekend ? styles.toggleBtnActive : ''}`} onClick={() => setIsPreviewWeekend(true)}>Weekend</button>
                  </div>
                </div>
                <div className={styles.previewGrid}>
                  {previewSlots.map((ps, idx) => (
                    <div key={idx} className={styles.previewSlot}>
                      <span>{formatTime(ps.start)} - {formatTime(ps.end)}</span>
                      <strong>Rs {ps.price}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AVAILABILITY' && (
            <div className={styles.availabilityStack}>
              <div className={styles.holidayPanel}>
                <h3 className={styles.holidayTitle}>
                   <RotateCcw size={20} /> Mark Holiday
                </h3>
                <p className={styles.holidayCopy}>This will block all slots for the selected date.</p>
                <div className={styles.holidayActions}>
                   <div className={`${styles.inputGroup} ${styles.holidayInput}`}>
                      <label>Select Date</label>
                      <DateInput
                        value={displayDates.holidayDate || isoToDisplayDate(availData.holidayDate)}
                        isoValue={availData.holidayDate}
                        onTextChange={value => handleDateFieldChange('holidayDate', value)}
                        onPickerChange={value => handleDatePickerChange('holidayDate', value)}
                      />
                   </div>
                   <button onClick={handleHoliday} className={`${styles.submitBtn} ${styles.submitInline}`}>Block Day</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.newStatus === 'BLOCKED' ? "Block this slot?" : "Unblock this slot?"}
        message={confirmModal.newStatus === 'BLOCKED' 
          ? "This will make the slot unavailable for users to book. You can unblock it later." 
          : "This will make the slot available for public booking again."}
        confirmLabel={confirmModal.newStatus === 'BLOCKED' ? "Block Slot" : "Unblock Slot"}
        cancelLabel="No, Cancel"
        onConfirm={confirmToggleStatus}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ManageSlotsModal;
