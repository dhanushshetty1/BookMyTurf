import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { AlertCircle, CalendarDays, Clock, RefreshCw, XCircle, ChevronRight, QrCode, Trophy } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import styles from './Dashboard.module.css';
import { formatTime } from '../../utils/formatTime';
import { formatDate } from '../../utils/formatDate';
import BookingDetailsModal from '../../components/booking/BookingDetailsModal/BookingDetailsModal';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rescheduleData, setRescheduleData] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const navigate = useNavigate();

  const fetchBookings = () => {
    setIsLoading(true);
    bookingService.getMyBookings()
      .then(data => setBookings(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'OWNER') {
        navigate('/owner');
      } else {
        fetchBookings();
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleCancelBooking = async (bookingId: string, isRescheduling = false) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await bookingService.updateBookingStatus(bookingId, 'CANCELLED');
      if (isRescheduling && rescheduleData) {
        alert('Booking cancelled. Redirecting you to pick a new slot.');
        navigate(`/turfs/${rescheduleData.turfId}`);
      } else {
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to cancel booking.');
    }
  };

  const handleShowDetails = (booking: any) => {
    setDetailData({
      booking,
      turfName: booking.turf.name,
      courtName: booking.court.name,
      location: booking.turf.location,
      mapsUrl: booking.turf.googleMapsUrl,
      date: booking.slot.startTimeUTC,
      timeRange: `${formatTime(booking.slot.startTimeUTC)} - ${formatTime(booking.slot.endTimeUTC)}`,
      amount: booking.totalAmount
    });
    setIsDetailModalOpen(true);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const getStatusClass = (status: string) => {
    if (status === 'CONFIRMED') return styles.confirmed;
    if (status === 'CANCELLED') return styles.cancelled;
    return styles.pending;
  };

  const upcomingBookings = bookings.filter((booking) => booking.bookingStatus !== 'CANCELLED').length;

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Player dashboard</p>
            <h1 className={styles.title}>Welcome back, {user?.name}</h1>
            <p className={styles.subtitle}>Track your upcoming turf sessions and manage changes from one clean place.</p>
          </div>
          <Link to="/" className={`btn-primary ${styles.browseLink}`}>Book another turf</Link>
        </header>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Trophy size={20} />
            <span>Upcoming</span>
            <strong>{upcomingBookings}</strong>
          </div>
          <div className={styles.statCard}>
            <CalendarDays size={20} />
            <span>Total bookings</span>
            <strong>{bookings.length}</strong>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Your Bookings</h2>
            <span className={styles.countBadge}>{bookings.length} total</span>
          </div>
        
          {isLoading ? (
            <div style={{ height: '300px' }}>
              <LoadingScreen fullScreen={false} message="Loading your bookings..." />
            </div>
          ) : bookings.length > 0 ? (
            <ul className={styles.bookingList}>
              {bookings.map(booking => (
                <li key={booking.id} className={styles.bookingItem}>
                  <div>
                    <h3 className={styles.bookingName}>
                      <Link to={`/turfs/${booking.turfId || booking.turf?.id}`} className={styles.bookingNameLink}>
                        {booking.turf.name}
                      </Link>
                    </h3>
                    <div className={styles.bookingMeta}>
                      <span className={styles.metaItem}>
                        <CalendarDays size={16} />
                        {formatDate(booking.slot.startTimeUTC)}
                      </span>
                      <span className={styles.metaItem}>
                        <Clock size={16} />
                        {formatTime(booking.slot.startTimeUTC)} - {formatTime(booking.slot.endTimeUTC)}
                      </span>
                      <span className={styles.metaItem}>
                        {booking.bookingType === 'HALF' ? 'Half court' : 'Full court'}
                      </span>
                      <span className={styles.metaItem}>
                        <QrCode size={16} />
                        QR ready
                      </span>
                    </div>
                  </div>
                  <div className={styles.bookingActions}>
                    <span className={`${styles.status} ${getStatusClass(booking.bookingStatus)}`}>
                      {booking.bookingStatus}
                    </span>
                    {booking.bookingStatus !== 'CANCELLED' && (
                      <div className={styles.iconButtons}>
                        <button
                          onClick={() => setRescheduleData(booking)}
                          className={styles.iconBtn}
                          title="Reschedule"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className={`${styles.iconBtn} ${styles.dangerBtn}`}
                          title="Cancel"
                        >
                          <XCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleShowDetails(booking)}
                          className={`${styles.iconBtn} ${styles.detailsBtn}`}
                          title="View Details"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <p>No bookings yet. Choose a turf and reserve your first slot.</p>
            </div>
          )}
        </section>

      {rescheduleData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
             <AlertCircle size={48} className={styles.modalIcon} />
             <h2>Reschedule Booking</h2>
             <p>
               To reschedule, you must first cancel this current booking and then select a new slot for <strong>{rescheduleData.turf.name}</strong>.
             </p>
             <div className={styles.modalActions}>
               <button 
                 className="btn-primary" 
                 style={{ width: '100%' }}
                 onClick={() => handleCancelBooking(rescheduleData.id, true)}
               >
                 Cancel Current & Pick New Slot
               </button>
               <button 
                 className={styles.secondaryBtn}
                 onClick={() => setRescheduleData(null)}
               >
                 Go Back
               </button>
             </div>
          </div>
        </div>
      )}

      {user?.role === 'OWNER' && (
        <div className="card glass" style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h2>Manage Your Turfs</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Access your dedicated owner dashboard to manage properties, pricing, and availability.</p>
          <Link to="/owner" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Go to Owner Panel
          </Link>
        </div>
      )}
      
      <BookingDetailsModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        bookingData={detailData}
      />
      </main>
    </div>
  );
};

export default Dashboard;
