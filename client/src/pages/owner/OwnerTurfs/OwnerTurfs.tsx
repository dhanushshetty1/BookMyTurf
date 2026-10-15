import React, { useEffect, useState } from 'react';
import { turfService } from '../../../services/turfService';
import styles from './OwnerTurfs.module.css';
import {
  Plus, Edit2, Image as ImageIcon, Calendar, Layout,
  ClipboardList, LogOut, Zap,
  RotateCcw
} from 'lucide-react';
import TurfModal from '../components/TurfModal/TurfModal';
import ManageSlotsModal from '../components/ManageSlotsModal/ManageSlotsModal';
import CourtModal from '../components/CourtModal/CourtModal';
import OwnerBookings from '../OwnerBookings/OwnerBookings';
import OfflineBookingModal from '../components/OfflineBookingModal/OfflineBookingModal';
import { useDispatch } from 'react-redux';
import { logout } from '../../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { IMAGE_BASE_URL } from '../../../config';

const OwnerTurfs: React.FC = () => {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
  const [editingTurf, setEditingTurf] = useState<any>(null);
  const [editingCourt, setEditingCourt] = useState<any>(null);
  const [activeCourtId, setActiveCourtId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'TURFS' | 'BOOKINGS'>('TURFS');
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const fetchTurfs = () => {
    setIsLoading(true);
    turfService.getMyTurfs()
      .then(data => setTurfs(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTurfs();
  }, []);

  const handleCreateTurf = () => {
    setEditingTurf(null);
    setIsModalOpen(true);
  };

  const handleEditTurf = (turf: any) => {
    setEditingTurf(turf);
    setIsModalOpen(true);
  };

  const handleAddCourt = () => {
    setEditingCourt(null);
    setIsCourtModalOpen(true);
  };

  const handleEditCourt = (court: any) => {
    setEditingCourt(court);
    setIsCourtModalOpen(true);
  };

  const handleManageSlots = (courtId: string) => {
    setActiveCourtId(courtId);
    setIsSlotModalOpen(true);
  };

  const handleToggleCourtStatus = async (courtId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await turfService.toggleCourtStatus(courtId, newStatus);
      fetchTurfs();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const myTurf = turfs.length > 0 ? turfs[0] : null;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <span className={styles.statusActive}>Active</span>;
      case 'INACTIVE': return <span className={styles.statusInactive}>Inactive</span>;
      case 'MAINTENANCE': return <span className={styles.statusMaint}>Maintenance</span>;
      default: return status;
    }
  };
  void renderStatus;

  return (
    <div className={styles.dashboardContainer} data-theme="light">
      <aside className={styles.sidebar}>
        <div className={styles.brandSection}>
          <div className={styles.logoMark}>
            <img src="/bookmyturf-logo.png" alt="BookMyTurf Logo" className={styles.logoIcon} />
          </div>
          <div className={styles.brandCopy}>
            <span className={styles.logoText}>BookMyTurf</span>
            <span className={styles.logoSubtext}>Owner Control</span>
          </div>
        </div>

        <h2>Management</h2>
        <nav>
          <button onClick={() => setActiveView('TURFS')} className={activeView === 'TURFS' ? styles.activeLink : ''}>
            <Layout size={18} /> My Turf
          </button>
          <button onClick={() => setActiveView('BOOKINGS')} className={activeView === 'BOOKINGS' ? styles.activeLink : ''}>
            <ClipboardList size={18} /> Bookings
          </button>
          <div className={styles.navDivider}></div>
          <button onClick={() => setShowOfflineModal(true)} className={styles.offlineSidebarBtn}>
            <Zap size={18} /> Offline Booking
          </button>
          {!myTurf ? (
            <button onClick={handleCreateTurf} className={styles.addSidebarBtn}>
              <Plus size={18} /> Add New Turf
            </button>
          ) : (
            <button onClick={handleAddCourt} className={styles.addSidebarBtn}>
              <Plus size={18} /> Add New Court
            </button>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        {activeView === 'TURFS' ? (
          <>
            <div className={styles.header}>
              <div>
                <h1>{myTurf ? myTurf.name : 'Turf Dashboard'}</h1>
                <p className={styles.subtitle}>
                  {myTurf ? `${myTurf.location} | Managing ${myTurf.courts?.length || 0} Courts` : 'Control your sports facilities from a single command center.'}
                </p>
              </div>
              <div className={styles.headerActions}>
                {myTurf && (
                  <button className={`${styles.editBtn} ${styles.facilityEditBtn}`} onClick={() => handleEditTurf(myTurf)}>
                    <Edit2 size={16} /> Edit Facility
                  </button>
                )}
              </div>
            </div>

            <div className={styles.grid}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <RotateCcw className="animate-spin" size={32} />
                  <p>Loading your sports empire...</p>
                </div>
              ) : !myTurf ? (
                <div className={`${styles.emptyState} ${styles.fullSpan}`}>
                  <div className={styles.emptyIcon}><Plus size={48} /></div>
                  <h3>No Turf Facility Found</h3>
                  <p>Register your first sports facility to get started.</p>
                  <button onClick={handleCreateTurf} className={`${styles.manageBtn} ${styles.emptyStateAction}`}>
                    Register Turf
                  </button>
                </div>
              ) : (
                <>
                  {myTurf.courts?.length === 0 && (
                    <div className={`${styles.emptyState} ${styles.fullSpan}`}>
                      <div className={styles.emptyIcon}><Layout size={48} /></div>
                      <h3>No Courts Added</h3>
                      <p>Add courts (Tennis, Football, etc.) to your turf facility.</p>
                      <button onClick={handleAddCourt} className={`${styles.manageBtn} ${styles.emptyStateAction}`}>
                        Add Your First Court
                      </button>
                    </div>
                  )}

                  {myTurf.courts?.map((court: any) => (
                    <div key={court.id} className={`${styles.turfCard} glass`}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardImagePlaceholder} style={{
                          backgroundImage: court.images && court.images.length > 0
                            ? `url(${IMAGE_BASE_URL}${court.images[0]})`
                            : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}>
                          {(!court.images || court.images.length === 0) && (
                            <ImageIcon size={48} className={styles.emptyImageIcon} />
                          )}
                        </div>
                        <div className={styles.cardActions}>
                          <span className={styles.typeBadge}>{court.type}</span>
                          <button className={`${styles.editBtn} ${styles.cardEditBtn}`} onClick={() => handleEditCourt(court)}>
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.cardBody}>
                        <div className={styles.cardBodyHeader}>
                          <h3>{court.name}</h3>
                          <div className={styles.statusSwitchWrapper}>
                            <span className={court.status === 'ACTIVE' ? styles.activeText : styles.inactiveText}>
                              {court.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                            <label className={styles.statusSwitch}>
                              <input
                                type="checkbox"
                                checked={court.status === 'ACTIVE'}
                                onChange={() => handleToggleCourtStatus(court.id, court.status)}
                                className={styles.switchInput}
                              />
                              <span className={styles.switchSlider}></span>
                            </label>
                          </div>
                        </div>

                        <div className={styles.cardStats}>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Standard</span>
                            <span className={styles.statValue}>Rs {court.pricePerHour}/hr</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Weekend</span>
                            <span className={styles.statValue}>Rs {court.weekendPricePerHour || court.pricePerHour}/hr</span>
                          </div>
                          {court.allowHalfCourtBooking && (
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>Half court</span>
                              <span className={styles.statValue}>Rs {court.halfCourtPricePerHour}/hr</span>
                            </div>
                          )}
                        </div>

                        <button className={styles.manageBtn} onClick={() => handleManageSlots(court.id)}>
                          <Calendar size={18} /> Manage Slots
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <OwnerBookings />
        )}
      </main>

      {isModalOpen && (
        <TurfModal turf={editingTurf} onClose={() => setIsModalOpen(false)} onRefresh={fetchTurfs} />
      )}

      {isCourtModalOpen && (
        <CourtModal turfId={myTurf.id} court={editingCourt} onClose={() => setIsCourtModalOpen(false)} onRefresh={fetchTurfs} />
      )}

      {isSlotModalOpen && activeCourtId && (
        <ManageSlotsModal
          courtId={activeCourtId}
          onClose={() => setIsSlotModalOpen(false)}
          onRefresh={fetchTurfs}
        />
      )}

      {showOfflineModal && (
        <OfflineBookingModal onClose={() => setShowOfflineModal(false)} onRefresh={fetchTurfs} />
      )}
    </div>
  );
};

export default OwnerTurfs;
