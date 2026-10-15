import React, { useEffect, useState } from 'react';
import { bookingService } from '../../../services/bookingService';
import styles from '../OwnerTurfs/OwnerTurfs.module.css';
import bStyles from './OwnerBookings.module.css';
import { 
  Calendar, Clock, Phone, CheckCircle, 
  XCircle, Eye, EyeOff, Search, Layout
} from 'lucide-react';
import { formatTime } from '../../../utils/formatTime';
import ConfirmationModal from '../../../components/common/ConfirmationModal/ConfirmationModal';
import { formatDate } from '../../../utils/formatDate';

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

const OwnerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [displayFilterDate, setDisplayFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState({
    isOpen: false,
    bookingId: ''
  });

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const data = await bookingService.getOwnerBookings();
      setBookings(data);
    } catch {
      setError('Failed to fetch bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    if (status === 'CANCELLED') {
      setCancelConfirm({ isOpen: true, bookingId: id });
      return;
    }
    
    await executeStatusUpdate(id, status);
  };

  const executeStatusUpdate = async (id: string, status: string) => {
    try {
      await bookingService.updateBookingStatus(id, status);
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmCancellation = async () => {
    await executeStatusUpdate(cancelConfirm.bookingId, 'CANCELLED');
    setCancelConfirm(prev => ({ ...prev, isOpen: false }));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    return phone.substring(0, 3) + '******' + phone.substring(phone.length - 1);
  };

  const filteredBookings = bookings.filter(b => {
    // 1. Status Filter
    let matchesStatus = filterStatus === 'ALL' || b.bookingStatus === filterStatus;
    
    // Special case for TODAY_LIVE
    if (filterStatus === 'TODAY_LIVE') {
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const bookingDate = b.slot?.startTimeUTC ? new Date(b.slot.startTimeUTC).toISOString().split('T')[0] : '';
      
      // Slot must be today AND (not started yet OR started within the last 30 minutes)
      const startTime = b.slot?.startTimeUTC ? new Date(b.slot.startTimeUTC) : null;
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      const isWithinTimeWindow = Boolean(startTime && startTime >= thirtyMinsAgo);
      
      matchesStatus = bookingDate === todayIso && isWithinTimeWindow;
    }

    // 2. Search Filter
    const customerName = b.isOffline ? b.guestName : b.user?.name;
    const matchesSearch = !searchTerm || customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 3. Date Filter
    const bookingDate = b.slot?.startTimeUTC ? new Date(b.slot.startTimeUTC).toISOString().split('T')[0] : '';
    const matchesDate = !filterDate || bookingDate === filterDate;
    
    return matchesStatus && matchesSearch && matchesDate;
  }).sort((a, b) => {
    const dateA = a.slot?.startTimeUTC ? new Date(a.slot.startTimeUTC).toISOString().split('T')[0] : '';
    const dateB = b.slot?.startTimeUTC ? new Date(b.slot.startTimeUTC).toISOString().split('T')[0] : '';
    
    // Primary Sort: Date Descending (e.g., May 7th comes before May 6th)
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    
    // Secondary Sort: Time Ascending (e.g., 10:00 AM comes before 8:00 PM)
    const timeA = a.slot?.startTimeUTC ? new Date(a.slot.startTimeUTC).getTime() : 0;
    const timeB = b.slot?.startTimeUTC ? new Date(b.slot.startTimeUTC).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div className={bStyles.container}>
      <div className={bStyles.header}>
        <div>
          <h1 className={styles.headerTitle}>Finance & Operations</h1>
          <p className={styles.subtitle}>Audit revenue streams and manage live turf schedules.</p>
        </div>
      </div>

      {error && <div className={bStyles.errorAlert}>{error}</div>}

      <div className={bStyles.controlsRow}>
        <div className={bStyles.searchWrapper}>
          <Search size={18} className={bStyles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by customer name..." 
            className={bStyles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className={bStyles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="TODAY_LIVE">Today's Live</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div className={bStyles.dateFilterWrapper}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            className={bStyles.filterSelect}
            value={displayFilterDate}
            onChange={(e) => {
              const displayDate = normalizeDisplayDate(e.target.value);
              setDisplayFilterDate(displayDate);
              setFilterDate(displayToIsoDate(displayDate));
            }}
            pattern="\d{2}/\d{2}/\d{4}"
            maxLength={10}
          />
          <Calendar size={16} />
        </div>
        {filterDate && (
          <button 
            className={bStyles.clearDateBtn} 
            onClick={() => {
              setFilterDate('');
              setDisplayFilterDate('');
            }}
          >
            Clear Date
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={bStyles.emptyState}>
          <div className={`${bStyles.emptyIcon} ${bStyles.emptyIconDashed}`}>
             <Clock size={32} className="animate-spin" />
          </div>
          <p>Synchronizing booking data...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className={bStyles.emptyState}>
          <div className={bStyles.emptyIcon}>
            <Calendar size={32} />
          </div>
          <h3>No Records Found</h3>
          <p>Adjust your filters or use the sidebar for new entries.</p>
        </div>
      ) : (
        <div className={bStyles.bookingList}>
          {filteredBookings.map((booking) => {
            const customerName = booking.isOffline ? booking.guestName : booking.user?.name;
            const phoneToShow = booking.isOffline ? booking.guestPhone : booking.user?.phone;
            
            return (
              <div key={booking.id} className={bStyles.bookingCard}>
                <div className={bStyles.cardMain}>
                  <div className={bStyles.cardHeader}>
                    <div className={bStyles.customerInfo}>
                      <span className={bStyles.customerName}>{customerName}</span>
                    <span className={bStyles.bookingCodeLabel}>Code: {booking.bookingCode || 'N/A'}</span>
                  </div>
                  {booking.isOffline && <span className={`${bStyles.badge} ${bStyles.offlineBadge}`}>OFFLINE</span>}
                  <span className={`${bStyles.badge} ${booking.bookingType === 'HALF' ? bStyles.halfBadge : bStyles.fullBadge}`}>
                    {booking.bookingType === 'HALF' ? 'HALF COURT' : 'FULL COURT'}
                  </span>
                </div>
                  
                  <div className={bStyles.cardMeta}>
                    <div className={bStyles.metaItem}>
                      <Layout size={16} />
                      {booking.turf?.name}
                    </div>
                    <div className={bStyles.metaItem}>
                      <Calendar size={16} />
                      {formatDate(booking.slot?.startTimeUTC)}
                    </div>
                    <div className={bStyles.metaItem}>
                      <Clock size={16} />
                      {formatTime(booking.slot?.startTimeUTC)} - {formatTime(booking.slot?.endTimeUTC)}
                    </div>
                    <div className={bStyles.metaItem}>
                      <Phone size={16} />
                      {revealedIds.includes(booking.id) ? (phoneToShow || 'N/A') : maskPhone(phoneToShow)}
                      <button onClick={() => toggleReveal(booking.id)} className={bStyles.revealBtn}>
                        {revealedIds.includes(booking.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={bStyles.cardSide}>
                  <div className={bStyles.priceTag}>Rs {booking.totalAmount?.toLocaleString()}</div>
                  <div className={bStyles.actionRow}>
                    <span className={`${bStyles.statusBadge} ${bStyles['status-' + booking.bookingStatus]}`}>
                      {booking.bookingStatus}
                    </span>
                    <div className={bStyles.actionButtons}>
                      {booking.bookingStatus === 'PENDING' && (
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')} 
                          className={`${bStyles.actionBtn} ${bStyles.confirmBtn}`}
                          title="Confirm"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {booking.bookingStatus !== 'CANCELLED' && (
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')} 
                          className={`${bStyles.actionBtn} ${bStyles.cancelBtn}`}
                          title="Cancel"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={cancelConfirm.isOpen}
        title="Cancel this booking?"
        message="Are you sure you want to cancel this booking? This action cannot be undone. If the payment was made online, the refund will be processed to the original payment method within 5-7 business days."
        confirmLabel="Yes, Cancel Booking"
        cancelLabel="No, Keep Booking"
        onConfirm={confirmCancellation}
        onCancel={() => setCancelConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default OwnerBookings;
