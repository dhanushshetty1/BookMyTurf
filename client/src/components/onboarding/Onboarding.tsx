import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/onboarding.css';

const onboardingCards = [
  {
    eyebrow: "Discover",
    title: "Find the right turf in seconds",
    body: "Browse premium sports venues with clean availability, location context, and prices that are easy to compare.",
  },
  {
    eyebrow: "Reserve",
    title: "Book your slot without the back-and-forth",
    body: "Pick a time, confirm your match plan, and keep your group moving with a smooth booking flow.",
  },
  {
    eyebrow: "Play",
    title: "Arrive ready for the game",
    body: "Your bookings, reminders, and venue details stay together so match day feels effortless.",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [activeCard, setActiveCard] = useState(0);
  const card = onboardingCards[activeCard];
  const isLast = activeCard === onboardingCards.length - 1;

  const progressWidth = useMemo(() => {
    return `${((activeCard + 1) / onboardingCards.length) * 100}%`;
  }, [activeCard]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setActiveCard(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveCard(prev => Math.max(0, prev - 1));
  };

  return (
    <motion.section
      className="bmt-onboarding-section"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bmt-onboarding-container">
        <header className="bmt-onboarding-header">
          <div className="bmt-header-logo">
            <span className="bmt-header-icon">
              <img src="/logo-icon.png" alt="Logo" style={{ width: '2rem', height: '2rem' }} />
            </span>
            <span className="bmt-header-title">BookMyTurf</span>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="bmt-skip-btn"
          >
            Skip
          </button>
        </header>

        <div className="bmt-onboarding-grid">
          <div>
            <div style={{ maxWidth: '36rem' }}>
              <p className="bmt-card-eyebrow">{card.eyebrow}</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCard}
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -26 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="bmt-card-title">{card.title}</h2>
                  <p className="bmt-card-body">{card.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="bmt-controls-container">
              <div className="bmt-progress-container" style={{ width: '100%', maxWidth: '28rem', marginTop: '0' }}>
                <motion.div
                  className="bmt-progress-bar"
                  animate={{ width: progressWidth }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>

              <div className="bmt-action-btns">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={activeCard === 0}
                  className="bmt-btn-back"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="bmt-btn-next"
                >
                  {isLast ? "Start booking" : "Continue"}
                </button>
              </div>
            </div>
          </div>

          <div className="bmt-visual-container">
            {onboardingCards.map((item, index) => {
              const offset = index - activeCard;

              return (
                <motion.article
                  key={item.title}
                  className="bmt-visual-card"
                  animate={{
                    x: offset * 26,
                    y: Math.abs(offset) * 18,
                    scale: 1 - Math.abs(offset) * 0.055,
                    opacity: Math.abs(offset) > 1 ? 0 : 1,
                    zIndex: onboardingCards.length - Math.abs(offset),
                  }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="bmt-card-inner">
                    <div>
                      <div className="bmt-step-icon">
                        <img src="/logo-icon.png" alt="" style={{ width: '2.5rem', height: '2.5rem' }} />
                      </div>
                      <p className="bmt-step-label">Step {index + 1}</p>
                      <h3 className="bmt-step-title">{item.title}</h3>
                    </div>

                    <div className="bmt-slot-preview">
                      <div className="bmt-slot-header">
                        <span>Turf slots</span>
                        <span className="bmt-live-indicator">Live</span>
                      </div>
                      <div className="bmt-slot-grid">
                        {["6 PM", "7 PM", "8 PM"].map((slot) => (
                          <span key={slot} className="bmt-slot-item">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default Onboarding;
